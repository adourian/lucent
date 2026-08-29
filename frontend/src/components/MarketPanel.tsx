import { useEffect, useId, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatCompactCurrency,
  formatPercentagePoints,
  formatPrice,
} from "../lib/format";
import type {
  FinanceMetadata,
  FinanceRange,
  FinanceResponse,
  PricePoint,
} from "../types";

const RANGE_OPTIONS: ReadonlyArray<{
  value: FinanceRange;
  label: string;
}> = [
  { value: "5d", label: "5 days" },
  { value: "1mo", label: "1 month" },
  { value: "3mo", label: "3 months" },
  { value: "6mo", label: "6 months" },
  { value: "1y", label: "1 year" },
  { value: "2y", label: "2 years" },
  { value: "5y", label: "5 years" },
  { value: "10y", label: "10 years" },
  { value: "max", label: "Maximum" },
];

const FINANCE_RANGES: ReadonlySet<string> = new Set([
  "1d",
  "5d",
  "1mo",
  "3mo",
  "6mo",
  "1y",
  "2y",
  "5y",
  "10y",
  "ytd",
  "max",
]);

interface MarketPanelProps {
  ticker: string;
}

interface DefinitionRow {
  label: string;
  value: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPricePoint(value: unknown): value is PricePoint {
  return (
    isRecord(value) &&
    typeof value.date === "string" &&
    typeof value.close === "number" &&
    Number.isFinite(value.close)
  );
}

function isPricePointOrMissingClose(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.date === "string" &&
    (value.close === null ||
      (typeof value.close === "number" && Number.isFinite(value.close)))
  );
}

function isNullableNumber(value: unknown): value is number | null | undefined {
  return value === null || value === undefined ||
    (typeof value === "number" && Number.isFinite(value));
}

function isNullableString(value: unknown): value is string | null | undefined {
  return value === null || value === undefined || typeof value === "string";
}

function isFinanceMetadata(value: unknown): value is FinanceMetadata {
  if (!isRecord(value)) return false;

  const numericKeys: ReadonlyArray<keyof FinanceMetadata> = [
    "marketCap",
    "enterpriseValue",
    "trailingPE",
    "forwardPE",
    "pegRatio",
    "priceToBook",
    "beta",
    "dividendYield",
    "returnOnEquity",
    "revenueGrowth",
    "grossMargins",
    "operatingMargins",
    "profitMargins",
    "totalRevenue",
    "ebitda",
    "totalDebt",
    "currentRatio",
    "quickRatio",
    "fiftyTwoWeekHigh",
    "fiftyTwoWeekLow",
  ];
  const stringKeys: ReadonlyArray<keyof FinanceMetadata> = [
    "sector",
    "industry",
    "summary",
  ];

  return (
    numericKeys.every((key) => isNullableNumber(value[key])) &&
    stringKeys.every((key) => isNullableString(value[key]))
  );
}

function isFinanceRange(value: unknown): value is FinanceRange {
  return typeof value === "string" && FINANCE_RANGES.has(value);
}

function parseFinanceResponse(value: unknown): FinanceResponse | null {
  if (
    !isRecord(value) ||
    typeof value.ticker !== "string" ||
    !isFinanceRange(value.range) ||
    value.interval !== "1d" ||
    !Array.isArray(value.prices) ||
    !value.prices.every(isPricePointOrMissingClose) ||
    !isFinanceMetadata(value.metadata)
  ) {
    return null;
  }

  return {
    ticker: value.ticker,
    range: value.range,
    interval: value.interval,
    prices: value.prices.filter(isPricePoint),
    metadata: value.metadata,
  };
}

function getApiError(payload: unknown, status: number): string {
  if (
    isRecord(payload) &&
    typeof payload.detail === "string" &&
    payload.detail.trim()
  ) {
    return payload.detail;
  }

  if (status === 404) return "No market data is available for this ticker.";
  return "Market data is currently unavailable.";
}

