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
        // Prepare minimal files (no npm install required)
        await cache.wc.fs.writeFile('index.html', INDEX_HTML)
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

const INDEX_HTML = `<!doctype html>
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
    </style>
    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
      mermaid.initialize({ startOnLoad: false, theme: 'dark', logLevel: 'fatal' });
      const el = document.getElementById('root');
      try {
        const res = await fetch('/diagram.mmd', { cache: 'no-store' });
        const code = await res.text();
        const { svg } = await mermaid.render('mmd-' + Math.random().toString(36).slice(2), code);
        el.innerHTML = svg;
      } catch (e) {
        el.textContent = 'Failed to render: ' + (e?.message || e);
      }
    </script>
  </head>
  <body>
    <div class="wrap">
      <div id="root" class="box"></div>
    </div>
  </body>
</html>`

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


