import { learningPaths } from "@/data/learningPaths";
import { researchMethods } from "@/data/researchMethods";
import { terms } from "@/data/terms";
import { toolGuides } from "@/data/toolGuides";
import { getAllArticles } from "@/lib/markdown";

let targetIndex;

function buildTargetIndex() {
  if (targetIndex) return targetIndex;

  const index = new Map();

  for (const article of getAllArticles()) {
    index.set(article.slug, {
      type: "article",
      titleZh: article.titleZh,
      titleEn: article.titleEn,
      href: `/articles/${article.slug}`
    });
  }

  for (const term of terms) {
    index.set(`term:${term.id}`, {
      type: "term",
      titleZh: term.termZh,
      titleEn: term.termEn,
      href: `/terms?q=${encodeURIComponent(term.termZh)}`
    });
  }

  for (const method of researchMethods) {
    index.set(`method:${method.id}`, {
      type: "method",
      titleZh: method.titleZh,
      titleEn: method.titleEn,
      href: `/methods?q=${encodeURIComponent(method.titleZh)}`
    });
  }

  for (const path of learningPaths) {
    index.set(`path:${path.id}`, {
      type: "path",
      titleZh: path.titleZh,
      titleEn: path.titleEn,
      href: `/paths?type=all&q=${encodeURIComponent(path.titleZh)}`
    });
  }

  for (const tool of toolGuides) {
    index.set(`tool:${tool.id}`, {
      type: "tool",
      titleZh: tool.titleZh,
      titleEn: tool.titleEn,
      href: `/tools#tool-${encodeURIComponent(tool.id)}`
    });
  }

  targetIndex = index;
  return targetIndex;
}

function withLanguage(href, lang) {
  const [pathAndQuery, hash = ""] = href.split("#");
  const separator = pathAndQuery.includes("?") ? "&" : "?";
  const localized = `${pathAndQuery}${separator}lang=${lang}`;
  return hash ? `${localized}#${hash}` : localized;
}

export function getDiscussionTarget(targetKey, lang = "zh") {
  const key = String(targetKey || "").trim();
  const isZh = lang !== "en";
  const knownTarget = buildTargetIndex().get(key);

  if (knownTarget) {
    return {
      type: knownTarget.type,
      title: isZh ? knownTarget.titleZh : knownTarget.titleEn,
      href: withLanguage(knownTarget.href, lang)
    };
  }

  const [prefix, rawId] = key.includes(":") ? key.split(":", 2) : ["article", key];
  const readableId = (rawId || key).replace(/[-_]+/g, " ").trim();
  const typeLabels = {
    article: isZh ? "知识点" : "Article",
    term: isZh ? "术语" : "Term",
    method: isZh ? "方法" : "Method",
    path: isZh ? "学习路径" : "Learning path",
    tool: isZh ? "工具" : "Tool"
  };

  return {
    type: prefix,
    title: readableId || typeLabels[prefix] || (isZh ? "知识点" : "Knowledge item"),
    href: withLanguage(key.includes(":") ? "/articles" : `/articles/${key}`, lang)
  };
}
