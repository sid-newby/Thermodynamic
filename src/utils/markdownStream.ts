// Markdown streaming helpers rewritten to avoid regex and prefer line scanning

export function stabilizeMarkdownForStreaming(raw: string, isFinal: boolean): string {
  const out = String(raw ?? '')
  if (out.length === 0) return out
  // Count code fences by scanning lines that start with ``` (ignoring indentation)
  const lines = out.split(/\r?\n/)
  let fenceCount = 0
  for (const line of lines) {
    const t = line.trimStart()
    if (t.startsWith('```')) fenceCount++
  }
  // If we have an unmatched opening fence during streaming, temporarily close it
  if (!isFinal && fenceCount % 2 === 1) {
    return out + '\n```'
  }
  return out
}

// Close any dangling fenced code blocks by appending a single closing fence.
// Avoids touching inline backticks entirely.
export function hardCloseDanglingFences(md: string): string {
  const text = String(md ?? '')
  if (text.length === 0) return text
  const lines = text.split(/\r?\n/)
  let fenceCount = 0
  for (const line of lines) {
    const t = line.trimStart()
    if (t.startsWith('```')) fenceCount++
  }
  if (fenceCount % 2 === 1) {
    return text + '\n```\n'
  }
  return text
}

// Remove a trailing final line that is only backticks (```...) at the very end.
export function stripTrailingFence(md: string): string {
  const text = String(md ?? '')
  if (text.length === 0) return text
  const lines = text.split(/\r?\n/)
  let end = lines.length
  while (end > 0) {
    const t = lines[end - 1]?.trim()
    if (t && t.startsWith('```') && t.replace(/`/g, '').length === 0) {
      end--
      continue
    }
    break
  }
  if (end === lines.length) return text
  return lines.slice(0, end).join('\n')
}


