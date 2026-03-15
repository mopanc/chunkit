import type { Chunk, Tokenizer } from '../types.js'

/**
 * HTML-aware chunking.
 * Strips script/style tags, splits on block elements (article, section, div, p, h1-h6, li, tr),
 * preserves readable text content with structural metadata.
 */
export function chunkHtml(text: string, maxSize: number, overlap: number, tokenizer?: Tokenizer): Chunk[] {
  if (text.length === 0) return []
  if (maxSize <= 0) throw new Error('maxSize must be positive')
  if (overlap >= maxSize) throw new Error('overlap must be less than maxSize')

  const measure = tokenizer ? (t: string) => tokenizer.count(t) : (t: string) => t.length

  // Strip scripts, styles, and comments
  const cleaned = text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  const blocks = extractBlocks(cleaned)
  const chunks = mergeBlocks(blocks, maxSize, overlap, text, measure, tokenizer)

  return chunks
}

interface HtmlBlock {
  text: string
  tag: string
}

const BLOCK_PATTERN = /<(article|section|div|main|aside|header|footer|nav|p|h[1-6]|li|tr|td|th|blockquote|pre|ul|ol|table|figure|figcaption|details|summary)[\s>]/gi

/**
 * Extract readable text blocks from HTML, tracking which tag they came from.
 */
function extractBlocks(html: string): HtmlBlock[] {
  const blocks: HtmlBlock[] = []

  // Split by block-level tags
  const parts = html.split(BLOCK_PATTERN)

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    // Check if this part is a tag name (matched by capture group)
    if (/^(article|section|div|main|aside|header|footer|nav|p|h[1-6]|li|tr|td|th|blockquote|pre|ul|ol|table|figure|figcaption|details|summary)$/i.test(part)) {
      continue
    }

    const cleaned = stripTags(part).trim()
    if (!cleaned) continue

    // Try to determine the parent tag
    const prevTag = i > 0 ? parts[i - 1] : ''
    const tag = /^(article|section|div|main|aside|header|footer|nav|p|h[1-6]|li|tr|td|th|blockquote|pre|ul|ol|table|figure|figcaption|details|summary)$/i.test(prevTag)
      ? prevTag.toLowerCase()
      : 'body'

    blocks.push({ text: cleaned, tag })
  }

  // If no blocks found, fall back to stripping all tags
  if (blocks.length === 0) {
    const stripped = stripTags(html).trim()
    if (stripped) {
      blocks.push({ text: stripped, tag: 'body' })
    }
  }

  return blocks
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
}

function mergeBlocks(
  blocks: HtmlBlock[],
  maxSize: number,
  overlap: number,
  original: string,
  measure: (t: string) => number,
  tokenizer?: Tokenizer,
): Chunk[] {
  if (blocks.length === 0) return []

  // Merge small blocks together up to maxSize
  const merged: HtmlBlock[] = []
  let current = blocks[0]

  for (let i = 1; i < blocks.length; i++) {
    const candidate = current.text + '\n\n' + blocks[i].text
    if (measure(candidate) <= maxSize) {
      current = { text: candidate, tag: current.tag }
    } else {
      merged.push(current)
      current = blocks[i]
    }
  }
  merged.push(current)

  // Build final chunks with positions
  const chunks: Chunk[] = []
  let offset = 0

  for (let i = 0; i < merged.length; i++) {
    const block = merged[i]
    const content = block.text

    // Force-split if still too large
    if (measure(content) > maxSize) {
      const subChunks = forceSplit(content, maxSize, measure)
      for (const sub of subChunks) {
        chunks.push({
          content: sub,
          index: chunks.length,
          start: offset,
          end: offset + sub.length,
          length: sub.length,
          metadata: { tag: block.tag },
        })
        offset += sub.length
      }
      continue
    }

    chunks.push({
      content,
      index: i,
      start: offset,
      end: offset + content.length,
      length: content.length,
      metadata: { tag: block.tag },
    })
    offset += content.length
  }

  // Re-index
  for (let i = 0; i < chunks.length; i++) {
    chunks[i].index = i
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

function forceSplit(text: string, maxSize: number, measure: (t: string) => number): string[] {
  const parts: string[] = []

  // Try to split on paragraph breaks
  const paragraphs = text.split('\n\n')
  let current = ''

  for (const para of paragraphs) {
    const candidate = current ? current + '\n\n' + para : para
    if (measure(candidate) <= maxSize) {
      current = candidate
    } else {
      if (current) parts.push(current)
      if (measure(para) > maxSize) {
        // Hard split
        for (let i = 0; i < para.length; i += maxSize) {
          parts.push(para.slice(i, i + maxSize))
        }
        current = ''
      } else {
        current = para
      }
    }
  }

  if (current) parts.push(current)
  return parts
}
