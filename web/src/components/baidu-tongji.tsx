"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    _hmt?: unknown[][];
  }
}

// Baidu Tongji, when the admin console sets it (the backend then puts its script into the page), only counts the page
// it is loaded on; report client-side navigations as page views. Google Analytics counts them by itself.
export function BaiduTongjiPageview() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window._hmt?.push(["_trackPageview", pathname]);
  }, [pathname]);

  return null;
}
