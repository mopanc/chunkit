export type Strategy = 'fixed' | 'recursive' | 'markdown' | 'html' | 'code'

export interface ChunkOptions {
  /** Chunking strategy. Default: 'recursive' */
  strategy?: Strategy
  /** Maximum chunk size in characters (or tokens if tokenizer provided). Default: 1000 */
  maxSize?: number
  /** Overlap between consecutive chunks in characters (or tokens). Default: 100 */
  overlap?: number
  /** Custom tokenizer function for token-based sizing */
  tokenizer?: Tokenizer
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
  /** Optional metadata about the chunk's context */
  metadata?: ChunkMetadata
}

export interface ChunkMetadata {
  /** Heading hierarchy this chunk belongs to (e.g. ['# Overview', '## Install']) */
  headings?: string[]
  /** The language of a code block, if applicable */
  language?: string
  /** HTML tag context (e.g. 'article', 'section') */
  tag?: string
  /** Token count (when tokenizer is provided) */
  tokens?: number
}

/**
 * A tokenizer function that splits text into tokens.
 * Used for token-based chunk sizing.
 */
export interface Tokenizer {
  /** Count the number of tokens in a string */
  count(text: string): number
  /** Truncate text to a maximum number of tokens */
  truncate(text: string, maxTokens: number): string
}
