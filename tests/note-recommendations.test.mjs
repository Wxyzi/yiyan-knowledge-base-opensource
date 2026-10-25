import assert from "node:assert/strict";
import test from "node:test";
import { getNoteFeeds } from "../lib/noteRecommendations.js";

const categoryIds = ["corpus", "statistics", "ai", "methods", "translation-tech", "linguistics", "applied-linguistics", "discourse-analysis"];
const articles = categoryIds.flatMap((category) => Array.from({ length: 30 }, (_, index) => ({
  slug: `${category}-${index}`, category, date: `2026-08-${String(index + 1).padStart(2, "0")}`,
  levelZh: index < 4 ? "入门" : "研究进阶", tags: index < 6 ? ["2026前沿"] : []
})));
function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test("fresh selections contain unique notes, balanced fields, and accessible entry points", () => {
  const { recommended } = getNoteFeeds(articles, categoryIds, { random: random(12) });
  assert.equal(recommended.length, 48);
  assert.equal(new Set(recommended.map((article) => article.slug)).size, 48);
  for (const category of categoryIds) {
    const group = recommended.filter((article) => article.category === category);
    assert.equal(group.length, 6);
    assert.ok(group.some((article) => article.levelZh === "入门"));
    assert.ok(group.some((article) => article.tags.includes("2026前沿")));
    assert.equal(recommended.slice(0, 16).filter((article) => article.category === category).length, 2);
  }
});

test("randomness changes the actual selection as well as its order, without mutating content", () => {
  const before = JSON.stringify(articles);
  const first = getNoteFeeds(articles, categoryIds, { random: random(1) }).recommended;
  const second = getNoteFeeds(articles, categoryIds, { random: random(2) }).recommended;
  assert.notDeepEqual(first.map((article) => article.slug).sort(), second.map((article) => article.slug).sort());
  assert.notDeepEqual(first.slice(0, 8).map((article) => article.category), second.slice(0, 8).map((article) => article.category));
  assert.equal(JSON.stringify(articles), before);
});

test("recent notes are stable across visits, include the global newest, and cover each field", () => {
  const first = getNoteFeeds(articles, categoryIds, { random: random(1) }).recent;
  const second = getNoteFeeds(articles, categoryIds, { random: random(77) }).recent;
  assert.deepEqual(first, second);
  assert.ok(first.every((article, index) => index === 0 || first[index - 1].date >= article.date));
  const newest = [...articles].sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug)).slice(0, 48);
  assert.deepEqual(first.slice(0, 48), newest);
  for (const category of categoryIds) assert.ok(first.filter((article) => article.category === category).length >= 6);
});

test("empty or small fields and duplicate candidates do not produce missing or repeated notes", () => {
  assert.deepEqual(getNoteFeeds([], categoryIds), { recommended: [], recent: [] });
  const feeds = getNoteFeeds([articles[0], articles[1], articles[0]], [categoryIds[0], categoryIds[0], "missing"], { random: random(1) });
  assert.equal(feeds.recommended.length, 2);
  assert.equal(feeds.recent.length, 2);
  assert.deepEqual(getNoteFeeds(articles, categoryIds, { perCategory: 0 }), { recommended: [], recent: [] });
});
