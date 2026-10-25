import { BarChart3, BookOpenCheck, BrainCircuit, Database, Languages, Layers, PenLine, Tags, Wrench } from "lucide-react";

export const categories = [
  { id: "all", zh: "全部", en: "All", icon: Layers, emoji: "✨" },
  { id: "translation-tech", zh: "翻译技术", en: "Translation Technology", icon: Languages, emoji: "💬" },
  { id: "corpus", zh: "语料库语言学", en: "Corpus Linguistics", icon: Database, emoji: "🔎" },
  { id: "discourse-analysis", zh: "话语分析", en: "Discourse Analysis", icon: PenLine, emoji: "🤔" },
  { id: "linguistics", zh: "语言学基础", en: "Linguistics Foundations", icon: BookOpenCheck, emoji: "📚" },
  { id: "applied-linguistics", zh: "应用语言学", en: "Applied Linguistics", icon: BookOpenCheck, emoji: "🧩" },
  { id: "ai", zh: "人工智能基础", en: "AI Fundamentals", icon: BrainCircuit, emoji: "💡" },
  { id: "methods", zh: "研究方法", en: "Research Methods", icon: BarChart3, emoji: "🧐" },
  { id: "statistics", zh: "统计学", en: "Statistics", icon: BarChart3, emoji: "📊" },
  { id: "tools", zh: "工具教程", en: "Tool Tutorials", icon: Wrench, emoji: "🛠️" },
  { id: "terminology", zh: "术语表", en: "Terminology", icon: Tags, emoji: "📝" }
];

export function getCategoryById(id) {
  return categories.find((category) => category.id === id) || categories[0];
}
