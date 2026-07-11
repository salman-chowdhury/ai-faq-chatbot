# AI FAQ Chatbot

[![CI](https://github.com/salman-uq2024/ai-faq-chatbot/actions/workflows/ci.yml/badge.svg)](https://github.com/salman-uq2024/ai-faq-chatbot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)

A full-stack retrieval-augmented generation application that ingests website and PDF content, retrieves relevant evidence, produces cited answers, and exposes both an admin dashboard and an embeddable support widget.

![Landing page](public/demo-landing.png)

## What it demonstrates

- Document and website ingestion
- Chunking, embeddings and cosine-similarity retrieval
- Grounded answer generation with source citations
- Offline TF-IDF fallback when no model API key is present
- Admin controls for sources, chunks, settings and logs
- Embeddable JavaScript support widget
- Rate limiting and optional admin-token protection
- Type checking, production builds and Playwright end-to-end tests in CI

## Architecture

```text
PDFs / webpages
      ↓
text extraction and chunking
      ↓
Gemini embeddings or offline fallback vectors
      ↓
file-backed vector store
      ↓
query embedding and similarity retrieval
      ↓
grounded prompt with retrieved evidence
      ↓
answer with citations
```

The file-backed store keeps the project easy to run and review. A production deployment should replace ephemeral serverless storage with a durable database or managed vector store.

## Stack

- Next.js App Router
- React 19 and TypeScript
- Tailwind CSS
- Google Gemini API
- SWR
- Zod
- Playwright

## Quick start

```bash
git clone https://github.com/salman-uq2024/ai-faq-chatbot.git
cd ai-faq-chatbot
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` for the public experience and `http://localhost:3000/admin` for ingestion and administration.

### Environment variables

- `GEMINI_API_KEY` — optional Gemini embeddings and generation
- `ADMIN_TOKEN` — recommended for protecting admin APIs
- `STORAGE_DIR` — optional persistent-data path
- `RATE_LIMIT_PER_MINUTE` — request-rate override

Without `GEMINI_API_KEY`, the project remains usable in deterministic offline-demo mode.

## Live demo

[Open the deployed application](https://ai-faq-chatbot.vercel.app)

## Embed the widget

```html
<script
  src="https://your-domain.example/widget.js"
  data-api-url="https://your-domain.example/api/query"
  data-button-text="Need help?"
  data-title="Support assistant"
  data-placeholder="Ask us anything..."
  data-brand-color="#2563EB"
  async>
</script>
```

## Screenshots

### Landing page

![Landing page](public/demo-landing.png)

### Admin dashboard

![Admin dashboard](public/demo-admin.png)

## Verification

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

GitHub Actions runs these checks against Node.js 20 and 22.

## Current limitations

- The default vector store is file-backed rather than a production database.
- Serverless filesystems may be ephemeral.
- Automated RAG-quality evaluation is not yet included.
- Website ingestion must still respect site permissions and terms.
- Retrieved content can contain prompt-injection attempts and should be treated as untrusted input.

## Next engineering milestones

- Add a durable PostgreSQL/pgvector storage adapter
- Add retrieval, faithfulness and citation-correctness evaluation
- Add prompt-injection and malformed-document tests
- Add structured tracing for ingestion, retrieval, latency and token usage

## Documentation

- [Installation guide](docs/install.md)
- [Deployment guide](docs/deploy.md)
- [Operations guide](docs/ops.md)

## License

MIT
