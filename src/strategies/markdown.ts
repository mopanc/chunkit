import type { Chunk, Tokenizer } from '../types.js'

/**
 * Markdown-aware chunking.
 * Splits on heading boundaries (## and above) first, then on paragraphs.
 * Preserves code blocks intact when possible.
 * Attaches heading hierarchy as metadata.
 */
export function chunkMarkdown(text: string, maxSize: number, overlap: number, tokenizer?: Tokenizer): Chunk[] {
  if (text.length === 0) return []
  if (maxSize <= 0) throw new Error('maxSize must be positive')
  if (overlap >= maxSize) throw new Error('overlap must be less than maxSize')

  const measure = tokenizer ? (t: string) => tokenizer.count(t) : (t: string) => t.length

  const sections = splitBySections(text)
  const rawChunks = fitToSize(sections, maxSize, measure)
  const chunks = buildChunks(text, rawChunks.map(s => s.content), overlap, maxSize, measure, tokenizer)

  // Attach heading metadata
  for (let i = 0; i < chunks.length; i++) {
    if (i < rawChunks.length && rawChunks[i].headings.length > 0) {
      chunks[i].metadata = { ...chunks[i].metadata, headings: rawChunks[i].headings }
    }
  }

  return chunks
}

interface Section {
  content: string
  headings: string[]
}

function splitBySections(text: string): Section[] {
  const lines = text.split('\n')
  const sections: Section[] = []
  let current: string[] = []
  let headings: string[] = []

  for (const line of lines) {
    if (/^#{1,3}\s/.test(line) && current.length > 0) {
      sections.push({ content: current.join('\n'), headings: [...headings] })
      current = [line]
      // Update heading stack
      const level = line.match(/^(#{1,3})\s/)
      if (level) {
        const depth = level[1].length
        headings = headings.filter(h => {
          const hMatch = h.match(/^(#{1,3})\s/)
          return hMatch ? hMatch[1].length < depth : false
        })
        headings.push(line.trim())
      }
    } else {
      if (/^#{1,3}\s/.test(line)) {
        const level = line.match(/^(#{1,3})\s/)
        if (level) {
          const depth = level[1].length
          headings = headings.filter(h => {
            const hMatch = h.match(/^(#{1,3})\s/)
            return hMatch ? hMatch[1].length < depth : false
          })
          headings.push(line.trim())
        }
      }
      current.push(line)
    }
  }

  if (current.length > 0) {
    sections.push({ content: current.join('\n'), headings: [...headings] })
  }

  return sections
}

function fitToSize(sections: Section[], maxSize: number, measure: (t: string) => number): Section[] {
  const result: Section[] = []

  for (const section of sections) {
    if (measure(section.content) <= maxSize) {
      result.push(section)
      continue
    }

    const paragraphs = splitByParagraphs(section.content)
    let current = ''

    for (const para of paragraphs) {
      if (measure(para) > maxSize) {
        if (current) {
          result.push({ content: current, headings: section.headings })
          current = ''
        }
        for (let i = 0; i < para.length; i += maxSize) {
          result.push({ content: para.slice(i, i + maxSize), headings: section.headings })
        }
        continue
      }

      const candidate = current ? current + '\n\n' + para : para

      if (measure(candidate) <= maxSize) {
        current = candidate
      } else {
        if (current) result.push({ content: current, headings: section.headings })
        current = para
      }
    }

    if (current) result.push({ content: current, headings: section.headings })
  }

  return result
}

function splitByParagraphs(text: string): string[] {
  const blocks: string[] = []
  const lines = text.split('\n')
  let current: string[] = []
  let inCodeBlock = false

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      current.push(line)
      continue
    }

    if (inCodeBlock) {
      current.push(line)
      continue
    }

    if (line.trim() === '' && current.length > 0) {
      blocks.push(current.join('\n'))
      current = []
    } else {
      current.push(line)
    }
  }

  if (current.length > 0) {
    blocks.push(current.join('\n'))
  }

  return blocks
}

function buildChunks(
  original: string,
  rawChunks: string[],
  overlap: number,
  maxSize: number,
  measure: (t: string) => number,
  tokenizer?: Tokenizer,
): Chunk[] {
  const result: Chunk[] = []
  let searchFrom = 0

  for (let i = 0; i < rawChunks.length; i++) {
    const content = rawChunks[i]
    const pos = original.indexOf(content, searchFrom)
    const start = pos >= 0 ? pos : searchFrom

    result.push({
      content,
      index: i,
      start,
      end: start + content.length,
      length: content.length,
    })

    searchFrom = start + content.length
  }

  if (overlap > 0 && result.length > 1) {
    for (let i = 1; i < result.length; i++) {
      const overlapStart = Math.max(result[i].start - overlap, result[i - 1].start)
      const prefix = original.slice(overlapStart, result[i].start)
      let content = prefix + result[i].content

      if (measure(content) > maxSize) {
        content = tokenizer ? tokenizer.truncate(content, maxSize) : content.slice(0, maxSize)
      }

      result[i] = {
        ...result[i],
        content,
        start: overlapStart,
        end: overlapStart + content.length,
        length: content.length,
      }
    }
  }

  return result
}
