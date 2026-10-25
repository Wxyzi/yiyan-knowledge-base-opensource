export const articleRelations = {
  "sample-research-question": { prerequisites: [], next: ["sample-evidence-note"], related: [], bridge: [] },
  "sample-evidence-note": { prerequisites: ["sample-research-question"], next: [], related: [], bridge: [] }
};

export function getArticleRelations(slug) {
  return articleRelations[slug] || { prerequisites: [], next: [], related: [], bridge: [] };
}
