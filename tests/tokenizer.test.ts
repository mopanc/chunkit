import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { chunk } from '../src/chunk.js'
import type { Tokenizer } from '../src/types.js'

/**
 * Simple word-based tokenizer for testing.
 * Counts words as tokens (split by whitespace).
 */
const wordTokenizer: Tokenizer = {
  count(text: string): number {
    return text.split(/\s+/).filter(Boolean).length
  },
  truncate(text: string, maxTokens: number): string {
    const words = text.split(/\s+/).filter(Boolean)
    return words.slice(0, maxTokens).join(' ')
  },
}

describe('token-based chunking', () => {
  it('uses tokenizer for sizing in fixed strategy', () => {
    // 20 words, maxSize 5 tokens
    const text = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'
    const result = chunk(text, { strategy: 'fixed', maxSize: 5, overlap: 0, tokenizer: wordTokenizer })

    assert.ok(result.length >= 4)
    for (const c of result) {
      assert.ok(wordTokenizer.count(c.content) <= 5, `chunk has ${wordTokenizer.count(c.content)} tokens, expected <= 5`)
    }
  })

  it('attaches token count to metadata', () => {
    const text = 'hello world foo bar baz'
    const result = chunk(text, { strategy: 'fixed', maxSize: 10, overlap: 0, tokenizer: wordTokenizer })

    assert.ok(result.length > 0)
    for (const c of result) {
      assert.ok(c.metadata?.tokens !== undefined, 'should have token count in metadata')
      assert.strictEqual(c.metadata?.tokens, wordTokenizer.count(c.content))
    }
  })

  it('uses tokenizer in recursive strategy', () => {
    const sentences = Array.from({ length: 10 }, (_, i) => `Sentence number ${i + 1} has several words in it.`)
    const text = sentences.join(' ')
    const result = chunk(text, { strategy: 'recursive', maxSize: 15, overlap: 0, tokenizer: wordTokenizer })

    assert.ok(result.length > 1)
    for (const c of result) {
      assert.ok(wordTokenizer.count(c.content) <= 15, `chunk has ${wordTokenizer.count(c.content)} tokens`)
    }
  })

  it('works without tokenizer (default char-based)', () => {
    const text = 'a'.repeat(100)
    const result = chunk(text, { strategy: 'fixed', maxSize: 30, overlap: 0 })

    assert.ok(result.length > 1)
    for (const c of result) {
      assert.ok(c.content.length <= 30)
      assert.strictEqual(c.metadata, undefined)
    }
  })
})
