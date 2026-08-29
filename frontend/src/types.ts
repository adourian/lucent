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
}

/** A prediction annotated with the client-side time at which it was generated. */
export interface AnalysisResult extends PredictionApiResponse {
  generatedAt: string;
}

/** The subset retained for the compact, session-local recent analyses list. */
export type RecentAnalysis = Pick<
  AnalysisResult,
  "nctid" | "title" | "probability" | "uncertainty" | "generatedAt"
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
