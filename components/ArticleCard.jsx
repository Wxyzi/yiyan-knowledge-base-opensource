import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Sparkles } from "lucide-react";
import { getCategoryById } from "@/lib/categories";

export default function ArticleCard({ article, lang = "zh", variant = "card" }) {
  const isZh = lang !== "en";
  const category = getCategoryById(article.category);
  const CategoryIcon = category.icon;
  const isFrontier = article.tags.includes("2026前沿");

  if (variant === "record") {
    return (
      <Link className="article-record" href={`/articles/${article.slug}?lang=${lang}`}>
        <div className="journal-meta"><span>{isZh ? category.zh : category.en}</span><span aria-hidden="true">/</span><span>{isZh ? article.levelZh : article.levelEn}</span>{isFrontier ? <span className="journal-frontier">{isZh ? "研究前沿" : "Research frontier"}</span> : null}</div>
        <h2>{isZh ? article.titleZh : article.titleEn}</h2>
        <p>{isZh ? article.summaryZh : article.summaryEn}</p>
        <div className="journal-reading-time"><span>{article.author}</span><CalendarDays size={13} />{article.date}<Clock size={13} />{isZh ? article.readingTimeZh : article.readingTimeEn}</div>
        <div className="article-record-footer"><div className="article-record-tags">{article.tags.filter((tag) => tag !== "2026前沿").slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div><span>{isZh ? "阅读全文" : "Read article"}<ArrowRight size={14} /></span></div>
      </Link>
    );
  }

  return (
    <Link className={`card article-card ${isFrontier ? "frontier-article-card" : ""}`} href={`/articles/${article.slug}?lang=${lang}`}>
      <div className="article-card-top" aria-hidden="true">
        <span className="mini-icon"><CategoryIcon size={16} /></span>
        {isFrontier ? (
          <span className="frontier-card-badge"><Sparkles size={13} />{isZh ? "2026 前沿" : "2026 Frontier"}</span>
        ) : (
          <span className="mini-spark"><Sparkles size={14} /></span>
        )}
      </div>
      <h3>{isZh ? article.titleZh : article.titleEn}</h3>
      <p>{isZh ? article.summaryZh : article.summaryEn}</p>
      <div className="meta-row">
        <span className="pill">{isZh ? category.zh : category.en}</span>
        <span className="pill">{isZh ? article.levelZh : article.levelEn}</span>
        <span className="pill"><Clock size={13} />{isZh ? article.readingTimeZh : article.readingTimeEn}</span>
        <span className="pill"><CalendarDays size={13} />{article.date}</span>
      </div>
      <div className="meta-row">
        {article.tags.filter((tag) => tag !== "2026前沿").slice(0, 3).map((tag) => (
          <span className="pill" key={tag}>#{tag}</span>
        ))}
      </div>
    </Link>
  );
}
