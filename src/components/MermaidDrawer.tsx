import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function MermaidDrawer({ open, onClose, code, themeVarsJson, themeCss }: { open: boolean; onClose: () => void; code: string; themeVarsJson?: string; themeCss?: string }) {
  const [srcDoc, setSrcDoc] = useState<string | null>(null)
  const [error] = useState<string | null>(null)
  const latestCodeRef = useRef<string>('')
  latestCodeRef.current = code

  useEffect(() => {
    if (!open) return
    setSrcDoc(buildAnySrcDoc(code || '', themeVarsJson || '{}', themeCss || ''))
  }, [open])

  useEffect(() => {
    if (!open) return
    setSrcDoc(buildAnySrcDoc(code || '', themeVarsJson || '{}', themeCss || ''))
  }, [code, themeVarsJson, themeCss, open])

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
            className="drawer drawer--left drawer--mermaid"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          >
            <div className="drawer__header">
              <div className="drawer__title">Mermaid</div>
              <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
            </div>
            <div className="drawer__body" style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: 8 }}>
              {error ? (
                <div style={{ color: '#ef4444', fontSize: 12 }}>Error: {error}</div>
              ) : null}
              <div style={{ color: '#9ca3af', fontSize: 12 }}>Live Mermaid rendering.</div>
              <div style={{ border: '1px solid #1f2937', borderRadius: 8, overflow: 'hidden', minHeight: 360 }}>
                {srcDoc ? (
                  <iframe title="Mermaid Preview" srcDoc={srcDoc} style={{ width: '100%', height: '100%', border: '0' }} />
                ) : null}
              </div>
            </div>
            <div className="drawer__footer">
              <div style={{ color: '#6b7280', fontSize: 12 }}>Rendered diagram output.</div>
              <button className="btn btn--outline" onClick={onClose}>Close</button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function buildAnySrcDoc(code: string, themeVarsJson: string, extraCss: string): string {
  const src = String(code || '')
  if (/\bradar-beta\b/i.test(src)) return buildRadarSrcDoc(src, extraCss)
  return buildMermaidSrcDoc(src, themeVarsJson, extraCss)
}

