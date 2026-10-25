import Link from "next/link";
import { BookOpenText, Search, Sparkles, Tags, X } from "lucide-react";
import { getAllArticles, getArticlesByCategory, searchArticles } from "@/lib/markdown";
import { categories } from "@/lib/categories";
import KnowledgeNoteCard from "@/components/KnowledgeNoteCard";
import KnowledgeNoteGrid from "@/components/KnowledgeNoteGrid";
import ResourcePagination from "@/components/ResourcePagination";

export const metadata = {
  title: "知识文章 | 译研知识库",
  description: "浏览译研知识库的双语研究文章、系统知识与 2026 研究前沿。"
};

const PAGE_SIZE = 24;
const FRONTIER_TAG = "2026前沿";

function createHref(state, updates = {}) {
  const nextState = { ...state, ...updates };
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(nextState)) {
    if (key === "page" && Number(value) <= 1) continue;
    if (value !== undefined && value !== null && String(value) !== "") {
      params.set(key, String(value));
    }
  }

  return `/articles?${params.toString()}`;
}

export default async function ArticlesPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const q = String(sp?.q || "").trim();
  const requestedCategory = String(sp?.category || "all");
  const category = categories.some((item) => item.id === requestedCategory) ? requestedCategory : "all";
  const tag = String(sp?.tag || "");
  const view = String(sp?.view) === "frontier" ? "frontier" : "all";
  const sort = String(sp?.sort) === "title" ? "title" : "recent";
  const requestedPage = Math.max(1, Number.parseInt(String(sp?.page || "1"), 10) || 1);
  const isZh = lang !== "en";
  const allArticles = getAllArticles();
  const frontierArticles = allArticles.filter((article) => article.tags.includes(FRONTIER_TAG));
  const articleCategories = categories.filter(
    (item) => item.id === "all" || allArticles.some((article) => article.category === item.id)
  );
  const filteredArticles = searchArticles(q, getArticlesByCategory(category))
    .filter((article) => view !== "frontier" || article.tags.includes(FRONTIER_TAG))
    .filter((article) => !tag || article.tags.includes(tag))
    .sort((left, right) => {
      if (sort === "title") {
        const leftTitle = isZh ? left.titleZh : left.titleEn;
        const rightTitle = isZh ? right.titleZh : right.titleEn;
        return leftTitle.localeCompare(rightTitle, isZh ? "zh-Hans-CN" : "en");
      }
      return String(right.date).localeCompare(String(left.date));
    });
  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const visibleArticles = filteredArticles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const state = { lang, view, category, sort, q, tag };

  return (
    <section className="resource-page article-resource-page">
      <div className="resource-hero card article-resource-hero">
        <span className="badge"><BookOpenText size={15} /> Research Articles</span>
        <h1>{isZh ? "研究知识文章" : "Research Knowledge Articles"}</h1>
        <p>
          {isZh
            ? "按领域、问题和更新时间浏览中英双语知识。2026 研究前沿单独汇集经来源核验的新主题，并通过学习路径、术语和方法卡连接回已有知识体系。"
            : "Browse bilingual knowledge by field, question, and update date. The 2026 frontier view collects source-checked emerging topics and connects them to existing paths, terms, and method cards."}
        </p>
        <div className="resource-stat-row">
          <div><strong>{allArticles.length}</strong><span>{isZh ? "全部文章" : "All articles"}</span></div>
          <div><strong>{frontierArticles.length}</strong><span>{isZh ? "2026 前沿" : "2026 frontiers"}</span></div>
          <div><strong>{articleCategories.length - 1}</strong><span>{isZh ? "知识领域" : "Knowledge areas"}</span></div>
          <div><strong>{filteredArticles.length}</strong><span>{isZh ? "当前结果" : "Current results"}</span></div>
        </div>
      </div>

      <section className="resource-browser">
        <div className="resource-segments" aria-label={isZh ? "文章视图" : "Article view"}>
          <Link
            className={view === "all" ? "active" : ""}
            href={createHref(state, { view: "all", page: 1 })}
          >
            {isZh ? "全部知识" : "All Knowledge"}
          </Link>
          <Link
            className={view === "frontier" ? "active" : ""}
            href={createHref(state, { view: "frontier", page: 1 })}
          >
            <Sparkles size={14} /> {isZh ? "2026 研究前沿" : "2026 Frontiers"}
          </Link>
        </div>

        <form className="card resource-filter-bar article-filter-bar" action="/articles">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="view" value={view} />
          <input type="hidden" name="tag" value={tag} />
          <div className="resource-search-field">
            <Search size={17} />
            <input
              name="q"
              defaultValue={q}
              placeholder={isZh ? "搜索概念、研究问题、方法或标签" : "Search concepts, questions, methods, or tags"}
            />
          </div>
          <select name="category" defaultValue={category} aria-label={isZh ? "知识领域" : "Knowledge area"}>
            {articleCategories.map((item) => (
              <option value={item.id} key={item.id}>{isZh ? item.zh : item.en}</option>
            ))}
          </select>
          <select name="sort" defaultValue={sort} aria-label={isZh ? "排序方式" : "Sort order"}>
            <option value="recent">{isZh ? "最近更新" : "Recently updated"}</option>
            <option value="title">{isZh ? "按标题排序" : "Title"}</option>
          </select>
          <button className="primary-button" type="submit"><Search size={16} /> {isZh ? "筛选" : "Filter"}</button>
        </form>

        {tag ? (
          <div className="active-filter-row">
            <span><Tags size={15} /> {isZh ? "当前标签" : "Active tag"}：{tag}</span>
            <Link href={createHref(state, { tag: "", page: 1 })}>
              <X size={15} /> {isZh ? "清除" : "Clear"}
            </Link>
          </div>
        ) : null}

        <div className="resource-result-head">
          <div>
            <strong>{filteredArticles.length}</strong>
            <span>{isZh ? "篇符合条件的文章" : "matching articles"}</span>
          </div>
          <span>{isZh ? `第 ${currentPage} / ${totalPages} 页` : `Page ${currentPage} of ${totalPages}`}</span>
        </div>
      </section>

      {visibleArticles.length > 0 ? (
        <KnowledgeNoteGrid className="article-browser-grid">
          {visibleArticles.map((article) => <KnowledgeNoteCard key={article.slug} article={article} lang={lang} />)}
        </KnowledgeNoteGrid>
      ) : (
        <div className="search-empty-state">
          {isZh ? "没有找到符合条件的文章，请尝试缩短关键词或清除筛选。" : "No article matches these filters. Try a shorter query or clear a filter."}
        </div>
      )}

      <ResourcePagination
        basePath="/articles"
        currentPage={currentPage}
        totalPages={totalPages}
        params={{ lang, view, category, sort, q, tag }}
        isZh={isZh}
      />
    </section>
  );
}
