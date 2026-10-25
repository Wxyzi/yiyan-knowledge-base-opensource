import Link from "next/link";
import { ArrowRight, CheckCircle2, Route, Search, UserRound } from "lucide-react";
import { categories, getCategoryById } from "@/lib/categories";
import { getAllArticles } from "@/lib/markdown";
import { learnerEntrances, learningPaths } from "@/data/learningPaths";
import CommentSection from "@/components/CommentSection";
import ResourcePagination from "@/components/ResourcePagination";

export const metadata = {
  title: "学习路径 | 译研知识库",
  description: "按身份和研究方向进入译研知识库的系统学习路径。"
};

const PAGE_SIZE = 10;

function withLanguage(href, language) {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}lang=${language}`;
}

function getPathType(path) {
  return path.kind === "system" || path.steps.length >= 6 ? "system" : "topic";
}

function getPathCategory(path, articlesBySlug) {
  if (path.category) return path.category;

  const counts = new Map();
  for (const step of path.steps) {
    const category = articlesBySlug.get(step.articleSlug)?.category;
    if (category) counts.set(category, (counts.get(category) || 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "methods";
}

function filterHref({ lang, q, category, type, nextType }) {
  const params = new URLSearchParams();
  params.set("lang", lang);
  params.set("type", nextType);
  if (q) params.set("q", q);
  if (category !== "all") params.set("category", category);
  return `/paths?${params.toString()}`;
}

export default async function PathsPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const identity = String(sp?.identity || "");
  const q = String(sp?.q || "").trim().toLowerCase();
  const category = String(sp?.category || "all");
  const type = ["system", "topic", "all"].includes(String(sp?.type)) ? String(sp.type) : "system";
  const requestedPage = Math.max(1, Number.parseInt(String(sp?.page || "1"), 10) || 1);
  const isZh = lang !== "en";
  const articles = getAllArticles();
  const articlesBySlug = new Map(articles.map((article) => [article.slug, article]));
  const enrichedPaths = learningPaths.map((path) => ({
    ...path,
    pathType: getPathType(path),
    pathCategory: getPathCategory(path, articlesBySlug)
  }));
  const activeEntrance = learnerEntrances.find((item) => item.id === identity);
  const activePath = activeEntrance ? enrichedPaths.find((path) => path.id === activeEntrance.pathId) : null;
  const systemCount = enrichedPaths.filter((path) => path.pathType === "system").length;
  const topicCount = enrichedPaths.filter((path) => path.pathType === "topic").length;
  const pathCategories = categories.filter(
    (item) => item.id === "all" || enrichedPaths.some((path) => path.pathCategory === item.id)
  );
  const filteredPaths = enrichedPaths
    .filter((path) => type === "all" || path.pathType === type)
    .filter((path) => category === "all" || path.pathCategory === category)
    .filter((path) => {
      if (!q) return true;
      const text = [
        path.titleZh,
        path.titleEn,
        path.descriptionZh,
        path.descriptionEn,
        path.audienceZh,
        path.audienceEn,
        ...path.steps.flatMap((step) => [step.titleZh, step.titleEn])
      ].join(" ").toLowerCase();
      return text.includes(q);
    })
    .sort((a, b) => {
      if (a.id === activePath?.id) return -1;
      if (b.id === activePath?.id) return 1;
      if (a.kind === "system" && b.kind !== "system") return -1;
      if (b.kind === "system" && a.kind !== "system") return 1;
      return b.steps.length - a.steps.length || a.titleZh.localeCompare(b.titleZh, "zh-Hans-CN");
    });
  const totalPages = Math.max(1, Math.ceil(filteredPaths.length / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const visiblePaths = filteredPaths.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section className="resource-page">
      <div className="resource-hero card">
        <span className="badge"><Route size={15} /> Learning Paths</span>
        <h1>{isZh ? "学习路径" : "Learning Paths"}</h1>
        <p>
          {isZh
            ? "系统主路径负责建立完整领域框架，专题微路径负责快速进入具体问题。两者共同连接基础概念、研究方法与进阶应用。"
            : "System paths build complete field frameworks, while focused paths provide quick entry into specific problems. Together they connect foundations, methods, and advanced applications."}
        </p>
        <div className="resource-stat-row">
          <div><strong>{learningPaths.length}</strong><span>{isZh ? "全部路径" : "All paths"}</span></div>
          <div><strong>{systemCount}</strong><span>{isZh ? "系统主路径" : "System paths"}</span></div>
          <div><strong>{topicCount}</strong><span>{isZh ? "专题微路径" : "Focused paths"}</span></div>
          <div><strong>{articles.length}</strong><span>{isZh ? "关联文章" : "Linked articles"}</span></div>
        </div>
      </div>

      <section className="home-section">
        <div className="section-header">
          <div>
            <span className="badge"><UserRound size={15} /> {isZh ? "按身份进入" : "Start by Identity"}</span>
            <h2>{isZh ? "选择与你当前目标最接近的入口" : "Choose the Entrance Closest to Your Goal"}</h2>
          </div>
        </div>
        <div className="advantage-grid">
          {learnerEntrances.map((item) => (
            <Link
              className={`card advantage-card ${item.id === identity ? "active-card" : ""}`}
              href={withLanguage(`/paths?identity=${item.id}&type=all`, lang)}
              key={item.id}
            >
              <h3>{isZh ? item.labelZh : item.labelEn}</h3>
              <p>{isZh ? item.noteZh : item.noteEn}</p>
              <span className="text-link">{isZh ? "查看推荐路径" : "View recommended path"} <ArrowRight size={14} /></span>
            </Link>
          ))}
        </div>
      </section>

      {activeEntrance && activePath ? (
        <section className="card panel recommended-path-callout">
          <div>
            <span className="badge">{isZh ? "已根据你的身份推荐" : "Recommended for You"}</span>
            <h2>{isZh ? activePath.titleZh : activePath.titleEn}</h2>
            <p className="notice">{isZh ? activeEntrance.noteZh : activeEntrance.noteEn}</p>
          </div>
          <Link className="primary-button" href={withLanguage(`/articles/${activePath.steps[0].articleSlug}`, lang)}>
            {isZh ? "从第 1 步开始" : "Start Step 1"} <ArrowRight size={16} />
          </Link>
        </section>
      ) : null}

      <section className="resource-browser">
        <div className="resource-segments" aria-label={isZh ? "路径类型" : "Path type"}>
          {[
            ["system", isZh ? "系统主路径" : "System"],
            ["topic", isZh ? "专题微路径" : "Focused"],
            ["all", isZh ? "全部" : "All"]
          ].map(([value, label]) => (
            <Link
              className={type === value ? "active" : ""}
              href={filterHref({ lang, q, category, type, nextType: value })}
              key={value}
            >
              {label}
            </Link>
          ))}
        </div>

        <form className="card resource-filter-bar" action="/paths">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="type" value={type} />
          <div className="resource-search-field">
            <Search size={17} />
            <input name="q" defaultValue={q} placeholder={isZh ? "搜索路径、知识点或研究方向" : "Search paths, topics, or research areas"} />
          </div>
          <select name="category" defaultValue={category} aria-label={isZh ? "领域" : "Area"}>
            {pathCategories.map((item) => (
              <option value={item.id} key={item.id}>{isZh ? item.zh : item.en}</option>
            ))}
          </select>
          <button className="primary-button" type="submit"><Search size={16} /> {isZh ? "筛选" : "Filter"}</button>
        </form>

        <div className="resource-result-head">
          <div>
            <strong>{filteredPaths.length}</strong>
            <span>{isZh ? "条符合条件的路径" : "matching paths"}</span>
          </div>
          <span>{isZh ? `第 ${currentPage} / ${totalPages} 页` : `Page ${currentPage} of ${totalPages}`}</span>
        </div>
      </section>

      {visiblePaths.length > 0 ? (
        <section className="path-stack">
          {visiblePaths.map((path) => {
            const pathCategory = getCategoryById(path.pathCategory);
            return (
              <article className={`card path-detail-card ${path.kind === "system" ? "curated-system-path" : ""}`} id={path.id} key={path.id}>
                <div className="path-detail-header">
                  <div>
                    <div className="meta-row">
                      <span className="pill">{path.advantage}</span>
                      <span className="pill">{isZh ? pathCategory.zh : pathCategory.en}</span>
                    </div>
                    <h2>{isZh ? path.titleZh : path.titleEn}</h2>
                    <p>{isZh ? path.descriptionZh : path.descriptionEn}</p>
                    <p className="notice">{isZh ? path.audienceZh : path.audienceEn}</p>
                  </div>
                  <strong>{path.steps.length} {isZh ? "步" : "steps"}</strong>
                </div>
                <div className="path-steps">
                  {path.steps.map((step) => {
                    const article = articlesBySlug.get(step.articleSlug);
                    const title = article ? (isZh ? article.titleZh : article.titleEn) : (isZh ? step.titleZh : step.titleEn);

                    return (
                      <Link
                        className="path-step"
                        href={withLanguage(`/articles/${step.articleSlug}`, lang)}
                        key={`${path.id}-${step.articleSlug}`}
                      >
                        <span className="step-number">{step.order}</span>
                        <div>
                          <strong>{isZh ? step.titleZh : step.titleEn}</strong>
                          <p>{title}</p>
                        </div>
                        <CheckCircle2 size={18} />
                      </Link>
                    );
                  })}
                </div>
                <CommentSection
                  targetType="path"
                  targetId={path.id}
                  title={isZh ? "路径讨论" : "Path Discussion"}
                  lang={lang}
                  collapsed
                  embedded
                />
              </article>
            );
          })}
        </section>
      ) : (
        <div className="search-empty-state">{isZh ? "没有找到符合条件的学习路径。" : "No learning path matches these filters."}</div>
      )}

      <ResourcePagination
        basePath="/paths"
        currentPage={currentPage}
        totalPages={totalPages}
        params={{ lang, type, category, q }}
        isZh={isZh}
      />
    </section>
  );
}
