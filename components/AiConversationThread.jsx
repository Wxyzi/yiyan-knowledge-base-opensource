"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, LoaderCircle, Send, ShieldCheck, Sparkles } from "lucide-react";
import AiAnswerModeToggle from "@/components/AiAnswerModeToggle";

function AnswerWithCitations({ answer, sources, lang }) {
  const safeSources = Array.isArray(sources) ? sources : [];
  const parts = String(answer || "").split(/(\[\d{1,2}\])/g);

  return (
    <div className="ai-conversation-answer-text">
      {parts.map((part, index) => {
        const match = part.match(/^\[(\d{1,2})]$/);
        if (!match) return <span key={`${part}-${index}`}>{part}</span>;

        const source = safeSources.find((item) => Number(item.id) === Number(match[1]));
        if (!source?.slug) return <span key={`${part}-${index}`}>{part}</span>;

        return (
          <Link className="ai-inline-citation" href={`/articles/${source.slug}?lang=${lang}`} key={`${part}-${index}`}>
            {part}
          </Link>
        );
      })}
    </div>
  );
}

function getErrorMessage(code, isZh) {
  const messages = {
    AI_RATE_LIMIT: ["请求过于频繁，请稍后再继续。", "Too many requests. Please try again shortly."],
    AI_PROVIDER_LIMIT: ["AI 服务额度暂时达到限制。", "The AI service quota has been reached."],
    AI_TIMEOUT: ["回答生成超时，请稍后重试。", "The answer timed out. Please try again."],
    CONVERSATION_NOT_FOUND: ["这段会话不存在，或你没有访问权限。", "This conversation does not exist or is not accessible."],
    AI_HISTORY_UNAVAILABLE: ["暂时无法读取会话记录，请稍后重试。", "Conversation history is temporarily unavailable."],
    AUTH_REQUIRED: ["登录状态已经失效，请重新登录。", "Your session has expired. Please sign in again."]
  };
  const fallback = ["暂时无法生成回答，请稍后重试。", "The answer could not be generated. Try again later."];
  return (messages[code] || fallback)[isZh ? 0 : 1];
}

