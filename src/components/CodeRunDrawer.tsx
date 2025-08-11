import { useEffect, useRef, useState } from 'react'
import { getServerUrl } from '../wc'
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
  const [booting] = useState(false)
  const [error] = useState<string | null>(null)
  const latestCodeRef = useRef<string>('')
  latestCodeRef.current = code

  // Intentionally unused: container lifecycle is external; keep variable removed to avoid lints

  // removed internal boot logic; container lifecycle is external

  // Do not boot on open; just attach to existing server if present
  useEffect(() => {
    if (!open) return
    let stop = false
    const tryAttach = async () => {
      for (let i = 0; i < 50 && !stop; i++) {
        const url = getServerUrl()
        if (url) {
          setIframeUrl(urlWithBust(url + '/run'))
          return
        }
        await new Promise((r) => setTimeout(r, 100))
      }
    }
    void tryAttach()
    return () => { stop = true }
  }, [open])

  // Sync code changes
  useEffect(() => {
    if (!open) return
    const url = getServerUrl()
    if (url) setIframeUrl(urlWithBust(url + '/run'))
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

// Write helpers are centralized in src/wc.ts

function urlWithBust(url: string): string {
  const u = new URL(url)
  u.searchParams.set('t', String(Date.now()))
  return u.toString()
}

// Templates and helpers removed; they live in src/wc.ts

export default CodeRunDrawer
