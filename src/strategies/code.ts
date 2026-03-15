import type { Chunk, Tokenizer } from '../types.js'

/**
 * Code-aware chunking.
 * Splits source code respecting function/class/block boundaries.
 * Attempts to keep complete functions, classes, and methods together.
 */
export function chunkCode(text: string, maxSize: number, overlap: number, tokenizer?: Tokenizer): Chunk[] {
  if (text.length === 0) return []
  if (maxSize <= 0) throw new Error('maxSize must be positive')
  if (overlap >= maxSize) throw new Error('overlap must be less than maxSize')

  const measure = tokenizer ? (t: string) => tokenizer.count(t) : (t: string) => t.length
  const language = detectLanguage(text)
  const blocks = splitByBlocks(text, language)
  const merged = mergeBlocks(blocks, maxSize, measure)
  return buildChunks(text, merged, overlap, maxSize, measure, tokenizer, language)
}

type Language = 'javascript' | 'python' | 'go' | 'generic'

function detectLanguage(text: string): Language {
  const lines = text.split('\n').slice(0, 20).join('\n')

  if (/\bdef\s+\w+\s*\(/.test(lines) || /^import\s+\w+$/m.test(lines) || /^from\s+\w+\s+import/.test(lines)) {
    return 'python'
  }
  if (/\bfunc\s+\w+\s*\(/.test(lines) || /^package\s+\w+$/m.test(lines)) {
    return 'go'
  }
  if (/\b(function|const|let|var|import|export|class)\b/.test(lines)) {
    return 'javascript'
  }
  return 'generic'
}

interface CodeBlock {
  content: string
  type: 'declaration' | 'block' | 'line'
}

/**
 * Split code into logical blocks based on language patterns.
 */
function splitByBlocks(text: string, language: Language): CodeBlock[] {
  const lines = text.split('\n')
  const blocks: CodeBlock[] = []
  let current: string[] = []
  let braceDepth = 0
  let indentBlock = false

  const isBlockStart = (line: string): boolean => {
    switch (language) {
      case 'javascript':
        return /^\s*(export\s+)?(async\s+)?(function|class|const|let|interface|type|enum)\b/.test(line) ||
               /^\s*(export\s+)?default\s/.test(line)
      case 'python':
        return /^\s*(def|class|async\s+def)\b/.test(line)
      case 'go':
        return /^(func|type|var|const)\b/.test(line)
      default:
        return /^\s*(function|class|def|func|sub|proc)\b/.test(line)
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (language === 'python') {
      // Python: track indentation-based blocks
      if (isBlockStart(line) && current.length > 0 && !indentBlock) {
        blocks.push({ content: current.join('\n'), type: 'block' })
        current = [line]
        indentBlock = true
      } else if (indentBlock && line.trim() !== '' && !/^\s/.test(line) && !isBlockStart(line)) {
        // End of indented block
        blocks.push({ content: current.join('\n'), type: 'declaration' })
        current = [line]
        indentBlock = false
      } else if (isBlockStart(line) && current.length > 0 && indentBlock && !/^\s/.test(line)) {
        blocks.push({ content: current.join('\n'), type: 'declaration' })
        current = [line]
        indentBlock = true
      } else {
        current.push(line)
      }
    } else {
      // Brace-based languages (JS, Go, etc.)
      if (isBlockStart(line) && braceDepth === 0 && current.length > 0) {
        const content = current.join('\n').trim()
        if (content) {
          blocks.push({ content: current.join('\n'), type: 'block' })
        }
        current = [line]
      } else {
        current.push(line)
      }

      // Track brace depth
      for (const ch of line) {
        if (ch === '{') braceDepth++
        if (ch === '}') braceDepth = Math.max(0, braceDepth - 1)
      }

      // End of top-level block
      if (braceDepth === 0 && current.length > 0 && line.includes('}')) {
        blocks.push({ content: current.join('\n'), type: 'declaration' })
        current = []
      }
    }
  }

  if (current.length > 0) {
    const content = current.join('\n').trim()
    if (content) {
      blocks.push({ content: current.join('\n'), type: 'block' })
    }
  }

  return blocks.filter(b => b.content.trim().length > 0)
}

function mergeBlocks(blocks: CodeBlock[], maxSize: number, measure: (t: string) => number): CodeBlock[] {
  if (blocks.length === 0) return []

  const result: CodeBlock[] = []
  let current = blocks[0]

  for (let i = 1; i < blocks.length; i++) {
    const candidate = current.content + '\n\n' + blocks[i].content
    if (measure(candidate) <= maxSize) {
      current = { content: candidate, type: blocks[i].type }
    } else {
      result.push(current)
      current = blocks[i]
    }
  }
  result.push(current)

  return result
}

function buildChunks(
  original: string,
  blocks: CodeBlock[],
  overlap: number,
  maxSize: number,
  measure: (t: string) => number,
  tokenizer: Tokenizer | undefined,
  language: Language,
): Chunk[] {
  const chunks: Chunk[] = []
  let searchFrom = 0

  for (let i = 0; i < blocks.length; i++) {
    const content = blocks[i].content

    // Force-split oversized blocks
    if (measure(content) > maxSize) {
      const lines = content.split('\n')
      let current = ''
      for (const line of lines) {
        const candidate = current ? current + '\n' + line : line
        if (measure(candidate) > maxSize && current) {
          const pos = original.indexOf(current, searchFrom)
          const start = pos >= 0 ? pos : searchFrom
          chunks.push({
            content: current,
            index: chunks.length,
            start,
            end: start + current.length,
            length: current.length,
            metadata: { language },
          })
          searchFrom = start + current.length
          current = line
        } else {
          current = candidate
        }
      }
      if (current) {
        const pos = original.indexOf(current, searchFrom)
        const start = pos >= 0 ? pos : searchFrom
        chunks.push({
          content: current,
          index: chunks.length,
          start,
          end: start + current.length,
          length: current.length,
          metadata: { language },
        })
        searchFrom = start + current.length
      }
      continue
    }

    const pos = original.indexOf(content, searchFrom)
    const start = pos >= 0 ? pos : searchFrom

    chunks.push({
      content,
      index: chunks.length,
      start,
      end: start + content.length,
      length: content.length,
      metadata: { language },
    })

    searchFrom = start + content.length
  }

  // Apply overlap
  if (overlap > 0 && chunks.length > 1) {
    for (let i = 1; i < chunks.length; i++) {
      const prev = chunks[i - 1]
      const overlapText = prev.content.slice(-overlap)
      let content = overlapText + chunks[i].content

      if (measure(content) > maxSize) {
        content = tokenizer ? tokenizer.truncate(content, maxSize) : content.slice(0, maxSize)
      }

      chunks[i] = {
        ...chunks[i],
        content,
        length: content.length,
      }
    }
  }

  return chunks
}
