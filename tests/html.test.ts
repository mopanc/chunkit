import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { chunk } from '../src/chunk.js'

describe('html strategy', () => {
  it('returns empty array for empty string', () => {
    const result = chunk('', { strategy: 'html' })
    assert.deepStrictEqual(result, [])
  })

  it('strips script and style tags', () => {
    const html = '<p>Hello</p><script>alert("x")</script><style>.x{}</style><p>World</p>'
    const result = chunk(html, { strategy: 'html', maxSize: 500 })

    assert.ok(result.length > 0)
    for (const c of result) {
      assert.ok(!c.content.includes('alert'))
      assert.ok(!c.content.includes('.x{}'))
    }
  })

  it('strips HTML comments', () => {
    const html = '<p>Hello</p><!-- secret comment --><p>World</p>'
    const result = chunk(html, { strategy: 'html', maxSize: 500 })

    for (const c of result) {
      assert.ok(!c.content.includes('secret comment'))
    }
  })

  it('extracts text from block elements', () => {
    const html = '<article><h1>Title</h1><p>First paragraph.</p><p>Second paragraph.</p></article>'
    const result = chunk(html, { strategy: 'html', maxSize: 500 })

    assert.ok(result.length > 0)
    const allText = result.map(c => c.content).join(' ')
    assert.ok(allText.includes('Title'))
    assert.ok(allText.includes('First paragraph'))
    assert.ok(allText.includes('Second paragraph'))
  })

  it('attaches tag metadata', () => {
    const html = '<section><p>Content here</p></section>'
    const result = chunk(html, { strategy: 'html', maxSize: 500 })

    assert.ok(result.length > 0)
    assert.ok(result[0].metadata?.tag)
  })

  it('splits large HTML into multiple chunks', () => {
    const paragraphs = Array.from({ length: 20 }, (_, i) => `<p>Paragraph ${i + 1} with some content that takes up space.</p>`)
    const html = `<article>${paragraphs.join('')}</article>`
    const result = chunk(html, { strategy: 'html', maxSize: 200, overlap: 0 })

    assert.ok(result.length > 1)
    for (const c of result) {
      assert.ok(c.length <= 200, `chunk too large: ${c.length}`)
    }
  })

  it('decodes HTML entities', () => {
    const html = '<p>A &amp; B &lt; C &gt; D &quot;E&quot; &#39;F&#39;</p>'
    const result = chunk(html, { strategy: 'html', maxSize: 500 })

    const text = result[0].content
    assert.ok(text.includes('A & B'))
    assert.ok(text.includes('< C'))
    assert.ok(text.includes('> D'))
  })

  it('converts br tags to newlines', () => {
    const html = '<p>Line 1<br/>Line 2<br>Line 3</p>'
    const result = chunk(html, { strategy: 'html', maxSize: 500 })

    assert.ok(result[0].content.includes('\n'))
  })
})
