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
import MermaidDrawer from './components/MermaidDrawer'
import CodeRunDrawer from './components/CodeRunDrawer'
import { bootWC, writeRunSnippet } from './wc'

type LogItem = { level: 'log' | 'warn' | 'error'; text: string };
type ChatRole = 'user' | 'assistant'
type ChatMessage = { role: ChatRole; content: string }

export default function App() {
  const [input, setInput] = useState('')
  const [markdown, setMarkdown] = useState('')
  type ChatMsg = { role: 'user'|'assistant'; text: string }
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const micStreamRef = useRef<MediaStream | null>(null)
  const micRecorderRef = useRef<MediaRecorder | null>(null)
  const dgSocketRef = useRef<WebSocket | null>(null)
  const micBaseInputRef = useRef<string>('')
  const micCommittedRef = useRef<string>('')
  const micInterimRef = useRef<string>('')
  const [logs, setLogs] = useState<LogItem[]>([{ level: 'log', text: 'idle' }])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [chartsState, setChartsState] = useState({ open: false, code: '' })
  const [runState, setRunState] = useState({ open: false, code: '', language: '' })
  const [systemPrompt, setSystemPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const [mermaidVars, setMermaidVars] = useState<string>('')
  const [mermaidCss, setMermaidCss] = useState<string>('')
  const [history, setHistory] = useState<ChatMessage[]>([])
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
  // Auto-open drawers and stream code to singleton WebContainers when a fully closed fenced block appears in the latest assistant message.
  const lastCodeSigRef = useRef<string>('')
  useEffect(() => {
    if (!messages.length) return
    // Find the most recent message (user or assistant) with a closed fenced block
    for (let i = messages.length - 1; i >= 0; i--) {
      const text = messages[i]?.text
      if (!text) continue
      const latest = scanLatestRunnableCode(text)
      if (!latest) continue
      const sig = `${latest.lang}\n${latest.code}`
      if (sig === lastCodeSigRef.current) return
      lastCodeSigRef.current = sig
      // Send code to the appropriate container (booting if needed) and open the matching drawer
      if (latest.lang === 'mermaid') {
        setChartsState({ open: true, code: latest.code })
      } else {
        void writeRunSnippet(latest.lang, latest.code)
        setRunState({ open: true, code: latest.code, language: latest.lang })
      }
      return
    }
  }, [messages])

  // (old regex-based detector removed)

  useEffect(() => { autoResize() }, [input])
  useEffect(() => { autoResize() }, [])
  // Boot the shared container ASAP so routes are ready before any drawer opens
  useEffect(() => {
    void bootWC()
  }, [])
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
        // Load mermaid theme
        const tRes = await fetch('/api/mermaid-theme')
        if (tRes.ok) {
          const t = await tRes.json()
          setMermaidVars(JSON.stringify(t?.variables || {}, null, 2))
          setMermaidCss(String(t?.css || ''))
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

  async function saveMermaidTheme(nextVars: string, nextCss: string) {
    try {
      const parsed = nextVars.trim() ? JSON.parse(nextVars) : {}
      await fetch('/api/mermaid-theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: parsed, css: nextCss || '' }),
      })
    } catch (e) {
      console.error('failed to save mermaid theme', (e as any)?.message || String(e))
    }
  }

  // close drawer on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setDrawerOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function onSend(forcedText?: string) {
  // Before starting a new turn, strip any trailing fence ticks from the end of the accumulated buffer
  if (rawMdRef.current) {
    const stripped = stripTrailingFence(rawMdRef.current)
    if (stripped !== rawMdRef.current) {
      rawMdRef.current = stripped
      setMarkdown(stabilizeMarkdownForStreaming(stripped, true))
    }
  }
    const textToSend = forcedText ?? input
    if (textToSend.trim().length === 0 || isLoading) return
    setIsLoading(true)
    // Keep mic running for continuous capture
    const userText = textToSend
    const updatedHistory: ChatMessage[] = [...history, { role: 'user', content: userText }]
    setHistory(updatedHistory)
    // Echo the user's message into the main pane before streaming
    // Add a blank line after the assistant header so streamed text starts as a paragraph
    {
      const safeUser = stripTrailingFence(userText)
      setMessages((prev) => [...prev, { role: 'user', text: safeUser }])
    }
    try {
      console.log('[send]', userText)
      const recentHistory = updatedHistory.slice(-10)
      const res = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userText, history: recentHistory }),
      })
      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      setInput('')
      let assistantText = ''
      // Start a new assistant message entry for this turn
      setMessages((prev) => [...prev, { role: 'assistant', text: '' }])
      const scheduleFlush = () => {
        if (flushTimerRef.current != null) return
        flushTimerRef.current = window.setTimeout(() => {
          if (streamBufRef.current) {
            // Append streamed chunk into the last assistant message only
            const chunk = streamBufRef.current
            setMessages((prev) => {
              const next = prev.slice()
              const idx = next.length - 1
              if (idx >= 0 && next[idx]?.role === 'assistant') {
                next[idx] = { role: 'assistant', text: next[idx].text + chunk }
              }
              return next
            })
            streamBufRef.current = ''
          }
          flushTimerRef.current = null
        }, 32)
      }
      const flushNow = () => {
        if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null }
        if (streamBufRef.current) {
          const chunk = streamBufRef.current
          setMessages((prev) => {
            const next = prev.slice()
            const idx = next.length - 1
            if (idx >= 0 && next[idx]?.role === 'assistant') {
              next[idx] = { role: 'assistant', text: next[idx].text + chunk }
            }
            return next
          })
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
            assistantText += payload.text
            scheduleFlush()
          } else if (payload.type === 'tool') {
            console.log(`[tool] ${payload.name}`)
          } else if (payload.type === 'error') {
            console.error(payload.message)
          } else if (payload.type === 'done') {
            flushNow()
            // Close any dangling fences inside the last assistant message only
            setMessages((prev) => {
              const next = prev.slice()
              const idx = next.length - 1
              if (idx >= 0 && next[idx]?.role === 'assistant') {
                next[idx] = { role: 'assistant', text: hardCloseDanglingFences(next[idx].text) }
              }
              return next
            })
            if (assistantText.trim()) {
              setHistory((h) => [...h, { role: 'assistant', content: assistantText }])
            }
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

  async function toggleMic() {
    if (micOn) {
      stopMic()
      setMicOn(false)
      return
    }
    try {
      const keyRes = await fetch('/api/deepgram-token')
      const { key } = await keyRes.json()
      if (!key) throw new Error('Missing Deepgram key')
      console.log('[mic] requesting user media')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { ideal: 1 },
          noiseSuppression: { ideal: true },
          echoCancellation: { ideal: true },
          autoGainControl: { ideal: true },
          sampleRate: { ideal: 48000 },
        },
      })
      micStreamRef.current = stream
      const qs = new URLSearchParams({
        model: 'nova-3',
        encoding: 'opus',
        interim_results: 'true',
        smart_format: 'true',
        punctuate: 'true',
        vad_events: 'true',
        channels: '1',
        language: 'en-US',
      })
      const wsUrl = `wss://api.deepgram.com/v1/listen?${qs.toString()}`
      console.log('[mic] opening ws', wsUrl)
      const socket = new WebSocket(wsUrl, ['token', key] as unknown as string)
      dgSocketRef.current = socket
      socket.binaryType = 'arraybuffer'
      socket.onopen = () => {
        // Capture baseline input at mic start
        micBaseInputRef.current = input
        micCommittedRef.current = ''
        micInterimRef.current = ''
        const mime = chooseOpusMime()
        console.log('[mic] ws open; starting recorder with', mime)
        const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 128000 })
        micRecorderRef.current = rec
        rec.ondataavailable = (e) => {
          const data = e.data
          if (data && data.size > 0 && socket.readyState === WebSocket.OPEN) {
            data.arrayBuffer().then((buf) => {
              socket.send(buf)
              console.log('[mic] sent chunk', (buf as ArrayBuffer).byteLength, 'bytes')
            })
          }
        }
        rec.start(100)
        setMicOn(true)
      }
      socket.onmessage = (ev) => {
        try {
          const raw = typeof ev.data === 'string' ? ev.data : ''
          if (!raw) return
          const msg = JSON.parse(raw)
          console.log('[mic] msg', msg?.type || 'Results')
          // Deepgram typically sends { type: 'Results', channel: { alternatives: [{ transcript, words, ... }] }, is_final }
          const transcript: string | undefined = msg?.channel?.alternatives?.[0]?.transcript
          const isFinal: boolean = Boolean(msg?.is_final ?? msg?.speech_finalized)
          if (!transcript) return
          console.log('[mic] recv', { len: transcript.length, isFinal })
          // Maintain committed (final) + interim (non-final) buffers
          if (isFinal) {
            micCommittedRef.current = micCommittedRef.current
              ? micCommittedRef.current + ' ' + transcript
              : transcript
            micInterimRef.current = ''
          } else {
            micInterimRef.current = transcript
          }
          // Compose display: baseline + committed + interim
          const join = (a: string, b: string) => {
            const sa = (a || '').trim(); const sb = (b || '').trim();
            if (!sa) return sb; if (!sb) return sa; return sa + ' ' + sb
          }
          let display = join(join(micBaseInputRef.current || '', micCommittedRef.current), micInterimRef.current)
          display = suppressCommandPhrases(display)
          if (!isFinal) display = suppressDanglingSendAtEnd(display)
          if (hasSendHotword(display)) {
            const cleaned = display.trim()
            // Send cleaned and reset mic buffers, keep mic running
            queueMicrotask(() => onSend(cleaned))
            micBaseInputRef.current = ''
            micCommittedRef.current = ''
            micInterimRef.current = ''
            setInput('')
          } else {
            setInput(display)
          }
        } catch {
          // ignore non-JSON or interim messages
        }
      }
      socket.onclose = () => {
        console.warn('[mic] ws close')
        stopMic()
        setMicOn(false)
      }
      socket.onerror = (e) => {
        console.error('[mic] ws error', e)
        stopMic()
        setMicOn(false)
      }
    } catch (e) {
      console.error('mic error', (e as any)?.message || String(e))
      stopMic()
      setMicOn(false)
    }
  }

  function stopMic() {
    try { micRecorderRef.current?.stop() } catch {/* ignore */}
    micRecorderRef.current = null
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null
    }
    try {
      if (dgSocketRef.current && dgSocketRef.current.readyState === WebSocket.OPEN) {
        try { dgSocketRef.current.send(JSON.stringify({ type: 'CloseStream' })) } catch {/* ignore */}
      }
      dgSocketRef.current?.close()
    } catch {/* ignore */}
    dgSocketRef.current = null
  }

  function hasSendHotword(text: string): boolean {
    const t = text.toLowerCase()
    return /\b(send\s*it|send-it)\b/.test(t)
  }

  // Note: replaced by suppression helpers; keep for future use if needed

  // Hide command phrases from the visible input (even if we don't trigger send yet)
  function suppressCommandPhrases(text: string): string {
    return text.replace(/\b(send\s*it|send-it)\b/gi, '').replace(/\b(send)\b\s*$/i, '')
  }

  // If interim buffer ends with a dangling 'send' at the end, hide it until finalized
  function suppressDanglingSendAtEnd(text: string): string {
    return text.replace(/\b(send)\b\s*$/i, '')
  }

  function chooseOpusMime(): string {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/webm',
    ]
    for (const m of candidates) {
      try {
        // Some environments may not type this, but it exists at runtime
        if (typeof MediaRecorder !== 'undefined' && (MediaRecorder as any).isTypeSupported?.(m)) return m
      } catch {
        // ignore
      }
    }
    return ''
  }

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
    if (!inline && match) {
        return (
          <div className="md-code-block-wrapper">
            <div className="md-code-header">
              <span className="md-code-lang">{match[1]}</span>
              {(match[1] === 'js' || match[1] === 'javascript' || match[1] === 'html' || match[1] === 'python' || match[1] === 'py' || match[1] === 'perl' || match[1] === 'pl' || match[1] === 'mermaid') && (
                <button
                  className="md-code-run"
                  onClick={() => {
                    const lang = match![1]
                      if (lang === 'mermaid') {
                        setChartsState({ open: true, code: codeString })
                      } else {
                      void writeRunSnippet(lang, codeString)
                      setRunState({ open: true, code: codeString, language: lang })
                    }
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
            {(match[1] === 'js' || match[1] === 'javascript' || match[1] === 'html' || match[1] === 'python' || match[1] === 'py' || match[1] === 'perl' || match[1] === 'pl' || match[1] === 'mermaid') && (
              <div className="md-code-footer">
                <button
                  className="md-code-run"
                  onClick={() => {
                    const lang = match![1]
                     if (lang === 'mermaid') {
                       setChartsState({ open: true, code: codeString })
                     } else {
                      void writeRunSnippet(lang, codeString)
                      setRunState({ open: true, code: codeString, language: lang })
                    }
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
          <button className="icon-btn" aria-label="WebContainers" onClick={() => setRunState((s) => ({ ...s, open: !s.open }))}>
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
        {messages.length ? (
          <div className="prose">
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div className="md-p"><strong>{m.role === 'user' ? 'You' : 'Thermodynamic'}</strong>:</div>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {m.text}
                </ReactMarkdown>
              </div>
            ))}
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
        <button className="composer__icon" aria-label="Send" disabled={!canSend} onClick={() => onSend()}>
          <Send size={18} />
        </button>
        <button
          className={`composer__icon ${micOn ? 'composer__icon--recording' : ''}`}
          aria-label="Microphone"
          onClick={() => toggleMic()}
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
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}>
                  <div className="app__title">Mermaid Theme</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 6 }}>Theme Variables (JSON)</div>
                    <textarea
                      className="textarea"
                      value={mermaidVars}
                      onChange={(e) => setMermaidVars(e.target.value)}
                      placeholder={`{\n  "primaryColor": "#00ffff"\n}`}
                      style={{ minHeight: 160 }}
                    />
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 6 }}>Extra CSS</div>
                    <textarea
                      className="textarea"
                      value={mermaidCss}
                      onChange={(e) => setMermaidCss(e.target.value)}
                      placeholder=".node rect { stroke-width: 3px }"
                      style={{ minHeight: 160 }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn" onClick={() => saveMermaidTheme(mermaidVars, mermaidCss)}>Save Theme</button>
                  <span style={{ color: '#6b7280', fontSize: 12 }}>Re-open Charts to apply.</span>
                </div>
              </div>
              <div className="drawer__footer">
                <div style={{ color: '#6b7280', fontSize: 12 }}>Persistent between sessions</div>
                <button className="btn btn--outline" onClick={() => setDrawerOpen(false)}>Close</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mermaid Drawer (left) */}
      <MermaidDrawer open={chartsState.open} onClose={() => setChartsState({ open: false, code: '' })} code={chartsState.code} themeVarsJson={mermaidVars} themeCss={mermaidCss} />
      <CodeRunDrawer open={runState.open} onClose={() => setRunState({ open: false, code: '', language: '' })} code={runState.code} language={runState.language} />
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

// Aggressively close any dangling fenced code blocks in the provided markdown
function hardCloseDanglingFences(md: string): string {
  if (!md) return md
  // Count fenced code ticks ``` occurrences not preceded by 4 backticks
  const matches = md.match(/(^|\n)```/g)
  if (matches && matches.length % 2 === 1) {
    return md + '\n```\n'
  }
  // Also close inline single backticks if odd count at end of stream
  const inline = md.match(/(?<!\\)`/g)
  if (inline && inline.length % 2 === 1) {
    return md + '`'
  }
  return md
}

function stripTrailingFence(md: string): string {
  if (!md) return md
  // Remove any trailing sequence of backticks at end or on the last line
  return md.replace(/(```+\s*)+$/m, '').replace(/\n```+\s*$/m, '')
}

function limit<T>(arr: T[], n = 30) { return arr.length > n ? arr.slice(arr.length - n) : arr }
function join(args: unknown[]) { return args.map((a) => (typeof a === 'string' ? a : safe(JSON.stringify(a)))).join(' ') }
function safe(s: string) { try { return s } catch { return '[unserializable]' } }

// Scan for the last fully closed fenced code block in the string; returns the language and code
function scanLatestRunnableCode(md: string): { lang: string; code: string } | null {
  if (!md) return null
  const lines = md.split(/\r?\n/)
  let inFence = false
  let lang = ''
  let buf: string[] = []
  let last: { lang: string; code: string } | null = null
  for (const line of lines) {
    const trimmed = line.trimStart()
    if (!inFence && trimmed.startsWith('```')) {
      lang = trimmed.slice(3).trim().toLowerCase()
      inFence = true
      buf = []
      continue
    }
    if (inFence && trimmed.startsWith('```')) {
      const code = buf.join('\n')
      last = { lang: lang || 'js', code }
      inFence = false
      lang = ''
      buf = []
      continue
    }
    if (inFence) buf.push(line)
  }
  if (!last) return null
  const l = last.lang
  if (l === 'mermaid' || l === 'javascript' || l === 'js' || l === 'html' || l === 'python' || l === 'py' || l === 'perl' || l === 'pl') {
    return last
  }
  return null
}

// (removed old regex-based extractor)
