import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { articleRelations } from "../data/knowledgeRelations.js";
import { learningPaths } from "../data/learningPaths.js";
import { researchMethods } from "../data/researchMethods.js";
import { terms } from "../data/terms.js";

const projectRoot = path.resolve(import.meta.dirname, "..");
const contentRoot = path.join(projectRoot, "content");
const requiredFields = [
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

function findMarkdownFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findMarkdownFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".md") ? [entryPath] : [];
  });
}

const errors = [];
const articles = findMarkdownFiles(contentRoot).map((filePath) => {
  const relativePath = path.relative(projectRoot, filePath);
  const source = fs.readFileSync(filePath, "utf8");
  let data = {};
  let content = source;

  try {
    ({ data, content } = matter(source));
  } catch (error) {
    errors.push(`${relativePath}: invalid frontmatter (${error.reason || error.message})`);
  }

  for (const field of requiredFields) {
    const value = data[field];
    const missing = field === "tags"
      ? !Array.isArray(value) || value.length === 0
      : value === undefined || value === null || value === "";
    if (missing) errors.push(`${relativePath}: missing ${field}`);
  }

  if (!content.includes("<!-- zh -->") || !content.includes("<!-- /zh -->")) {
    errors.push(`${relativePath}: missing complete Chinese content markers`);
  }
  if (!content.includes("<!-- en -->") || !content.includes("<!-- /en -->")) {
    errors.push(`${relativePath}: missing complete English content markers`);
  }

  return {
    filePath: relativePath,
    slug: data.slug,
    titleZh: data.titleZh,
    titleEn: data.titleEn
  };
});

const slugs = new Set();
const titlesZh = new Set();
const titlesEn = new Set();
for (const article of articles) {
  if (!article.slug) continue;
  if (slugs.has(article.slug)) errors.push(`${article.filePath}: duplicate slug ${article.slug}`);
  slugs.add(article.slug);

  if (titlesZh.has(article.titleZh)) errors.push(`${article.filePath}: duplicate Chinese title ${article.titleZh}`);
  if (titlesEn.has(article.titleEn)) errors.push(`${article.filePath}: duplicate English title ${article.titleEn}`);
  titlesZh.add(article.titleZh);
  titlesEn.add(article.titleEn);
}

for (const [source, relationGroups] of Object.entries(articleRelations)) {
  if (!slugs.has(source)) errors.push(`relation source does not exist: ${source}`);
  for (const [group, targets] of Object.entries(relationGroups)) {
    if (!Array.isArray(targets)) {
      errors.push(`${source}.${group} must be an array`);
      continue;
    }
    if (new Set(targets).size !== targets.length) {
      errors.push(`${source}.${group} contains duplicate targets`);
    }
    for (const target of targets) {
      if (!slugs.has(target)) errors.push(`${source}.${group} points to missing article: ${target}`);
      if (target === source) errors.push(`${source}.${group} points to itself`);
    }
  }
}

for (const slug of slugs) {
  if (!articleRelations[slug]) errors.push(`article has no relation record: ${slug}`);
}

let pathStepCount = 0;
const learningPathIds = new Set();
for (const learningPath of learningPaths) {
  if (learningPathIds.has(learningPath.id)) errors.push(`duplicate learning path id: ${learningPath.id}`);
  learningPathIds.add(learningPath.id);

  learningPath.steps.forEach((step, index) => {
    pathStepCount += 1;
    if (step.order !== index + 1) {
      errors.push(`${learningPath.id}: expected order ${index + 1}, received ${step.order}`);
    }
    if (!slugs.has(step.articleSlug)) {
      errors.push(`${learningPath.id}: missing article ${step.articleSlug}`);
    }
  });
}

const termIds = new Set();
for (const term of terms) {
  if (termIds.has(term.id)) errors.push(`duplicate term id: ${term.id}`);
  termIds.add(term.id);
  if (!slugs.has(term.articleSlug)) errors.push(`term ${term.id} points to missing article: ${term.articleSlug}`);
}

const methodIds = new Set();
for (const method of researchMethods) {
  if (methodIds.has(method.id)) errors.push(`duplicate research method id: ${method.id}`);
  methodIds.add(method.id);
  if (!slugs.has(method.articleSlug)) {
    errors.push(`research method ${method.id} points to missing article: ${method.articleSlug}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  `Validated ${articles.length} articles, ${Object.keys(articleRelations).length} relation records, ${pathStepCount} learning-path steps, ${terms.length} terms, and ${researchMethods.length} method cards.`
);
