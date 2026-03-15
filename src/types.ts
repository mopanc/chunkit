export type Strategy = 'fixed' | 'recursive' | 'markdown'

export interface ChunkOptions {
  /** Chunking strategy. Default: 'recursive' */
  strategy?: Strategy
  /** Maximum chunk size in characters. Default: 1000 */
  maxSize?: number
  /** Overlap between consecutive chunks in characters. Default: 100 */
  overlap?: number
}

export interface Chunk {
  /** Chunk text content */
  content: string
  /** Zero-based chunk index */
  index: number
  /** Start position in the original text */
  start: number
  /** End position in the original text */
  end: number
  /** Content length in characters */
  length: number
}
