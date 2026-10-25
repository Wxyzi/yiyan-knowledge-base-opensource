"use client";

import { Children, useEffect, useRef } from "react";

export default function KnowledgeNoteGrid({ children, className = "" }) {
  const gridRef = useRef(null);
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || typeof ResizeObserver === "undefined") return;
    const articles = [...grid.querySelectorAll(":scope > .note-grid-item > article")];
    const measure = () => {
      const gap = parseFloat(getComputedStyle(grid).rowGap);
      // Small grid rows retain DOM reading order while allowing varied card heights.
      articles.forEach((article) => {
        article.parentElement.style.gridRowEnd = `span ${Math.ceil((article.getBoundingClientRect().height + gap) / (6 + gap))}`;
      });
      grid.dataset.masonry = "true";
    };
    const observer = new ResizeObserver(measure);
    articles.forEach((article) => observer.observe(article));
    measure();
    return () => observer.disconnect();
  }, [children]);

  return <div ref={gridRef} className={`notes-grid ${className}`}>{Children.map(children, (child) => <div className="note-grid-item">{child}</div>)}</div>;
}
