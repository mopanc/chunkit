import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { chunk } from '../src/index.js'

describe('markdown strategy', () => {
  it('returns empty array for empty string', () => {
    const result = chunk('', { strategy: 'markdown', maxSize: 100 })
    assert.deepStrictEqual(result, [])
  })

  it('splits on heading boundaries', () => {
    const text = [
      '# Title',
      'Intro paragraph.',
      '',
      '## Section One',
      'Content of section one.',
      '',
      '## Section Two',
      'Content of section two.',
    ].join('\n')

    const result = chunk(text, { strategy: 'markdown', maxSize: 50, overlap: 0 })

    assert.ok(result.length >= 2)
    assert.ok(result[0].content.includes('Title'))
  })

  it('keeps small documents as single chunk', () => {
    const text = '# Title\n\nShort content.'
    const result = chunk(text, { strategy: 'markdown', maxSize: 500, overlap: 0 })
    assert.strictEqual(result.length, 1)
  })

  it('preserves code blocks', () => {
    const text = [
      '## Setup',
      '',
      'Install dependencies:',
      '',
      '```bash',
      'npm install chunkit',
      'npm run build',
      '```',
      '',
      'Then use it.',
    ].join('\n')

    const result = chunk(text, { strategy: 'markdown', maxSize: 200, overlap: 0 })

    const codeChunk = result.find(c => c.content.includes('```bash'))
    assert.ok(codeChunk, 'Code block should be present')
    assert.ok(codeChunk.content.includes('npm install'), 'Code content preserved')
  })

  it('splits large sections by paragraphs', () => {
    const text = [
      '## Large Section',
      '',
      'Paragraph one with enough text to matter.',
      '',
      'Paragraph two with more text content.',
      '',
      'Paragraph three has text as well.',
    ].join('\n')

    const result = chunk(text, { strategy: 'markdown', maxSize: 60, overlap: 0 })

    assert.ok(result.length >= 2)
    for (const c of result) {
      assert.ok(c.length <= 60, `Chunk too large: ${c.length}`)
    }
  })

  it('handles h1, h2, h3 headings', () => {
    const text = [
      '# Main',
      'Content.',
      '## Sub',
      'Content.',
      '### Detail',
      'Content.',
    ].join('\n')

    const result = chunk(text, { strategy: 'markdown', maxSize: 30, overlap: 0 })
    assert.ok(result.length >= 2)
  })

  it('does not split on h4+ headings', () => {
    const text = [
      '## Section',
      'Intro.',
      '#### Minor heading',
      'Detail.',
    ].join('\n')

    const result = chunk(text, { strategy: 'markdown', maxSize: 200, overlap: 0 })
    assert.strictEqual(result.length, 1)
  })

  it('chunk metadata is correct', () => {
    const text = '## A\nContent A.\n\n## B\nContent B.'
    const result = chunk(text, { strategy: 'markdown', maxSize: 20, overlap: 0 })

    for (const c of result) {
      assert.strictEqual(c.length, c.content.length)
      assert.strictEqual(c.end - c.start, c.length)
      assert.strictEqual(typeof c.index, 'number')
    }
  })
})
