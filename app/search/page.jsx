import Link from "next/link";
import { ArrowRight, Clock3, Search } from "lucide-react";
import SiteSearchAssistant from "@/components/SiteSearchAssistant";
import { getAiProviderConfig } from "@/lib/aiProvider";
import { getAllArticles } from "@/lib/markdown";

export const metadata = {
  title: "智能检索 | 译研知识库",
  description: "从本站文章中检索知识，并在服务端配置完成后生成带原文引用的 AI 回答。"
};

function withLanguage(href, language) {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}lang=${language}`;
}

export default async function SearchPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const isZh = lang !== "en";
  const initialQuery = String(sp?.q || "").trim();
  const aiAvailable = getAiProviderConfig().hasApiKey;
  const sourceArticles = getAllArticles();

  const articles = sourceArticles.map((article) => ({
    slug: article.slug,
    titleZh: article.titleZh,
    titleEn: article.titleEn,
    summaryZh: article.summaryZh,
    summaryEn: article.summaryEn,
    category: article.category,
    tags: article.tags,
    date: article.date
  }));

  return (
    <section className="resource-page search-page">
      <div className="resource-hero card search-hero">
        <span className="badge"><Search size={15} /> {isZh ? "智能检索" : "Knowledge Search"}</span>
        <h1>{isZh ? "检索知识，也追溯回答依据" : "Search Knowledge and Trace the Evidence"}</h1>
        <p>
          {isZh
            ? "普通检索帮助你快速定位文章；智能回答会先检索本站知识，再根据相关片段生成带编号引用的回答。"
            : "Standard search locates articles quickly. AI Answer retrieves site knowledge first, then responds with numbered citations to the supporting articles."}
        </p>
        <div className="hero-actions">
          <Link className="primary-button" href={withLanguage("/articles", lang)}>
            {isZh ? "浏览全部文章" : "Browse Articles"} <ArrowRight size={16} />
          </Link>
          <Link className="secondary-button" href={withLanguage("/ai-history", lang)}>
            <Clock3 size={16} /> {isZh ? "我的问答记录" : "My AI History"}
          </Link>
        </div>
      </div>

      <SiteSearchAssistant
        articles={articles}
        lang={lang}
        initialQuery={initialQuery}
        aiAvailable={aiAvailable}
      />
    </section>
  );
}
