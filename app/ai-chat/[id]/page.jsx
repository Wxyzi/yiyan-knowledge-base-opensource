import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock3, MessageCircleMore, Plus, Sparkles } from "lucide-react";
import AiConversationThread from "@/components/AiConversationThread";
import { getAiProviderConfig } from "@/lib/aiProvider";
import { createClient, hasSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "继续 AI 对话 | 译研知识库",
  description: "读取既有问答语境，在译研知识库中继续多轮智能对话。"
};

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function formatDate(value, lang) {
  if (!value) return "-";
  return new Date(value).toLocaleString(lang === "en" ? "en-US" : "zh-CN", { timeZone: "Asia/Shanghai" });
}

export default async function AiChatPage({ params, searchParams }) {
  const routeParams = await params;
  const sp = await searchParams;
  const conversationId = String(routeParams?.id || "");
  const lang = String(sp?.lang || "zh");
  const isZh = lang !== "en";

  if (!isUuid(conversationId)) notFound();

  if (!hasSupabaseServerConfig()) {
    return <section className="resource-page"><div className="card panel"><h1>{isZh ? "会话暂不可用" : "Conversation Unavailable"}</h1></div></section>;
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    const redirectTo = `/ai-chat/${conversationId}?lang=${lang}`;
    const loginParams = new URLSearchParams({ redirectTo, lang });
    redirect(`/login?${loginParams.toString()}`);
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("ai_conversations")
    .select("id, title, language, created_at, updated_at")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation && !conversationError) notFound();

  if (conversationError) {
    return (
      <section className="resource-page ai-conversation-page">
        <div className="card panel">
          <h1>{isZh ? "连续对话功能正在初始化" : "Conversation Mode Is Being Initialized"}</h1>
          <p className="notice">{isZh ? "连续对话功能尚未完成初始化，请稍后再试。" : "Conversation mode is still being initialized. Please try again later."}</p>
        </div>
      </section>
    );
  }

  const { data: turns, error: turnsError } = await supabase
    .from("ai_chat_history")
    .select("id, question, answer, sources, language, model, provider, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const aiAvailable = getAiProviderConfig().hasApiKey;

  return (
    <section className="resource-page ai-conversation-page">
      <header className="ai-conversation-page-head">
        <Link className="text-link" href={`/ai-history?lang=${lang}`}><ArrowLeft size={15} /> {isZh ? "返回问答记录" : "Back to AI History"}</Link>
        <div className="ai-conversation-title-row">
          <div>
            <span className="badge"><MessageCircleMore size={14} /> {isZh ? "连续对话" : "Continuous Conversation"}</span>
            <h1>{conversation.title}</h1>
            <p><Clock3 size={14} /> {isZh ? "最近更新" : "Last updated"} {formatDate(conversation.updated_at, lang)} · {(turns || []).length} {isZh ? "轮问答" : "turns"}</p>
          </div>
          <Link className="secondary-button" href={`/search?lang=${lang}`}><Plus size={16} /> {isZh ? "新建会话" : "New Conversation"}</Link>
        </div>
      </header>

      {turnsError ? (
        <section className="card panel"><h2>{isZh ? "暂时无法读取消息" : "Messages Are Unavailable"}</h2><p className="notice">{turnsError.message}</p></section>
      ) : (
        <AiConversationThread
          conversationId={conversation.id}
          initialTurns={turns || []}
          lang={lang}
          aiAvailable={aiAvailable}
        />
      )}

      <footer className="ai-conversation-page-foot"><Sparkles size={15} /> {isZh ? "回答以本站知识为依据，请继续打开引用核对原文。" : "Answers are grounded in site knowledge. Open citations to verify the source text."}</footer>
    </section>
  );
}
