# chunkit

Smart document chunking for RAG pipelines. Split text into semantically meaningful chunks with configurable strategies and overlap.

## Install

```bash
npm install chunkit
```

## Usage

```ts
import { chunk } from 'chunkit'

const text = 'Your document content here...'
const chunks = chunk(text, { strategy: 'recursive', maxSize: 1000, overlap: 100 })
```

Each chunk contains:

```ts
{
  content: string   // chunk text
  index: number     // zero-based position in the sequence
  start: number     // start offset in the original text
  end: number       // end offset in the original text
  length: number    // content length in characters
}
```

## Strategies

### Fixed

Splits text into chunks of exactly `maxSize` characters. Simple and predictable.

```ts
chunk(text, { strategy: 'fixed', maxSize: 512, overlap: 50 })
```

### Recursive (default)

Splits on the largest semantic boundary that fits within `maxSize`. Tries paragraph breaks first, then line breaks, then sentences, then words. Produces the most coherent chunks for general text.

```ts
chunk(text, { strategy: 'recursive', maxSize: 1000, overlap: 100 })
```

### Markdown

Splits on heading boundaries (h1-h3), then paragraphs. Keeps code blocks intact when they fit within `maxSize`. Best for structured documentation.

```ts
chunk(text, { strategy: 'markdown', maxSize: 800, overlap: 0 })
```

## API

### `chunk(text, options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `strategy` | `'fixed' \| 'recursive' \| 'markdown'` | `'recursive'` | Chunking strategy |
| `maxSize` | `number` | `1000` | Maximum chunk size in characters |
| `overlap` | `number` | `100` | Overlap between consecutive chunks |

Returns `Chunk[]`.

## Examples

### Chunking for embeddings

```ts
import { chunk } from 'chunkit'

const docs = chunk(documentText, {
  strategy: 'recursive',
  maxSize: 512,    // match your embedding model's sweet spot
  overlap: 50,     // context continuity between chunks
})

for (const doc of docs) {
  const embedding = await embed(doc.content)
  await vectorStore.insert({
    content: doc.content,
    embedding,
    metadata: { start: doc.start, end: doc.end },
  })
}
```

### Splitting markdown documentation

```ts
import { chunk } from 'chunkit'

const sections = chunk(readme, {
  strategy: 'markdown',
  maxSize: 1500,
  overlap: 0,
})
```

## License

MIT
