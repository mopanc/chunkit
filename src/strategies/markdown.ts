import type { Chunk } from '../types.js'

/**
 * Markdown-aware chunking.
 * Splits on heading boundaries (## and above) first, then on paragraphs.
 * Preserves code blocks intact when possible.
 */
export function chunkMarkdown(text: string, maxSize: number, overlap: number): Chunk[] {
  if (text.length === 0) return []
  if (maxSize <= 0) throw new Error('maxSize must be positive')
  if (overlap >= maxSize) throw new Error('overlap must be less than maxSize')

  const sections = splitBySections(text)
  const rawChunks = fitToSize(sections, maxSize)
  return buildChunks(text, rawChunks, overlap, maxSize)
}

/**
 * Split markdown into sections by headings (# to ###).
 * Each section includes its heading.
 */
function splitBySections(text: string): string[] {
  const lines = text.split('\n')
  const sections: string[] = []
  let current: string[] = []

  for (const line of lines) {
    if (/^#{1,3}\s/.test(line) && current.length > 0) {
      sections.push(current.join('\n'))
      current = [line]
    } else {
      current.push(line)
    }
  }

  if (current.length > 0) {
    sections.push(current.join('\n'))
  }

  return sections
}

/**
 * Fit sections into chunks that respect maxSize.
 * Large sections are split further by paragraphs, then by code blocks.
 */
function fitToSize(sections: string[], maxSize: number): string[] {
  const result: string[] = []

  for (const section of sections) {
    if (section.length <= maxSize) {
      result.push(section)
      continue
    }

    // Split large sections by paragraphs
    const paragraphs = splitByParagraphs(section)
    let current = ''

    for (const para of paragraphs) {
      if (para.length > maxSize) {
        // Push accumulated content
        if (current) {
          result.push(current)
          current = ''
        }
        // Force-split oversized paragraph
        for (let i = 0; i < para.length; i += maxSize) {
          result.push(para.slice(i, i + maxSize))
        }
        continue
      }

      const candidate = current ? current + '\n\n' + para : para

      if (candidate.length <= maxSize) {
        current = candidate
      } else {
        if (current) result.push(current)
        current = para
      }
    }

    if (current) result.push(current)
  }

  return result
}

/**
 * Split text by paragraph breaks, keeping code blocks intact.
 */
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

function buildChunks(original: string, rawChunks: string[], overlap: number, maxSize: number): Chunk[] {
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

  // Apply overlap
  if (overlap > 0 && result.length > 1) {
    for (let i = 1; i < result.length; i++) {
      const overlapStart = Math.max(result[i].start - overlap, result[i - 1].start)
      const prefix = original.slice(overlapStart, result[i].start)
      let content = prefix + result[i].content

      if (content.length > maxSize) {
        content = content.slice(0, maxSize)
      }

      result[i] = {
        content,
        index: i,
        start: overlapStart,
        end: overlapStart + content.length,
        length: content.length,
      }
    }
  }

  return result
}
