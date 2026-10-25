import Link from "next/link";
import { ArrowUpRight, Clock3, MessageCircle } from "lucide-react";
import { getCategoryById } from "@/lib/categories";

export default function KnowledgeNoteCard({ article, lang = "zh" }) {
  const isZh = lang !== "en";
  const category = getCategoryById(article.category);
  const title = isZh ? article.titleZh : article.titleEn;
  const summary = isZh ? article.summaryZh : article.summaryEn;
  const hash = [...article.slug].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const coverTags = article.tags.filter((tag) => tag !== "2026前沿").slice(0, 2);
  const href = `/articles/${article.slug}?lang=${lang}`;

  return (
    <article className={`knowledge-note note-${article.category} ${isZh ? "" : "note-en"}`}>
      <Link href={href} className="note-reading-link">
        <div className={`note-cover note-cover-${hash % 3}`}>
          <div className="note-cover-top"><span>{isZh ? category.zh : category.en}</span><span className="note-emoji note-cover-emoji" aria-hidden="true">{category.emoji}</span></div>
          <h2 className={`note-cover-title ${title.length > (isZh ? 20 : 55) ? "note-title-long" : ""}`}>{title}</h2>
          <div className="note-cover-bottom"><span>{isZh ? article.levelZh : article.levelEn}</span><ArrowUpRight size={19} aria-hidden="true" /></div>
        </div>
        <div className="note-caption">
          <p>{summary}</p>
          <div className="note-tags">{coverTags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
        </div>
      </Link>
      <div className="note-meta">
        <span className="note-author"><span aria-hidden="true">{isZh ? "研" : "Y"}</span>{article.author || (isZh ? "译研知识库" : "Yiyan")}</span>
        <Link className="note-discuss" href={`${href}#discussion`} aria-label={isZh ? `讨论：${title}` : `Discuss: ${title}`} title={isZh ? "参与讨论" : "Join discussion"}><MessageCircle size={17} /></Link>
      </div>
      <div className="note-reading-time"><Clock3 size={12} aria-hidden="true" />{isZh ? article.readingTimeZh : article.readingTimeEn}<span>{article.date}</span></div>
    </article>
  );
}
