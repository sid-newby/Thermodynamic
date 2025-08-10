import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
// Bun global typing shim for editors without Bun types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Bun: any;

const anthropic = new Anthropic({
  // defaults to process.env["ANTHROPIC_API_KEY"] if undefined
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Prefer explicit MCP_SERVER_URL; otherwise, if TAVILY_API_KEY is set, default to Tavily's remote MCP
const fallbackTavilyUrl = process.env.TAVILY_API_KEY
  ? `https://mcp.tavily.com/mcp/?tavilyApiKey=${encodeURIComponent(process.env.TAVILY_API_KEY)}`
  : undefined;

const resolvedMcpUrl = process.env.MCP_SERVER_URL || fallbackTavilyUrl;

const mcpServers = resolvedMcpUrl
  ? [
      {
        type: "url" as const,
        url: resolvedMcpUrl,
        name: process.env.MCP_SERVER_NAME || "tavily",
        // Only set this if your remote MCP expects OAuth bearer tokens
        ...(process.env.MCP_AUTH_TOKEN
          ? { authorization_token: process.env.MCP_AUTH_TOKEN }
          : {}),
      },
    ]
  : undefined;

// Heuristic: auto-disable streaming for trivially short prompts unless explicitly enabled
function estimatePromptCharLength(p: any): number {
  let total = 0;
  // system can be string or array of blocks
  if (Array.isArray(p.system)) {
    for (const block of p.system) {
      if (block?.type === "text" && typeof block.text === "string") total += block.text.length;
    }
  } else if (typeof p.system === "string") {
    total += p.system.length;
  }
  // messages content blocks
  if (Array.isArray(p.messages)) {
    for (const m of p.messages) {
      if (Array.isArray(m?.content)) {
        for (const c of m.content) {
          if (c?.type === "text" && typeof c.text === "string") total += c.text.length;
        }
      }
    }
  }
  return total;
}

const envStreaming = process.env.STREAMING ? /^(1|true)$/i.test(process.env.STREAMING) : undefined;

const userPrompt = process.argv.slice(2).join(" ") || process.env.USER_PROMPT || "Hello";

const params = {
  model: "claude-sonnet-4-20250514",
  max_tokens: 64000,
  temperature: 1,
  // 1-hour prompt cache for the system prompt (requires beta flag below)
  system: [
    {
      type: "text" as const,
      text: "This is the System Prompt: ",
      cache_control: { type: "ephemeral" as const, ttl: "1h" },
    },
  ],
  messages: [
    {
      role: "user" as const,
      content: [
        {
          type: "text" as const,
          text: userPrompt,
        },
      ],
    },
  ],
  // Enable MCP connector to reach your remote MCP server
  mcp_servers: mcpServers,
  tools: [
    {
      type: "custom" as const,
      name: "get_stock_price",
      description: "Get the current stock price for a given stock symbol. ",
      input_schema: {
        type: "object",
        properties: {
          ticker: {
            type: "string",
            description: "The ticker to get the price for, e.g. CLDE",
          },
        },
        required: ["ticker"],
      },
    },
    {
      type: "custom" as const,
      name: "get_weather",
      description:
        "Get the current weather in a given location. If no location is defined, use Austin, Texas. ",
      input_schema: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city and state, e.g. San Francisco, CA",
          },
        },
        required: ["location"],
      },
    },
    {
      type: "custom" as const,
      name: "get_time",
      description:
        "Get the current time in a given location. If no location is defined, use Chicago. ",
      input_schema: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city and state, e.g. San Francisco, CA.",
          },
        },
        required: ["location"],
      },
    },
    {
      name: "web_search",
      type: "web_search_20250305" as const,
    },
  ],
  betas: [
    "web-search-2025-03-05",
    "mcp-client-2025-04-04",
    "extended-cache-ttl-2025-04-11",
  ],
};

// Heuristic streaming toggle computed after params is defined
const has1hCache = Array.isArray(params.system)
  && params.system.some((b: any) => (b as any)?.cache_control?.ttl === "1h");
const approxChars = estimatePromptCharLength(params);
const autoCharLimit = Number(process.env.STREAMING_AUTO_CHAR_LIMIT || 500);
const trivialPrompt = approxChars > 0 && approxChars <= autoCharLimit && !mcpServers;

// Default behavior: stream unless explicitly disabled or auto-disables for trivial prompts
let useStreaming = envStreaming ?? true;
if (useStreaming && (process.env.STREAMING_AUTO ?? "1").match(/^(1|true)$/i) && trivialPrompt) {
  useStreaming = false;
}
// Always stream if using extended 1h cache
if (has1hCache) {
  useStreaming = true;
}

if (process.env.CLAUDE_CLI === "1") {
  if (useStreaming) {
    try {
      const stream = await anthropic.beta.messages.stream(params as any);
      stream.on("text", (text: string) => process.stdout.write(text));
      stream.on("streamEvent", (event: any) => {
        if (event?.type === "content_block_start") {
          const blockType = event?.content_block?.type;
          const toolName = event?.content_block?.name;
          if (blockType === "tool_use" || blockType === "server_tool_use" || blockType === "mcp_tool_use") {
            console.log(`\n[tool start] ${toolName || blockType}`);
          }
        }
      });
      await stream.finalMessage();
      console.log("\n\n[done]");
    } catch (err) {
      console.error("Streaming error:", err);
    }
  } else {
    const msg = await anthropic.beta.messages.create(params as any);
    console.log(msg);
  }
}

// --- System Prompt persistence via Supabase ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false },
    });
  } catch (e) {
    console.warn("Failed to init Supabase client", e);
  }
}

