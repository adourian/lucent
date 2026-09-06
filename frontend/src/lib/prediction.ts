import type { PredictionApiResponse } from "../types";

export function isPredictionTimestamp(value: unknown): value is string {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

export function isPredictionResponse(value: unknown): value is PredictionApiResponse {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    ["nctid", "phase", "sponsor", "title", "status", "diseases", "completion_date",
      "model_id", "preprocessing_id", "encoder_id", "artifact_id", "source_hash"]
      .every((field) => typeof result[field] === "string") &&
    (typeof result.enrollment === "string" || typeof result.enrollment === "number") &&
    ["probability", "uncertainty", "deterministic"].every(
      (field) => typeof result[field] === "number" && Number.isFinite(result[field]),
    ) &&
    (result.label === 0 || result.label === 1) &&
    isPredictionTimestamp(result.generated_at) &&
    isPredictionTimestamp(result.source_fetched_at) &&
    (result.source_last_updated === null || typeof result.source_last_updated === "string") &&
    typeof result.cache_hit === "boolean"
  );
}
