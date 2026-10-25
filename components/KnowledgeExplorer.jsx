"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, MessageCircleMore, RotateCw, Route } from "lucide-react";
import KnowledgeNoteCard from "@/components/KnowledgeNoteCard";
import KnowledgeNoteGrid from "@/components/KnowledgeNoteGrid";

export default function KnowledgeExplorer({ fields, articles, recentArticles = articles, lang = "zh" }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [active, setActive] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [limit, setLimit] = useState(16);
  const isZh = lang !== "en";
  const pool = sort === "recent" ? recentArticles : articles;
  const filtered = pool.filter((article) => active === "all" || article.category === active);
  const ordered = sort === "recent" ? [...filtered].sort((a, b) => b.date.localeCompare(a.date)) : filtered;
  const visible = ordered.slice(0, limit);
  const selected = fields.find((field) => field.id === active);
  function changeField(id) { setActive(id); setLimit(16); }
  function refreshRecommendations() {
    setLimit(16);
    startRefresh(() => router.refresh());
  }

  return (
    <section className="notes-explorer" aria-label={isZh ? "发现知识笔记" : "Discover knowledge notes"}>
      <div className="notes-feed-tabs">
        <div role="group" aria-label={isZh ? "笔记排序" : "Note order"}>
          <button type="button" aria-pressed={sort === "recommended"} onClick={() => { setSort("recommended"); setLimit(16); }}>{isZh ? "为你精选" : "Selected"}</button>
          <button type="button" aria-pressed={sort === "recent"} onClick={() => { setSort("recent"); setLimit(16); }}>{isZh ? "最近更新" : "Recent"}</button>
        </div>
        <nav aria-label={isZh ? "学习与交流" : "Learn and discuss"}>
          <Link href={`/paths?lang=${lang}`}><Route size={16} />{isZh ? "学习路径" : "Paths"}</Link>
          <Link href={`/discussions?lang=${lang}`}><MessageCircleMore size={16} />{isZh ? "讨论广场" : "Discussions"}</Link>
        </nav>
      </div>
      <div className="notes-fields" role="group" aria-label={isZh ? "按领域筛选笔记" : "Filter notes by field"}>
        <button type="button" aria-pressed={active === "all"} onClick={() => changeField("all")}><span className="note-emoji notes-field-emoji" aria-hidden="true">✨</span>{isZh ? "全部" : "All"}</button>
        {fields.map((field) => <button key={field.id} type="button" aria-pressed={active === field.id} onClick={() => changeField(field.id)}><span className="note-emoji notes-field-emoji" aria-hidden="true">{field.emoji}</span>{field.title}</button>)}
      </div>
      <div className="notes-result-heading">
        <p role="status">{refreshing ? (isZh ? "正在更换推荐…" : "Refreshing recommendations…") : selected ? `${selected.title} · ${selected.count} ${isZh ? "篇知识文章" : "articles"}` : (isZh ? "今天，也发现一点新知识" : "A little discovery, every day")}</p>
        <div className="notes-result-actions">
          {sort === "recommended" ? <button className="notes-refresh" type="button" onClick={refreshRecommendations} disabled={refreshing} aria-busy={refreshing} aria-label={isZh ? "换一批推荐" : "Refresh recommendations"} title={isZh ? "换一批推荐" : "Refresh recommendations"}><RotateCw size={18} aria-hidden="true" /></button> : null}
          <Link href={`/articles?category=${active}&lang=${lang}`}>{isZh ? "全部文章" : "All articles"}<ArrowRight size={14} /></Link>
        </div>
      </div>
      <KnowledgeNoteGrid>{visible.map((article) => <KnowledgeNoteCard key={article.slug} article={article} lang={lang} />)}</KnowledgeNoteGrid>
      <div className="notes-feed-end">
        {visible.length < ordered.length ? <button className="secondary-button" type="button" onClick={() => setLimit((value) => value + 16)}><ChevronDown size={16} />{isZh ? "再看一些" : "More notes"}</button> : <Link className="secondary-button" href={`/articles?category=${active}&lang=${lang}`}>{isZh ? "去文章库继续发现" : "Explore the article library"}<ArrowRight size={16} /></Link>}
      </div>
    </section>
  );
}
