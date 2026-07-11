import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:3102";
const casesPath = path.resolve("evaluation/datasets/v1/cases.json");
const exportDir = path.resolve("evaluation/exports");
const reportDir = path.resolve("evaluation/reports/v1");
const cases = JSON.parse(await readFile(casesPath, "utf8"));
const tokenise = (text) => new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
const divide = (a, b) => (b ? a / b : 0);
const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
};
const round = (value, digits = 4) => Number(value.toFixed(digits));

const records = [];
await fetch(`${baseUrl}/api/query`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ question: "hello" }),
});
for (const testCase of cases) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}/api/query`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: testCase.question }),
  });
  const latencyMs = performance.now() - started;
  if (!response.ok) throw new Error(`${testCase.id}: HTTP ${response.status}`);
  const result = await response.json();
  const answer = String(result.answer ?? "");
  const sources = Array.isArray(result.sources) ? result.sources : [];
  const refused = /couldn.t find|do not specify|no knowledge base/i.test(answer);
  const forbidden = (testCase.forbidden_answer_terms ?? []).filter((term) =>
    answer.toLowerCase().includes(term.toLowerCase()),
  );
  records.push({
    id: testCase.id,
    category: testCase.category,
    question: testCase.question,
    reference_answer: testCase.reference_answer,
    answer,
    relevant_document_ids: testCase.relevant_document_ids,
    retrieved_documents: sources.map((source) => ({ id: source.id, text: source.snippet })),
    cited_document_ids: sources.map((source) => source.id),
    latency_ms: round(latencyMs, 2),
    estimated_cost_usd: 0,
    expected_refusal: testCase.expected_refusal,
    refused,
    prompt_tokens: 0,
    completion_tokens: 0,
    usage_available: false,
    forbidden_terms_observed: forbidden,
  });
}

const rows = records.map((record) => {
  const retrieved = record.retrieved_documents.slice(0, 5).map((item) => item.id);
  const relevant = new Set(record.relevant_document_ids);
  const relevantRetrieved = retrieved.filter((id) => relevant.has(id));
  const rank = retrieved.findIndex((id) => relevant.has(id));
  const referenceTokens = tokenise(record.reference_answer);
  const answerTokens = tokenise(record.answer);
  const evidenceTokens = tokenise(record.retrieved_documents.map((item) => item.text).join(" "));
  return {
    id: record.id,
    category: record.category,
    precision_at_5: round(divide(relevantRetrieved.length, retrieved.length)),
    recall_at_5: round(divide(new Set(relevantRetrieved).size, relevant.size)),
    reciprocal_rank: rank < 0 ? 0 : round(1 / (rank + 1)),
    citation_coverage: round(divide(record.cited_document_ids.filter((id) => relevant.has(id)).length, relevant.size)),
    answer_coverage: round(divide([...referenceTokens].filter((token) => answerTokens.has(token)).length, referenceTokens.size)),
    grounding_overlap: round(divide([...answerTokens].filter((token) => evidenceTokens.has(token)).length, answerTokens.size)),
    refusal_correctness: Number(record.expected_refusal === record.refused),
    latency_ms: record.latency_ms,
    forbidden_terms_observed: record.forbidden_terms_observed,
  };
});

const mean = (key) => round(rows.reduce((sum, row) => sum + row[key], 0) / rows.length);
const summary = {
  dataset_version: "v1",
  records: rows.length,
  mean_precision_at_5: mean("precision_at_5"),
  mean_recall_at_5: mean("recall_at_5"),
  mean_reciprocal_rank: mean("reciprocal_rank"),
  mean_citation_coverage: mean("citation_coverage"),
  mean_answer_coverage: mean("answer_coverage"),
  mean_grounding_overlap: mean("grounding_overlap"),
  mean_refusal_correctness: mean("refusal_correctness"),
  latency_p50_ms: round(percentile(rows.map((row) => row.latency_ms), 0.5), 2),
  latency_p95_ms: round(percentile(rows.map((row) => row.latency_ms), 0.95), 2),
  token_usage_available: false,
  total_estimated_cost_usd: 0,
  prompt_injection_forbidden_terms_observed: rows.flatMap((row) => row.forbidden_terms_observed).length,
};

const table = rows.map((row) =>
  `| ${row.id} | ${row.category} | ${row.precision_at_5} | ${row.recall_at_5} | ${row.reciprocal_rank} | ${row.refusal_correctness} | ${row.latency_ms} |`,
).join("\n");
const report = `# AI FAQ Evaluation v1\n\n` +
  `Measured against the deterministic local fallback with no provider credentials. Dataset: \`evaluation/datasets/v1\`.\n\n` +
  `## Summary\n\n` + Object.entries(summary).map(([key, value]) => `- \`${key}\`: ${value}`).join("\n") +
  `\n\nProvider token usage and billing cost are unavailable in fallback mode. Zero values in the compatible JSONL mean unobserved, not free provider execution.\n\n` +
  `## Per-case retrieval\n\n| Case | Category | P@5 | R@5 | RR | Refusal correct | Latency ms |\n|---|---|---:|---:|---:|---:|---:|\n${table}\n\n` +
  `## Principal failure cases\n\n` +
  `- Lexical answer coverage penalises valid paraphrases and is not a semantic correctness judge.\n` +
  `- Archived documents can still be retrieved when their vocabulary overlaps a current-policy question; date-aware reranking is not implemented.\n` +
  `- The deterministic fallback returns source cards rather than inline citation markers.\n` +
  `- Prompt-injection protection uses explicit instruction-pattern filtering and requires broader adversarial coverage.\n\n` +
  `## Next experiment\n\nAdd metadata-aware reranking that demotes superseded documents, then rerun this fixed dataset and compare retrieval recall, stale-source precision, and latency.\n`;

await mkdir(exportDir, { recursive: true });
await mkdir(reportDir, { recursive: true });
await writeFile(path.join(exportDir, "ai-faq-v1.jsonl"), `${records.map((row) => JSON.stringify(row)).join("\n")}\n`);
await writeFile(path.join(reportDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(path.join(reportDir, "records.json"), `${JSON.stringify(rows, null, 2)}\n`);
await writeFile(path.join(reportDir, "report.md"), report);
console.log(`Evaluated ${records.length} cases; report written to ${reportDir}`);
