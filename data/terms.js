export const terms = [
  { id: "sample-question", termZh: "研究问题", termEn: "research question", category: "methods", articleSlug: "sample-research-question",
    definitionZh: "说明研究希望回答什么的具体问句。", definitionEn: "A specific question that states what a study seeks to answer.",
    related: ["evidence"], mistakesZh: ["兴趣不等于可回答的问题。"], mistakesEn: ["An interest is not yet an answerable question."] },
  { id: "sample-evidence", termZh: "证据记录", termEn: "evidence note", category: "corpus", articleSlug: "sample-evidence-note",
    definitionZh: "把材料来源、观察和解释分别保存的记录。", definitionEn: "A record separating the source, observation, and interpretation.",
    related: ["research question"], mistakesZh: ["观察与解释需要区分。"], mistakesEn: ["Distinguish an observation from an interpretation."] }
];

export function getTermsByArticleSlug(slug) { return terms.filter(item => item.articleSlug === slug); }
