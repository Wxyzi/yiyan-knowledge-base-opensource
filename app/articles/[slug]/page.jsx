import { notFound } from "next/navigation";
import Link from "next/link";
import {
  BookOpenCheck,
  ChevronDown,
  ListChecks,
  MessageCircle,
  Route
} from "lucide-react";
import { getAllArticles, getArticleBySlug, getMarkdownHeadings, markdownToHtml, removeLeadingTitleHeading } from "@/lib/markdown";
import { getCategoryById } from "@/lib/categories";
import FavoriteButton from "@/components/FavoriteButton";
import CommentSection from "@/components/CommentSection";
import LanguageToggle from "@/components/LanguageToggle";
import ArticleViewTracker from "@/components/ArticleViewTracker";
import { getArticleRelations } from "@/data/knowledgeRelations";
import { learningPaths } from "@/data/learningPaths";
import { researchMethods } from "@/data/researchMethods";
import { getTermsByArticleSlug } from "@/data/terms";

export async function generateStaticParams() {
  return getAllArticles().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params, searchParams }) {
  const p = await params;
  const sp = await searchParams;
  const article = getArticleBySlug(p.slug);
  if (!article) return {};

  const isZh = String(sp?.lang || "zh") !== "en";
  const title = isZh ? article.titleZh : article.titleEn;
  const description = isZh ? article.summaryZh : article.summaryEn;

  return {
    title: `${title} | ${isZh ? "译研知识库" : "Yiyan Knowledge Base"}`,
    description: description || article.summaryZh || article.summaryEn,
    openGraph: {
      title: `${title} | ${isZh ? "译研知识库" : "Yiyan Knowledge Base"}`,
      description: description || article.summaryZh || article.summaryEn,
      type: "article"
    }
  };
}

