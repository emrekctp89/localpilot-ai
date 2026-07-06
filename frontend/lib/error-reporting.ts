type ErrorContext = {
  boundary?: string;
  digest?: string;
  route?: string;
};

type ErrorPayload = {
  message: string;
  stack?: string;
  digest?: string;
  boundary?: string;
  route?: string;
  timestamp: string;
  userAgent?: string;
};

const reportedErrors = new Set<string>();

function buildErrorKey(error: Error, context: ErrorContext): string {
  return [context.boundary, context.digest, error.message].filter(Boolean).join(":");
}

function buildPayload(error: Error, context: ErrorContext): ErrorPayload {
  return {
    message: error.message,
    stack: error.stack,
    digest: context.digest,
    boundary: context.boundary,
    route:
      context.route ??
      (typeof window !== "undefined" ? window.location.pathname : undefined),
    timestamp: new Date().toISOString(),
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };
}

async function sendToEndpoint(payload: ErrorPayload, endpoint: string) {
  await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  });
}

export function captureClientError(error: Error, context: ErrorContext = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const key = buildErrorKey(error, context);
  if (reportedErrors.has(key)) {
    return;
  }
  reportedErrors.add(key);

  const payload = buildPayload(error, context);
  console.error("[LocalPilot]", payload);

  const endpoint = process.env.NEXT_PUBLIC_ERROR_REPORT_URL?.trim();
  if (!endpoint) {
    return;
  }

  void sendToEndpoint(payload, endpoint).catch(() => {
    // Reporting must never break the UI.
  });
}