import Link from "next/link";
import { BarChart3, Database, FileQuestion, Search, Wrench } from "lucide-react";
import { categories, getCategoryById } from "@/lib/categories";
import { getAllArticles } from "@/lib/markdown";
import { researchMethods } from "@/data/researchMethods";
import CommentSection from "@/components/CommentSection";
import ResourcePagination from "@/components/ResourcePagination";

export const metadata = {
  title: "研究方法库 | 译研知识库",
  description: "面向研究实践的研究方法卡片，说明研究问题、数据、工具和局限。"
};

const PAGE_SIZE = 18;

function withLanguage(href, language) {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}lang=${language}`;
}

function difficultyGroup(method) {
  const value = String(method.difficultyEn || "").toLowerCase();
  if (value.includes("beginner")) return "beginner";
  if (value.includes("intermediate")) return "intermediate";
  if (value.includes("research") || value.includes("doctoral")) return "research";
  return "advanced";
}

export default async function MethodsPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const q = String(sp?.q || "").trim().toLowerCase();
  const category = String(sp?.category || "all");
  const difficulty = ["all", "beginner", "intermediate", "advanced", "research"].includes(String(sp?.difficulty))
    ? String(sp.difficulty)
    : "all";
  const requestedPage = Math.max(1, Number.parseInt(String(sp?.page || "1"), 10) || 1);
  const isZh = lang !== "en";
  const articles = getAllArticles();
  const articlesBySlug = new Map(articles.map((article) => [article.slug, article]));
  const enrichedMethods = researchMethods.map((method) => ({
    ...method,
    methodCategory: method.category || articlesBySlug.get(method.articleSlug)?.category || "methods",
    difficultyGroup: difficultyGroup(method)
  }));
  const methodCategories = categories.filter(
    (item) => item.id === "all" || enrichedMethods.some((method) => method.methodCategory === item.id)
  );
  const filteredMethods = enrichedMethods
    .filter((method) => category === "all" || method.methodCategory === category)
    .filter((method) => difficulty === "all" || method.difficultyGroup === difficulty)
    .filter((method) => {
      if (!q) return true;
      return [
        method.titleZh,
        method.titleEn,
        method.questionZh,
        method.questionEn,
        method.dataZh,
        method.dataEn,
        method.useContextZh,
        method.useContextEn,
        method.limitationZh,
        method.limitationEn,
        ...method.tools
      ].join(" ").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (a.methodCategory !== b.methodCategory) return a.methodCategory.localeCompare(b.methodCategory);
      return (isZh ? a.titleZh : a.titleEn).localeCompare(isZh ? b.titleZh : b.titleEn, isZh ? "zh-Hans-CN" : "en");
    });
  const totalPages = Math.max(1, Math.ceil(filteredMethods.length / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const visibleMethods = filteredMethods.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section className="resource-page">
      <div className="resource-hero card">
        <span className="badge"><BarChart3 size={15} /> Research Methods</span>
        <h1>{isZh ? "研究方法库" : "Research Method Library"}</h1>
        <p>
          {isZh
            ? "围绕“适合回答什么问题、需要什么数据、怎样执行、结论有什么边界”组织方法卡，并连接到完整知识文章。"
            : "Method cards are organized around suitable questions, required data, execution, and claim boundaries, with links to complete articles."}
        </p>
        <div className="hero-actions">
          <Link className="primary-button" href={withLanguage("/paths?type=system&category=methods", lang)}>{isZh ? "进入研究方法主路径" : "Open method path"}</Link>
          <Link className="secondary-button" href={withLanguage("/terms?category=methods", lang)}>{isZh ? "查看方法术语" : "View method terms"}</Link>
        </div>
        <div className="resource-stat-row">
          <div><strong>{researchMethods.length}</strong><span>{isZh ? "方法卡" : "Method cards"}</span></div>
          <div><strong>{methodCategories.length - 1}</strong><span>{isZh ? "覆盖领域" : "Areas covered"}</span></div>
          <div><strong>{enrichedMethods.filter((method) => method.difficultyGroup === "beginner").length}</strong><span>{isZh ? "入门方法" : "Beginner methods"}</span></div>
          <div><strong>{enrichedMethods.filter((method) => method.difficultyGroup === "research").length}</strong><span>{isZh ? "研究进阶" : "Research level"}</span></div>
        </div>
      </div>

      <section className="resource-browser">
        <form className="card resource-filter-bar method-filter-bar" action="/methods">
          <input type="hidden" name="lang" value={lang} />
          <div className="resource-search-field">
            <Search size={17} />
            <input name="q" defaultValue={q} placeholder={isZh ? "搜索问题、数据、工具或方法" : "Search questions, data, tools, or methods"} />
          </div>
          <select name="category" defaultValue={category} aria-label={isZh ? "领域" : "Area"}>
            {methodCategories.map((item) => (
              <option value={item.id} key={item.id}>{isZh ? item.zh : item.en}</option>
            ))}
          </select>
          <select name="difficulty" defaultValue={difficulty} aria-label={isZh ? "难度" : "Difficulty"}>
            <option value="all">{isZh ? "全部难度" : "All levels"}</option>
            <option value="beginner">{isZh ? "入门" : "Beginner"}</option>
            <option value="intermediate">{isZh ? "中级" : "Intermediate"}</option>
            <option value="advanced">{isZh ? "高级" : "Advanced"}</option>
            <option value="research">{isZh ? "研究进阶" : "Research level"}</option>
          </select>
          <button className="primary-button" type="submit"><Search size={16} /> {isZh ? "筛选" : "Filter"}</button>
        </form>

        <div className="resource-result-head">
          <div>
            <strong>{filteredMethods.length}</strong>
            <span>{isZh ? "张符合条件的方法卡" : "matching method cards"}</span>
          </div>
          <span>{isZh ? `第 ${currentPage} / ${totalPages} 页` : `Page ${currentPage} of ${totalPages}`}</span>
        </div>
      </section>

      {visibleMethods.length > 0 ? (
        <div className="method-grid">
          {visibleMethods.map((method) => {
            const methodCategory = getCategoryById(method.methodCategory);
            return (
              <article className="card method-card" key={method.id}>
                <div className="method-card-head">
                  <div>
                    <div className="meta-row">
                      <span className="pill">{isZh ? method.difficultyZh : method.difficultyEn}</span>
                      <span className="pill">{isZh ? methodCategory.zh : methodCategory.en}</span>
                    </div>
                    <h2>{isZh ? method.titleZh : method.titleEn}</h2>
                  </div>
                  <BarChart3 size={24} />
                </div>
                <div className="method-facts">
                  <div>
                    <FileQuestion size={17} />
                    <p><strong>{isZh ? "适合问题" : "Question"}</strong>{isZh ? method.questionZh : method.questionEn}</p>
                  </div>
                  <div>
                    <Database size={17} />
                    <p><strong>{isZh ? "所需数据" : "Data"}</strong>{isZh ? method.dataZh : method.dataEn}</p>
                  </div>
                  <div>
                    <Wrench size={17} />
                    <p><strong>{isZh ? "推荐工具" : "Tools"}</strong>{method.tools.join(" / ")}</p>
                  </div>
                </div>
                <div className="term-note">
                  <strong>{isZh ? "适用场景" : "Use Contexts"}</strong>
                  <p>{isZh ? method.useContextZh : method.useContextEn}</p>
                </div>
                <div className="term-note">
                  <strong>{isZh ? "局限提醒" : "Limitation"}</strong>
                  <p>{isZh ? method.limitationZh : method.limitationEn}</p>
                </div>
                <Link className="text-link" href={withLanguage(`/articles/${method.articleSlug}`, lang)}>
                  {isZh ? "阅读方法知识点" : "Read method article"} <span aria-hidden="true">›</span>
                </Link>
                <CommentSection
                  targetType="method"
                  targetId={method.id}
                  title={isZh ? "方法讨论" : "Method Discussion"}
                  lang={lang}
                  collapsed
                  embedded
                />
              </article>
            );
          })}
        </div>
      ) : (
        <div className="search-empty-state">{isZh ? "没有找到符合条件的方法卡。" : "No method card matches these filters."}</div>
      )}

      <ResourcePagination
        basePath="/methods"
        currentPage={currentPage}
        totalPages={totalPages}
        params={{ lang, category, difficulty, q }}
        isZh={isZh}
      />
    </section>
  );
}
