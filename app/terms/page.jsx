import Link from "next/link";
import { Search, Tags } from "lucide-react";
import { categories, getCategoryById } from "@/lib/categories";
import { terms } from "@/data/terms";
import CommentSection from "@/components/CommentSection";
import ResourcePagination from "@/components/ResourcePagination";

export const metadata = {
  title: "术语表 | 译研知识库",
  description: "固定、统一、可复习的中英双语术语表。"
};

const PAGE_SIZE = 24;

function withLanguage(href, language) {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}lang=${language}`;
}

export default async function TermsPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const q = String(sp?.q || "").trim().toLowerCase();
  const category = String(sp?.category || "all");
  const requestedPage = Math.max(1, Number.parseInt(String(sp?.page || "1"), 10) || 1);
  const isZh = lang !== "en";
  const termCategories = categories.filter((item) => item.id === "all" || terms.some((term) => term.category === item.id));
  const filteredTerms = terms
    .filter((term) => {
      const matchCategory = category === "all" || term.category === category;
      const text = [
        term.termZh,
        term.termEn,
        term.definitionZh,
        term.definitionEn,
        ...term.mistakesZh,
        ...term.mistakesEn,
        ...term.related
      ].join(" ").toLowerCase();
      return matchCategory && (!q || text.includes(q));
    })
    .sort((a, b) => {
      const left = isZh ? a.termZh : a.termEn;
      const right = isZh ? b.termZh : b.termEn;
      return left.localeCompare(right, isZh ? "zh-Hans-CN" : "en");
    });
  const totalPages = Math.max(1, Math.ceil(filteredTerms.length / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const visibleTerms = filteredTerms.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function categoryHref(nextCategory) {
    const params = new URLSearchParams();
    params.set("lang", lang);
    params.set("category", nextCategory);
    if (q) params.set("q", q);
    return `/terms?${params.toString()}`;
  }

  return (
    <section className="layout">
      <aside className="sidebar">
        <form className="card panel" action="/terms">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="category" value={category} />
          <p className="panel-title">{isZh ? "搜索术语" : "Search Terms"}</p>
          <input className="search-box" name="q" defaultValue={q} placeholder={isZh ? "中文、英文、定义或相关概念" : "Chinese, English, definition, or related concept"} />
          <button className="primary-button" style={{ marginTop: 12 }} type="submit"><Search size={16} /> {isZh ? "搜索" : "Search"}</button>
        </form>

        <div className="card panel">
          <p className="panel-title">{isZh ? "领域筛选" : "Filter by Area"}</p>
          <div className="category-list">
            {termCategories.map((item) => {
              const Icon = item.icon;
              const count = item.id === "all" ? terms.length : terms.filter((term) => term.category === item.id).length;
              return (
                <Link key={item.id} className={`category-link ${item.id === category ? "active" : ""}`} href={categoryHref(item.id)}>
                  <span className="category-left"><Icon size={16} />{isZh ? item.zh : item.en}</span>
                  <span>{count}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </aside>

      <main>
        <div className="resource-title">
          <span className="badge"><Tags size={15} /> Terminology</span>
          <h1>{isZh ? "中英术语表" : "Bilingual Terminology"}</h1>
          <p>
            {isZh
              ? "固定核心术语、双语定义、常见误区与相邻概念，并把每个术语连接回完整文章。"
              : "Stabilize core terms, bilingual definitions, common mistakes, and neighboring concepts, with every term linked to a full article."}
          </p>
          <div className="resource-stat-row compact">
            <div><strong>{terms.length}</strong><span>{isZh ? "全部术语" : "All terms"}</span></div>
            <div><strong>{termCategories.length - 1}</strong><span>{isZh ? "知识领域" : "Knowledge areas"}</span></div>
            <div><strong>{filteredTerms.length}</strong><span>{isZh ? "当前结果" : "Current results"}</span></div>
          </div>
        </div>

        <div className="resource-result-head">
          <div>
            <strong>{filteredTerms.length}</strong>
            <span>{isZh ? "个符合条件的术语" : "matching terms"}</span>
          </div>
          <span>{isZh ? `第 ${currentPage} / ${totalPages} 页` : `Page ${currentPage} of ${totalPages}`}</span>
        </div>

        {visibleTerms.length > 0 ? (
          <div className="term-grid">
            {visibleTerms.map((term) => {
              const termCategory = getCategoryById(term.category);
              const TermIcon = termCategory.icon;
              return (
                <article className="card term-card" key={term.id}>
                  <div className="term-pair">
                    <div className="term-name">
                      <span className="mini-icon" aria-hidden="true"><TermIcon size={16} /></span>
                      <h2>{isZh ? term.termZh : term.termEn}</h2>
                    </div>
                    <strong>{isZh ? term.termEn : term.termZh}</strong>
                  </div>
                  <p>{isZh ? term.definitionZh : term.definitionEn}</p>
                  <div className="meta-row">
                    <span className="pill">{isZh ? termCategory.zh : termCategory.en}</span>
                    {term.related.map((item) => <span className="pill" key={item}>{item}</span>)}
                  </div>
                  <div className="term-note">
                    <strong>{isZh ? "常见误区" : "Common Mistake"}</strong>
                    <p>{isZh ? term.mistakesZh.join("；") : term.mistakesEn.join("; ")}</p>
                  </div>
                  <Link className="text-link" href={withLanguage(`/articles/${term.articleSlug}`, lang)}>
                    {isZh ? "阅读相关知识点" : "Read related article"} <ArrowIcon />
                  </Link>
                  <CommentSection
                    targetType="term"
                    targetId={term.id}
                    title={isZh ? "术语讨论" : "Term Discussion"}
                    lang={lang}
                    collapsed
                    embedded
                  />
                </article>
              );
            })}
          </div>
        ) : (
          <div className="search-empty-state">{isZh ? "没有找到符合条件的术语。" : "No terminology entry matches these filters."}</div>
        )}

        <ResourcePagination
          basePath="/terms"
          currentPage={currentPage}
          totalPages={totalPages}
          params={{ lang, category, q }}
          isZh={isZh}
        />
      </main>
    </section>
  );
}

function ArrowIcon() {
  return <span aria-hidden="true">›</span>;
}
