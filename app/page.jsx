import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, BookOpen, Heart, Route, Tags, Wrench, MessageCircleMore, Clock3 } from "lucide-react";
import { getAllArticles } from "@/lib/markdown";
import { getNoteFeeds } from "@/lib/noteRecommendations";
import { getAiProviderConfig } from "@/lib/aiProvider";
import { categories } from "@/lib/categories";
import { learningPaths } from "@/data/learningPaths";
import { terms } from "@/data/terms";
import { researchMethods } from "@/data/researchMethods";
import SiteSearchAssistant from "@/components/SiteSearchAssistant";
import KnowledgeExplorer from "@/components/KnowledgeExplorer";

export default async function HomePage({ searchParams }) {
  await connection();
  const sp = await searchParams;
  const lang = sp?.lang === "en" ? "en" : "zh";
  const isZh = lang === "zh";
  const articles = getAllArticles();
  const categoryOrder = ["corpus", "applied-linguistics", "statistics", "discourse-analysis", "translation-tech", "linguistics", "ai", "methods"];
  const fields = categoryOrder.map((id) => {
    const category = categories.find((item) => item.id === id);
    return { id, title: isZh ? category.zh : category.en, emoji: category.emoji, count: articles.filter((article) => article.category === id).length };
  });
  const feeds = getNoteFeeds(articles, categoryOrder);
  const toNote = (article) => ({
    slug: article.slug, titleZh: article.titleZh, titleEn: article.titleEn,
    summaryZh: article.summaryZh, summaryEn: article.summaryEn, category: article.category,
    readingTimeZh: article.readingTimeZh, readingTimeEn: article.readingTimeEn,
    levelZh: article.levelZh, levelEn: article.levelEn, date: article.date, tags: article.tags, author: article.author
  });
  const resources = [
    { icon: BookOpen, zh: "知识文章", en: "Articles", count: articles.length, path: "/articles" },
    { icon: Route, zh: "学习路径", en: "Paths", count: learningPaths.length, path: "/paths" },
    { icon: Tags, zh: "核心术语", en: "Terms", count: terms.length, path: "/terms" },
    { icon: Wrench, zh: "研究方法", en: "Methods", count: researchMethods.length, path: "/methods" }
  ];
  return (
    <div className="notes-home">
      <div className="notes-welcome"><div><h1><span>{isZh ? "发现知识，也发现灵感。" : "Discover knowledge. Find inspiration."}</span><span className="note-emoji notes-welcome-emoji" aria-hidden="true">😊</span></h1><p>{isZh ? "语言学 · 翻译 · 语料库 · 科研方法" : "Linguistics · Translation · Corpora · Research"}</p></div><Link href={`/favorites?lang=${lang}`}><Heart size={17} />{isZh ? "我的收藏" : "Saved reading"}</Link></div>
      <section className="journal-search notes-search" id="smart-search" aria-label={isZh ? "智能检索" : "Research search"}>
        <SiteSearchAssistant lang={lang} initialQuery={String(sp?.q || "").trim()} aiAvailable={getAiProviderConfig().hasApiKey} variant="home" />
      </section>
      <KnowledgeExplorer fields={fields} articles={feeds.recommended.map(toNote)} recentArticles={feeds.recent.map(toNote)} lang={lang} />
      <section className="notes-library" aria-labelledby="notes-library-title">
        <h2 id="notes-library-title">{isZh ? "把兴趣读成体系" : "Turn curiosity into understanding"}</h2>
        <div className="notes-library-links">{resources.map(({ icon: Icon, zh, en, count, path }) => <Link key={path} href={`${path}?lang=${lang}`}><Icon size={22} /><span>{isZh ? zh : en}<small>{count.toLocaleString("en-US")}</small></span><ArrowRight size={17} /></Link>)}</div>
        <div className="notes-community-links"><Link href={`/discussions?lang=${lang}`}><MessageCircleMore size={18} />{isZh ? "去讨论广场聊一聊" : "Join a knowledge discussion"}<ArrowRight size={16} /></Link><Link href={`/ai-history?lang=${lang}`}><Clock3 size={18} />{isZh ? "接着上次的问题聊" : "Continue your conversation"}<ArrowRight size={16} /></Link></div>
      </section>
    </div>
  );
}
