import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { chunk } from '../src/index.js'

describe('recursive strategy', () => {
  it('returns empty array for empty string', () => {
    const result = chunk('', { strategy: 'recursive', maxSize: 100 })
    assert.deepStrictEqual(result, [])
  })

  it('returns single chunk when text fits', () => {
    const text = 'Short text.'
    const result = chunk(text, { strategy: 'recursive', maxSize: 100, overlap: 0 })
    assert.strictEqual(result.length, 1)
    assert.strictEqual(result[0].content, text)
  })

  it('splits on paragraph breaks first', () => {
    const text = 'Paragraph one here.\n\nParagraph two here.\n\nParagraph three here.'
    const result = chunk(text, { strategy: 'recursive', maxSize: 25, overlap: 0 })

    assert.ok(result.length >= 3)
    assert.ok(result[0].content.includes('Paragraph one'))
  })

  it('splits on line breaks when paragraphs are too large', () => {
    const text = 'Line one\nLine two\nLine three\nLine four'
    const result = chunk(text, { strategy: 'recursive', maxSize: 20, overlap: 0 })

    assert.ok(result.length >= 2)
    for (const c of result) {
      assert.ok(c.length <= 20, `Chunk too large: ${c.length}`)
    }
  })

  it('falls back to sentence splitting', () => {
    const text = 'First sentence here. Second sentence here. Third sentence here.'
    const result = chunk(text, { strategy: 'recursive', maxSize: 30, overlap: 0 })

    assert.ok(result.length >= 2)
    for (const c of result) {
      assert.ok(c.length <= 30, `Chunk too large: ${c.length}`)
    }
  })

  it('hard-splits when no separator works', () => {
    const text = 'abcdefghijklmnopqrstuvwxyz'
    const result = chunk(text, { strategy: 'recursive', maxSize: 10, overlap: 0 })

    for (const c of result) {
      assert.ok(c.length <= 10)
    }
  })

  it('applies overlap correctly', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.'
    const result = chunk(text, { strategy: 'recursive', maxSize: 25, overlap: 5 })

    if (result.length > 1) {
      // Second chunk should start before its natural position
      assert.ok(result[1].start < result[0].end || result[1].start === result[0].end)
    }
  })

  it('preserves all original content', () => {
    const text = 'Hello world. This is a test. Of the recursive strategy.'
    const result = chunk(text, { strategy: 'recursive', maxSize: 20, overlap: 0 })

    // Every part of the original text should appear in at least one chunk
    for (const word of ['Hello', 'world', 'test', 'recursive', 'strategy']) {
      const found = result.some(c => c.content.includes(word))
      assert.ok(found, `Word "${word}" not found in any chunk`)
    }
  })

  it('chunk indices are sequential', () => {
    const text = 'A.\n\nB.\n\nC.\n\nD.\n\nE.'
    const result = chunk(text, { strategy: 'recursive', maxSize: 5, overlap: 0 })

    for (let i = 0; i < result.length; i++) {
      assert.strictEqual(result[i].index, i)
    }
  })
})
