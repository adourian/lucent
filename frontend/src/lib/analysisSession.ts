// Older sessions contain browser-generated timestamps with no provenance.
export const ANALYSIS_SESSION_KEY = "lucent.analysis-session.v2";

export function clearAnalysisSession(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(ANALYSIS_SESSION_KEY);
  } catch {
    // Navigation still works when browser storage is unavailable.
  }
}
