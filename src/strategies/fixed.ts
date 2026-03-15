import type { Chunk, Tokenizer } from '../types.js'

/**
 * Fixed-size chunking with configurable overlap.
 * Splits text into chunks of exactly maxSize characters (or tokens),
 * with each chunk overlapping the previous by `overlap` characters/tokens.
 */
export function chunkFixed(text: string, maxSize: number, overlap: number, tokenizer?: Tokenizer): Chunk[] {
  if (text.length === 0) return []
  if (maxSize <= 0) throw new Error('maxSize must be positive')
  if (overlap >= maxSize) throw new Error('overlap must be less than maxSize')

  if (tokenizer) {
    return chunkFixedByTokens(text, maxSize, overlap, tokenizer)
  }

  const chunks: Chunk[] = []
  const step = maxSize - overlap
  let pos = 0
  let index = 0

  while (pos < text.length) {
    const end = Math.min(pos + maxSize, text.length)
    const content = text.slice(pos, end)

    chunks.push({
      content,
      index,
      start: pos,
      end,
      length: content.length,
    })

    pos += step
    index++

    if (end === text.length) break
  }

  return chunks
}

function chunkFixedByTokens(text: string, maxTokens: number, overlapTokens: number, tokenizer: Tokenizer): Chunk[] {
  const chunks: Chunk[] = []
  const step = maxTokens - overlapTokens
  let pos = 0
  let index = 0

  while (pos < text.length) {
    const remaining = text.slice(pos)
    const content = tokenizer.truncate(remaining, maxTokens)
    if (content.length === 0) break

    chunks.push({
      content,
      index,
      start: pos,
      end: pos + content.length,
      length: content.length,
    })

    // Advance by step tokens worth of characters
    const stepContent = tokenizer.truncate(content, step)
    pos += stepContent.length || content.length

    index++

    if (pos >= text.length) break
  }

  return chunks
}
