export const learningPaths = [{
  id: "sample-learning-path", kind: "system", category: "methods",
  titleZh: "从问题到证据", titleEn: "From Questions to Evidence",
  audienceZh: "初次练习研究记录的学习者", audienceEn: "Learners practicing research notes",
  descriptionZh: "用两个简短示例连接研究问题与证据记录。", descriptionEn: "Connect a research question to evidence through two short samples.",
  advantage: "体系化",
  steps: [
    { order: 1, titleZh: "提出研究问题", titleEn: "Frame a question", articleSlug: "sample-research-question" },
    { order: 2, titleZh: "记录证据", titleEn: "Record evidence", articleSlug: "sample-evidence-note" }
  ]
}];

export const learnerEntrances = [{
  id: "sample-reader", pathId: "sample-learning-path",
  labelZh: "开始研究记录练习", labelEn: "Practice research notes",
  noteZh: "先明确问题，再检查证据。", noteEn: "Define a question, then examine the evidence."
}];

export function getLearningPathById(id) { return learningPaths.find(item => item.id === id); }
