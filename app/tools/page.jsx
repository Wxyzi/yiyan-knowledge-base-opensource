import Link from "next/link";
import { ArrowRight, ClipboardList, Wrench } from "lucide-react";
import { toolGuides } from "@/data/toolGuides";
import CommentSection from "@/components/CommentSection";

export const metadata = {
  title: "工具教程库 | 译研知识库",
  description: "可复现的语料库、统计、Python、AI 和翻译技术工具流程。"
};

function withLanguage(href, language) {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}lang=${language}`;
}

export default async function ToolsPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const isZh = lang !== "en";
  const groups = Array.from(new Set(toolGuides.map((tool) => (isZh ? tool.typeZh : tool.typeEn))));

  return (
    <section className="resource-page">
      <div className="resource-hero card">
        <span className="badge"><Wrench size={15} /> Tool Workflows</span>
        <h1>{isZh ? "工具教程库" : "Tool Workflow Library"}</h1>
        <p>
          {isZh
            ? "把工具操作流程沉淀下来，让用户不只是知道概念，还能准备数据、执行步骤、导出结果并形成解释。"
            : "Make tool workflows reusable so learners can prepare data, run steps, export results, and form interpretations."}
        </p>
      </div>

      {groups.map((group) => (
        <section className="home-section" key={group}>
          <div className="section-header">
            <div>
              <span className="badge"><ClipboardList size={15} /> {group}</span>
              <h2>{group}</h2>
            </div>
          </div>
          <div className="tool-grid">
            {toolGuides
              .filter((tool) => (isZh ? tool.typeZh : tool.typeEn) === group)
              .map((tool) => (
                <article className="card tool-card" id={`tool-${tool.id}`} key={tool.id}>
                  <h3>{isZh ? tool.titleZh : tool.titleEn}</h3>
                  <p>{isZh ? tool.purposeZh : tool.purposeEn}</p>
                  <ol className="flow-list">
                    {(isZh ? tool.stepsZh : tool.stepsEn).map((step) => <li key={step}>{step}</li>)}
                  </ol>
                  <div className="hero-actions">
                    {tool.relatedSlugs.map((slug) => (
                      <Link className="secondary-button" href={withLanguage(`/articles/${slug}`, lang)} key={slug}>
                        {slug} <ArrowRight size={14} />
                      </Link>
                    ))}
                  </div>
                  <CommentSection
                    targetType="tool"
                    targetId={tool.id}
                    title={isZh ? "工具讨论" : "Tool Discussion"}
                    lang={lang}
                    collapsed
                    embedded
                  />
                </article>
              ))}
          </div>
        </section>
      ))}
    </section>
  );
}
