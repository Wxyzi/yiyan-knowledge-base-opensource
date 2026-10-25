"use client";

import { useEffect } from "react";

const REVEAL_SELECTOR = [
  ".home-hero-copy",
  ".home-hero-map",
  ".home-decision-card",
  ".home-feature-item",
  ".home-coverage-item",
  ".resource-link-card",
  ".system-card",
  ".start-guide-card",
  ".article-card",
  ".article-overview",
  ".article-link-group",
  ".article-provenance",
  ".site-search-card",
  ".search-assistant-panel",
  ".search-guide-panel",
  ".term-card",
  ".method-card",
  ".tool-card",
  ".help-card",
  ".help-workflow-card",
  ".help-faq-item"
].join(",");

export default function MotionEnhancer() {
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const seenElements = new WeakSet();
    let revealCount = 0;
    let animationFrame = 0;

    document.body.classList.add("motion-ready");

    const updateProgress = () => {
      const articleContent = document.getElementById("article-content");
      let ratio = 0;

      if (articleContent) {
        const articleTop = articleContent.getBoundingClientRect().top + window.scrollY;
        const articleHeight = articleContent.scrollHeight;
        const start = Math.max(articleTop - 110, 0);
        const end = Math.max(articleTop + articleHeight - window.innerHeight * 0.58, start + 1);
        ratio = (window.scrollY - start) / (end - start);
      } else {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        ratio = max > 0 ? window.scrollY / max : 0;
      }

      ratio = Math.min(Math.max(ratio, 0), 1);
      root.style.setProperty("--scroll-progress", ratio.toFixed(4));
    };

    const updateReadingFocus = () => {
      const links = Array.from(document.querySelectorAll(".reader-nav-list a[href^='#'], .article-toc-list a[href^='#']"));
      if (!links.length) return;

      const candidates = Array.from(new Set(links
        .map((link) => {
          const hash = link.getAttribute("href") || "";
          const id = decodeURIComponent(hash.slice(1));
          return id ? document.getElementById(id) : null;
        })
        .filter(Boolean)))
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

      const offset = 132;
      let activeId = candidates[0]?.id;

      candidates.forEach((element) => {
        const top = element.getBoundingClientRect().top;
        if (top <= offset) activeId = element.id;
      });

      links.forEach((link) => {
        const hash = link.getAttribute("href") || "";
        link.classList.toggle("is-active", hash === `#${activeId}`);
      });
    };

    const updateMotionState = () => {
      animationFrame = 0;
      updateProgress();
      updateReadingFocus();
    };

    const scheduleUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateMotionState);
    };

    let observer = null;
    let mutationObserver = null;

    const prepareElement = (element) => {
      if (!(element instanceof HTMLElement) || seenElements.has(element)) return;
      seenElements.add(element);

      if (reducedMotion.matches || !observer) {
        element.classList.add("is-visible");
        return;
      }

      element.classList.add("reveal-on-scroll");
      element.style.setProperty("--reveal-order", String(revealCount % 8));
      revealCount += 1;
      observer.observe(element);
    };

    const prepareTree = (node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches(REVEAL_SELECTOR)) prepareElement(node);
      node.querySelectorAll(REVEAL_SELECTOR).forEach(prepareElement);
    };

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      document.querySelectorAll(REVEAL_SELECTOR).forEach(prepareElement);
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          });
        },
        {
          rootMargin: "0px 0px -8% 0px",
          threshold: 0.12
        }
      );

      document.querySelectorAll(REVEAL_SELECTOR).forEach(prepareElement);
      mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach(prepareTree);
        });
        scheduleUpdate();
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      observer?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      root.style.removeProperty("--scroll-progress");
      document.body.classList.remove("motion-ready");
    };
  }, []);

  return <div className="scroll-progress" data-scroll-progress aria-hidden="true" />;
}
