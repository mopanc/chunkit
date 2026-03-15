import type { Chunk, ChunkOptions } from './types.js'
import { chunkFixed } from './strategies/fixed.js'
import { chunkRecursive } from './strategies/recursive.js'
import { chunkMarkdown } from './strategies/markdown.js'

const DEFAULT_MAX_SIZE = 1000
const DEFAULT_OVERLAP = 100

/**
 * Split text into chunks using the specified strategy.
 *
 * @param text - The text to chunk
 * @param options - Chunking configuration
 * @returns Array of chunks with content and position metadata
 */
export function chunk(text: string, options: ChunkOptions = {}): Chunk[] {
  const {
    strategy = 'recursive',
    maxSize = DEFAULT_MAX_SIZE,
    overlap = DEFAULT_OVERLAP,
  } = options

  if (typeof text !== 'string') {
    throw new TypeError('text must be a string')
  }

  switch (strategy) {
    case 'fixed':
      return chunkFixed(text, maxSize, overlap)
    case 'recursive':
      return chunkRecursive(text, maxSize, overlap)
    case 'markdown':
      return chunkMarkdown(text, maxSize, overlap)
    default:
      throw new Error(`Unknown strategy: ${strategy}`)
  }
}
