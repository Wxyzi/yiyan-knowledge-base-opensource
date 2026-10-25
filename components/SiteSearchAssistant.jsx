"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  Clock3,
  LoaderCircle,
  Search,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import AiAnswerModeToggle from "@/components/AiAnswerModeToggle";

const exampleQuestionsZh = [
  "二语习得中的任务型教学有什么特点？",
  "BERTopic 主题建模适合解决什么问题？",
  "语料库方法如何用于话语分析？",
  "效应量和统计显著性有什么区别？"
];

const exampleQuestionsEn = [
  "How does task-based teaching support second language acquisition?",
  "What research questions suit BERTopic topic modeling?",
  "How can corpus methods support discourse analysis?",
  "How do effect size and statistical significance differ?"
];

const commonSearchTerms = [
  "BERTopic",
  "TF-IDF",
  "RAG",
  "AI",
  "语料库",
  "语言学",
  "应用语言学",
  "二语习得",
  "任务型教学",
  "跨语实践",
  "纠正性反馈",
  "语言评价",
  "话语分析",
  "翻译技术",
  "人工智能",
  "机器翻译",
  "主题建模",
  "统计学",
  "效应量",
  "回归",
  "相关分析",
  "显著性",
  "关键词",
  "搭配",
  "框架",
  "评价",
  "corpus",
  "linguistics",
  "applied linguistics",
  "second language acquisition",
  "task-based language teaching",
  "translanguaging",
  "corrective feedback",
  "discourse",
  "translation",
  "statistics",
  "regression",
  "effect size",
  "topic modeling",
  "machine translation"
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function stripMarkdown(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_>~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getKnownTerms(articles) {
  return Array.from(new Set([
    ...commonSearchTerms,
    ...articles.flatMap((article) => [
      article.titleZh,
      article.titleEn,
      article.category,
      ...article.tags
    ])
  ].filter(Boolean)));
}

function getTerms(query, articles) {
  const normalized = normalizeText(query);
  const parts = normalized
    .split(/[,\s，。！？、；;:：'“”‘’()[\]{}<>《》【】\\]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
  const knownTerms = getKnownTerms(articles)
    .map((item) => normalizeText(item))
    .filter((item) => item.length >= 2 && normalized.includes(item));

  return Array.from(new Set([normalized, ...parts, ...knownTerms].filter(Boolean)));
}

function countMatches(text, terms, maxPerTerm = Number.POSITIVE_INFINITY) {
  const normalized = normalizeText(text);
  return terms.reduce((total, term) => {
    if (!term) return total;
    let count = 0;
    let index = normalized.indexOf(term);
    while (index !== -1 && count < maxPerTerm) {
      count += 1;
      index = normalized.indexOf(term, index + term.length);
    }
    return total + count;
  }, 0);
}

function matchedTermCount(text, terms) {
  const normalized = normalizeText(text);
  return terms.filter((term) => term && normalized.includes(term)).length;
}

function createExcerpt(article, terms, isZh) {
  const source = stripMarkdown(isZh ? article.contentZh : article.contentEn || article.contentZh);
  const normalized = normalizeText(source);
  const matchedTerm = terms.find((term) => normalized.includes(term));
  const fallback = isZh ? article.summaryZh : article.summaryEn || article.summaryZh;

  if (!matchedTerm) return fallback;

  const index = normalized.indexOf(matchedTerm);
  const start = Math.max(0, index - 60);
  const end = Math.min(source.length, index + matchedTerm.length + 120);
  return `${start > 0 ? "..." : ""}${source.slice(start, end).trim()}${end < source.length ? "..." : ""}`;
}

function scoreArticle(article, terms, isZh) {
  const title = isZh ? article.titleZh : article.titleEn || article.titleZh;
  const otherTitle = isZh ? article.titleEn : article.titleZh;
  const summary = isZh ? article.summaryZh : article.summaryEn || article.summaryZh;
  const content = isZh ? article.contentZh : article.contentEn || article.contentZh;
  const tagText = article.tags.join(" ");
  const combined = [title, otherTitle, summary, tagText, content].join(" ");

  return (
    countMatches(title, terms, 2) * 30 +
    countMatches(otherTitle, terms, 2) * 12 +
    countMatches(tagText, terms, 2) * 22 +
    countMatches(summary, terms, 3) * 10 +
    countMatches(content, terms, 3) * 3 +
    matchedTermCount(combined, terms) * 6
  );
}
function getAiErrorMessage(code, isZh) {
  const messages = {
    AI_NOT_CONFIGURED: ["智能回答尚未完成服务端配置。", "AI answering has not been configured on the server."],
    AI_AUTH_ERROR: ["OpenCode Go 密钥无效，或当前订阅无权使用所选模型。", "The OpenCode Go key is invalid or cannot access the selected model."],
    AI_MODEL_ERROR: ["当前回答模型不可用，请稍后再试。", "The configured answer model is unavailable. Please try again later."],
    AI_PROVIDER_LIMIT: ["OpenCode Go 的短期、周度或月度额度已达到限制。", "The OpenCode Go short-term, weekly, or monthly usage limit has been reached."],
    AI_RATE_LIMIT: ["请求过于频繁，请稍后再试。", "Too many requests. Please try again shortly."],
    AUTH_REQUIRED: ["登录状态已经失效，请重新登录。", "Your session has expired. Please sign in again."],
    AI_TIMEOUT: ["回答生成超时，请稍后重试。", "Answer generation timed out. Please try again."],
    AI_UNAVAILABLE: ["暂时无法连接智能回答服务。", "The AI answering service is temporarily unavailable."]
  };
  const message = messages[code] || ["智能回答暂时失败，请稍后重试。", "AI answering failed. Please try again later."];
  return isZh ? message[0] : message[1];
}

function AnswerText({ answer, sources, lang }) {
  const parts = String(answer || "").split(/(\[\d{1,2}\])/g);

  return (
    <div className="ai-answer-text">
      {parts.map((part, index) => {
        const match = part.match(/^\[(\d{1,2})]$/);
        if (!match) return <span key={`${part}-${index}`}>{part}</span>;

        const source = sources.find((item) => item.id === Number(match[1]));
        if (!source) return <span key={`${part}-${index}`}>{part}</span>;

        return (
          <Link
            className="ai-inline-citation"
            href={`/articles/${source.slug}?lang=${lang}`}
            key={`${part}-${index}`}
            aria-label={`${part} ${source.title}`}
          >
            {part}
          </Link>
        );
      })}
    </div>
  );
}

export default function SiteSearchAssistant({
  articles = [],
  lang = "zh",
  initialQuery = "",
  aiAvailable = false,
  variant = "full"
}) {
  const isZh = lang !== "en";
  const isHome = variant === "home";
  const normalizedInitialQuery = String(initialQuery || "").trim();
  const [query, setQuery] = useState(normalizedInitialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(normalizedInitialQuery);
  const [aiState, setAiState] = useState("idle");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiSources, setAiSources] = useState([]);
  const [aiError, setAiError] = useState("");
  const [historySaved, setHistorySaved] = useState(null);
  const [historyConversationId, setHistoryConversationId] = useState(null);
  const [answerMode, setAnswerMode] = useState("hybrid");
  const [answeredMode, setAnsweredMode] = useState(null);
  const examples = isZh ? exampleQuestionsZh : exampleQuestionsEn;

  const results = useMemo(() => {
    const terms = getTerms(submittedQuery, articles);
    if (!terms.length) return [];

    return articles
      .map((article) => ({
        ...article,
        score: scoreArticle(article, terms, isZh),
        excerpt: createExcerpt(article, terms, isZh)
      }))
      .filter((article) => article.score > 0)
      .sort((a, b) => b.score - a.score || String(b.date).localeCompare(String(a.date)))
      .slice(0, 12);
  }, [articles, submittedQuery, isZh]);

  function resetAiAnswer() {
    setAiState("idle");
    setAiAnswer("");
    setAiSources([]);
    setAiError("");
    setHistorySaved(null);
    setHistoryConversationId(null);
    setAnsweredMode(null);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const cleanQuery = query.trim();

    if (isHome) {
      const params = new URLSearchParams({ lang });
      if (cleanQuery) params.set("q", cleanQuery);
      window.location.assign(`/search?${params.toString()}`);
      return;
    }

    setSubmittedQuery(cleanQuery);
    resetAiAnswer();
  }

  function useExample(item) {
    setQuery(item);
    setSubmittedQuery(item);
    resetAiAnswer();
  }

  async function requestAiAnswer() {
    const question = query.trim();
    setSubmittedQuery(question);
    setAiAnswer("");
    setAiSources([]);
    setAiError("");
    setHistorySaved(null);
    setHistoryConversationId(null);
    setAnsweredMode(null);

    if (question.length < 2) {
      setAiState("error");
      setAiError(isZh ? "请先输入一个问题。" : "Enter a question first.");
      return;
    }

    if (!aiAvailable) {
      setAiState("error");
      setAiError(isZh ? "智能回答尚未完成服务端配置。" : "AI answering has not been configured on the server.");
      return;
    }

    setAiState("loading");

    try {
      const response = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, language: isZh ? "zh" : "en", answerMode })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getAiErrorMessage(payload.code, isZh));
      }

      setAiAnswer(payload.answer || "");
      setAiSources(Array.isArray(payload.sources) ? payload.sources : []);
      setHistorySaved(Boolean(payload.historySaved));
      setHistoryConversationId(payload.conversationId || null);
      setAnsweredMode(payload.answerMode || answerMode);
      setAiState("success");
    } catch (error) {
      setAiState("error");
      setAiError(error.message || getAiErrorMessage("", isZh));
    }
  }

  return (
    <section className={`search-assistant-shell ${isHome ? "home-search-assistant" : ""}`}>
      <div className={`search-assistant-panel ${isHome ? "journal-search-panel" : "card"}`}>
        <div className="search-assistant-head">
          {!isHome ? <span className="badge"><Sparkles size={15} /> {isZh ? "智能检索" : "AI Search"}</span> : null}
          <h2>
            {isHome
              ? (isZh ? "智能检索" : "Research search")
              : (isZh ? "检索知识并生成回答" : "Retrieve Knowledge and Generate an Answer")}
          </h2>
          {!isHome ? <p>
            {isZh
              ? (isHome ? "可选择只依据本站文章，或在站内依据上补充 GLM 通用知识。" : "先定位站内知识，再按所选范围生成回答；普通检索始终可用。")
              : (isHome ? "Choose a site-grounded answer or supplement site evidence with GLM general knowledge." : "Retrieve site knowledge first, then answer within the selected scope. Standard search remains available.")}
          </p> : null}
        </div>

        <AiAnswerModeToggle
          value={answerMode}
          onChange={setAnswerMode}
          lang={lang}
          disabled={aiState === "loading"}
        />

        <form className="site-search-form" role="search" aria-label={isZh ? "站内知识检索" : "Site knowledge search"} onSubmit={handleSubmit}>
          <input
            type="search"
            className="search-box site-search-input"
            maxLength={600}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={isZh ? "输入站内检索问题" : "Enter a site search question"}
            placeholder={isZh ? "输入概念、方法或研究问题" : "Enter a concept, method, or research question"}
          />
          <div className="site-search-actions">
            <button className="secondary-button" type="submit"><Search size={16} /> {isHome ? (isZh ? "查找文章" : "Find Articles") : (isZh ? "普通检索" : "Search")}</button>
            <button
              className="primary-button"
              type="button"
              onClick={requestAiAnswer}
              disabled={aiState === "loading" || !aiAvailable}
              title={!aiAvailable ? (isZh ? "AI 服务尚未配置" : "AI service is not configured") : undefined}
            >
              {aiState === "loading" ? <LoaderCircle className="spin-icon" size={16} /> : <Sparkles size={16} />}
              {aiState === "loading"
                ? (isZh ? "生成中" : "Generating")
                : (isZh ? "AI 回答" : "AI Answer")}
            </button>
          </div>
        </form>

        <div className="search-example-row" aria-label={isZh ? "示例问题" : "Example questions"}>
          {examples.map((item) => (
            <button type="button" onClick={() => useExample(item)} key={item}>
              {item}
            </button>
          ))}
        </div>

        <p className="ai-history-disclosure">
          <ShieldCheck size={14} />
          {isZh
            ? "AI 问答会保存到你的账号记录中，方便回顾和继续对话；你可以随时删除。"
            : "AI questions and answers are saved to your account for review and follow-up, and can be deleted at any time."}
          <Link href={`/ai-history?lang=${lang}`}>{isZh ? "查看记录" : "View History"} <Clock3 size={13} /></Link>
        </p>

        <section className={`ai-answer-panel ai-answer-state-${aiState}`} aria-live="polite" aria-busy={aiState === "loading"}>
          <div className="ai-answer-heading">
            <div>
              <span>
                <Sparkles size={16} />
                {(answeredMode || answerMode) === "hybrid"
                  ? (isZh ? "综合知识回答" : "Hybrid Answer")
                  : (isZh ? "知识库回答" : "Knowledge Base Answer")}
              </span>
              <h3>{submittedQuery || (isZh ? "等待提问" : "Waiting for a question")}</h3>
            </div>
            <div className="ai-answer-heading-actions">
              <Link className="ai-history-shortcut" href={`/ai-history?lang=${lang}`}>
                <Clock3 size={14} /> {isZh ? "问答记录" : "History"}
              </Link>
              <span className={`ai-answer-status status-${aiState}`}>
                {aiState === "success"
                  ? (isZh ? "已生成" : "Ready")
                  : aiState === "loading"
                    ? (isZh ? "检索中" : "Retrieving")
                    : aiState === "error"
                      ? (isZh ? "需要检查" : "Needs attention")
                      : (aiAvailable ? (isZh ? "可用" : "Available") : (isZh ? "未配置" : "Not configured"))}
              </span>
            </div>
          </div>

          {aiState === "idle" ? (
            <p className="ai-answer-placeholder">
              {aiAvailable
                ? (isZh ? "输入问题后选择“AI 回答”；综合模式会区分站内依据与模型通用知识。" : "Ask a question and choose AI Answer. Hybrid mode separates site evidence from model general knowledge.")
                : (isZh ? "普通检索可以继续使用；AI 回答将在服务配置完成后开放。" : "Standard search remains available. AI answers will open after service setup is complete.")}
            </p>
          ) : null}

          {aiState === "loading" ? (
            <div className="ai-answer-loading" aria-label={isZh ? "正在生成回答" : "Generating answer"}>
              <span />
              <span />
              <span />
            </div>
          ) : null}

          {aiState === "error" ? (
            <div className="ai-answer-error"><AlertCircle size={18} /><p>{aiError}</p></div>
          ) : null}

          {aiState === "success" ? (
            <>
              <AnswerText answer={aiAnswer} sources={aiSources} lang={lang} />
              {aiSources.length ? (
                <div className="ai-answer-sources">
                  <h4>{isZh ? "回答依据" : "Sources"}</h4>
                  {aiSources.map((source) => (
                    <Link href={`/articles/${source.slug}?lang=${lang}`} key={`${source.id}-${source.slug}`}>
                      <span>[{source.id}]</span>
                      <div>
                        <strong>{source.title}</strong>
                        <p>{source.excerpt}</p>
                      </div>
                      <ArrowRight size={16} />
                    </Link>
                  ))}
                </div>
              ) : null}
              <div className="ai-answer-meta-row">
                <p className="ai-answer-caution"><ShieldCheck size={15} />
                  {(answeredMode || answerMode) === "hybrid"
                    ? (isZh ? "站内引用可打开核对；通用知识补充并非实时联网结果。" : "Open site citations to verify them. General supplements are not live web results.")
                    : (isZh ? "回答仅供学习参考，请打开引用核对原文。" : "For study use. Open the citations and verify the original text.")}
                </p>
                {historySaved && historyConversationId ? (
                  <Link className="text-link" href={`/ai-chat/${historyConversationId}?lang=${lang}`}>
                    <Clock3 size={14} /> {isZh ? "打开会话并继续追问" : "Open and Continue"}
                  </Link>
                ) : (
                  <span className="ai-history-save-warning">{isZh ? "记录功能暂未完成初始化，本次回答可能无法保存。" : "History is still being initialized, so this answer may not be saved."}</span>
                )}
              </div>
            </>
          ) : null}
        </section>

        {!isHome ? (
          <div className="search-result-summary" aria-live="polite">
            {submittedQuery
              ? (isZh ? `普通检索找到 ${results.length} 个相关知识点` : `${results.length} related article(s) found`)
              : (isZh ? "输入关键词或问题后开始检索。" : "Enter keywords or a question to start searching.")}
          </div>
        ) : null}

        {!isHome && submittedQuery && !results.length ? (
          <div className="search-empty-state">
            {isZh
              ? "暂时没有匹配结果。可以换成更短的核心概念，例如“统计”“语料库”“框架”或“回归”。"
              : "No matches yet. Try shorter terms such as statistics, corpus, framing, or regression."}
          </div>
        ) : null}

        {!isHome && results.length ? (
          <div className="site-search-results">
            {results.map((article, index) => (
              <article className="site-search-card" key={article.slug}>
                <span className="site-search-rank">{index + 1}</span>
                <div>
                  <div className="site-search-card-head">
                    <Link className="site-search-title" href={`/articles/${article.slug}?lang=${lang}`}>
                      <strong>{isZh ? article.titleZh : article.titleEn || article.titleZh}</strong>
                    </Link>
                    <span>{article.category}</span>
                  </div>
                  <p>{article.excerpt}</p>
                  <div className="tag-cloud compact-tags">
                    {article.tags.slice(0, 4).map((tag) => <span className="pill" key={tag}>#{tag}</span>)}
                  </div>
                </div>
                <Link
                  className="site-search-open"
                  href={`/articles/${article.slug}?lang=${lang}`}
                  aria-label={isZh ? `打开${article.titleZh}` : `Open ${article.titleEn || article.titleZh}`}
                >
                  <ArrowRight size={17} />
                </Link>
              </article>
            ))}
          </div>
        ) : null}

        {isHome ? (
          <div className="home-search-footer">
            <span><ShieldCheck size={14} /> {isZh ? "可切换仅知识库或综合知识；站内来源会标注引用。" : "Switch between site-only and hybrid answers; site sources are cited."}</span>
            <Link className="text-link" href={`/search?lang=${lang}`}>
              {isZh ? "打开完整检索页" : "Open full search"} <ArrowRight size={15} />
            </Link>
          </div>
        ) : null}
      </div>

      {!isHome ? <aside className="card search-guide-panel">
        <h2>{isZh ? "检索建议" : "Search Tips"}</h2>
        <div className="search-tip-list">
          <div>
            <BookOpenCheck size={17} />
            <p>{isZh ? "普通检索适合快速定位文章，不会消耗 AI 额度。" : "Standard search quickly locates articles without using AI quota."}</p>
          </div>
          <div>
            <BookOpenCheck size={17} />
            <p>{isZh ? "AI 回答可选择仅知识库，或结合 GLM 通用知识。" : "AI Answer can use only the site or combine it with GLM general knowledge."}</p>
          </div>
          <div>
            <BookOpenCheck size={17} />
            <p>{isZh ? "综合知识不等于实时联网；最新信息仍需外部核验。" : "Hybrid knowledge is not live web search; verify recent information externally."}</p>
          </div>
          <div>
            <BookOpenCheck size={17} />
            <p>{isZh ? "使用 AI 回答时，问题与相关知识片段会发送给 OpenCode Go；普通检索不会。" : "AI Answer sends the question and relevant excerpts to OpenCode Go. Standard search does not."}</p>
          </div>
        </div>
      </aside> : null}
    </section>
  );
}
