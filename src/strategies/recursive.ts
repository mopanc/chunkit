import type { Chunk, Tokenizer } from '../types.js'

/**
 * Separators ordered from largest to smallest semantic unit.
 */
const SEPARATORS = ['\n\n', '\n', '. ', ', ', ' ', '']

/**
 * Recursive character text splitting.
 * Attempts to split on paragraph breaks first, then line breaks,
 * then sentences, then words, preserving semantic coherence.
 */
export function chunkRecursive(text: string, maxSize: number, overlap: number, tokenizer?: Tokenizer): Chunk[] {
  if (text.length === 0) return []
  if (maxSize <= 0) throw new Error('maxSize must be positive')
  if (overlap >= maxSize) throw new Error('overlap must be less than maxSize')

  const measure = tokenizer ? (t: string) => tokenizer.count(t) : (t: string) => t.length

  const rawChunks = splitRecursive(text, maxSize, SEPARATORS, measure)
  return mergeWithOverlap(text, rawChunks, maxSize, overlap, measure, tokenizer)
}

function splitRecursive(text: string, maxSize: number, separators: string[], measure: (t: string) => number): string[] {
  if (measure(text) <= maxSize) return [text]

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

    if (measure(candidate) <= maxSize) {
      current = candidate
    } else {
      if (current) result.push(current)

      if (measure(piece) > maxSize && remaining.length > 0) {
        result.push(...splitRecursive(piece, maxSize, remaining, measure))
        current = ''
      } else {
        current = piece
      }
    }
  }

  if (current) result.push(current)
  return result
}

function mergeWithOverlap(
  original: string,
  rawChunks: string[],
  maxSize: number,
  overlap: number,
  measure: (t: string) => number,
  tokenizer?: Tokenizer,
): Chunk[] {
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

    if (i > 0 && overlap > 0) {
      const overlapStart = Math.max(chunk.start - overlap, positioned[i - 1].start)
      const prefix = original.slice(overlapStart, chunk.start)
      start = overlapStart
      content = prefix + content
    }

    if (measure(content) > maxSize) {
      content = tokenizer ? tokenizer.truncate(content, maxSize) : content.slice(0, maxSize)
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