function formatRatio(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return value.toFixed(2);
}

function formatChartDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function hasValue(value: number | string | null | undefined): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.trim().length > 0;
}

function getDefinitionRows(metadata: FinanceMetadata): DefinitionRow[] {
  const rows: Array<DefinitionRow & { present: boolean }> = [
    {
      label: "Sector",
      value: metadata.sector?.trim() || "—",
      present: hasValue(metadata.sector),
    },
    {
      label: "Industry",
      value: metadata.industry?.trim() || "—",
      present: hasValue(metadata.industry),
    },
    {
      label: "Market capitalisation",
      value: formatCompactCurrency(metadata.marketCap),
      present: hasValue(metadata.marketCap),
    },
    {
      label: "Enterprise value",
      value: formatCompactCurrency(metadata.enterpriseValue),
      present: hasValue(metadata.enterpriseValue),
    },
    {
      label: "Total revenue",
      value: formatCompactCurrency(metadata.totalRevenue),
      present: hasValue(metadata.totalRevenue),
    },
    {
      label: "Trailing P/E",
      value: formatRatio(metadata.trailingPE),
      present: hasValue(metadata.trailingPE),
    },
    {
      label: "Price / book",
      value: formatRatio(metadata.priceToBook),
      present: hasValue(metadata.priceToBook),
    },
    {
      label: "Beta",
      value: formatRatio(metadata.beta),
      present: hasValue(metadata.beta),
    },
    {
      label: "Current ratio",
      value: formatRatio(metadata.currentRatio),
      present: hasValue(metadata.currentRatio),
    },
    {
      label: "Dividend yield",
      value: `${formatRatio(metadata.dividendYield)}%`,
      present: hasValue(metadata.dividendYield),
    },
    {
      label: "Profit margin",
      value: formatPercentagePoints(metadata.profitMargins).replace(" pp", "%"),
      present: hasValue(metadata.profitMargins),
    },
    {
      label: "Return on equity",
      value: `${formatRatio(metadata.returnOnEquity)}%`,
      present: hasValue(metadata.returnOnEquity),
    },
    {
      label: "52-week low",
      value: formatPrice(metadata.fiftyTwoWeekLow),
      present: hasValue(metadata.fiftyTwoWeekLow),
    },
    {
      label: "52-week high",
      value: formatPrice(metadata.fiftyTwoWeekHigh),
      present: hasValue(metadata.fiftyTwoWeekHigh),
    },
  ];

  return rows.filter(({ present }) => present).map(({ label, value }) => ({
    label,
    value,
  }));
}

function buildFinanceUrl(ticker: string, range: FinanceRange): string {
  const baseUrl = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
  return `${baseUrl}/finance/${encodeURIComponent(ticker)}?range=${range}&interval=1d`;
}