function buildMermaidSrcDoc(code: string, themeVarsJson: string, extraCss: string): string {
  // Strip any init directive
  const cleaned = code.replace(/^%%\{init[\s\S]*?\}%%\s*/m, '').trim()
  const safeVars = themeVarsJson && themeVarsJson.trim() ? themeVarsJson : '{}'
  const cssBlock = extraCss && extraCss.trim().length > 0 ? `\n/* Extra custom CSS */\n${extraCss}\n` : ''
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mermaid Preview</title>
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
    <script id="theme-vars" type="application/json">${safeVars.replace(/<\//g, '<\\/')}</script>
    <script id="mmd" type="text/plain">${cleaned.replace(/<\//g, '<\\/')}</script>
    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
      let externalVars = {};
      try { externalVars = JSON.parse(document.getElementById('theme-vars')?.textContent || '{}') } catch {}
      const mermaidConfig = { startOnLoad: false, logLevel: 'fatal', securityLevel: 'loose', theme: 'base', themeVariables: externalVars };
      mermaid.initialize(mermaidConfig);
      const el = document.getElementById('root');
      try {
        const original = (document.getElementById('mmd')?.textContent || '').trim();
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
            return src.replace(/\s+(?=(style|linkStyle|classDef|click|subgraph|end)\b)/g, '\n').replace(/\s+--\>\s+/g, ' -->\n ');
          }
          if (attempt === 3) {
            return src.replace(/;\s*/g, ';\n').replace(/(\])\s+(?=[A-Za-z][A-Za-z0-9_]*\s*(\[|--|==|:::|:))/g, '$1\n').replace(/\)\s+(?=[A-Za-z][A-Za-z0-9_]*\s*(\[|--|==|:::|:))/g, ')\n');
          }
          return src;
        }
        for (let i = 0; i < MAX_TRIES; i++) {
          const attempt = normalize(original, i);
          try {
            const id = 'mmd-' + Math.random().toString(36).slice(2);
            const { svg } = await mermaid.render(id, attempt);
            if (!svg || String(svg).trim().length < 20) throw new Error('Empty SVG');
            el.innerHTML = svg;
            break;
          } catch (err) {
            console.error('[mermaid] render attempt', i, 'failed:', err);
            if (i === MAX_TRIES - 1) { el.textContent = 'Failed to render: ' + (err?.message || err); }
          }
        }
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
}

function buildRadarSrcDoc(code: string, extraCss: string): string {
  const lines = code
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => Boolean(l) && l !== '...')

  const axisIds: string[] = []
  const labels: string[] = []
  const series: { name: string; value: number[] }[] = []
  let min = 0
  let max = 100

  function parseAxis(line: string) {
    // Supports: axis id1["Label1"], id2["Label2"]  OR  axis axis1, axis2
    const rest = line.replace(/^axis\s+/i, '')
    const parts = rest.split(/\s*,\s*/)
    for (const part of parts) {
      const mLabel = part.match(/^(\w+)(?:\["([^\"]*)"\])?$/)
      if (mLabel) {
        const id = mLabel[1]
        const label = (mLabel[2] ?? id).trim()
        axisIds.push(id)
        labels.push(label)
      }
    }
  }

  function normalizeLength(values: number[]): number[] {
    const n = axisIds.length
    if (n <= 0) return values
    if (values.length === n) return values
    if (values.length > n) return values.slice(0, n)
    const out = values.slice()
    while (out.length < n) out.push(0)
    return out
  }

  function parseCurveLine(line: string) {
    // Examples:
    // curve id1["Label1"]{1,2,3}
    // curve id2["Label2"]{4,5,6}, id3{7,8,9}
    // curve id4{ axis3: 30, axis1: 20, axis2: 10 }
    const after = line.replace(/^curve\s+/i, '')
    const chunks = after
      .split(/},\s*/)
      .map((c) => (c.endsWith('}') ? c : c + '}'))
      .filter((c) => /\{[^}]*\}/.test(c))
    for (const ch of chunks) {
      const nameMatch = ch.match(/^(\w+)(?:\["([^\"]*)"\])?\s*\{/)
      if (!nameMatch) continue
      const id = nameMatch[1]
      const label = (nameMatch[2] ?? id).trim()
      const contentMatch = ch.match(/\{([^}]*)\}/)
      const content = (contentMatch?.[1] || '').trim()
      let values: number[] = []
      if (/\b\w+\s*:\s*[-+]?\d/.test(content)) {
        const map: Record<string, number> = {}
        content.split(/\s*,\s*/).forEach((seg) => {
          const kv = seg.split(/:\s*/)
          if (kv.length === 2) {
            const k = kv[0].trim()
            const v = Number(kv[1])
            if (Number.isFinite(v)) map[k] = v
          }
        })
        values = axisIds.map((axis) => (Number.isFinite(map[axis]) ? Number(map[axis]) : 0))
      } else {
        values = content
          .split(/\s*,\s*/)
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n))
      }
      series.push({ name: label, value: normalizeLength(values) })
    }
  }

  for (const line of lines) {
    if (/^---/.test(line)) continue
    if (/^title\b/i.test(line)) continue
    if (/^radar-beta/i.test(line)) continue
    if (/^axis\b/i.test(line)) { parseAxis(line); continue }
    if (/^curve\b/i.test(line)) { parseCurveLine(line); continue }
    const minMatch = line.match(/^min\s+(\d+(?:\.\d+)?)/i)
    const maxMatch = line.match(/^max\s+(\d+(?:\.\d+)?)/i)
    if (minMatch) min = Number(minMatch[1])
    if (maxMatch) max = Number(maxMatch[1])
  }

  const indicators = labels.map((name) => ({ name, min, max }))
  const legend = series.map((s) => s.name)
  const cssBlock = extraCss && extraCss.trim().length > 0 ? `\n/* Extra custom CSS */\n${extraCss}\n` : ''
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Radar Chart</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; background: #0b0b0b; color: #e5e5e5; font: 14px/1.5 ui-sans-serif, system-ui, -apple-system; }
      .wrap { padding: 16px; }
      .box { background: #0a0e1a; border: 1px solid #1f2937; border-radius: 10px; padding: 0; overflow: hidden; }
      #chart { width: 100%; height: 520px; }
      ${cssBlock}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
  </head>
  <body>
    <div class="wrap">
      <div class="box">
        <div id="chart"></div>
      </div>
    </div>
    <script>
      const el = document.getElementById('chart');
      const chart = echarts.init(el, null, { renderer: 'canvas' });
      const option = {
        backgroundColor: 'transparent',
        tooltip: {},
        legend: { data: ${JSON.stringify(legend)} },
        radar: {
          axisName: { color: '#e5e5e5' },
          indicator: ${JSON.stringify(indicators)}
        },
        series: [{
          type: 'radar',
          areaStyle: { opacity: 0.2 },
          data: ${JSON.stringify(series)}
        }]
      };
      if (${JSON.stringify(indicators)}.length > 0) {
        chart.setOption(option);
      } else {
        el.innerHTML = '<div style="padding:16px;color:#9ca3af">Invalid radar specification (no axes)</div>';
      }
      window.addEventListener('resize', () => chart.resize());
    </script>
  </body>
  </html>`
}


