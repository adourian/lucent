import { sponsorToTicker } from "../sponsor_to_tickr";

const UNAVAILABLE = "—";

const STATUS_LABELS: Readonly<Record<string, string>> = {
  ACTIVE_NOT_RECRUITING: "Active, not recruiting",
  APPROVED_FOR_MARKETING: "Approved for marketing",
  AVAILABLE: "Available",
  COMPLETED: "Completed",
  ENROLLING_BY_INVITATION: "Enrolling by invitation",
  NO_LONGER_AVAILABLE: "No longer available",
  NOT_YET_RECRUITING: "Not yet recruiting",
  RECRUITING: "Recruiting",
  SUSPENDED: "Suspended",
  TEMPORARILY_NOT_AVAILABLE: "Temporarily not available",
  TERMINATED: "Terminated",
  UNKNOWN: "Unknown",
  WITHDRAWN: "Withdrawn",
  WITHHELD: "Withheld",
};

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normaliseDigits(digits: number): number {
  if (!Number.isFinite(digits)) return 1;
  return Math.min(6, Math.max(0, Math.round(digits)));
}

export function formatProbability(
  value: number | null | undefined,
  digits = 1,
): string {
  if (!isFiniteNumber(value)) return UNAVAILABLE;

  const precision = normaliseDigits(digits);
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
}

export function formatPercentagePoints(
  value: number | null | undefined,
  digits = 1,
): string {
  if (!isFiniteNumber(value)) return UNAVAILABLE;

  const precision = normaliseDigits(digits);
  return `${(value * 100).toFixed(precision)} pp`;
}

/**
 * Formats a large monetary value without assuming a currency the API does not
 * provide. Pass an ISO currency code when that context is available.
 */
export function formatCompactCurrency(
  value: number | null | undefined,
  currency?: string,
): string {
  if (!isFiniteNumber(value)) return UNAVAILABLE;

  const baseOptions: Intl.NumberFormatOptions = {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  };

  if (currency) {
    try {
      return new Intl.NumberFormat("en-US", {
        ...baseOptions,
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
      }).format(value);
    } catch {
      // Fall through to a unit-neutral value if the currency code is invalid.
    }
  }

  return new Intl.NumberFormat("en-US", baseOptions).format(value);
}

export function formatNumber(
  value: number | null | undefined,
  maximumFractionDigits = 0,
): string {
  if (!isFiniteNumber(value)) return UNAVAILABLE;

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: normaliseDigits(maximumFractionDigits),
  }).format(value);
}

export function formatPrice(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return UNAVAILABLE;

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatRegistryValue(
  value: string | number | null | undefined,
  fallback = "Not reported",
): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? formatNumber(value) : fallback;
  }

  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed || /^(?:n\/?a|na|null|none|unknown)$/i.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

export function formatEnrollment(
  value: string | number | null | undefined,
): string {
  if (typeof value === "number") return formatNumber(value);
  if (typeof value !== "string" || !value.trim()) return "Not reported";

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return formatNumber(Number(trimmed));
  return formatRegistryValue(trimmed);
}

export function formatGeneratedTime(value: string | null | undefined): string {
  if (!value) return "Time unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(value: string | null | undefined): string {
  if (!value?.trim()) return "Not reported";

  const trimmed = value.trim();
  const isoMatch = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(trimmed);
  if (!isoMatch) return trimmed;

  const year = Number(isoMatch[1]);
  const month = isoMatch[2] ? Number(isoMatch[2]) : undefined;
  const day = isoMatch[3] ? Number(isoMatch[3]) : undefined;

  if (!month) return String(year);
  if (month < 1 || month > 12) return trimmed;
  if (day !== undefined && (day < 1 || day > 31)) return trimmed;

  const date = new Date(Date.UTC(year, month - 1, day ?? 1));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    (day !== undefined && date.getUTCDate() !== day)
  ) {
    return trimmed;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: day === undefined ? undefined : "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatStatus(value: string | null | undefined): string {
  if (!value?.trim() || /^(?:n\/?a|na|null|none)$/i.test(value.trim())) {
    return "Status not reported";
  }

  const key = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const knownLabel = STATUS_LABELS[key];
  if (knownLabel) return knownLabel;

  const words = key.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Resolves only an exact, case-insensitive sponsor-name match. */
export function getSponsorTicker(
  sponsor: string | null | undefined,
): string | null {
  const normalisedSponsor = sponsor?.trim().toLocaleLowerCase("en-US");
  if (!normalisedSponsor) return null;

  const match = Object.entries(sponsorToTicker).find(
    ([name]) => name.trim().toLocaleLowerCase("en-US") === normalisedSponsor,
  );

  return match?.[1] ?? null;
}
