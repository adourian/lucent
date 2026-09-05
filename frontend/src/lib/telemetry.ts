type UsageEventName =
  | "page_view"
  | "analysis_submitted"
  | "analysis_succeeded"
  | "analysis_failed"
  | "analysis_rejected"
  | "example_selected"
  | "registry_link_opened";

interface UsageEventProperties {
  nctid?: string;
  reason?: "empty" | "format";
}

const APP_VERSION = "0.3.0";
const SCHEMA_VERSION = 1;
const CLIENT_ID_KEY = "lucent.analytics.client_id";
const SESSION_ID_KEY = "lucent.analytics.session_id";

let fallbackClientId: string | null = null;
let fallbackSessionId: string | null = null;

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function readOrCreateStorageId(
  storage: Storage | null,
  key: string,
  fallback: "client" | "session",
): string {
  const currentFallback = fallback === "client" ? fallbackClientId : fallbackSessionId;
  if (currentFallback) return currentFallback;

  try {
    const existing = storage?.getItem(key);
    if (existing) return existing;
    const created = createId();
    storage?.setItem(key, created);
    if (fallback === "client") fallbackClientId = created;
    else fallbackSessionId = created;
    return created;
  } catch {
    const created = createId();
    if (fallback === "client") fallbackClientId = created;
    else fallbackSessionId = created;
    return created;
  }
}

function getStorage(kind: "local" | "session"): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function viewportClass(width: number): string {
  if (width < 480) return "mobile-narrow";
  if (width < 768) return "mobile";
  if (width < 1200) return "tablet";
  return "desktop";
}

function apiBase(): string {
  return (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
}

/**
 * Send a small first-party event. Failure is intentionally silent: telemetry
 * must never change the inference experience or expose an error to the user.
 */
export function trackEvent(
  event: UsageEventName,
  properties: UsageEventProperties = {},
): void {
  if (typeof window === "undefined") return;

  const payload = {
    schema_version: SCHEMA_VERSION,
    event,
    client_id: readOrCreateStorageId(
      getStorage("local"),
      CLIENT_ID_KEY,
      "client",
    ),
    session_id: readOrCreateStorageId(
      getStorage("session"),
      SESSION_ID_KEY,
      "session",
    ),
    nctid: properties.nctid,
    reason: properties.reason,
    app_version: APP_VERSION,
    route: window.location.pathname,
    viewport: viewportClass(window.innerWidth),
    source: "web" as const,
  };

  void fetch(`${apiBase()}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Product usage tracking is best effort and must not affect the app.
  });
}
