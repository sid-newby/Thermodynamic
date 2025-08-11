// Runnable code detection extracted from App.tsx

export type RunnableDetection = { lang: string; code: string } | null

export function scanLatestRunnableCode(md: string): RunnableDetection {
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
      let code = buf.join('\n')
      // Strip any obvious non-HTML prologue lines when language is html
      if (lang === 'html') {
        const ls = code.split(/\r?\n/)
        let i = 0
        while (i < ls.length && !/^\s*</.test(ls[i] || '')) i++
        code = ls.slice(i).join('\n')
      }
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


