// Reports what visitors do on the pages to the backend (/api/add-event), which keeps it for the admin's statistics.
// Page views are counted by the backend itself.

export type TrackEvent = {
  // "ping" only tells the backend the page has run in a browser, so the page views count as a person's
  action: "click" | "copy" | "search" | "filter" | "ping";
  target?: string;
  integrationId?: string;
  query?: string;
  count?: number;
};

export function track(event: TrackEvent) {
  if (typeof window === "undefined") {
    return;
  }
  const body = JSON.stringify({ source: "site", path: window.location.pathname, ...event });
  try {
    if (navigator.sendBeacon?.("/api/add-event", new Blob([body], { type: "text/plain" }))) {
      return;
    }
    void fetch("/api/add-event", { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {
    // statistics never get in the way
  }
}
