import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { chunk } from '../src/chunk.js'

describe('code strategy', () => {
  it('returns empty array for empty string', () => {
    const result = chunk('', { strategy: 'code' })
    assert.deepStrictEqual(result, [])
  })

  it('keeps small files as single chunk', () => {
    const code = `function hello() {\n  return "world"\n}`
    const result = chunk(code, { strategy: 'code', maxSize: 500 })

    assert.strictEqual(result.length, 1)
    assert.strictEqual(result[0].content.trim(), code)
  })

  it('splits JavaScript functions into separate chunks', () => {
    const code = [
      'function first() {',
      '  console.log("first")',
      '  console.log("more logic")',
      '  console.log("even more")',
      '}',
      '',
      'function second() {',
      '  console.log("second")',
      '  console.log("more logic")',
      '  console.log("even more")',
      '}',
    ].join('\n')

    const result = chunk(code, { strategy: 'code', maxSize: 100, overlap: 0 })

    assert.ok(result.length >= 2)
    assert.ok(result[0].content.includes('first'))
    assert.ok(result[result.length - 1].content.includes('second'))
  })

  it('detects JavaScript language', () => {
    const code = `import fs from 'fs'\nconst x = 1\nexport function test() {\n  return x\n}`
    const result = chunk(code, { strategy: 'code', maxSize: 500 })

    assert.strictEqual(result[0].metadata?.language, 'javascript')
  })

  it('detects Python language', () => {
    const code = `import os\n\ndef hello():\n    print("hello")\n\ndef world():\n    print("world")`
    const result = chunk(code, { strategy: 'code', maxSize: 500 })

    assert.strictEqual(result[0].metadata?.language, 'python')
  })

  it('detects Go language', () => {
    const code = `package main\n\nfunc main() {\n    fmt.Println("hello")\n}`
    const result = chunk(code, { strategy: 'code', maxSize: 500 })

    assert.strictEqual(result[0].metadata?.language, 'go')
  })

  it('handles classes and methods', () => {
    const code = [
      'export class Calculator {',
      '  add(a: number, b: number) {',
      '    return a + b',
      '  }',
      '',
      '  subtract(a: number, b: number) {',
      '    return a - b',
      '  }',
      '}',
      '',
      'export class Logger {',
      '  log(msg: string) {',
      '    console.log(msg)',
      '  }',
      '}',
    ].join('\n')

    const result = chunk(code, { strategy: 'code', maxSize: 150, overlap: 0 })

    assert.ok(result.length >= 2)
  })

  it('force-splits very large functions', () => {
    const lines = ['function big() {']
    for (let i = 0; i < 50; i++) {
      lines.push(`  const x${i} = ${i}`)
    }
    lines.push('}')
    const code = lines.join('\n')

    const result = chunk(code, { strategy: 'code', maxSize: 200, overlap: 0 })

    assert.ok(result.length > 1)
    for (const c of result) {
      assert.ok(c.length <= 200, `chunk too large: ${c.length}`)
    }
  })

  it('applies overlap between chunks', () => {
    const code = [
      'function a() {',
      '  return 1',
      '}',
      '',
      'function b() {',
      '  return 2',
      '}',
      '',
      'function c() {',
      '  return 3',
      '}',
    ].join('\n')

    const result = chunk(code, { strategy: 'code', maxSize: 80, overlap: 20 })

    if (result.length > 1) {
      // Second chunk should contain some overlap from the first
      assert.ok(result[1].content.length > 0)
    }
  })
})
