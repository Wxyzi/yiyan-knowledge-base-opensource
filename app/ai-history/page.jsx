import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import AiHistoryList from "@/components/AiHistoryList";
import { createClient, hasSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "我的问答记录 | 译研知识库",
  description: "查看和管理自己在译研知识库中的智能 AI 问答记录。"
};

export default async function AiHistoryPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const isZh = lang !== "en";

  if (!hasSupabaseServerConfig()) {
    return (
      <section className="resource-page ai-history-page">
        <div className="card panel">
          <h1>{isZh ? "问答记录暂不可用" : "AI History Is Unavailable"}</h1>
          <p className="notice">{isZh ? "网站尚未完成 Supabase 服务端配置。" : "The server-side Supabase configuration is incomplete."}</p>
        </div>
      </section>
    );
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    const params = new URLSearchParams({ redirectTo: `/ai-history?lang=${lang}`, lang });
    redirect(`/login?${params.toString()}`);
  }

  const { data, error } = await supabase
    .from("ai_conversations")
    .select(`
      id,
      title,
      language,
      created_at,
      updated_at,
      ai_chat_history(id, question, created_at)
    `)
    .order("updated_at", { ascending: false })
    .limit(100);

  const conversations = (data || []).map((conversation) => {
    const turns = [...(conversation.ai_chat_history || [])]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const lastTurn = turns.at(-1);

    return {
      id: conversation.id,
      title: conversation.title,
      language: conversation.language,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      turnCount: turns.length,
      lastQuestion: lastTurn?.question || conversation.title,
      lastAnswer: ""
    };
  });

  return (
    <section className="resource-page ai-history-page">
      <div className="resource-hero card ai-history-hero">
        <span className="badge"><Clock3 size={15} /> {isZh ? "个人记录" : "Personal History"}</span>
        <h1>{isZh ? "我的 AI 对话" : "My AI Conversations"}</h1>
        <p>
          {isZh
            ? "智能问答会按会话保留完整前文、站内引用和时间。打开任意旧会话即可沿着原来的思路继续追问。"
            : "AI questions are organized into conversations with prior turns, site citations, and timestamps. Open any conversation to continue from its existing context."}
        </p>
        <div className="hero-actions">
          <Link className="primary-button" href={`/search?lang=${lang}`}>
            <Sparkles size={16} /> {isZh ? "开始新会话" : "Start a New Conversation"}
          </Link>
          <Link className="secondary-button" href={`/articles?lang=${lang}`}>
            {isZh ? "浏览知识点" : "Browse Articles"} <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <div className="ai-history-privacy-note">
        <ShieldCheck size={18} />
        <p>{isZh ? "对话记录会保存在你的账号中。你可以继续已有对话、删除单段会话或随时清除全部记录。" : "Conversation history is stored with your account. Continue an existing conversation, delete one, or clear all history at any time."}</p>
      </div>

      {error ? (
        <section className="card panel">
          <h2>{isZh ? "问答记录功能正在初始化" : "AI History Is Being Initialized"}</h2>
          <p className="notice">
            {isZh
              ? "问答记录功能尚未完成初始化。智能回答仍可使用，但当前回答可能暂时无法保存。"
              : "AI history is still being initialized. AI answers remain available, but records may not be saved yet."}
          </p>
        </section>
      ) : (
        <AiHistoryList initialConversations={conversations} lang={lang} />
      )}
    </section>
  );
}
