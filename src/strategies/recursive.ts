import type { Chunk } from '../types.js'

/**
 * Separators ordered from largest to smallest semantic unit.
 * We try to split on the largest separator first, then recurse
 * with smaller separators for any oversized pieces.
 */
const SEPARATORS = ['\n\n', '\n', '. ', ', ', ' ', '']

/**
 * Recursive character text splitting.
 * Attempts to split on paragraph breaks first, then line breaks,
 * then sentences, then words, preserving semantic coherence.
 */
export function chunkRecursive(text: string, maxSize: number, overlap: number): Chunk[] {
  if (text.length === 0) return []
  if (maxSize <= 0) throw new Error('maxSize must be positive')
  if (overlap >= maxSize) throw new Error('overlap must be less than maxSize')

  const rawChunks = splitRecursive(text, maxSize, SEPARATORS)
  return mergeWithOverlap(text, rawChunks, maxSize, overlap)
}

function splitRecursive(text: string, maxSize: number, separators: string[]): string[] {
  if (text.length <= maxSize) return [text]

  const separator = separators[0]
  const remaining = separators.slice(1)

  // Last resort: hard split at maxSize boundary
  if (separator === '') {
    const parts: string[] = []
    for (let i = 0; i < text.length; i += maxSize) {
      parts.push(text.slice(i, i + maxSize))
    }
    return parts
  }

  const splits = text.split(separator)
  const result: string[] = []
  let current = ''

  for (const piece of splits) {
    const candidate = current ? current + separator + piece : piece

    if (candidate.length <= maxSize) {
      current = candidate
    } else {
      if (current) result.push(current)

      if (piece.length > maxSize && remaining.length > 0) {
        // Piece itself is too large — recurse with smaller separator
        result.push(...splitRecursive(piece, maxSize, remaining))
        current = ''
      } else {
        current = piece
      }
    }
  }

  if (current) result.push(current)
  return result
}

/**
 * Takes raw chunks and re-maps them to the original text positions,
 * adding overlap between consecutive chunks.
 */
function mergeWithOverlap(original: string, rawChunks: string[], maxSize: number, overlap: number): Chunk[] {
  if (overlap === 0) {
    return mapPositions(original, rawChunks)
  }

  const positioned = mapPositions(original, rawChunks)
  if (positioned.length <= 1) return positioned

  const result: Chunk[] = []

  for (let i = 0; i < positioned.length; i++) {
    const chunk = positioned[i]
    let start = chunk.start
    let content = chunk.content

    // Extend backwards into previous chunk for overlap
    if (i > 0 && overlap > 0) {
      const overlapStart = Math.max(chunk.start - overlap, positioned[i - 1].start)
      const prefix = original.slice(overlapStart, chunk.start)
      start = overlapStart
      content = prefix + content
    }

    // Trim if overlap made it too large
    if (content.length > maxSize) {
      content = content.slice(0, maxSize)
    }

    result.push({
      content,
      index: i,
      start,
      end: start + content.length,
      length: content.length,
    })
  }

  return result
}

/**
 * Maps raw chunk strings back to their positions in the original text.
 */
function mapPositions(original: string, chunks: string[]): Chunk[] {
  const result: Chunk[] = []
  let searchFrom = 0

  for (let i = 0; i < chunks.length; i++) {
    const content = chunks[i]
    const start = original.indexOf(content, searchFrom)
    const actualStart = start >= 0 ? start : searchFrom

    result.push({
      content,
      index: i,
      start: actualStart,
      end: actualStart + content.length,
      length: content.length,
    })

    searchFrom = actualStart + content.length
  }

  return result
}
