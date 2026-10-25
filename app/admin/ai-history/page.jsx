import Link from "next/link";
import { ArrowRight, CircleHelp, Clock3, MessageCircleMore, MessagesSquare, ShieldCheck, Sparkles, Users } from "lucide-react";
import AdminOnlyNotice from "@/components/AdminOnlyNotice";
import { getAdminAccess } from "@/lib/adminAccess";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI 对话审阅 | 译研知识库",
  description: "管理员按用户和会话查看多轮智能 AI 问答记录。"
};

function formatDate(value, lang) {
  if (!value) return "-";
  return new Date(value).toLocaleString(lang === "en" ? "en-US" : "zh-CN", { timeZone: "Asia/Shanghai" });
}

function getUserName(conversation) {
  return conversation.profiles?.username || conversation.user_id?.slice(0, 8) || "User";
}

export default async function AdminAiHistoryPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const isZh = lang !== "en";
  const access = await getAdminAccess({ lang, redirectTo: `/admin/ai-history?lang=${lang}` });

  if (!access.allowed) return <AdminOnlyNotice lang={lang} reason={access.reason} />;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .select(`
      id,
      user_id,
      title,
      language,
      created_at,
      updated_at,
      profiles(username, role),
      ai_chat_history(id, question, answer, sources, language, model, provider, created_at)
    `)
    .order("updated_at", { ascending: false })
    .limit(100);

  const conversations = (data || []).map((conversation) => ({
    ...conversation,
    turns: [...(conversation.ai_chat_history || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }));
  const turnCount = conversations.reduce((total, conversation) => total + conversation.turns.length, 0);
  const userCount = new Set(conversations.map((conversation) => conversation.user_id)).size;
  const multiTurnCount = conversations.filter((conversation) => conversation.turns.length > 1).length;
  const sourceLessTurnCount = conversations.reduce(
    (total, conversation) => total + conversation.turns.filter((turn) => !Array.isArray(turn.sources) || turn.sources.length === 0).length,
    0
  );
  const followUpRate = conversations.length ? Math.round((multiTurnCount / conversations.length) * 100) : 0;

  return (
    <section className="resource-page admin-ai-history-page">
      <div className="settings-title">
        <span className="badge"><MessageCircleMore size={14} /> AI Review</span>
        <h1>{isZh ? "用户 AI 对话审阅" : "User AI Conversation Review"}</h1>
        <p>{isZh ? "按用户名和会话查看普通用户的连续提问、AI 回答、站内引用与时间，用于识别研究需求和知识缺口。" : "Review each user's multi-turn questions, answers, citations, and timestamps to identify research needs and knowledge gaps."}</p>
      </div>

      {error ? (
        <section className="card panel">
          <h2>{isZh ? "连续对话数据表还没有初始化" : "Conversation Tables Are Not Ready"}</h2>
          <p className="notice">{isZh ? "请在 Supabase SQL Editor 运行最新的 supabase/ai-chat-history.sql。" : "Run the latest supabase/ai-chat-history.sql in the Supabase SQL Editor."}</p>
          <Link className="secondary-button" href={`/settings?lang=${lang}`}>{isZh ? "打开设置" : "Open Settings"} <ArrowRight size={16} /></Link>
        </section>
      ) : (
        <>
          <div className="analytics-stat-grid analytics-stat-grid-adaptive">
            <div className="card stat-card"><div><p>{isZh ? "对话会话" : "Conversations"}</p><strong>{conversations.length}</strong></div><Sparkles size={24} /></div>
            <div className="card stat-card"><div><p>{isZh ? "提问用户" : "Users"}</p><strong>{userCount}</strong></div><Users size={24} /></div>
            <div className="card stat-card"><div><p>{isZh ? "问答轮次" : "Turns"}</p><strong>{turnCount}</strong></div><Clock3 size={24} /></div>
            <div className="card stat-card"><div><p>{isZh ? "连续会话" : "Multi-turn"}</p><strong>{followUpRate}%</strong><small>{multiTurnCount} / {conversations.length} {isZh ? "段会话" : "conversations"}</small></div><MessagesSquare size={24} /></div>
            <div className="card stat-card"><div><p>{isZh ? "无引用轮次" : "Uncited Turns"}</p><strong>{sourceLessTurnCount}</strong><small>{isZh ? "优先检查知识缺口" : "Review knowledge gaps first"}</small></div><CircleHelp size={24} /></div>
          </div>

          <div className="admin-ai-history-notice">
            <ShieldCheck size={17} />
            <p>{isZh ? "每段会话会显示提问者的公开用户名和短用户 ID，用于区分重名账号；登录邮箱不会暴露。记录仅应用于知识库维护和质量改进。" : "Each conversation shows the user's public username and short user ID to distinguish duplicate names. Sign-in emails are not exposed. Use records only for maintenance and quality improvement."}</p>
          </div>

          <div className="admin-ai-history-list">
            {conversations.length === 0 ? (
              <section className="ai-history-empty"><MessageCircleMore size={28} /><h2>{isZh ? "还没有用户 AI 对话" : "No User AI Conversations Yet"}</h2></section>
            ) : conversations.map((conversation) => (
              <details className="card admin-ai-history-record" key={conversation.id}>
                <summary>
                  <div className="admin-ai-history-summary-main">
                    <span>
                      {getUserName(conversation)} · ID {conversation.user_id.slice(0, 8)} · {formatDate(conversation.updated_at, lang)}
                    </span>
                    <strong>{conversation.title}</strong>
                  </div>
                  <span className="pill">{conversation.turns.length} {isZh ? "轮" : "turns"}</span>
                </summary>

                <div className="admin-ai-history-detail">
                  <div className="admin-ai-user-identity">
                    <Users size={16} />
                    <div>
                      <strong>{getUserName(conversation)}</strong>
                      <span>{conversation.profiles?.role === "admin" ? (isZh ? "管理员" : "Administrator") : (isZh ? "普通用户" : "Regular User")} · {conversation.user_id}</span>
                    </div>
                  </div>

                  {conversation.turns.map((turn, index) => {
                    const sources = Array.isArray(turn.sources) ? turn.sources : [];
                    return (
                      <section className="admin-ai-history-turn" key={turn.id}>
                        <header>
                          <span>{isZh ? `第 ${index + 1} 轮` : `Turn ${index + 1}`} · {formatDate(turn.created_at, lang)}</span>
                          {sources.length === 0 ? <span className="admin-ai-history-gap-pill">{isZh ? "检查知识缺口" : "Review gap"}</span> : null}
                        </header>
                        <div>
                          <span className="admin-ai-history-label">{isZh ? "用户问题" : "User Question"}</span>
                          <p className="admin-ai-history-question">{turn.question}</p>
                        </div>
                        <div>
                          <span className="admin-ai-history-label">{isZh ? "AI 回答" : "AI Answer"}</span>
                          <div className="admin-ai-history-answer">{turn.answer}</div>
                        </div>
                        {sources.length ? (
                          <div className="admin-ai-history-sources">
                            <span className="admin-ai-history-label">{isZh ? "本轮引用" : "Turn Citations"}</span>
                            {sources.map((source) => (
                              <Link href={`/articles/${source.slug}?lang=${lang}`} key={`${turn.id}-${source.id}-${source.slug}`}>
                                [{source.id}] {source.title} <ArrowRight size={14} />
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </section>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