const SETTINGS_TABLE = "app_settings"; // columns: key text primary key, value text
const SYSTEM_PROMPT_KEY = "system_prompt";
const MERMAID_THEME_KEY = "mermaid_theme"; // stores JSON string: { variables: object, css: string }

let cachedSystemPrompt = "";

async function loadSystemPrompt(): Promise<string> {
  if (!supabase) return cachedSystemPrompt || "";
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("value")
    .eq("key", SYSTEM_PROMPT_KEY)
    .maybeSingle();
  if (error) {
    console.warn("Failed to load system prompt:", error.message);
    return cachedSystemPrompt || "";
  }
  return (data?.value as string) || "";
}

async function saveSystemPrompt(next: string): Promise<void> {
  cachedSystemPrompt = next;
  if (!supabase) return;
  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert({ key: SYSTEM_PROMPT_KEY, value: next }, { onConflict: "key" });
  if (error) console.warn("Failed to save system prompt:", error.message);
}

async function loadMermaidTheme(): Promise<{ variables?: Record<string, unknown>; css?: string }> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("value")
    .eq("key", MERMAID_THEME_KEY)
    .maybeSingle();
  if (error) {
    console.warn("Failed to load mermaid theme:", error.message);
    return {};
  }
  try {
    return data?.value ? JSON.parse(data.value as string) : {};
  } catch {
    return {};
  }
}

async function saveMermaidTheme(theme: { variables?: Record<string, unknown>; css?: string }): Promise<void> {
  if (!supabase) return;
  const payload = JSON.stringify(theme || {});
  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert({ key: MERMAID_THEME_KEY, value: payload }, { onConflict: "key" });
  if (error) console.warn("Failed to save mermaid theme:", error.message);
}

// Prime cache on startup
try {
  loadSystemPrompt().then((v) => (cachedSystemPrompt = v || ""));
} catch {
  /* noop */
}

// Minimal Bun API for UI
Bun.serve({
  port: Number(process.env.PORT || 3000),
  async fetch(req) {
    const url = new URL(req.url);
    // Expose Deepgram key for browser WebSocket auth (dev-only). Do NOT use this in production as-is.
    if (req.method === "GET" && url.pathname === "/api/deepgram-token") {
      const key = process.env.DEEPGRAM_API_KEY || "";
      const body = { key, warn: key ? undefined : "Missing DEEPGRAM_API_KEY" } as any;
      return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
    }
    // Mermaid theme (GET)
    if (req.method === "GET" && url.pathname === "/api/mermaid-theme") {
      try {
        const theme = await loadMermaidTheme();
        return new Response(JSON.stringify(theme || {}), { headers: { "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response("{}", { headers: { "Content-Type": "application/json" } });
      }
    }
    // Mermaid theme (PUT)
    if (req.method === "PUT" && url.pathname === "/api/mermaid-theme") {
      try {
        const body = await req.json();
        const variables = (body && typeof body.variables === "object") ? body.variables : undefined;
        const css = typeof body?.css === "string" ? body.css : undefined;
        await saveMermaidTheme({ variables, css });
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
    }
    // Get current system prompt
    if (req.method === "GET" && url.pathname === "/api/system-prompt") {
      try {
        const prompt = await loadSystemPrompt();
        return new Response(JSON.stringify({ prompt }), { headers: { "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ prompt: cachedSystemPrompt || "" }), { headers: { "Content-Type": "application/json" } });
      }
    }
    // Update system prompt
    if (req.method === "PUT" && url.pathname === "/api/system-prompt") {
      try {
        const body = await req.json();
        const next = String(body?.prompt || "");
        await saveSystemPrompt(next);
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
    }
    if (req.method === "POST" && url.pathname === "/api/message") {
      try {
        const body = await req.json();
        const text: string = String(body?.text || "");
        const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(body?.history)
          ? body.history.map((m: any) => ({ role: m?.role, content: String(m?.content || "") }))
          : [];
        const systemBlocks = [
          {
            type: "text" as const,
            text: cachedSystemPrompt || "",
            cache_control: { type: "ephemeral" as const, ttl: "1h" },
          },
        ];
        // Convert prior turns to Anthropic format; include only last 10 for brevity
        const priorMessages = history.slice(-10).map((m) => ({
          role: m.role,
          content: [{ type: "text" as const, text: m.content }],
        }));

        const stream = await anthropic.beta.messages.stream({
          ...params,
          system: systemBlocks,
          messages: [...priorMessages, { role: "user", content: [{ type: "text", text }] }],
        } as any);

        const encoder = (s: string) => new TextEncoder().encode(s);
        const sse = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder(`event: message\n`));
            // send initial echo of user message to populate pane with a header line
            controller.enqueue(encoder(`data: ${JSON.stringify({ type: "text", text: "" })}\n\n`));
            stream.on("text", (t: string) => {
              controller.enqueue(encoder(`data: ${JSON.stringify({ type: "text", text: t })}\n\n`));
            });
            stream.on("streamEvent", (ev: any) => {
              if (ev?.type === "content_block_start") {
                const nm = ev?.content_block?.name;
                if (nm) controller.enqueue(encoder(`data: ${JSON.stringify({ type: "tool", name: nm })}\n\n`));
              }
            });
            stream.on("finalMessage", () => {
              controller.enqueue(encoder(`data: ${JSON.stringify({ type: "done" })}\n\n`));
              controller.close();
            });
            stream.on("error", (e: any) => {
              controller.enqueue(encoder(`data: ${JSON.stringify({ type: "error", message: String(e?.message || e) })}\n\n`));
            });
          },
        });

        return new Response(sse, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }
    return new Response("Not found", { status: 404 });
  },
});