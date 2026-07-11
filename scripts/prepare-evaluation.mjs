import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const dimension = 768;
const storageDir = path.resolve(process.argv[2] ?? "/tmp/ai-faq-evaluation-v1");
const corpusPath = path.resolve("evaluation/datasets/v1/corpus.json");

function embed(text) {
  const vector = Array(dimension).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  for (const word of words) {
    const index = createHash("sha1").update(word).digest().readUInt32BE(0) % dimension;
    vector[index] += 1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return magnitude === 0 ? vector : vector.map((value) => value / magnitude);
}

const corpus = JSON.parse(await readFile(corpusPath, "utf8"));
const createdAt = "2026-07-12T00:00:00.000Z";
const chunks = corpus.map((document) => ({
  id: document.id,
  sourceUrl: document.url,
  title: document.title,
  content: document.content,
  embedding: embed(document.content),
  tokens: document.content.split(/\s+/).filter(Boolean).length,
  createdAt,
}));

await mkdir(storageDir, { recursive: true });
await writeFile(path.join(storageDir, "chunks.json"), `${JSON.stringify({ version: 1, chunks }, null, 2)}\n`);
console.log(`Prepared ${chunks.length} safe evaluation chunks in ${storageDir}`);
