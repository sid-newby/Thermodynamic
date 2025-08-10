import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type WebContainerType = typeof import('@webcontainer/api')

declare global {
  interface Window {
    __RUN_WC__?: {
      api: WebContainerType | null
      wc: import('@webcontainer/api').WebContainer | null
      serverUrl: string | null
      process: import('@webcontainer/api').WebContainerProcess | null
    }
  }
}

export function CodeRunDrawer({
  open,
  onClose,
  code,
  language,
}: {
  open: boolean
  onClose: () => void
  code: string
  language: string
}) {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null)
  const [booting, setBooting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const latestCodeRef = useRef<string>('')
  latestCodeRef.current = code

  const clientId = (import.meta as unknown as { env?: Record<string, unknown> })?.env
    ?.VITE_WEB_CONTAINERS_CLIENT_ID as string | undefined

  const ensureBoot = useCallback(async (): Promise<void> => {
    if (!open) return
    try {
      setError(null)
      const coi = (globalThis as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated
      if (!coi) {
        setError(
          'This page is not cross-origin isolated. Restart the dev server after enabling COOP/COEP headers.'
        )
        return
      }
      if (!window.__RUN_WC__) window.__RUN_WC__ = { api: null, wc: null, serverUrl: null, process: null }
      const cache = window.__RUN_WC__
      if (!cache.api) {
        setBooting(true)
        const mod = (await import('@webcontainer/api')) as typeof import('@webcontainer/api') & {
          auth?: { init?: (opts: { clientId: string; scope?: string }) => Promise<void> | void }
        }
        try {
          if (clientId) await mod.auth?.init?.({ clientId, scope: '' })
        } catch {
          // ignore auth init errors
        }
        cache.api = mod
      }
      const { WebContainer } = cache.api!
      if (!cache.wc) {
        setBooting(true)
        cache.wc = await WebContainer.boot({ workdirName: 'code-runner' })
        // Write static assets
        await cache.wc.fs.writeFile('server.js', SERVER_JS)
        // Start server
        const proc = await cache.wc.spawn('node', ['server.js'])
        cache.process = proc
        cache.wc.on('server-ready', (_port, url) => {
          cache.serverUrl = url
          setIframeUrl(urlWithBust(url))
        })
        proc.output
          .pipeTo(
            new WritableStream({
              write() {
                // no-op
              },
            })
          )
          .catch(() => {})
      }

      // Initial files
      await writeFilesForLanguage(cache.wc!, language, latestCodeRef.current)
      if (cache.serverUrl) setIframeUrl(urlWithBust(cache.serverUrl))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBooting(false)
    }
  }, [open, clientId, language])

  useEffect(() => {
    if (!open) return
    ensureBoot()
  }, [open, ensureBoot])

  // Sync code changes
  useEffect(() => {
    const cache = window.__RUN_WC__
    const wc = cache?.wc
    const url = cache?.serverUrl
    if (!open || !wc) return
    ;(async () => {
      try {
        // Clear previous files to avoid stale content
        try { await wc.fs.rm('index.html') } catch {}
        try { await wc.fs.rm('snippet.js') } catch {}
        try { await wc.fs.rm('snippet.py') } catch {}
        await writeFilesForLanguage(wc, language, latestCodeRef.current)
        if (url) setIframeUrl(urlWithBust(url))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })()
  }, [code, language, open])

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
              <div className="drawer__title">Run Code ({language})</div>
              <button className="icon-btn" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="drawer__body" style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: 8 }}>
              {error ? (
                <div style={{ color: '#ef4444', fontSize: 12 }}>Error: {error}</div>
              ) : null}
              <div style={{ color: '#9ca3af', fontSize: 12 }}>
                Live preview. Supports JavaScript, HTML, and Python (Pyodide). External npm dependencies are not installed.
              </div>
              <div style={{ border: '1px solid #1f2937', borderRadius: 8, overflow: 'hidden', minHeight: 360 }}>
                {iframeUrl ? (
                  <iframe title="Code Preview" src={iframeUrl} style={{ width: '100%', height: '100%', border: '0' }} />
                ) : (
                  <div style={{ padding: 16, color: '#9ca3af' }}>
                    {booting ? 'Booting WebContainer…' : 'Waiting for server…'}
                  </div>
                )}
              </div>
            </div>
            <div className="drawer__footer">
              <div style={{ color: '#6b7280', fontSize: 12 }}>Console output appears inside the preview.</div>
              <button className="btn btn--outline" onClick={onClose}>
                Close
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function urlWithBust(url: string): string {
  const u = new URL(url)
  u.searchParams.set('t', String(Date.now()))
  return u.toString()
}

async function writeFilesForLanguage(
  wc: import('@webcontainer/api').WebContainer,
  language: string,
  code: string
): Promise<void> {
  const lang = language.toLowerCase()
  if (lang === 'python' || lang === 'py') {
    await wc.fs.writeFile('index.html', INDEX_HTML_PY)
    await wc.fs.writeFile('snippet.py', code)
    return
  }
  if (lang === 'html' || code.trim().startsWith('<!doctype') || code.trim().startsWith('<html')) {
    // Use provided HTML as-is; inject console capture via a lightweight shim if missing
    await wc.fs.writeFile('index.html', ensureConsoleShimInHtml(code))
    return
  }
  // Default to JS module executed in the browser
  await wc.fs.writeFile('index.html', INDEX_HTML_JS)
  await wc.fs.writeFile('snippet.js', wrapSnippet(code))
}

function ensureConsoleShimInHtml(html: string): string {
  if (html.includes('__console_shim__')) return html
  const shim = `<script>\n(function(){\n  if (window.__console_shim__) return;\n  window.__console_shim__=true;\n  const out=document.getElementById('preview-console')||document.body.appendChild(Object.assign(document.createElement('pre'),{id:'preview-console',style:'background:#0a0e1a;border:1px solid #1f2937;border-radius:10px;padding:12px;white-space:pre-wrap;'}));\n  const write=(lvl, args)=>{out.textContent += '['+lvl+'] '+args.map(a=>{try{return typeof a==='string'?a:JSON.stringify(a)}catch{return String(a)}}).join(' ')+'\n'};\n  ['log','warn','error'].forEach(k=>{const orig=console[k];console[k]=(...a)=>{try{write(k,a)}catch{};orig.apply(console,a)};});\n})();\n</script>`
  if (html.includes('</head>')) return html.replace('</head>', `${shim}\n</head>`)
  if (html.includes('</body>')) return html.replace('</body>', `${shim}\n</body>`)
  return shim + html
}

function wrapSnippet(code: string): string {
  return `// user snippet\ntry {\n${code}\n} catch (e) {\n  console.error(e?.message || String(e));\n}`
}

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
    <script type="module" src="/snippet.js"></script>
  </head>
  <body>
    <div class="wrap">
      <div class="box">Open the console output below. Your JS runs as a browser module.</div>
      <pre id="preview-console" class="box"></pre>
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
      const html = await readFile('index.html', 'utf8').catch(() => '');
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      res.end(html);
      return;
    }
    if (path === '/snippet.js') {
      const js = await readFile('snippet.js', 'utf8').catch(() => 'console.warn("No snippet provided")');
      res.writeHead(200, {
        'content-type': 'text/javascript; charset=utf-8',
        'cache-control': 'no-store',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      res.end(js);
      return;
    }
    if (path === '/snippet.py') {
      const py = await readFile('snippet.py', 'utf8').catch(() => 'print("No snippet provided")')
      res.writeHead(200, {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      })
      res.end(py)
      return
    }
    if (path === '/favicon.ico') {
      res.writeHead(204); res.end(); return;
    }
    res.statusCode = 404; res.end('not found');
  } catch (e) {
    res.statusCode = 500; res.end(String(e));
  }
});

server.listen(port, '0.0.0.0');
console.log('server-ready', port);
`

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
    <script type="module">
      import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.mjs';
      const status = document.getElementById('status');
      try {
        status.textContent = 'Loading Pyodide…';
        const pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/' });
        status.textContent = 'Loaded. Running snippet…';
        const code = await fetch('/snippet.py', { cache: 'no-store' }).then(r => r.text());
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

export default CodeRunDrawer


