/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Send, Mic, Box } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'
import './markdown-theme.css'
import ChartsDrawer from './components/ChartsDrawer'
import CodeRunDrawer from './components/CodeRunDrawer'

type LogItem = { level: 'log' | 'warn' | 'error'; text: string };

export default function App() {
  const [input, setInput] = useState('')
  const [markdown, setMarkdown] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [logs, setLogs] = useState<LogItem[]>([{ level: 'log', text: 'idle' }])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [chartsOpen, setChartsOpen] = useState(false)
  const [chartsCode, setChartsCode] = useState('')
  const [runOpen, setRunOpen] = useState(false)
  const [runCode, setRunCode] = useState('')
  const [runLang, setRunLang] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const streamBufRef = useRef('')
  const flushTimerRef = useRef<number | null>(null)
  const rawMdRef = useRef('')
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const surfaceRef = useRef<HTMLDivElement | null>(null)

  // Mermaid rendering moved to WebContainers in ChartsDrawer

  // capture console logs to ticker
  useEffect(() => {
    const orig: any = { log: console.log, info: console.info, warn: console.warn, error: console.error }
    ;(console as any).log = (...args: any[]) => { setLogs((l) => limit([...l, { level: 'log', text: join(args) }])); orig.log.apply(console, args) }
    ;(console as any).info = (...args: any[]) => { setLogs((l) => limit([...l, { level: 'log', text: join(args) }])); orig.info.apply(console, args) }
    ;(console as any).warn = (...args: any[]) => { setLogs((l) => limit([...l, { level: 'warn', text: join(args) }])); orig.warn.apply(console, args) }
    ;(console as any).error = (...args: any[]) => { setLogs((l) => limit([...l, { level: 'error', text: join(args) }])); orig.error.apply(console, args) }
    return () => { (console as any).log = orig.log; (console as any).info = orig.info; (console as any).warn = orig.warn; (console as any).error = orig.error }
  }, [])

  const canSend = input.trim().length > 0 && !isLoading
  // Detect mermaid blocks in markdown and open Charts drawer automatically
  const lastMermaidRef = useRef<string>('')
  useEffect(() => {
    const m = extractLatestMermaid(markdown)
    if (m && m !== lastMermaidRef.current) {
      lastMermaidRef.current = m
      setChartsCode(m)
      setChartsOpen(true)
    }
  }, [markdown])

  useEffect(() => { autoResize() }, [input])
  useEffect(() => { autoResize() }, [])
  function autoResize() {
    const el = taRef.current; if (!el) return
    const cs = getComputedStyle(el)
    const lh = parseFloat(cs.lineHeight || '0') || 20
    const pad = parseFloat(cs.paddingTop || '0') + parseFloat(cs.paddingBottom || '0')
    const border = parseFloat(cs.borderTopWidth || '0') + parseFloat(cs.borderBottomWidth || '0')
    const min = Math.ceil(pad + border + lh * 1)
    const max = Math.ceil(pad + border + lh * 3)
    el.style.height = 'auto'
    const next = Math.max(min, Math.min(max, el.scrollHeight))
    el.style.height = next + 'px'
    el.style.overflowY = next >= max ? 'auto' : 'hidden'
  }

  // Load system prompt on mount
  useEffect(() => {
    (async () => {
      try {
        // optimistic local cache
        const cached = localStorage.getItem('systemPrompt')
        if (cached) setSystemPrompt(cached)
        const res = await fetch('/api/system-prompt')
        if (res.ok) {
          const json = await res.json()
          setSystemPrompt(json?.prompt || '')
          if (json?.prompt) localStorage.setItem('systemPrompt', json.prompt)
        }
      } catch {
        console.warn('failed to load system prompt')
      }
    })()
  }, [])

  async function saveSystemPrompt(next: string) {
    setSaving(true)
    try {
      localStorage.setItem('systemPrompt', next)
      await fetch('/api/system-prompt', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: next }),
      })
    } catch {
      console.error('failed to save system prompt')
    } finally {
      setSaving(false)
    }
  }

  // close drawer on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setDrawerOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function onSend() {
    if (!canSend) return
    setIsLoading(true)
    // Echo the user's message into the main pane before streaming
    // Add a blank line after the assistant header so streamed text starts as a paragraph
    {
      const header = `${rawMdRef.current ? rawMdRef.current + '\n\n' : ''}**You:** ${input}\n\n### **Thermodynamic**\n\n`
      rawMdRef.current = header
      setMarkdown(header)
    }
    try {
      console.log('[send]', input)
      const res = await fetch('/api/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: input }) })
      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      setInput('')
      const scheduleFlush = () => {
        if (flushTimerRef.current != null) return
        flushTimerRef.current = window.setTimeout(() => {
          if (streamBufRef.current) {
            const nextRaw = rawMdRef.current + streamBufRef.current
            rawMdRef.current = nextRaw
            const safe = stabilizeMarkdownForStreaming(nextRaw, false)
            setMarkdown(safe)
            streamBufRef.current = ''
          }
          flushTimerRef.current = null
        }, 32)
      }
      const flushNow = () => {
        if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null }
        if (streamBufRef.current) {
          const nextRaw = rawMdRef.current + streamBufRef.current
          rawMdRef.current = nextRaw
          const safe = stabilizeMarkdownForStreaming(nextRaw, true)
          setMarkdown(safe)
          streamBufRef.current = ''
        }
      }
      for (; ;) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let idx
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const chunk = buf.slice(0, idx)
          buf = buf.slice(idx + 2)
          const dataLine = chunk.split('\n').find((l) => l.startsWith('data: '))
          if (!dataLine) continue
          const payload = JSON.parse(dataLine.slice(6))
          if (payload.type === 'text') {
            streamBufRef.current += payload.text
            scheduleFlush()
          } else if (payload.type === 'tool') {
            console.log(`[tool] ${payload.name}`)
          } else if (payload.type === 'error') {
            console.error(payload.message)
          } else if (payload.type === 'done') {
            // force re-render if empty
            flushNow()
            setMarkdown((m) => m || '')
          }
        }
      }
    } catch (e: any) {
      console.error(e?.message || String(e))
    } finally {
      setIsLoading(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  // Auto-scroll the surface to bottom whenever content grows
  useEffect(() => {
    const el = surfaceRef.current
    if (!el) return
    // allow DOM to paint
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [markdown, isLoading])

  const mdComponents: any = {
    h1: (p: any) => <h1 className="md-h1" {...p} />,
    h2: (p: any) => <h2 className="md-h2" {...p} />,
    h3: (p: any) => <h3 className="md-h3" {...p} />,
    p: (p: any) => <p className="md-p" {...p} />,
    a: (p: any) => <a className="md-link" {...p} />,
    ul: (p: any) => <ul className="md-ul" {...p} />,
    ol: (p: any) => <ol className="md-ol" {...p} />,
    li: (p: any) => <li className="md-li" {...p} />,
    blockquote: (p: any) => <blockquote className="md-quote" {...p} />,
    code: ({ inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '')
      const codeString = String(children).replace(/\n$/, '')
    if (!inline && match && match[1] === 'mermaid') {
        return <div className="md-mermaid">Rendered in Charts panel ▶</div>
      }
      if (!inline && match) {
        return (
          <div className="md-code-block-wrapper">
            <div className="md-code-header">
              <span className="md-code-lang">{match[1]}</span>
              {(match[1] === 'js' || match[1] === 'javascript' || match[1] === 'html' || match[1] === 'python' || match[1] === 'py') && (
                <button
                  className="md-code-run"
                  onClick={() => {
                    setRunLang(match![1])
                    setRunCode(codeString)
                    setRunOpen(true)
                  }}
                  aria-label="Run in WebContainer"
                  title="Run in WebContainer"
                >
                  Run ▶
                </button>
              )}
            </div>
            <SyntaxHighlighter language={match[1]} style={oneDark} PreTag="div" customStyle={{ margin: 0, background: 'transparent' }}>
              {codeString}
            </SyntaxHighlighter>
            {(match[1] === 'js' || match[1] === 'javascript' || match[1] === 'html' || match[1] === 'python' || match[1] === 'py') && (
              <div className="md-code-footer">
                <button
                  className="md-code-run"
                  onClick={() => {
                    setRunLang(match![1])
                    setRunCode(codeString)
                    setRunOpen(true)
                  }}
                  aria-label="Run in WebContainer"
                  title="Run in WebContainer"
                >
                  Run ▶
                </button>
              </div>
            )}
          </div>
        )
      }
      return <code className="md-code-inline" {...props}>{children}</code>
    },
    table: (p: any) => <div className="md-table-wrapper"><table className="md-table" {...p} /></div>,
    th: (p: any) => <th className="md-th" {...p} />,
    td: (p: any) => <td className="md-td" {...p} />,
    tr: (p: any) => <tr className="md-tr" {...p} />,
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__title">Thermodynamic</div>
        <div className="header__actions">
          <button className="icon-btn" aria-label="WebContainers" onClick={() => setChartsOpen((v) => !v)}>
            <Box size={16} />
          </button>
          <button className="icon-btn" aria-label="Settings" onClick={() => setDrawerOpen(true)}>⚙️</button>
        </div>
      </header>

      <div className="ticker" role="status" aria-live="polite">
        <div className="ticker__content">
          {logs.map((l, i) => (
            <span key={i} className={l.level === 'error' ? 'log log--error' : l.level === 'warn' ? 'log log--warn' : 'log'}>
              {l.text}{i < logs.length - 1 ? '   •   ' : ''}
            </span>
          ))}
        </div>
      </div>

      <main className="surface" ref={surfaceRef}>
        {markdown ? (
          <div className="prose">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={mdComponents}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="placeholder">Enter a query to begin.</div>
        )}
      </main>

      <footer className="composer">
        <textarea
          ref={taRef}
          className="composer__input"
          placeholder={isLoading ? 'Working…' : 'Message'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
        />
        <button className="composer__icon" aria-label="Send" disabled={!canSend} onClick={onSend}>
          <Send size={18} />
        </button>
        <button
          className={`composer__icon ${micOn ? 'composer__icon--recording' : ''}`}
          aria-label="Microphone"
          onClick={() => setMicOn((s) => !s)}
        >
          <Mic size={18} />
        </button>
      </footer>

      {/* Settings Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              className="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            >
              <div className="drawer__header">
                <div className="drawer__title">Settings</div>
                <button className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label="Close">✕</button>
              </div>
              <div className="drawer__body">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <div className="app__title">System Prompt</div>
                  {saving ? <span style={{ color: '#9ca3af', fontSize: 12 }}>Saving…</span> : null}
                </div>
                <textarea
                  className="textarea"
                  value={systemPrompt}
                  onChange={(e) => {
                    const next = e.target.value
                    setSystemPrompt(next)
                    // debounce-save
                    clearTimeout((saveSystemPrompt as any)._t)
                    ;(saveSystemPrompt as any)._t = setTimeout(() => saveSystemPrompt(next), 400)
                  }}
                  placeholder="Enter system prompt…"
                />
              </div>
              <div className="drawer__footer">
                <div style={{ color: '#6b7280', fontSize: 12 }}>Persistent between sessions</div>
                <button className="btn btn--outline" onClick={() => setDrawerOpen(false)}>Close</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Charts Drawer */}
      <ChartsDrawer open={chartsOpen} onClose={() => setChartsOpen(false)} code={chartsCode} />
      <CodeRunDrawer open={runOpen} onClose={() => setRunOpen(false)} code={runCode} language={runLang} />
    </div>
  )
}

function stabilizeMarkdownForStreaming(raw: string, isFinal: boolean): string {
  let out = raw
  // Balance fenced code blocks ```
  const fenceMatches = out.match(/(^|\n)```/g)
  if (fenceMatches && fenceMatches.length % 2 === 1 && !isFinal) {
    out += '\n```'
  }
  // Balance inline code backticks ` (ignore escaped \`)
  const inlineMatches = out.match(/(?<!\\)`/g)
  if (inlineMatches && inlineMatches.length % 2 === 1 && !isFinal) {
    out += '`'
  }
  return out
}

function limit<T>(arr: T[], n = 30) { return arr.length > n ? arr.slice(arr.length - n) : arr }
function join(args: unknown[]) { return args.map((a) => (typeof a === 'string' ? a : safe(JSON.stringify(a)))).join(' ') }
function safe(s: string) { try { return s } catch { return '[unserializable]' } }

function extractLatestMermaid(md: string): string | null {
  if (!md) return null
  const re = /```mermaid\n([\s\S]*?)\n```/g
  let match: RegExpExecArray | null
  let last: string | null = null
  while ((match = re.exec(md)) !== null) {
    last = match[1]
  }
  return last
}
