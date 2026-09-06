import { useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import AboutPage from "./AboutPage";
import AnalysisReport from "./components/AnalysisReport";
import AppShell from "./components/AppShell";
import RecentAnalyses from "./components/RecentAnalyses";
import TrialSearch from "./components/TrialSearch";
import { ANALYSIS_SESSION_KEY } from "./lib/analysisSession";
import RouteMetadata from "./RouteMetadata";
import { trackEvent } from "./lib/telemetry";
import { isPredictionResponse, isPredictionTimestamp } from "./lib/prediction";
import type {
  AnalysisResult,
  ApiErrorResponse,
  RecentAnalysis,
} from "./types";

const MODEL_METADATA = {
  modelVersion: "0.3.0",
  lastUpdated: "July 2025",
  datasetSize: "33K trials",
} as const;

const NCT_ID_PATTERN = /^NCT\d{8}$/;

interface StoredAnalysisSession {
  result: AnalysisResult | null;
  recentAnalyses: RecentAnalysis[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecentAnalysis(value: unknown): value is RecentAnalysis {
  return (
    isRecord(value) &&
    typeof value.nctid === "string" &&
    typeof value.title === "string" &&
    isFiniteNumber(value.probability) &&
    isFiniteNumber(value.uncertainty) &&
    isPredictionTimestamp(value.generated_at)
  );
}

function readAnalysisSession(): StoredAnalysisSession {
  const emptySession: StoredAnalysisSession = {
    result: null,
    recentAnalyses: [],
  };

  if (typeof window === "undefined") return emptySession;

  try {
    const stored = window.sessionStorage.getItem(ANALYSIS_SESSION_KEY);
    if (!stored) return emptySession;

    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed)) return emptySession;

    return {
      result: isPredictionResponse(parsed.result) ? parsed.result : null,
      recentAnalyses: Array.isArray(parsed.recentAnalyses)
        ? parsed.recentAnalyses.filter(isRecentAnalysis).slice(0, 5)
        : [],
    };
  } catch {
    return emptySession;
  }
}

function readApiDetail(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const detail = (payload as ApiErrorResponse).detail;
  return typeof detail === "string" && detail.trim() ? detail.trim() : null;
}

function getPredictionError(payload: unknown, status: number): string {
  const detail = readApiDetail(payload);

  if ((status === 400 || status === 404) && detail) return detail;
  if (status === 502) {
    return "ClinicalTrials.gov could not provide the trial record. Try again in a moment.";
  }
  if (status >= 500) {
    return "The prediction service could not complete this analysis. Try again in a moment.";
  }
  return detail ?? "The analysis request was not accepted. Please try again.";
}

function buildPredictionUrl(nctid: string): string {
  const baseUrl = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
  return `${baseUrl}/predict/${encodeURIComponent(nctid)}`;
}

function HomePage() {
  const [restoredSession] = useState(readAnalysisSession);
  const [nctid, setNctid] = useState(restoredSession.result?.nctid ?? "");
  const [result, setResult] = useState<AnalysisResult | null>(
    restoredSession.result,
  );
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>(
    restoredSession.recentAnalyses,
  );
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const reportRef = useRef<HTMLElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => requestRef.current?.abort();
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        ANALYSIS_SESSION_KEY,
        JSON.stringify({ result, recentAnalyses }),
      );
    } catch {
      // The analysis remains usable when browser storage is unavailable.
    }
  }, [recentAnalyses, result]);

  useEffect(() => {
    if (result) reportRef.current?.focus();
  }, [result]);

  const updateNctid = (value: string) => {
    setNctid(value);
    setFieldError(null);
    setServiceError(null);
  };

  const runAnalysis = async () => {
    const normalizedNctid = nctid.trim().toUpperCase();
    setNctid(normalizedNctid);
    setFieldError(null);
    setServiceError(null);

    if (!normalizedNctid) {
      setFieldError("Enter a ClinicalTrials.gov NCT identifier.");
      trackEvent("analysis_rejected", { reason: "empty" });
      return;
    }

    if (!NCT_ID_PATTERN.test(normalizedNctid)) {
      setFieldError(
        "Use NCT followed by eight digits, for example NCT05822830.",
      );
      trackEvent("analysis_rejected", { reason: "format" });
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    trackEvent("analysis_submitted", { nctid: normalizedNctid });

    try {
      const response = await fetch(buildPredictionUrl(normalizedNctid), {
        signal: controller.signal,
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getPredictionError(payload, response.status));
      }
      if (!isPredictionResponse(payload)) {
        throw new Error("The prediction service returned an invalid response.");
      }

      const nextResult: AnalysisResult = payload;
      setResult(nextResult);
      trackEvent("analysis_succeeded", { nctid: normalizedNctid });
      setRecentAnalyses((current) => {
        const nextRecent: RecentAnalysis = {
          nctid: nextResult.nctid,
          title: nextResult.title,
          probability: nextResult.probability,
          uncertainty: nextResult.uncertainty,
          generated_at: nextResult.generated_at,
        };
        return [
          nextRecent,
          ...current.filter((item) => item.nctid !== nextRecent.nctid),
        ].slice(0, 5);
      });
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") return;
      setServiceError(
        caught instanceof TypeError
          ? "Could not reach the prediction service. Check the connection and try again."
          : caught instanceof Error
          ? caught.message
          : "The prediction service is currently unavailable.",
      );
      trackEvent("analysis_failed", { nctid: normalizedNctid });
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  };

  const selectRecentAnalysis = (selectedNctid: string) => {
    updateNctid(selectedNctid);
    const input = document.getElementById("nctid-input");
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    input?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "center",
    });
    input?.focus({ preventScroll: true });
  };

  const resetAnalysis = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setNctid("");
    setResult(null);
    setRecentAnalyses([]);
    setLoading(false);
    setFieldError(null);
    setServiceError(null);
  };

  return (
    <AppShell onBrandActivate={resetAnalysis}>
      <main
        id="main-content"
        className={`analysis-page${result ? "" : " analysis-page--empty"}`}
      >
        <TrialSearch
          nctid={nctid}
          modelVersion={MODEL_METADATA.modelVersion}
          datasetSize={MODEL_METADATA.datasetSize}
          loading={loading}
          hasResult={Boolean(result)}
          fieldError={fieldError}
          serviceError={serviceError}
          onChange={updateNctid}
          onExampleSelect={(example) =>
            trackEvent("example_selected", { nctid: example })
          }
          onSubmit={() => void runAnalysis()}
        />

        {result && (
          <AnalysisReport
            ref={reportRef}
            result={result}
            loading={loading}
            requestFailed={Boolean(fieldError || serviceError)}
          />
        )}

        {result && (
          <RecentAnalyses
            analyses={recentAnalyses}
            onSelect={selectRecentAnalysis}
          />
        )}
      </main>
    </AppShell>
  );
}

function UsagePageTracker() {
  const location = useLocation();

  useEffect(() => {
    trackEvent("page_view");
  }, [location.pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <UsagePageTracker />
      <RouteMetadata />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/about"
          element={
            <AboutPage
              modelStats={{
                modelVersion: MODEL_METADATA.modelVersion,
                lastUpdated: MODEL_METADATA.lastUpdated,
                datasetSize: MODEL_METADATA.datasetSize,
              }}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
