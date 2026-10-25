"use client";

import { useEffect } from "react";

const VIEW_WINDOW_MS = 15 * 60 * 1000;

function getDeviceInfo() {
  if (typeof window === "undefined") return {};

  return {
    userAgent: window.navigator.userAgent,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    locale: window.navigator.language || "",
    screenWidth: window.screen?.width || null,
    screenHeight: window.screen?.height || null
  };
}

export default function ArticleViewTracker({ articleSlug, articleTitle, category }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_LEARNING_ANALYTICS !== "true") return;
    if (typeof window === "undefined" || !articleSlug) return;

    const bucket = Math.floor(Date.now() / VIEW_WINDOW_MS);
    const storageKey = `yiyan.articleView.${articleSlug}.${bucket}`;

    if (window.sessionStorage.getItem(storageKey)) return;

    let cancelled = false;

    async function recordView() {
      try {
        const response = await fetch("/api/article-views", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleSlug,
            articleTitle,
            category,
            device: getDeviceInfo(),
            locationConsent: false,
            location: null
          })
        });

        if (!response.ok) return;

        if (!cancelled) {
          window.sessionStorage.setItem(storageKey, "1");
        }
      } catch {
        // Analytics should never block reading.
      }
    }

    recordView();

    return () => {
      cancelled = true;
    };
  }, [articleSlug, articleTitle, category]);

  return null;
}
