/** The prediction payload returned by `GET /predict/{nctid}`. */
export interface PredictionApiResponse {
  nctid: string;
  phase: string;
  sponsor: string;
  title: string;
  status: string;
  diseases: string;
  enrollment: number | string;
  completion_date: string;
  probability: number;
  uncertainty: number;
  deterministic: number;
  label: 0 | 1;
  generated_at: string;
  source_fetched_at: string;
  source_last_updated: string | null;
  cache_hit: boolean;
  model_id: string;
  preprocessing_id: string;
  encoder_id: string;
  artifact_id: string;
  source_hash: string;
  input_status: "supported" | "supported_with_missing";
  missing_fields: string[];
}

export interface PredictionAbstention {
  status: "abstained";
  category: "unsupported" | "insufficient_input" | "malformed_upstream";
  message: string;
  reasons: { code: string; field: string; message: string }[];
}

/** Displayed predictions retain the backend's creation time and provenance. */
export type AnalysisResult = PredictionApiResponse;

/** The subset retained for the compact, session-local recent analyses list. */
export type RecentAnalysis = Pick<
  AnalysisResult,
  "nctid" | "title" | "probability" | "uncertainty" | "generated_at"
>;

export type FinanceRange =
  | "1d"
  | "5d"
  | "1mo"
  | "3mo"
  | "6mo"
  | "1y"
  | "2y"
  | "5y"
  | "10y"
  | "ytd"
  | "max";

export type FinanceInterval =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "1d"
  | "1wk"
  | "1mo"
  | "3mo";

export interface PricePoint {
  date: string;
  close: number;
}

/**
 * Company metadata returned by the finance endpoint.
 *
 * Fields are optional as well as nullable because the external provider may
 * omit individual values even when price history is available.
 */
export interface FinanceMetadata {
  marketCap?: number | null;
  enterpriseValue?: number | null;
  trailingPE?: number | null;
  forwardPE?: number | null;
  pegRatio?: number | null;
  priceToBook?: number | null;
  beta?: number | null;
  dividendYield?: number | null;
  returnOnEquity?: number | null;
  revenueGrowth?: number | null;
  grossMargins?: number | null;
  operatingMargins?: number | null;
  profitMargins?: number | null;
  totalRevenue?: number | null;
  ebitda?: number | null;
  totalDebt?: number | null;
  currentRatio?: number | null;
  quickRatio?: number | null;
  sector?: string | null;
  industry?: string | null;
  summary?: string | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
}

export interface FinanceResponse {
  ticker: string;
  range: FinanceRange;
  interval: FinanceInterval;
  prices: PricePoint[];
  metadata: FinanceMetadata;
}

export interface ApiErrorResponse {
  detail?: string;
}
