import type { Chunk, ChunkOptions } from './types.js'
import { chunkFixed } from './strategies/fixed.js'
import { chunkRecursive } from './strategies/recursive.js'
import { chunkMarkdown } from './strategies/markdown.js'
import { chunkHtml } from './strategies/html.js'
import { chunkCode } from './strategies/code.js'

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
    tokenizer,
  } = options

  if (typeof text !== 'string') {
    throw new TypeError('text must be a string')
  }

  let chunks: Chunk[]

  switch (strategy) {
    case 'fixed':
      chunks = chunkFixed(text, maxSize, overlap, tokenizer)
      break
    case 'recursive':
      chunks = chunkRecursive(text, maxSize, overlap, tokenizer)
      break
    case 'markdown':
      chunks = chunkMarkdown(text, maxSize, overlap, tokenizer)
      break
    case 'html':
      chunks = chunkHtml(text, maxSize, overlap, tokenizer)
      break
    case 'code':
      chunks = chunkCode(text, maxSize, overlap, tokenizer)
      break
    default:
      throw new Error(`Unknown strategy: ${strategy}`)
  }

  // Attach token counts if tokenizer is provided
  if (tokenizer) {
    for (const c of chunks) {
      c.metadata = { ...c.metadata, tokens: tokenizer.count(c.content) }
    }
  }

  return chunks
}
