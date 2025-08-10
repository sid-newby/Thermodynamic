// Centralized, singleton WebContainer manager used by all features (Mermaid + Run)
// Ensures exactly one WebContainer instance is ever booted, regardless of entrypoint.

type WebContainerLib = typeof import('@webcontainer/api')

declare global {
  interface Window {
    __WC__?: {
      api: WebContainerLib | null
      wc: import('@webcontainer/api').WebContainer | null
      serverUrl: string | null
      process: import('@webcontainer/api').WebContainerProcess | null
      bootPromise: Promise<void> | null
    }
  }
}

export async function bootWC(): Promise<string | null> {
  try {
    const coi = (globalThis as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated
    if (!coi) {
      console.warn('[wc] Page is not cross-origin isolated; cannot boot WebContainers')
      return null
    }
    if (!window.__WC__) window.__WC__ = { api: null, wc: null, serverUrl: null, process: null, bootPromise: null }
    const cache = window.__WC__
    if (!cache.api) {
      const mod = (await import('@webcontainer/api')) as WebContainerLib & {
        auth?: { init?: (opts: { clientId: string; scope?: string }) => Promise<void> | void }
      }
      try {
        const clientId = (import.meta as unknown as { env?: Record<string, unknown> })?.env?.VITE_WEB_CONTAINERS_CLIENT_ID as string | undefined
        if (clientId) await mod.auth?.init?.({ clientId, scope: '' })
      } catch (e) {
        console.warn('[wc] Failed to init WebContainer auth', e)
      }
      cache.api = mod
    }
    const { WebContainer } = cache.api!
    if (!cache.wc) {
      if (!cache.bootPromise) {
        cache.bootPromise = (async () => {
          cache.wc = await WebContainer.boot({ workdirName: 'thermodynamic-wc', coep: 'credentialless' })
          // Seed files required by both Mermaid (/charts) and Run (/run)
          await cache.wc.fs.writeFile('index.html', buildChartsIndexHtml({}, ''))
          await cache.wc.fs.writeFile('main.mjs', MERMAID_MAIN_JS)
          await cache.wc.fs.writeFile('diagram.mmd', 'graph TD; boot --> ready;')
          await cache.wc.fs.mkdir('run').catch(() => {})
          await cache.wc.fs.writeFile('server.js', UNIFIED_SERVER_JS)
          const proc = await cache.wc.spawn('node', ['server.js'])
          cache.process = proc
          cache.wc.on('server-ready', (_port, url) => {
            cache.serverUrl = url
          })
          proc.output.pipeTo(new WritableStream({ write() {} })).catch(() => {})
        })()
      }
      await cache.bootPromise
      cache.bootPromise = null
    }
    return cache.serverUrl || null
  } catch (e) {
    console.error('[wc] boot error', e)
    return null
  }
}

export function getServerUrl(): string | null {
  return window.__WC__?.serverUrl || null
}

export async function writeMermaidCode(code: string): Promise<string | null> {
  const url = await bootWC()
  const wc = window.__WC__?.wc
  if (!wc) return url
  try {
    try { await wc.fs.rm('diagram.mmd') } catch { /* ignore */ }
    await wc.fs.writeFile('diagram.mmd', code || '')
  } catch (e) {
    console.error('[wc] mermaid write error', e)
  }
  return window.__WC__?.serverUrl || url
}

export async function writeRunSnippet(language: string, code: string): Promise<string | null> {
  const url = await bootWC()
  const wc = window.__WC__?.wc
  if (!wc) return url
  try {
    await writeFilesForLanguage(wc, language, code)
  } catch (e) {
    console.error('[wc] run write error', e)
  }
  return window.__WC__?.serverUrl || url
}

async function writeFilesForLanguage(
  wc: import('@webcontainer/api').WebContainer,
  language: string,
  code: string
): Promise<void> {
  const lang = language.toLowerCase()
  if (lang === 'python' || lang === 'py') {
    await wc.fs.mkdir('run').catch(() => {})
    await wc.fs.writeFile('run/index.html', INDEX_HTML_PY)
    await wc.fs.writeFile('run/snippet.py', code)
    return
  }
  if (lang === 'html' || code.trim().startsWith('<!doctype') || code.trim().startsWith('<html')) {
    const html = ensureConsoleShimInHtml(code)
    await wc.fs.mkdir('run').catch(() => {})
    await wc.fs.writeFile('run/index.html', html)
    return
  }
  // Default to JS module executed in the browser
  await wc.fs.mkdir('run').catch(() => {})
  await wc.fs.writeFile('run/index.html', INDEX_HTML_JS)
  await wc.fs.writeFile('run/snippet.js', wrapSnippet(code))
}

function ensureConsoleShimInHtml(html: string): string {
  if (html.includes('__console_shim__')) return html
  const shim = `<script>\n(function(){\n  if (window.__console_shim__) return;\n  window.__console_shim__=true;\n  const out=document.getElementById('preview-console')||document.body.appendChild(Object.assign(document.createElement('pre'),{id:'preview-console',style:'background:#0a0e1a;border:1px solid #1f2937;border-radius:10px;padding:12px;white-space:pre-wrap;'}));\n  const write=(lvl, args)=>{out.textContent += '['+lvl+'] '+args.map(a=>{try{return typeof a==='string'?a:JSON.stringify(a)}catch{return String(a)}}).join(' ')+'\\n'};\n  ['log','warn','error'].forEach(k=>{const orig=console[k];console[k]=(...a)=>{try{write(k,a)}catch{};orig.apply(console,a)};});\n})();\n</script>`
  if (html.includes('</head>')) return html.replace('</head>', `${shim}\n</head>`)
  if (html.includes('</body>')) return html.replace('</body>', `${shim}\n</body>`)
  return shim + html
}

function wrapSnippet(code: string): string {
  return `// user snippet\ntry {\n${code}\n} catch (e) {\n  console.error(e?.message || String(e));\n}`
}

function buildChartsIndexHtml(variables?: Record<string, unknown>, extraCss?: string): string {
  const varJson = JSON.stringify(variables || {})
  const varJsonEscaped = varJson.replace(/<\//g, '<\\/')
  const cssBlock = (extraCss && String(extraCss).trim().length > 0)
    ? `\n/* Extra custom CSS */\n${extraCss}\n`
    : ''
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Rendered Preview</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; background: #0b0b0b; color: #e5e5e5; font: 14px/1.5 ui-sans-serif, system-ui, -apple-system; }
      .wrap { padding: 16px; }
      .box { background: #0a0e1a; border: 1px solid #1f2937; border-radius: 10px; padding: 16px; overflow: auto; }
      /* Cyberpunk Mermaid CSS overrides */
      .node rect { stroke-width: 3px !important; filter: drop-shadow(0 0 10px currentColor); }
      .node text { font-weight: 900 !important; font-size: 14px !important; text-shadow: 2px 2px 0px rgba(0,0,0,0.8), -1px -1px 0px rgba(0,0,0,0.8), 1px -1px 0px rgba(0,0,0,0.8), -1px 1px 0px rgba(0,0,0,0.8); }
      .edgeLabel { background-color: #0a0e27 !important; padding: 5px !important; border: 2px solid #00ffff !important; font-weight: bold !important; }
      .flowchart-link { stroke-width: 3px !important; filter: drop-shadow(0 0 5px currentColor); }
      .cluster text { font-size: 18px !important; font-weight: 900 !important; fill: #00ffff !important; }
      .node.default { filter: drop-shadow(0 0 20px rgba(255,0,128,0.6)); }
      ${cssBlock}
    </style>
    <script id="theme-vars" type="application/json">${varJsonEscaped}</script>
    <script type="module" src="/main.mjs"></script>
  </head>
  <body>
    <div class="wrap">
      <div id="root" class="box"></div>
    </div>
  </body>
  </html>`
}

const UNIFIED_SERVER_JS = `import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.env.PORT || 3000);

const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url || '/', 'http://wc.local');
    const path = u.pathname;
    if (path === '/' || path === '/charts' || path === '/charts/' || path === '/index.html') {
      const html = await readFile('index.html', 'utf8').catch(() => '<!doctype html><html><body><div>Loading…</div></body></html>');
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      res.end(html);
      return;
    }
    if (path === '/diagram.mmd') {
      const mmd = await readFile('diagram.mmd', 'utf8').catch(() => '');
      res.writeHead(200, {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      res.end(mmd);
      return;
    }
    if (path === '/main.mjs') {
      const js = await readFile('main.mjs', 'utf8');
      res.writeHead(200, {
        'content-type': 'text/javascript; charset=utf-8',
        'cache-control': 'no-store',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      res.end(js);
      return;
    }
    // Run preview
    if (path === '/run' || path === '/run/') {
      const html = await readFile('run/index.html', 'utf8').catch(() => '<!doctype html><html><body><div>Loading…</div></body></html>');
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      res.end(html);
      return;
    }
    if (path === '/run/snippet.js') {
      const js = await readFile('run/snippet.js', 'utf8').catch(() => 'console.warn("No snippet provided")');
      res.writeHead(200, {
        'content-type': 'text/javascript; charset=utf-8',
        'cache-control': 'no-store',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      res.end(js);
      return;
    }
    if (path === '/run/snippet.py') {
      const py = await readFile('run/snippet.py', 'utf8').catch(() => 'print("No snippet provided")')
      res.writeHead(200, {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      })
      res.end(py)
      return
    }
    if (path === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }
    res.statusCode = 404;
    res.end('not found');
  } catch (e) {
    res.statusCode = 500;
    res.end(String(e));
  }
});

server.listen(port, '0.0.0.0');

console.log('server-ready', port);
`

const MERMAID_MAIN_JS = `import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

let externalVars = {};
try { externalVars = JSON.parse(document.getElementById('theme-vars')?.textContent || '{}') } catch {}

const mermaidConfig = {
  startOnLoad: false,
  logLevel: 'fatal',
  securityLevel: 'loose',
  theme: 'base',
  themeVariables: externalVars,
};

mermaid.initialize(mermaidConfig);
const el = document.getElementById('root');
try {
  const res = await fetch('/diagram.mmd', { cache: 'no-store' });
  let original = (await res.text()) || '';
  original = original.replace(/^%%\{init[\s\S]*?\}%%\s*/m, '').trim();

  const MAX_TRIES = 4;
  function normalize(src, attempt) {
    try { src = String(src); } catch { return src; }
    if (attempt === 0) return src;
    if (attempt === 1) {
      let out = src;
      out = out.replace(/^\s*(flowchart|graph)\s+([A-Za-z]{2})\b\s*/i, function(_m, a, dir) { return String(a) + ' ' + String(dir) + '\n'; });
      out = out.replace(/^\s*(sequenceDiagram|classDiagram|erDiagram|stateDiagram(?:-v2)?|journey|gantt)\b\s*/i, function(_m, t) { return String(t) + '\n'; });
      return out;
    }
    if (attempt === 2) {
      return src
        .replace(/\s+(?=(style|linkStyle|classDef|click|subgraph|end)\b)/g, '\n')
        .replace(/\s+--\>\s+/g, ' -->\n ');
    }
    if (attempt === 3) {
      return src
        .replace(/;\s*/g, ';\n')
        .replace(/(\])\s+(?=[A-Za-z][A-Za-z0-9_]*\s*(\[|--|==|:::|:))/g, '$1\n')
        .replace(/\)\s+(?=[A-Za-z][A-Za-z0-9_]*\s*(\[|--|==|:::|:))/g, ')\n');
    }
    return src;
  }

  for (let i = 0; i < MAX_TRIES; i++) {
    const code = normalize(original, i);
    try {
      const id = 'mmd-' + Math.random().toString(36).slice(2);
      const { svg } = await mermaid.render(id, code);
      if (!svg || String(svg).trim().length < 20) throw new Error('Empty SVG');
      el.innerHTML = svg;
      break;
    } catch (err) {
      console.error('[mermaid] render attempt', i, 'failed:', err);
      if (i === MAX_TRIES - 1) {
        el.textContent = 'Failed to render: ' + (err?.message || err);
      }
    }
  }
} catch (e) {
  el.textContent = 'Failed to render: ' + (e?.message || e);
}`

const INDEX_HTML_JS = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Code Preview</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; background: #0b0b0b; color: #e5e5e5; font: 14px/1.5 ui-sans-serif, system-ui, -apple-system; }
      .wrap { padding: 16px; display: grid; gap: 12px; }
      .box { background: #0a0e1a; border: 1px solid #1f2937; border-radius: 10px; padding: 16px; overflow: auto; }
    </style>
    <script>
      (function(){
        if (window.__console_shim__) return; window.__console_shim__=true;
        const out=document.getElementById('preview-console')||document.body.appendChild(Object.assign(document.createElement('pre'),{id:'preview-console',className:'box'}));
        const write=(lvl, args)=>{out.textContent += '['+lvl+'] '+args.map(a=>{try{return typeof a==='string'?a:JSON.stringify(a)}catch{return String(a)}}).join(' ')+'\n'};
        ['log','warn','error'].forEach(k=>{const orig=console[k];console[k]=(...a)=>{try{write(k,a)}catch{};orig.apply(console,a)};});
      })();
    </script>
    <script type="module" src="/run/snippet.js"></script>
  </head>
  <body>
    <div class="wrap">
      <div class="box">Open the console output below. Your JS runs as a browser module.</div>
      <pre id="preview-console" class="box"></pre>
    </div>
  </body>
  </html>`

const INDEX_HTML_PY = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Python (Pyodide) Preview</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; background: #0b0b0b; color: #e5e5e5; font: 14px/1.5 ui-sans-serif, system-ui, -apple-system; }
      .wrap { padding: 16px; display: grid; gap: 12px; }
      .box { background: #0a0e1a; border: 1px solid #1f2937; border-radius: 10px; padding: 16px; overflow: auto; }
      .muted { color: #9ca3af; font-size: 12px; }
    </style>
    <script>
      (function(){
        if (window.__console_shim__) return; window.__console_shim__=true;
        const out=document.getElementById('preview-console')||document.body.appendChild(Object.assign(document.createElement('pre'),{id:'preview-console',className:'box'}));
        const write=(lvl, args)=>{out.textContent += '['+lvl+'] '+args.map(a=>{try{return typeof a==='string'?a:JSON.stringify(a)}catch{return String(a)}}).join(' ')+'\n'};
        ['log','warn','error'].forEach(k=>{const orig=console[k];console[k]=(...a)=>{try{write(k,a)}catch{};orig.apply(console,a)};});
      })();
    </script>
    <!-- Load non-module build to avoid module parse issues -->
    <script src="https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js"></script>
    <script type="module">
      const status = document.getElementById('status');
      self.addEventListener('error', (e) => { try { status.textContent = 'JS Error: ' + (e?.message || e); } catch {} });
      self.addEventListener('unhandledrejection', (e) => { try { status.textContent = 'Promise Rejection: ' + (e?.reason?.message || e?.reason || 'unknown'); } catch {} });
      try {
        status.textContent = 'Loading Pyodide…';
        const pyodide = await (window as any).loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/' });
        status.textContent = 'Loaded. Running snippet…';
        const code = await fetch('/run/snippet.py', { cache: 'no-store' }).then(r => r.text());
        // Capture stdout/stderr
        const pre = document.getElementById('py-out');
        function append(line){ pre.textContent += line + '\n'; }
        pyodide.setStdout({ batched: (s) => append(s) });
        pyodide.setStderr({ batched: (s) => append('[stderr] ' + s) });
        await pyodide.runPythonAsync(code);
        status.textContent = 'Done.';
      } catch (e) {
        console.error(e?.message || String(e));
        status.textContent = 'Error.';
      }
    </script>
  </head>
  <body>
    <div class="wrap">
      <div class="box">Python is executed using Pyodide (WASM) in the browser.</div>
      <div id="status" class="muted">Starting…</div>
      <pre id="py-out" class="box"></pre>
    </div>
  </body>
  </html>`


