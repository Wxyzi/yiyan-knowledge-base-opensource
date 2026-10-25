import { BookOpenCheck, Sparkles } from "lucide-react";

export default function AiAnswerModeToggle({ value, onChange, lang = "zh", disabled = false }) {
  const isZh = lang !== "en";
  const isHybrid = value === "hybrid";

  return (
    <div className="ai-answer-mode-control">
      <div className="ai-answer-mode-copy">
        <strong>{isZh ? "回答范围" : "Answer scope"}</strong>
        <span>
          {isHybrid
            ? (isZh ? "站内资料 + GLM 通用知识，不含实时联网" : "Site sources + GLM general knowledge, without live web search")
            : (isZh ? "只依据本站文章，并标注引用" : "Only site articles, with citations")}
        </span>
      </div>
      <div className="ai-answer-mode-switch" role="group" aria-label={isZh ? "选择回答范围" : "Choose answer scope"}>
        <button
          className={value === "site" ? "active" : ""}
          type="button"
          aria-pressed={value === "site"}
          disabled={disabled}
          onClick={() => onChange("site")}
        >
          <BookOpenCheck size={15} />
          {isZh ? "仅知识库" : "Site only"}
        </button>
        <button
          className={isHybrid ? "active" : ""}
          type="button"
          aria-pressed={isHybrid}
          disabled={disabled}
          onClick={() => onChange("hybrid")}
        >
          <Sparkles size={15} />
          {isZh ? "综合知识" : "Hybrid"}
        </button>
      </div>
    </div>
  );
}
