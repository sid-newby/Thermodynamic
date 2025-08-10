/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState } from 'react'

type UseMicStreamingOptions = {
  getDeepgramKey: () => Promise<string>
  onDisplayChange: (value: string) => void
  onSendHotword: (cleaned: string) => void
  getBaselineInput?: () => string
}

type UseMicStreamingReturn = {
  micOn: boolean
  toggleMic: () => Promise<void>
  stopMic: () => void
}

function hasSendHotword(text: string): boolean {
  const t = text.toLowerCase()
  return /\b(send\s*it|send-it)\b/.test(t)
}

function suppressCommandPhrases(text: string): string {
  return text.replace(/\b(send\s*it|send-it)\b/gi, '').replace(/\b(send)\b\s*$/i, '')
}

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
      if (typeof MediaRecorder !== 'undefined' && (MediaRecorder as any).isTypeSupported?.(m)) return m
    } catch {
      // ignore
    }
  }
  return ''
}

export function useMicStreaming(opts: UseMicStreamingOptions): UseMicStreamingReturn {
  const [micOn, setMicOn] = useState(false)
  const micStreamRef = useRef<MediaStream | null>(null)
  const micRecorderRef = useRef<MediaRecorder | null>(null)
  const dgSocketRef = useRef<WebSocket | null>(null)
  const micBaseInputRef = useRef<string>('')
  const micCommittedRef = useRef<string>('')
  const micInterimRef = useRef<string>('')

  function stopMic(): void {
    try { micRecorderRef.current?.stop() } catch { /* ignore */ }
    micRecorderRef.current = null
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null
    }
    try {
      if (dgSocketRef.current && dgSocketRef.current.readyState === WebSocket.OPEN) {
        try { dgSocketRef.current.send(JSON.stringify({ type: 'CloseStream' })) } catch { /* ignore */ }
      }
      dgSocketRef.current?.close()
    } catch { /* ignore */ }
    dgSocketRef.current = null
  }

  async function toggleMic(): Promise<void> {
    if (micOn) {
      stopMic()
      setMicOn(false)
      return
    }
    try {
      const key = await opts.getDeepgramKey()
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
      const socket = new WebSocket(wsUrl, ['token', key] as unknown as string)
      dgSocketRef.current = socket
      socket.binaryType = 'arraybuffer'
      socket.onopen = () => {
        micBaseInputRef.current = opts.getBaselineInput ? (opts.getBaselineInput() || '') : ''
        micCommittedRef.current = ''
        micInterimRef.current = ''
        const mime = chooseOpusMime()
        const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 128000 })
        micRecorderRef.current = rec
        rec.ondataavailable = (e) => {
          const data = e.data
          if (data && data.size > 0 && socket.readyState === WebSocket.OPEN) {
            data.arrayBuffer().then((buf) => {
              socket.send(buf)
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
          const transcript: string | undefined = msg?.channel?.alternatives?.[0]?.transcript
          const isFinal: boolean = Boolean(msg?.is_final ?? msg?.speech_finalized)
          if (!transcript) return
          if (isFinal) {
            micCommittedRef.current = micCommittedRef.current
              ? micCommittedRef.current + ' ' + transcript
              : transcript
            micInterimRef.current = ''
          } else {
            micInterimRef.current = transcript
          }
          const join = (a: string, b: string) => {
            const sa = (a || '').trim(); const sb = (b || '').trim();
            if (!sa) return sb; if (!sb) return sa; return sa + ' ' + sb
          }
          let display = join(join(micBaseInputRef.current || '', micCommittedRef.current), micInterimRef.current)
          display = suppressCommandPhrases(display)
          if (!isFinal) display = suppressDanglingSendAtEnd(display)
          if (hasSendHotword(display)) {
            const cleaned = display.trim()
            queueMicrotask(() => opts.onSendHotword(cleaned))
            micBaseInputRef.current = ''
            micCommittedRef.current = ''
            micInterimRef.current = ''
            opts.onDisplayChange('')
          } else {
            opts.onDisplayChange(display)
          }
        } catch {
          // ignore non-JSON or interim messages
        }
      }
      socket.onclose = () => {
        stopMic()
        setMicOn(false)
      }
      socket.onerror = () => {
        stopMic()
        setMicOn(false)
      }
    } catch (e) {
      console.error('mic error', (e as any)?.message || String(e))
      stopMic()
      setMicOn(false)
    }
  }

  return { micOn, toggleMic, stopMic }
}