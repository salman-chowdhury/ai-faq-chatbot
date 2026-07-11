# RAG Evaluation Plan

This document defines how changes to retrieval, chunking, prompts, models and storage should be evaluated before they are described as improvements.

## Evaluation dataset

Create a versioned JSONL dataset containing:

- question
- reference answer or required facts
- relevant source identifiers
- answerability label
- category and difficulty
- known prompt-injection or ambiguity flags

The first target is at least 50 questions across:

- direct factual lookup
- multi-source synthesis
- unanswerable questions
- conflicting documents
- stale information
- malicious instructions embedded in ingested content

## Retrieval metrics

- Precision@k
- Recall@k
- Mean reciprocal rank
- Source diversity
- Retrieval latency

## Answer metrics

- Required-fact coverage
- Citation coverage
- Citation correctness
- Grounding or evidence overlap
- Unsupported-claim rate
- Correct refusal rate for unanswerable questions

## Operational metrics

- End-to-end latency p50 and p95
- Prompt and completion tokens
- Estimated provider cost
- Ingestion throughput
- Storage size per document
- Failure and retry counts

## Experiment discipline

Each experiment should record:

- commit SHA
- model and embedding model
- chunk size and overlap
- retrieval limit
- prompt version
- dataset version
- metric summary
- observed failures

A change should not be called an improvement unless it beats the current baseline on its target metric without causing an unacceptable regression elsewhere.

## Security cases

The evaluation set should include:

- prompt injection inside a crawled page
- instructions to reveal system prompts or secrets
- malformed PDFs
- unsupported file types
- excessively large inputs
- cross-tenant or unauthorised admin requests

## Initial acceptance targets

These are starting engineering targets rather than externally validated claims:

- Recall@5 ≥ 0.85 on answerable questions
- Citation coverage ≥ 0.90
- Unsupported-claim rate ≤ 0.10
- Correct refusal rate ≥ 0.90
- p95 response latency documented for both offline and provider-backed modes

The standalone LLM Evaluation Toolkit repository can consume exported JSONL records and provide deterministic baseline reports. Human review remains required for factual equivalence and nuanced answer quality.
