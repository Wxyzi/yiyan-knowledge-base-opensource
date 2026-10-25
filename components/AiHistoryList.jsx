"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, MessageCircleMore, ShieldCheck, Sparkles, Trash2 } from "lucide-react";

function formatDate(value, lang) {
  if (!value) return "-";
  return new Date(value).toLocaleString(lang === "en" ? "en-US" : "zh-CN", {
    timeZone: "Asia/Shanghai"
  });
}

export default function AiHistoryList({ initialConversations = [], lang = "zh" }) {
  const isZh = lang !== "en";
  const [conversations, setConversations] = useState(initialConversations);
  const [deleting, setDeleting] = useState("");
  const [message, setMessage] = useState("");

  async function deleteConversation(payload, confirmMessage) {
    if (!window.confirm(confirmMessage)) return;

    const operationId = payload.scope === "all" ? "all" : payload.conversationId;
    setDeleting(operationId);
    setMessage("");

    try {
      const response = await fetch("/api/ai-history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || (isZh ? "删除失败，请稍后重试。" : "Deletion failed. Try again later."));
      }

      if (payload.scope === "all") {
        setConversations([]);
        setMessage(isZh ? "全部 AI 会话已清除。" : "All AI conversations have been cleared.");
      } else {
        setConversations((current) => current.filter((conversation) => conversation.id !== payload.conversationId));
        setMessage(isZh ? "这段 AI 会话已删除。" : "The AI conversation has been deleted.");
      }
    } catch (error) {
      setMessage(error.message || (isZh ? "删除失败，请稍后重试。" : "Deletion failed. Try again later."));
    } finally {
      setDeleting("");
    }
  }

  if (!conversations.length) {
    return (
      <section className="ai-history-empty">
        <Sparkles size={28} />
        <h2>{isZh ? "还没有 AI 会话" : "No AI Conversations Yet"}</h2>
        <p>{isZh ? "完成一次智能问答后，会话会自动出现在这里，并可以随时继续追问。" : "Complete an AI answer and the conversation will appear here for later follow-up."}</p>
        <Link className="primary-button" href={`/search?lang=${lang}`}>
          {isZh ? "开始新会话" : "Start a Conversation"} <ArrowRight size={16} />
        </Link>
        {message ? <p className="notice" role="status">{message}</p> : null}
      </section>
    );
  }

  return (
    <>
      <div className="ai-history-toolbar">
        <p><ShieldCheck size={15} /> {isZh ? `共保留 ${conversations.length} 段会话，可打开继续追问或随时删除。` : `${conversations.length} conversations saved. Open one to continue or delete it at any time.`}</p>
        <button
          className="secondary-button danger-button"
          type="button"
          disabled={Boolean(deleting)}
          onClick={() => deleteConversation(
            { scope: "all" },
            isZh ? "确定清除全部 AI 会话吗？其中的所有问答都将删除，且无法撤销。" : "Clear all AI conversations and every turn in them? This cannot be undone."
          )}
        >
          <Trash2 size={16} /> {deleting === "all" ? (isZh ? "清除中" : "Clearing") : (isZh ? "清除全部" : "Clear All")}
        </button>
      </div>

      {message ? <p className="notice ai-history-message" role="status">{message}</p> : null}

      <div className="ai-history-list">
        {conversations.map((conversation) => (
          <article className="card ai-history-record ai-conversation-summary-card" key={conversation.id}>
            <header className="ai-history-record-head">
              <div>
                <span><Clock3 size={14} /> {formatDate(conversation.updated_at, lang)}</span>
                <h2>{conversation.title}</h2>
              </div>
              <button
                className="icon-button ai-history-delete"
                type="button"
                aria-label={isZh ? "删除这段 AI 会话" : "Delete this AI conversation"}
                title={isZh ? "删除会话" : "Delete conversation"}
                disabled={Boolean(deleting)}
                onClick={() => deleteConversation(
                  { conversationId: conversation.id },
                  isZh ? "确定删除这段 AI 会话及其中的全部问答吗？" : "Delete this AI conversation and every turn in it?"
                )}
              >
                <Trash2 size={17} />
              </button>
            </header>

            <div className="ai-conversation-summary-meta">
              <span className="pill"><MessageCircleMore size={13} /> {conversation.turnCount} {isZh ? "轮问答" : conversation.turnCount === 1 ? "turn" : "turns"}</span>
              <span>{conversation.language === "en" ? "English" : "中文"}</span>
            </div>

            <div className="ai-conversation-preview">
              <strong>{isZh ? "最近问题" : "Latest Question"}</strong>
              <p>{conversation.lastQuestion}</p>
              {conversation.lastAnswer ? <span>{conversation.lastAnswer}</span> : null}
            </div>

            <footer className="ai-history-record-footer">
              <span>{isZh ? "打开后可读取前文并继续追问" : "Open to continue with prior context"}</span>
              <Link className="primary-button" href={`/ai-chat/${conversation.id}?lang=${lang}`}>
                {isZh ? "继续对话" : "Continue"} <ArrowRight size={15} />
              </Link>
            </footer>
          </article>
        ))}
      </div>
    </>
  );
}