export function MarketPanel({ ticker }: MarketPanelProps) {
  const rangeId = useId();
  const chartTitleId = useId();
  const [range, setRange] = useState<FinanceRange>("6mo");
  const [finance, setFinance] = useState<FinanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFinanceData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(buildFinanceUrl(ticker, range), {
          signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(getApiError(payload, response.status));
        }
        const parsedFinance = parseFinanceResponse(payload);
        if (!parsedFinance) {
          throw new Error("The market-data service returned an invalid response.");
        }

        setFinance(parsedFinance);
      } catch (caught) {
        if (caught instanceof Error && caught.name === "AbortError") return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Market data is currently unavailable.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadFinanceData();
    return () => controller.abort();
  }, [range, requestVersion, ticker]);

  const definitionRows = useMemo(
    () => (finance ? getDefinitionRows(finance.metadata) : []),
    [finance],
  );
  const hasPrices = Boolean(finance?.prices.length);
  const chartSummary = useMemo(() => {
    if (!finance?.prices.length) return null;

    const closes = finance.prices.map((point) => point.close);
    const first = finance.prices[0];
    const last = finance.prices[finance.prices.length - 1];
    return `${ticker} daily close from ${first.date} (${formatPrice(
      first.close,
    )}) to ${last.date} (${formatPrice(last.close)}). Period low ${formatPrice(
      Math.min(...closes),
    )}; period high ${formatPrice(
      Math.max(...closes),
    )}. The endpoint does not provide a currency code.`;
  }, [finance, ticker]);

  return (
    <section className="market-panel" aria-labelledby={chartTitleId}>
      <div className="market-panel__header">
        <div>
          <p className="market-panel__eyebrow">External market data</p>
          <h3 className="market-panel__title" id={chartTitleId}>
            {ticker} closing price
          </h3>
        </div>
        <div className="market-panel__range-control">
          <label className="market-panel__range-label" htmlFor={rangeId}>
            Period
          </label>
          <select
            className="market-panel__range-select"
            id={rangeId}
            value={range}
            disabled={loading && !finance}
            onChange={(event) => {
              if (isFinanceRange(event.currentTarget.value)) {
                setRange(event.currentTarget.value);
              }
            }}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && !finance ? (
        <div className="market-panel__loading" role="status" aria-live="polite">
          Retrieving external market data…
        </div>
      ) : null}

      {error ? (
        <div className="market-panel__error" role="alert">
          <p>{error}</p>
          <button
            className="market-panel__retry"
            type="button"
            onClick={() => setRequestVersion((version) => version + 1)}
          >
            Retry
          </button>
        </div>
      ) : null}

      {!error && hasPrices && finance ? (
        <figure className="market-panel__figure">
          {chartSummary ? <p className="sr-only">{chartSummary}</p> : null}
          <div className="market-panel__chart">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart
                accessibilityLayer
                data={finance.prices}
                margin={{ top: 12, right: 12, bottom: 4, left: 0 }}
              >
                <CartesianGrid
                  stroke="currentColor"
                  strokeDasharray="2 5"
                  vertical={false}
                  className="market-panel__grid"
                />
                <XAxis
                  axisLine={false}
                  dataKey="date"
                  minTickGap={32}
                  tickLine={false}
                  tickFormatter={formatChartDate}
                />
                <YAxis
                  axisLine={false}
                  domain={["auto", "auto"]}
                  tickLine={false}
                  tickFormatter={(value: number) => formatPrice(value)}
                  width={58}
                />
                <Tooltip
                  animationDuration={100}
                  labelFormatter={(label) => formatChartDate(String(label))}
                  formatter={(value) => [
                    formatPrice(typeof value === "number" ? value : Number(value)),
                    "Close",
                  ]}
                />
                <Line
                  dataKey="close"
                  dot={false}
                  isAnimationActive={false}
                  stroke="var(--color-accent, #315ac6)"
                  strokeWidth={1.75}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <figcaption className="market-panel__caption">
            Daily close · {RANGE_OPTIONS.find((option) => option.value === range)?.label}
            {loading ? " · Updating…" : ""} · Currency not provided
          </figcaption>
        </figure>
      ) : null}

      {!loading && !error && finance && !hasPrices ? (
        <p className="market-panel__empty" role="status">
          No price observations are available for this period.
        </p>
      ) : null}

      {!error && finance && definitionRows.length > 0 ? (
        <dl className="market-panel__definitions">
          {definitionRows.map((row) => (
            <div className="market-panel__definition" key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {!loading && !error && finance && definitionRows.length === 0 ? (
        <p className="market-panel__metadata-empty">
          Company metadata is unavailable for this ticker.
        </p>
      ) : null}

      {finance && definitionRows.some((row) =>
        ["Market capitalisation", "Enterprise value", "Total revenue"].includes(
          row.label,
        ),
      ) ? (
        <p className="market-panel__units-note">
          The endpoint does not provide a currency code; monetary figures are
          shown in provider-reported units.
        </p>
      ) : null}
    </section>
  );
}

export default MarketPanel;