export default async function ArticlePage({ params, searchParams }) {
  const p = await params;
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const isZh = lang !== "en";
  const article = getArticleBySlug(p.slug);
  if (!article) notFound();

  const allArticles = getAllArticles();
  const articlesBySlug = new Map(allArticles.map((item) => [item.slug, item]));
  const currentIndex = allArticles.findIndex((item) => item.slug === article.slug);
  const previousArticle = currentIndex > 0 ? allArticles[currentIndex - 1] : null;
  const nextArticle = currentIndex >= 0 && currentIndex < allArticles.length - 1 ? allArticles[currentIndex + 1] : null;
  const category = getCategoryById(article.category);
  const markdown = lang === "en" ? article.contentEn : article.contentZh;
  const articleMarkdown = removeLeadingTitleHeading(markdown);
  const htmlContent = await markdownToHtml(articleMarkdown);
  const tableOfContents = getMarkdownHeadings(articleMarkdown, { minDepth: 2, maxDepth: 3 });
  const relatedTerms = getTermsByArticleSlug(article.slug);
  const methodApplication = researchMethods.find((method) => method.articleSlug === article.slug);
  const pathMemberships = learningPaths
    .map((path) => {
      const stepIndex = path.steps.findIndex((step) => step.articleSlug === article.slug);
      if (stepIndex < 0) return null;
      return {
        path,
        stepIndex,
        previousStep: stepIndex > 0 ? path.steps[stepIndex - 1] : null,
        nextStep: stepIndex < path.steps.length - 1 ? path.steps[stepIndex + 1] : null,
        isSystem: path.kind === "system" || path.steps.length >= 6
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.path.kind === "system" && b.path.kind !== "system") return -1;
      if (b.path.kind === "system" && a.path.kind !== "system") return 1;
      if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
      return b.path.steps.length - a.path.steps.length;
    })
    .slice(0, 4);
  const relation = getArticleRelations(article.slug);
  const relationGroups = [
    {
      titleZh: "建议先学",
      titleEn: "Learn First",
      noteZh: "先补这些概念，当前知识会更容易理解。",
      noteEn: "Review these concepts first to understand this article more easily.",
      slugs: relation.prerequisites
    },
    {
      titleZh: "接着学习",
      titleEn: "Learn Next",
      noteZh: "读完本文后，建议继续进入这些知识点。",
      noteEn: "After this article, continue with these knowledge points.",
      slugs: relation.next
    },
    {
      titleZh: "相关概念",
      titleEn: "Related Concepts",
      noteZh: "这些知识点与当前主题处在同一问题链中。",
      noteEn: "These items belong to the same problem chain.",
      slugs: relation.related
    },
    {
      titleZh: "跨领域连接",
      titleEn: "Cross-Field Links",
      noteZh: "用这些知识把当前主题连接到其他领域。",
      noteEn: "Use these items to connect this topic with other fields.",
      slugs: relation.bridge
    }
  ]
    .map((group) => ({
      ...group,
      articles: group.slugs.map((slug) => articlesBySlug.get(slug)).filter(Boolean)
    }))
    .filter((group) => group.articles.length > 0);
  const relationArticleSlugs = new Set(relationGroups.flatMap((group) => group.articles.map((item) => item.slug)));
  const relatedArticles = allArticles
    .filter((item) => item.slug !== article.slug && !relationArticleSlugs.has(item.slug))
    .map((item) => ({
      article: item,
      score:
        (item.category === article.category ? 3 : 0) +
        item.tags.filter((tag) => article.tags.includes(tag)).length
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.article);

  return (
    <section className="article-page">
      <article className="card article-body">
        <div className="meta-row article-meta-strip">
          <span className="pill">{isZh ? category.zh : category.en}</span>
          <span className="pill">{isZh ? article.levelZh : article.levelEn}</span>
          <span className="pill">{isZh ? article.readingTimeZh : article.readingTimeEn}</span>
          <span className="pill"><BookOpenCheck size={13} />{isZh ? "文章" : "Article"}</span>
        </div>

        <h1 className="article-title">{isZh ? article.titleZh : article.titleEn}</h1>
        <p className="notice article-byline">{article.author} · {isZh ? "更新于" : "Updated"} {article.date}</p>

        <div className="hero-actions">
          <LanguageToggle
            currentLanguage={lang}
            links={{
              zh: `/articles/${article.slug}?lang=zh`,
              en: `/articles/${article.slug}?lang=en`
            }}
          />
          <Link className="secondary-button" href={`/articles?lang=${lang}`}>{isZh ? "返回列表" : "Back to articles"}</Link>
        </div>

        <section className="article-overview" id="article-overview">
          <p>{isZh ? article.summaryZh : article.summaryEn}</p>
        </section>

        {tableOfContents.length > 0 ? (
          <details className="article-mobile-outline">
            <summary><ListChecks size={17} aria-hidden="true" />{isZh ? "本篇内容" : "In this note"}<ChevronDown size={16} aria-hidden="true" /></summary>
            <nav className="article-toc-list" aria-label={isZh ? "本篇内容" : "In this note"}>
              {tableOfContents.map((heading) => (
                <Link className={`toc-depth-${heading.depth}`} href={`#${heading.id}`} key={heading.id}>{heading.text}</Link>
              ))}
            </nav>
          </details>
        ) : null}

        <div id="article-content" className="markdown" dangerouslySetInnerHTML={{ __html: htmlContent }} />

        {pathMemberships.length > 0 ? (
          <section className="article-path-context" id="path-context">
            <div className="section-header">
              <div>
                <span className="badge"><Route size={15} /> {isZh ? "体系位置" : "System Position"}</span>
                <h2>{isZh ? "这篇文章位于哪些学习路径" : "Where This Article Sits in the Learning System"}</h2>
                <p className="notice">
                  {isZh
                    ? "沿路径继续，可以补齐前置概念并进入下一步研究应用。"
                    : "Continue along a path to complete prerequisites and move into the next research application."}
                </p>
              </div>
            </div>
            <div className="article-path-memberships">
              {pathMemberships.map(({ path, stepIndex, previousStep, nextStep, isSystem }) => {
                const title = isZh ? path.titleZh : path.titleEn;
                const pathHref = `/paths?lang=${lang}&type=all&q=${encodeURIComponent(title)}#${path.id}`;
                return (
                  <article className="article-path-membership" key={path.id}>
                    <div className="article-path-membership-head">
                      <div className="meta-row">
                        <span className="pill">{isSystem ? (isZh ? "系统路径" : "System Path") : (isZh ? "专题路径" : "Focused Path")}</span>
                        <span className="pill">{isZh ? `第 ${stepIndex + 1} / ${path.steps.length} 步` : `Step ${stepIndex + 1} of ${path.steps.length}`}</span>
                      </div>
                      <h3>{title}</h3>
                    </div>
                    <div className="article-path-actions">
                      {previousStep ? (
                        <Link href={`/articles/${previousStep.articleSlug}?lang=${lang}`}>
                          <span>{isZh ? "上一步" : "Previous"}</span>
                          <strong>{isZh ? previousStep.titleZh : previousStep.titleEn}</strong>
                        </Link>
                      ) : <span className="path-edge-label">{isZh ? "路径起点" : "Path start"}</span>}
                      <Link className="path-overview-link" href={pathHref}>{isZh ? "查看完整路径" : "View full path"} <span aria-hidden="true">›</span></Link>
                      {nextStep ? (
                        <Link href={`/articles/${nextStep.articleSlug}?lang=${lang}`}>
                          <span>{isZh ? "下一步" : "Next"}</span>
                          <strong>{isZh ? nextStep.titleZh : nextStep.titleEn}</strong>
                        </Link>
                      ) : <span className="path-edge-label">{isZh ? "路径终点" : "Path complete"}</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="article-provenance" id="research-note">
          <div>
            <span>{isZh ? "内容性质" : "Content Type"}</span>
            <strong>{isZh ? "研究学习型知识梳理" : "Research-oriented knowledge guide"}</strong>
          </div>
          <div>
            <span>{isZh ? "维护信息" : "Maintained"}</span>
            <strong>{article.author} · {article.date}</strong>
          </div>
          <p>
            {isZh
              ? "正式用于论文、报告或项目时，请继续核对原始文献、数据来源和工具官方文档，并引用原始来源。"
              : "For papers, reports, or projects, verify the original literature, data sources, and official tool documentation, and cite the primary sources."}
          </p>
        </section>

        {relationGroups.length > 0 ? (
          <section className="article-learning-section" id="learning-links">
            <div className="section-header">
              <div>
                <span className="badge">{isZh ? "学习连接" : "Learning Links"}</span>
                <h2>{isZh ? "读完后可以这样继续学" : "Continue Learning from Here"}</h2>
                <p className="notice">
                  {isZh
                    ? "这些推荐来自本站知识关系表，用来帮助你补前置概念、找到下一步，并把当前知识连接到相邻领域。"
                    : "These links come from curated article relationships, helping you review prerequisites, choose the next step, and connect this topic to nearby fields."}
                </p>
              </div>
            </div>
            <div className="article-link-grid">
              {relationGroups.map((group) => (
                <section className="article-link-group" key={group.titleZh}>
                  <h3>{isZh ? group.titleZh : group.titleEn}</h3>
                  <p>{isZh ? group.noteZh : group.noteEn}</p>
                  <div className="compact-list">
                    {group.articles.map((item) => (
                      <Link href={`/articles/${item.slug}?lang=${lang}`} key={item.slug}>
                        <strong>{isZh ? item.titleZh : item.titleEn}</strong>
                        <span>{isZh ? item.summaryZh : item.summaryEn}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ) : relatedArticles.length > 0 ? (
          <section className="article-learning-section" id="learning-links">
            <div className="section-header">
              <div>
                <span className="badge">{isZh ? "相关知识" : "Related Knowledge"}</span>
                <h2>{isZh ? "继续阅读这些知识点" : "Continue with These Articles"}</h2>
                <p className="notice">
                  {isZh
                    ? "这些文章与当前知识点共享领域或标签，适合继续扩展学习。"
                    : "These articles share the same field or tags and are useful for continued study."}
                </p>
              </div>
            </div>
            <div className="article-link-grid">
              <section className="article-link-group">
                <h3>{isZh ? "相关知识点" : "Related Articles"}</h3>
                <div className="compact-list">
                  {relatedArticles.map((item) => (
                    <Link href={`/articles/${item.slug}?lang=${lang}`} key={item.slug}>
                      <strong>{isZh ? item.titleZh : item.titleEn}</strong>
                      <span>{isZh ? item.summaryZh : item.summaryEn}</span>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </section>
        ) : null}

        <nav className="article-nav">
          {previousArticle ? (
            <Link className="card article-nav-card" href={`/articles/${previousArticle.slug}?lang=${lang}`}>
              <span className="notice">{isZh ? "上一篇发布" : "Previous by date"}</span>
              <strong>{isZh ? previousArticle.titleZh : previousArticle.titleEn}</strong>
            </Link>
          ) : <span />}
          {nextArticle ? (
            <Link className="card article-nav-card" href={`/articles/${nextArticle.slug}?lang=${lang}`}>
              <span className="notice">{isZh ? "下一篇发布" : "Next by date"}</span>
              <strong>{isZh ? nextArticle.titleZh : nextArticle.titleEn}</strong>
            </Link>
          ) : <span />}
        </nav>

        <div id="discussion">
          <CommentSection
            articleSlug={article.slug}
            title={isZh ? "知识点讨论" : "Article Discussion"}
            lang={lang}
          />
        </div>
      </article>

      <aside className="side-stack">
        <div className="card panel article-reader-panel">
          <h2 className="panel-title">{isZh ? "阅读导览" : "Reading Guide"}</h2>
          <div className="reader-nav-list">
            <Link href="#article-content"><BookOpenCheck size={15} /> {isZh ? "正文内容" : "Article"}</Link>
            {pathMemberships.length > 0 ? (
              <Link href="#path-context"><Route size={15} /> {isZh ? "体系位置" : "System Position"}</Link>
            ) : null}
            {relationGroups.length > 0 || relatedArticles.length > 0 ? (
              <Link href="#learning-links"><Route size={15} /> {isZh ? "继续学习" : "Next Steps"}</Link>
            ) : null}
            <Link href="#discussion"><MessageCircle size={15} /> {isZh ? "知识点讨论" : "Discussion"}</Link>
          </div>
        </div>

        {tableOfContents.length > 0 ? (
          <div className="card panel article-toc-panel">
            <h2 className="panel-title">{isZh ? "本篇内容" : "In This Note"}</h2>
            <nav className="article-toc-list" aria-label={isZh ? "文章目录" : "On this page"}>
              {tableOfContents.map((heading) => (
                <Link className={`toc-depth-${heading.depth}`} href={`#${heading.id}`} key={`${heading.id}-${heading.text}`}>
                  {heading.text}
                </Link>
              ))}
            </nav>
          </div>
        ) : null}

        <div className="card panel">
          <h2 className="panel-title">收藏 Favorite</h2>
          <FavoriteButton articleSlug={article.slug} />
        </div>

        <ArticleViewTracker
          articleSlug={article.slug}
          articleTitle={isZh ? article.titleZh : article.titleEn}
          category={article.category}
          lang={lang}
        />

        <div className="card panel">
          <h2 className="panel-title">标签 Tags</h2>
          <div className="meta-row">
            {article.tags.map((tag) => <Link className="pill" href={`/articles?tag=${encodeURIComponent(tag)}&lang=${lang}`} key={tag}>#{tag}</Link>)}
          </div>
        </div>

        {relatedTerms.length > 0 ? (
          <div className="card panel">
            <h2 className="panel-title">{isZh ? "相关术语" : "Related Terms"}</h2>
            <div className="term-mini-list">
              {relatedTerms.map((term) => (
                <Link href={`/terms?q=${encodeURIComponent(term.termEn)}&lang=${lang}`} key={term.id}>
                  <strong>{isZh ? term.termZh : term.termEn}</strong>
                  <span>{isZh ? term.termEn : term.termZh}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {methodApplication ? (
          <div className="card panel">
            <h2 className="panel-title">{isZh ? "方法应用" : "Method Use"}</h2>
            <div className="term-note">
              <strong>{isZh ? "适合问题" : "Suitable Question"}</strong>
              <p>{isZh ? methodApplication.questionZh : methodApplication.questionEn}</p>
            </div>
            <div className="term-note">
              <strong>{isZh ? "所需数据" : "Required Data"}</strong>
              <p>{isZh ? methodApplication.dataZh : methodApplication.dataEn}</p>
            </div>
            <Link className="text-link" href={`/methods?lang=${lang}`}>{isZh ? "查看方法库" : "Open method library"} <span aria-hidden="true">›</span></Link>
          </div>
        ) : null}

        {relatedArticles.length > 0 ? (
          <div className="card panel">
            <h2 className="panel-title">{isZh ? "相关知识点" : "Related Articles"}</h2>
            <div className="compact-list">
              {relatedArticles.map((item) => (
                <Link href={`/articles/${item.slug}?lang=${lang}`} key={item.slug}>
                  <strong>{isZh ? item.titleZh : item.titleEn}</strong>
                  <span>{isZh ? item.summaryZh : item.summaryEn}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

      </aside>
    </section>
  );
}
