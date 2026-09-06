import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { build } from "vite";

let buildDirectory;
let isPredictionResponse;
let AnalysisReport;
let RecentAnalyses;
let sessionKey;
let isPredictionAbstention;
let formatAbstentionMessage;
let TrialSearch;

before(async () => {
  // Use the existing Vite TS/React transforms; no browser or extra test runner.
  const cacheRoot = fileURLToPath(new URL("../node_modules/.tmp/", import.meta.url));
  await mkdir(cacheRoot, { recursive: true });
  buildDirectory = await mkdtemp(`${cacheRoot}prediction-tests-`);
  const bundle = await build({
    logLevel: "silent",
    build: {
      ssr: fileURLToPath(new URL("./prediction-components.ts", import.meta.url)),
      write: false,
    },
  });
  const output = `${buildDirectory}/components.mjs`;
  await writeFile(output, bundle.output.find((chunk) => chunk.type === "chunk" && chunk.isEntry).code);
  ({ isPredictionResponse, AnalysisReport, RecentAnalyses, sessionKey,
     isPredictionAbstention, formatAbstentionMessage, TrialSearch } =
    await import(pathToFileURL(output).href));
});

after(async () => {
  if (buildDirectory) await rm(buildDirectory, { recursive: true, force: true });
});

const result = {
  nctid: "NCT00000001", phase: "phase 2", sponsor: "Example sponsor",
  title: "Example trial", status: "RECRUITING", diseases: "Example condition",
  enrollment: 100, completion_date: "2027-01-01", probability: 0.5,
  uncertainty: 0.1, deterministic: 0.51, label: 1,
  generated_at: "2025-01-05T08:30:00Z",
  source_fetched_at: "2025-01-05T08:29:50Z", source_last_updated: "2025-01-04",
  cache_hit: false, model_id: "weights", preprocessing_id: "preprocessing",
  encoder_id: "encoders", artifact_id: "artifact", source_hash: "source",
  input_status: "supported", missing_fields: [],
};

function report(payload) {
  return renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(AnalysisReport, { result: payload, loading: false, requestFailed: false }),
  ));
}

test("fresh and cached responses retain the server timestamp in the report", () => {
  const cached = { ...result, cache_hit: true };
  assert.equal(isPredictionResponse(result), true);
  assert.equal(isPredictionResponse(cached), true);
  const freshHtml = report(result);
  const cachedHtml = report(cached);
  for (const html of [freshHtml, cachedHtml]) {
    assert.match(html, /datetime="2025-01-05T08:30:00Z"/i);
    assert.match(html, /2025/); // Full date, not just an ambiguous clock time.
  }
  assert.doesNotMatch(freshHtml, /Cached result/);
  assert.match(cachedHtml, /Cached result/);
  assert.equal(freshHtml.match(/<time.*?<\/time>/i)[0],
               cachedHtml.match(/<time.*?<\/time>/i)[0]);
});

test("recent analyses display the same backend creation timestamp", () => {
  const html = renderToStaticMarkup(createElement(RecentAnalyses, {
    analyses: [result], onSelect: () => {},
  }));
  assert.match(html, /datetime="2025-01-05T08:30:00Z"/i);
  assert.match(html, /2025/);
});

test("missing, malformed and timezone-free timestamps are rejected", () => {
  for (const generated_at of [undefined, null, "", "invalid", "2025-01-05T08:30:00"]) {
    assert.equal(isPredictionResponse({ ...result, generated_at }), false);
  }
  assert.equal(isPredictionResponse({ ...result, source_fetched_at: "invalid" }), false);
  assert.equal(isPredictionResponse({ ...result, generated_at: "2025-01-05T09:30:00+01:00" }), true);
});

test("legacy browser-dated sessions cannot masquerade as server-dated predictions", () => {
  assert.notEqual(sessionKey, "lucent.analysis-session.v1");
  assert.notEqual(sessionKey, "lucent.analysis-session.v2");
  const legacy = { ...result, generated_at: undefined, generatedAt: "2025-01-05T08:30:00Z" };
  assert.equal(isPredictionResponse(legacy), false);
  const restored = JSON.parse(JSON.stringify(result));
  assert.equal(isPredictionResponse(restored), true);
  assert.equal(restored.generated_at, result.generated_at);
});

for (const category of ["unsupported", "insufficient_input", "malformed_upstream"]) {
  test(`${category} abstention is displayed as unavailable, without an estimate`, () => {
    const abstention = {
      status: "abstained", category,
      message: "This trial cannot currently be evaluated.",
      reasons: [{ code: "MISSING_BRIEF_SUMMARY", field: "brief_summary", message: "A brief summary is required." }],
    };
    assert.equal(isPredictionAbstention(abstention), true);
    assert.equal(isPredictionResponse(abstention), false);
    const message = formatAbstentionMessage(abstention);
    const html = renderToStaticMarkup(createElement(TrialSearch, {
      nctid: result.nctid, modelVersion: "0.3.0", loading: false, hasResult: false,
      datasetSize: "33K trials", fieldError: null, serviceError: message,
      onChange: () => {}, onSubmit: () => {},
    }));
    assert.match(html, /Analysis unavailable/);
    assert.match(html, /This trial cannot currently be evaluated/);
    assert.match(html, /A brief summary is required/);
    assert.doesNotMatch(html, /estimate-figure|analysis-report|50\.0%/);
  });
}

test("supported missing fields are disclosed while retaining the prediction", () => {
  const partial = { ...result, input_status: "supported_with_missing", missing_fields: ["phase"] };
  assert.equal(isPredictionResponse(partial), true);
  assert.match(report(partial), /Not reported: phase/);
  assert.equal(isPredictionResponse({ ...result, input_status: undefined }), false);
  assert.equal(isPredictionResponse({ ...result, status: "abstained" }), false);
});
