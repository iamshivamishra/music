"use client";

import { useEffect } from "react";

/**
 * Client-side error reporter.
 * Listens for unhandled errors and promise rejections and sends them
 * to our internal error-tracking endpoint.
 *
 * When a third-party service is configured (Sentry, LogRocket, etc.),
 * replace the `reportError` function body with the vendor SDK call.
 */
export default function ErrorReporter() {
  useEffect(() => {
    function reportError(payload: {
      message: string;
      stack?: string;
      source?: string;
    }) {
      try {
        const endpoint = "/api/errors/report";
        const body = JSON.stringify({
          ...payload,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        });
        if (navigator.sendBeacon) {
          navigator.sendBeacon(endpoint, body);
        } else {
          fetch(endpoint, {
            method: "POST",
            body,
            headers: { "Content-Type": "application/json" },
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // Silently fail — error reporting should never crash the app
      }
    }

    function handleError(event: ErrorEvent) {
      reportError({
        message: event.message,
        stack: event.error?.stack,
        source: `${event.filename}:${event.lineno}:${event.colno}`,
      });
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      reportError({
        message:
          reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        source: "unhandledrejection",
      });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