export default function AiConversationThread({ conversationId, initialTurns = [], lang = "zh", aiAvailable = false }) {
  const isZh = lang !== "en";
  const [turns, setTurns] = useState(initialTurns);
  const [question, setQuestion] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [answerMode, setAnswerMode] = useState("hybrid");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns.length, state]);

  async function submitQuestion(event) {
    event?.preventDefault();
    const cleanQuestion = question.trim();

    if (cleanQuestion.length < 2) {
      setError(isZh ? "请输入至少两个字符的问题。" : "Enter a question with at least two characters.");
      setState("error");
      return;
    }

    if (!aiAvailable) {
      setError(isZh ? "AI 回答尚未完成服务端配置。" : "AI answering is not configured on the server.");
      setState("error");
      return;
    }

    setPendingQuestion(cleanQuestion);
    setQuestion("");
    setError("");
    setState("loading");

    try {
      const response = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanQuestion,
          language: isZh ? "zh" : "en",
          conversationId,
          answerMode
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(payload.code, isZh));
      }

      setTurns((current) => [
        ...current,
        {
          id: payload.historyId || `pending-${Date.now()}`,
          question: cleanQuestion,
          answer: payload.answer || "",
          sources: Array.isArray(payload.sources) ? payload.sources : [],
          model: payload.model || null,
          provider: payload.provider || null,
          answerMode: payload.answerMode || answerMode,
          created_at: payload.createdAt || new Date().toISOString(),
          historySaved: Boolean(payload.historySaved)
        }
      ]);
      setState("success");
    } catch (requestError) {
      setQuestion(cleanQuestion);
      setError(requestError.message || getErrorMessage("", isZh));
      setState("error");
    } finally {
      setPendingQuestion("");
    }
  }

  function handleKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      submitQuestion(event);
    }
  }

  return (
    <div className="ai-conversation-workspace">
      <div className="ai-conversation-context-note">
        <ShieldCheck size={16} />
        <p>
          {answerMode === "hybrid"
            ? (isZh ? "AI 会读取最近 6 轮问答，并优先检索本站文章；GLM 通用知识补充不代表实时联网结果。" : "AI reads the latest six turns and prioritizes site retrieval. GLM general knowledge supplements are not live web results.")
            : (isZh ? "AI 会读取最近 6 轮问答来理解追问，但新的结论仍须由本轮检索到的站内文章支持。" : "AI reads the latest six turns for follow-up context, while new claims must still be supported by articles retrieved for the current turn.")}
        </p>
      </div>

      <div className="ai-conversation-timeline">
        {turns.map((turn, index) => {
          const sources = Array.isArray(turn.sources) ? turn.sources : [];
          return (
            <article className="ai-conversation-turn" key={turn.id}>
              <section className="ai-conversation-user-turn">
                <span>{isZh ? "你" : "You"}</span>
                <div>
                  <small>{isZh ? `第 ${index + 1} 轮` : `Turn ${index + 1}`}</small>
                  <p>{turn.question}</p>
                </div>
              </section>

              <section className="ai-conversation-assistant-turn">
                <div className="ai-conversation-assistant-label">
                  <Sparkles size={15} />
                  {turn.answerMode === "site"
                    ? (isZh ? "知识库回答" : "Knowledge Base Answer")
                    : turn.answerMode === "hybrid"
                      ? (isZh ? "综合知识回答" : "Hybrid Answer")
                      : (isZh ? "AI 回答" : "AI Answer")}
                </div>
                <AnswerWithCitations answer={turn.answer} sources={sources} lang={lang} />
                {sources.length ? (
                  <div className="ai-conversation-sources">
                    <strong>{isZh ? "本轮引用" : "Citations for This Turn"}</strong>
                    {sources.map((source) => (
                      <Link href={`/articles/${source.slug}?lang=${lang}`} key={`${turn.id}-${source.id}-${source.slug}`}>
                        <span>[{source.id}]</span>
                        <span>{source.title}</span>
                        <ArrowRight size={14} />
                      </Link>
                    ))}
                  </div>
                ) : null}
                {turn.historySaved === false ? (
                  <p className="ai-history-save-warning">{isZh ? "这一轮已显示，但未能保存到数据库。" : "This turn is visible here but was not saved to the database."}</p>
                ) : null}
              </section>
            </article>
          );
        })}

        {state === "loading" ? (
          <article className="ai-conversation-turn ai-conversation-pending" aria-live="polite">
            <section className="ai-conversation-user-turn">
              <span>{isZh ? "你" : "You"}</span>
              <div><small>{isZh ? "正在追问" : "Follow-up"}</small><p>{pendingQuestion}</p></div>
            </section>
            <section className="ai-conversation-assistant-turn">
              <div className="ai-conversation-assistant-label"><LoaderCircle className="spin-icon" size={15} />
                {answerMode === "hybrid"
                  ? (isZh ? "正在检索并综合回答" : "Retrieving and Synthesizing")
                  : (isZh ? "正在结合前文检索" : "Retrieving with Context")}
              </div>
              <div className="ai-answer-loading"><span /><span /><span /></div>
            </section>
          </article>
        ) : null}
        <div ref={endRef} />
      </div>

      <form className="ai-conversation-composer" onSubmit={submitQuestion}>
        <label htmlFor="conversation-question">{isZh ? "继续追问" : "Continue the Conversation"}</label>
        <AiAnswerModeToggle
          value={answerMode}
          onChange={setAnswerMode}
          lang={lang}
          disabled={state === "loading"}
        />
        <textarea
          id="conversation-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={600}
          rows={3}
          disabled={state === "loading"}
          placeholder={isZh ? "结合前面的回答继续提问，例如：这个方法有哪些局限？" : "Ask a follow-up, for example: What are the limitations of this method?"}
        />
        <div className="ai-conversation-composer-foot">
          <span>{question.length}/600 · {isZh ? "Ctrl + Enter 发送" : "Ctrl + Enter to send"}</span>
          <button className="primary-button" type="submit" disabled={state === "loading" || !aiAvailable}>
            {state === "loading" ? <LoaderCircle className="spin-icon" size={16} /> : <Send size={16} />}
            {state === "loading" ? (isZh ? "回答中" : "Answering") : (isZh ? "发送追问" : "Send Follow-up")}
          </button>
        </div>
        {state === "error" && error ? <div className="ai-answer-error"><AlertCircle size={17} /><p>{error}</p></div> : null}
      </form>
    </div>
  );
}
