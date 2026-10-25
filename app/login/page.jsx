import LoginForm from "@/components/LoginForm";
import { safeRedirectPath } from "@/lib/safeRedirect";
import { BookMarked, Languages, MessageCircleMore, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "登录 | 译研知识库"
};

async function getEmailConfirmationRequired() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabaseAnonKey },
      next: { revalidate: 300 }
    });

    if (!response.ok) return null;
    const settings = await response.json();
    return settings.mailer_autoconfirm !== true;
  } catch {
    return null;
  }
}

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const requestedRedirect = String(sp?.redirectTo || "/");
  const lang = String(sp?.lang || "zh");
  const message = String(sp?.message || "");
  const redirectTo = safeRedirectPath(requestedRedirect);
  const isZh = lang !== "en";
  const emailConfirmationRequired = await getEmailConfirmationRequired();

  return (
    <section className="login-page-shell">
      <div className="login-showcase">
        <span className="badge"><ShieldCheck size={15} /> {isZh ? "登录后访问" : "Sign-in access"}</span>
        <h1>{isZh ? "译研知识库" : "Yiyan Knowledge Base"}</h1>
        <p className="login-showcase-lead">
          {isZh
            ? "把外国语言学、翻译技术、语料库、话语分析、统计学与人工智能连接成可持续学习的知识体系。"
            : "A connected learning system for linguistics, translation technology, corpora, discourse, statistics, and AI."}
        </p>

        <div className="login-value-list">
          <div>
            <span><BookMarked size={18} /></span>
            <p><strong>{isZh ? "系统知识结构" : "Structured knowledge"}</strong><small>{isZh ? "文章、术语、方法与学习路径彼此关联" : "Connected articles, terms, methods, and learning paths"}</small></p>
          </div>
          <div>
            <span><MessageCircleMore size={18} /></span>
            <p><strong>{isZh ? "围绕知识点交流" : "Topic-based discussion"}</strong><small>{isZh ? "查看最新评论与回复，继续具体讨论" : "Follow recent comments and replies around each topic"}</small></p>
          </div>
          <div>
            <span><Languages size={18} /></span>
            <p><strong>{isZh ? "中英双语阅读" : "Bilingual reading"}</strong><small>{isZh ? "随时切换语言，保持概念表达一致" : "Switch languages while keeping concepts aligned"}</small></p>
          </div>
        </div>

        <div className="login-privacy-line">
          <ShieldCheck size={15} />
          <span>{isZh ? "邮箱仅用于账号登录，不会显示在评论或讨论动态中。" : "Your email is used only for sign-in and is never shown in comments or activity."}</span>
        </div>
      </div>

      <LoginForm
        redirectTo={redirectTo}
        lang={lang}
        messageCode={message}
        emailConfirmationRequired={emailConfirmationRequired}
      />
    </section>
  );
}
