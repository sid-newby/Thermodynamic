// Markdown streaming helpers extracted from App.tsx

export function stabilizeMarkdownForStreaming(raw: string, isFinal: boolean): string {
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
export function hardCloseDanglingFences(md: string): string {
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

export function stripTrailingFence(md: string): string {
  if (!md) return md
  // Remove any trailing sequence of backticks at end or on the last line
  return md.replace(/(```+\s*)+$/m, '').replace(/\n```+\s*$/m, '')
}


