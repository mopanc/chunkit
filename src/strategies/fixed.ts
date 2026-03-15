import type { Chunk } from '../types.js'

/**
 * Fixed-size chunking with configurable overlap.
 * Splits text into chunks of exactly maxSize characters,
 * with each chunk overlapping the previous by `overlap` characters.
 */
export function chunkFixed(text: string, maxSize: number, overlap: number): Chunk[] {
  if (text.length === 0) return []
  if (maxSize <= 0) throw new Error('maxSize must be positive')
  if (overlap >= maxSize) throw new Error('overlap must be less than maxSize')

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
