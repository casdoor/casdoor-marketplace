"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

// Reports clicks on the elements marked with data-track (and data-track-id for the integration), links to other
// sites, and text copied from the setup steps of an integration, and pings on every page so the backend counts its
// page views as a person's (crawlers and scanners don't run the script).
export function EventTracker() {
  const pathname = usePathname();

  useEffect(() => {
    track({ action: "ping" });
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-track], a[href]");
      if (!el) {
        return;
      }
      const target = el.getAttribute("data-track");
      if (target) {
        track({ action: "click", target, integrationId: el.getAttribute("data-track-id") ?? undefined });
        return;
      }
      const href = el.getAttribute("href") ?? "";
      if (/^https?:\/\//.test(href)) {
        try {
          const url = new URL(href);
          if (url.host !== window.location.host && !url.host.startsWith("marketplace.casdoor.")) {
            track({ action: "click", target: `outbound:${url.host}${url.pathname === "/" ? "" : url.pathname}` });
          }
        } catch {
          // not a URL
        }
      }
    };

    const onCopy = () => {
      const selection = document.getSelection();
      const node = selection?.anchorNode;
      const el = node instanceof Element ? node : node?.parentElement;
      if (!selection || selection.isCollapsed || !el) {
        return;
      }
      const area = el.closest("[data-track-copy]");
      track({ action: "copy", target: area?.getAttribute("data-track-copy") ?? "text" });
    };

    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("copy", onCopy);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("copy", onCopy);
    };
  }, []);

  return null;
}
