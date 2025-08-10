import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// WebContainers API is browser-only; import dynamically to avoid SSR/ts pitfalls
type WebContainerType = typeof import('@webcontainer/api')

declare global {
  interface Window {
    __MERMAID_WC__?: {
      api: WebContainerType | null
      wc: import('@webcontainer/api').WebContainer | null
      serverUrl: string | null
      process: import('@webcontainer/api').WebContainerProcess | null
    }
  }
}

export function ChartsDrawer({ open, onClose, code }: { open: boolean; onClose: () => void; code: string }) {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null)
  const [booting, setBooting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const latestCodeRef = useRef<string>('')
  latestCodeRef.current = code

  const clientId = (import.meta as unknown as { env?: Record<string, unknown> })?.env?.VITE_WEB_CONTAINERS_CLIENT_ID as string | undefined

  const ensureBoot = useCallback(async (): Promise<void> => {
    if (!open) return
    try {
      setError(null)
      // Cross-origin isolation is required for WebContainers (SharedArrayBuffer)
      const coi = (globalThis as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated
      if (!coi) {
        setError(
          'This page is not cross-origin isolated. Restart the dev server after enabling COOP/COEP headers. '
          + 'We added them to Vite. If you still see this, hard-refresh the page (Shift+Reload).'
        )
        return
      }
      if (!window.__MERMAID_WC__) window.__MERMAID_WC__ = { api: null, wc: null, serverUrl: null, process: null }
      const cache = window.__MERMAID_WC__
      // Load API once
      if (!cache.api) {
        setBooting(true)
        const mod = (await import('@webcontainer/api')) as typeof import('@webcontainer/api') & {
          auth?: { init?: (opts: { clientId: string; scope?: string }) => Promise<void> | void }
        }
        // Initialize auth if clientId is provided
        try {
          if (clientId) {
            await mod.auth?.init?.({ clientId, scope: '' })
          }
        } catch {
          // ignore auth init errors; may not be required in dev
        }
        cache.api = mod
      }
      const { WebContainer } = cache.api!
      // Boot container once
      if (!cache.wc) {
        setBooting(true)
        cache.wc = await WebContainer.boot({ workdirName: 'mermaid-renderer' })
        // Fetch theme config (variables + css) from backend
        let variables: Record<string, unknown> | undefined
        let css: string | undefined
        try {
          const res = await fetch('/api/mermaid-theme')
          if (res.ok) {
            const json = await res.json()
            variables = (json && typeof json.variables === 'object') ? json.variables : undefined
            css = typeof json?.css === 'string' ? json.css : undefined
          }
        } catch {}
        // Prepare minimal files (no npm install required)
        await cache.wc.fs.writeFile('index.html', buildIndexHtml(variables, css))
        await cache.wc.fs.writeFile('main.mjs', MAIN_JS)
        await cache.wc.fs.writeFile('diagram.mmd', latestCodeRef.current || 'graph TD; A[Empty] --> B[Diagram]')
        await cache.wc.fs.writeFile('server.js', SERVER_JS)

        // Start server
        const proc = await cache.wc.spawn('node', ['server.js'])
        cache.process = proc
        // Listen for server-ready
        cache.wc.on('server-ready', (_port, url) => {
          cache.serverUrl = url
          setIframeUrl(urlWithBust(url))
        })
        // Also read stdout for visibility (optional)
        proc.output.pipeTo(
          new WritableStream({
            write() {
              // intentionally ignored; hook into logs if desired
            },
          }),
        ).catch(() => {})
      }

      // Always sync the current diagram and html on open to avoid stale renders
      if (cache.wc) {
        try { await cache.wc.fs.rm('diagram.mmd') } catch {}
        await cache.wc.fs.writeFile('diagram.mmd', latestCodeRef.current || '')
        // Rewrite index.html as well, ensuring a fresh script execution path
        try { await cache.wc.fs.rm('index.html') } catch {}
        // Re-fetch theme in case it changed
        let variables: Record<string, unknown> | undefined
        let css: string | undefined
        try {
          const res = await fetch('/api/mermaid-theme')
          if (res.ok) {
            const json = await res.json()
            variables = (json && typeof json.variables === 'object') ? json.variables : undefined
            css = typeof json?.css === 'string' ? json.css : undefined
          }
        } catch {}
        await cache.wc.fs.writeFile('index.html', buildIndexHtml(variables, css))
        try { await cache.wc.fs.rm('main.mjs') } catch {}
        await cache.wc.fs.writeFile('main.mjs', MAIN_JS)
      }

      // If we already have a server URL, just use it
      if (cache.serverUrl) {
        setIframeUrl(urlWithBust(cache.serverUrl))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBooting(false)
    }
  }, [open, clientId])

  // Boot/start when opened
  useEffect(() => {
    if (!open) return
    ensureBoot()
  }, [open, ensureBoot])

  // Sync diagram content into container when code changes
  useEffect(() => {
    const cache = window.__MERMAID_WC__
    const wc = cache?.wc
    const url = cache?.serverUrl
    if (!open || !wc) return
    ;(async () => {
      try {
        // Clear and re-write diagram to avoid stale cache in iframe
        try { await wc.fs.rm('diagram.mmd') } catch {}
        await wc.fs.writeFile('diagram.mmd', latestCodeRef.current || '')
        if (url) setIframeUrl(urlWithBust(url))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })()
  }, [code, open])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          >
            <div className="drawer__header">
              <div className="drawer__title">Charts</div>
              <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
            </div>
            <div className="drawer__body" style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: 8 }}>
              {error ? (
                <div style={{ color: '#ef4444', fontSize: 12 }}>Error: {error}</div>
              ) : null}
              <div style={{ color: '#9ca3af', fontSize: 12 }}>
                Changes to Code update live.
              </div>
              <div style={{ border: '1px solid #1f2937', borderRadius: 8, overflow: 'hidden', minHeight: 360 }}>
                {iframeUrl ? (
                  <iframe
                    title="Rendering Preview"
                    src={iframeUrl}
                    style={{ width: '100%', height: '100%', border: '0' }}
                  />
                ) : (
                  <div style={{ padding: 16, color: '#9ca3af' }}>
                    {booting ? 'Booting WebContainer…' : 'Waiting for server…'}
                  </div>
                )}
              </div>
            </div>
            <div className="drawer__footer">
              <div style={{ color: '#6b7280', fontSize: 12 }}>
                Rendered code is displayed in this panel.
              </div>
              <button className="btn btn--outline" onClick={onClose}>Close</button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function urlWithBust(url: string): string {
  const u = new URL(url)
  // Force a full reload by changing the search params; servers ignore it for routing
  u.searchParams.set('t', String(Date.now()))
  return u.toString()
}

function buildIndexHtml(variables?: Record<string, unknown>, extraCss?: string): string {
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

const SERVER_JS = `import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.env.PORT || 3000);

const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url || '/', 'http://wc.local');
    const path = u.pathname;
    if (path === '/' || path === '/index.html') {
      const html = await readFile('index.html', 'utf8');
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        // Allow embedding this document in a COEP=require-corp page
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      res.end(html);
      return;
    }
    if (path === '/diagram.mmd') {
      const mmd = await readFile('diagram.mmd', 'utf8');
      res.writeHead(200, {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      res.end(mmd);
      return;
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

export default ChartsDrawer


const MAIN_JS = `import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

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
  original = original.replace(/^%%\\{init[\\s\\S]*?\\}%%\\s*/m, '').trim();

  const MAX_TRIES = 4;
  function normalize(src, attempt) {
    try { src = String(src); } catch { return src; }
    if (attempt === 0) return src;
    if (attempt === 1) {
      let out = src;
      out = out.replace(/^\\s*(flowchart|graph)\\s+([A-Za-z]{2})\\b\\s*/i, function(_m, a, dir) { return String(a) + ' ' + String(dir) + '\\n'; });
      out = out.replace(/^\\s*(sequenceDiagram|classDiagram|erDiagram|stateDiagram(?:-v2)?|journey|gantt)\\b\\s*/i, function(_m, t) { return String(t) + '\\n'; });
      return out;
    }
    if (attempt === 2) {
      return src
        .replace(/\\s+(?=(style|linkStyle|classDef|click|subgraph|end)\\b)/g, '\\n')
        .replace(/\\s+--\\>\\s+/g, ' -->\\n ');
    }
    if (attempt === 3) {
      return src
        .replace(/;\\s*/g, ';\\n')
        .replace(/(\\])\\s+(?=[A-Za-z][A-Za-z0-9_]*\\s*(\\[|--|==|:::|:))/g, '$1\\n')
        .replace(/\\)\\s+(?=[A-Za-z][A-Za-z0-9_]*\\s*(\\[|--|==|:::|:))/g, ')\\n');
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

