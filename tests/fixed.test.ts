import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { chunk } from '../src/index.js'

describe('fixed strategy', () => {
  it('returns empty array for empty string', () => {
    const result = chunk('', { strategy: 'fixed', maxSize: 100, overlap: 0 })
    assert.deepStrictEqual(result, [])
  })

  it('returns single chunk when text fits within maxSize', () => {
    const text = 'Hello world'
    const result = chunk(text, { strategy: 'fixed', maxSize: 100, overlap: 0 })
    assert.strictEqual(result.length, 1)
    assert.strictEqual(result[0].content, text)
    assert.strictEqual(result[0].index, 0)
    assert.strictEqual(result[0].start, 0)
    assert.strictEqual(result[0].end, text.length)
  })

  it('splits text into equal chunks without overlap', () => {
    const text = 'abcdefghij' // 10 chars
    const result = chunk(text, { strategy: 'fixed', maxSize: 4, overlap: 0 })
    assert.strictEqual(result.length, 3)
    assert.strictEqual(result[0].content, 'abcd')
    assert.strictEqual(result[1].content, 'efgh')
    assert.strictEqual(result[2].content, 'ij')
  })

  it('applies overlap between chunks', () => {
    const text = 'abcdefghijklmno' // 15 chars
    const result = chunk(text, { strategy: 'fixed', maxSize: 6, overlap: 2 })

    assert.strictEqual(result[0].content, 'abcdef')
    assert.strictEqual(result[0].start, 0)

    assert.strictEqual(result[1].content, 'efghij')
    assert.strictEqual(result[1].start, 4)

    // Each step is maxSize - overlap = 4
    assert.strictEqual(result[2].content, 'ijklmn')
    assert.strictEqual(result[2].start, 8)
  })

  it('sets correct metadata on each chunk', () => {
    const text = 'Hello, World!'
    const result = chunk(text, { strategy: 'fixed', maxSize: 5, overlap: 0 })

    for (const c of result) {
      assert.strictEqual(c.length, c.content.length)
      assert.strictEqual(c.end - c.start, c.length)
    }
  })

  it('throws on invalid maxSize', () => {
    assert.throws(() => chunk('test', { strategy: 'fixed', maxSize: 0 }))
    assert.throws(() => chunk('test', { strategy: 'fixed', maxSize: -1 }))
  })

  it('throws when overlap >= maxSize', () => {
    assert.throws(() => chunk('test', { strategy: 'fixed', maxSize: 5, overlap: 5 }))
    assert.throws(() => chunk('test', { strategy: 'fixed', maxSize: 5, overlap: 10 }))
  })
})
