import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import html from "remark-html";

const contentDirectory = path.join(process.cwd(), "content");
const requiredFrontMatterFields = [
  "slug",
  "titleZh",
  "titleEn",
  "category",
  "levelZh",
  "levelEn",
  "readingTimeZh",
  "readingTimeEn",
  "tags",
  "date",
  "author",
  "summaryZh",
  "summaryEn"
];

function walkMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

function validateFrontMatter(data, filePath) {
  const missingFields = requiredFrontMatterFields.filter((field) => {
    if (field === "tags") return !Array.isArray(data.tags) || data.tags.length === 0;
    return data[field] === undefined || data[field] === null || data[field] === "";
  });

  if (missingFields.length > 0) {
    const relativePath = path.relative(process.cwd(), filePath);
    throw new Error(`${relativePath} 缺少 Front Matter 字段：${missingFields.join(", ")}`);
  }
}

function normalizeDate(date) {
  if (!date) return "";
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  return String(date);
}

function stripLanguageMarkers(markdown) {
  return markdown
    .replace(/<!--\s*\/?(zh|en)\s*-->/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getNodeText(node) {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  if (Array.isArray(node.children)) return node.children.map(getNodeText).join("");
  return "";
}

function slugifyHeading(text) {
  const base = String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base || "section";
}

function uniqueHeadingId(text, usedIds) {
  const base = slugifyHeading(text);
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) id = `${base}-${suffix++}`;
  usedIds.set(id, true);
  return id;
}

function visitTree(node, callback) {
  callback(node);
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => visitTree(child, callback));
  }
}

function headingIdsPlugin() {
  return (tree) => {
    const counts = new Map();

    visitTree(tree, (node) => {
      if (node.type !== "heading") return;

      const text = getNodeText(node);
      const id = uniqueHeadingId(text, counts);
      node.data = node.data || {};
      node.data.hProperties = {
        ...(node.data.hProperties || {}),
        id
      };
    });
  };
}

export function extractLanguageSection(markdown, language = "zh") {
  const tag = language === "en" ? "en" : "zh";
  const regex = new RegExp(`<!--[\\s]*${tag}[\\s]*-->([\\s\\S]*?)<!--[\\s]*/${tag}[\\s]*-->`, "i");
  const match = markdown.match(regex);

  if (match) return match[1].trim();

  return markdown.trim();
}

export function getAllArticles() {
  const files = walkMarkdownFiles(contentDirectory);

  const articles = files
    .map((filePath) => {
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data, content } = matter(fileContents);
      validateFrontMatter(data, filePath);

      const contentZh = extractLanguageSection(content, "zh");
      const contentEn = extractLanguageSection(content, "en");
      const relativePath = path.relative(contentDirectory, filePath).split(path.sep).join("/");
      const date = normalizeDate(data.date);
      const searchableText = [
        data.titleZh,
        data.titleEn,
        data.summaryZh,
        data.summaryEn,
        ...data.tags,
        stripLanguageMarkers(content)
      ]
        .join(" ")
        .toLowerCase();

      return {
        slug: data.slug,
        relativePath,
        titleZh: data.titleZh,
        titleEn: data.titleEn,
        summaryZh: data.summaryZh,
        summaryEn: data.summaryEn,
        category: data.category,
        levelZh: data.levelZh,
        levelEn: data.levelEn,
        readingTimeZh: data.readingTimeZh,
        readingTimeEn: data.readingTimeEn,
        tags: data.tags,
        date,
        author: data.author,
        rawContent: content,
        contentZh,
        contentEn,
        searchableText
      };
    });

  const seenSlugs = new Map();
  const duplicateSlugs = [];

  for (const article of articles) {
    if (seenSlugs.has(article.slug)) {
      duplicateSlugs.push(`${article.slug}: ${seenSlugs.get(article.slug)} / ${article.relativePath}`);
    } else {
      seenSlugs.set(article.slug, article.relativePath);
    }
  }

  if (duplicateSlugs.length > 0) {
    throw new Error(`Duplicate article slug detected: ${duplicateSlugs.join("; ")}`);
  }

  return articles.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function getArticleBySlug(slug) {
  const articles = getAllArticles();
  const article = articles.find((item) => item.slug === slug);
  if (!article) return null;
  return article;
}

export function getArticlesByCategory(category) {
  if (!category || category === "all") return getAllArticles();
  return getAllArticles().filter((article) => article.category === category);
}

export function getAllTags(articles = getAllArticles()) {
  return Array.from(new Set(articles.flatMap((article) => article.tags))).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

export function searchArticles(query, articles = getAllArticles()) {
  const keyword = String(query || "").trim().toLowerCase();
  if (!keyword) return articles;
  return articles.filter((article) => article.searchableText.includes(keyword));
}

export function removeLeadingTitleHeading(markdown) {
  return String(markdown || "").replace(/^\s*#\s+.+(?:\r?\n)+/, "").trim();
}

export function getMarkdownHeadings(markdown, { minDepth = 2, maxDepth = 3 } = {}) {
  const tree = remark().parse(markdown || "");
  const counts = new Map();
  const headings = [];

  visitTree(tree, (node) => {
    if (node.type !== "heading") return;

    const text = getNodeText(node).trim();
    if (!text) return;

    const id = uniqueHeadingId(text, counts);
    if (node.depth < minDepth || node.depth > maxDepth) return;

    headings.push({
      // remark-html's sanitizer prefixes IDs to prevent DOM clobbering.
      id: `user-content-${id}`,
      depth: node.depth,
      text
    });
  });

  return headings;
}

export async function markdownToHtml(markdown) {
  const processedContent = await remark()
    .use(headingIdsPlugin)
    .use(remarkGfm)
    .use(html, { sanitize: true })
    .process(markdown);

  return processedContent.toString();
}

// Structure is checked without prescribing section names or a chapter count.
export function getMarkdownStructureErrors(markdown) {
  const nodes = remark().parse(markdown || "").children;
  const errors = [];
  let previousDepth = 0;
  nodes.forEach((node, index) => {
    if (node.type !== "heading") return;
    const title = getNodeText(node).trim();
    if (!title) errors.push("empty heading");
    if (node.depth > previousDepth + 1) errors.push(`heading level skipped: ${title}`);
    previousDepth = node.depth;
    let hasContent = false;
    for (let i = index + 1; i < nodes.length; i += 1) {
      if (nodes[i].type === "heading" && nodes[i].depth <= node.depth) break;
      if (!["heading", "html", "thematicBreak"].includes(nodes[i].type)) hasContent = true;
    }
    if (!hasContent) errors.push(`section has no content: ${title}`);
  });
  return errors;
}
