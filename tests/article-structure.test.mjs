import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { getAllArticles, getMarkdownHeadings, getMarkdownStructureErrors, markdownToHtml, removeLeadingTitleHeading } from "../lib/markdown.js";

test("short explanations and long guides do not require a fixed chapter count", () => {
  for (const count of [1, 4, 7, 16, 25]) {
    const body = `# Note\n\n${Array.from({ length: count }, (_, i) => `## Topic ${i}\n\nExplanation.`).join("\n\n")}`;
    assert.deepEqual(getMarkdownStructureErrors(body), []);
    assert.equal(getMarkdownHeadings(body).length, count);
  }
  assert.deepEqual(getMarkdownStructureErrors("A brief explanation without headings."), []);
});

test("empty sections and skipped levels are still rejected", () => {
  assert.match(getMarkdownStructureErrors("# Note\n\n## Empty\n\n## Full\n\nText.").join(" "), /section has no content: Empty/);
  assert.match(getMarkdownStructureErrors("# Note\n\n### Jump\n\nText.").join(" "), /heading level skipped/);
  assert.deepEqual(getMarkdownStructureErrors("# Note\n\n## Parent\n\n### Child\n\nText."), []);
});

test("fenced code is not treated as headings", () => {
  const body = "# Note\n\n## Code\n\n```md\n### Example\n## Not a section\n```";
  assert.deepEqual(getMarkdownStructureErrors(body), []);
  assert.equal(getMarkdownHeadings(body).length, 1);
});

test("TOC anchors are unique and match rendered headings, including suffix collisions", async () => {
  const body = "## 概念\n\nText\n\n## 概念-2\n\nText\n\n### 概念\n\nText\n\n#### Hidden\n\nText\n\n## Hidden\n\nText";
  const headings = getMarkdownHeadings(body);
  assert.deepEqual(headings.map((item) => item.id), ["user-content-概念", "user-content-概念-2", "user-content-概念-3", "user-content-hidden-2"]);
  const rendered = await markdownToHtml(body);
  for (const heading of headings) {
    assert.ok(rendered.includes(`id="${heading.id}"`));
  }
  const ids = [...rendered.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
});

test("both samples retain bilingual content, valid links, and matching complete outlines", async () => {
  const articles = getAllArticles();
  const slugs = new Set(articles.map((article) => article.slug));
  assert.equal(articles.length, 2);
  for (const slug of ["sample-research-question", "sample-evidence-note"]) {
    const article = articles.find((item) => item.slug === slug);
    assert.ok(article, slug);
    for (const body of [article.contentZh, article.contentEn]) {
      assert.deepEqual(getMarkdownStructureErrors(body), [], slug);
      const markdown = removeLeadingTitleHeading(body);
      const headings = getMarkdownHeadings(markdown);
      const rendered = await markdownToHtml(markdown);
      assert.ok(headings.length > 0, slug);
      for (const heading of headings) assert.ok(rendered.includes(`id="${heading.id}"`), `${slug}: ${heading.text}`);
      for (const match of body.matchAll(/\]\(\/articles\/([a-z0-9-]+)/g)) assert.ok(slugs.has(match[1]), `${slug}: ${match[1]}`);
    }
  }
});

test("heading navigation keeps HTML sanitization and DOM-clobber protection", async () => {
  const rendered = await markdownToHtml("## location\n\n<script>alert(1)</script>\n\n[unsafe](javascript:alert%281%29)");
  assert.match(rendered, /id="user-content-location"/);
  assert.doesNotMatch(rendered, /<script|href="javascript:|id="location"/);
});

test("the article view does not inject category-wide research templates or cap the outline", () => {
  const page = fs.readFileSync(new URL("../app/articles/[slug]/page.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /getArticleResearchProfile|research-brief|article-summary|slice\(0, 14\)/);
  assert.match(page, /CommentSection/);
  assert.match(page, /FavoriteButton/);
  assert.match(page, /getArticleRelations/);
  assert.match(page, /article-mobile-outline/);
});
