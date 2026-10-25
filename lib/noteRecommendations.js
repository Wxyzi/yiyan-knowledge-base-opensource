function shuffled(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function uniqueArticles(articles) {
  return [...new Map(articles.filter(Boolean).map((article) => [article.slug, article])).values()];
}

function newestFirst(a, b) {
  return b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug);
}

export function getNoteFeeds(articles, categoryIds, { perCategory = 6, random = Math.random } = {}) {
  const groups = [...new Set(categoryIds)].map((id) => uniqueArticles(articles.filter((article) => article.category === id)));
  const pools = groups.map((group) => {
    const candidates = shuffled(group, random);
    // Keep an entry point and a frontier topic when available, without fixing their positions.
    const selected = uniqueArticles([
      candidates.find((article) => article.levelZh === "入门"),
      candidates.find((article) => article.tags?.includes("2026前沿")),
      ...candidates
    ]).slice(0, perCategory);
    return shuffled(selected, random);
  });
  const recommended = [];
  for (let round = 0; round < perCategory; round += 1) {
    recommended.push(...shuffled(pools.map((pool) => pool[round]).filter(Boolean), random));
  }

  // Recent is independent of the lottery: retain global newest notes and each field's newest.
  const recent = uniqueArticles([
    ...groups.flat().sort(newestFirst).slice(0, perCategory * groups.length),
    ...groups.flatMap((group) => [...group].sort(newestFirst).slice(0, perCategory))
  ]).sort(newestFirst);
  return { recommended, recent };
}
