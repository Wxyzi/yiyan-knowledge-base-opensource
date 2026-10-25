import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Clock,
  Heart,
  KeyRound,
  Languages,
  LifeBuoy,
  MessageCircle,
  Route,
  Search,
  Tags,
  Wrench
} from "lucide-react";

export const metadata = {
  title: "WebHelp 使用帮助 | 译研知识库",
  description: "译研知识库的站内 WebHelp，帮助用户了解搜索、学习路径、收藏评论、中英文切换和账号安全。"
};

function withLanguage(href, language) {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}lang=${language}`;
}

export default async function HelpPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const isZh = lang !== "en";

  const quickLinks = [
    {
      icon: Search,
      href: "/search",
      titleZh: "智能检索",
      titleEn: "AI Search",
      textZh: "检索站内知识，也可结合 GLM 通用知识生成回答。",
      textEn: "Retrieve site knowledge and optionally combine it with GLM general knowledge."
    },
    {
      icon: Route,
      href: "/paths",
      titleZh: "按路径学习",
      titleEn: "Follow Paths",
      textZh: "从入门到进阶，按推荐顺序系统学习。",
      textEn: "Study systematically from beginner to advanced topics."
    },
    {
      icon: Tags,
      href: "/terms",
      titleZh: "查询术语",
      titleEn: "Browse Terms",
      textZh: "稳定中英术语、定义和常见误区。",
      textEn: "Check bilingual terms, definitions, and common mistakes."
    },
    {
      icon: BarChart3,
      href: "/methods",
      titleZh: "选择方法",
      titleEn: "Choose Methods",
      textZh: "根据问题、数据、工具和局限选择研究方法。",
      textEn: "Choose methods by question, data, tools, and limitations."
    },
    {
      icon: Wrench,
      href: "/tools",
      titleZh: "使用工具流程",
      titleEn: "Use Tool Workflows",
      textZh: "查看语料库、统计、AI 和翻译技术工具步骤。",
      textEn: "Review workflows for corpus, statistics, AI, and translation tools."
    },
    {
      icon: Clock,
      href: "/ai-history",
      titleZh: "查看问答记录",
      titleEn: "Review AI History",
      textZh: "回顾自己的问题、AI 回答与站内引用，并继续对话。",
      textEn: "Review your questions, AI answers, and site citations, then continue the conversation."
    },
    {
      icon: KeyRound,
      href: "/account",
      titleZh: "账号与安全",
      titleEn: "Account Security",
      textZh: "核对登录身份，并验证当前密码后安全修改密码。",
      textEn: "Review your identity and securely change the password after verification."
    }
  ];

  const workflows = [
    {
      icon: BookOpenCheck,
      titleZh: "第一次使用",
      titleEn: "First Visit",
      stepsZh: ["先进入学习路径", "选择最接近你身份的入口", "打开第 1 篇文章", "沿文章底部推荐继续学习"],
      stepsEn: ["Open learning paths", "Choose the closest learner identity", "Open the first article", "Continue through bottom recommendations"]
    },
    {
      icon: Search,
      titleZh: "带着问题查找",
      titleEn: "Search with a Question",
      stepsZh: ["进入智能检索", "输入完整问题", "阅读回答中的编号引用", "打开原文核对上下文"],
      stepsEn: ["Open AI Search", "Enter a full question", "Review numbered citations", "Open the articles to verify context"]
    },
    {
      icon: Route,
      titleZh: "系统复习",
      titleEn: "Review Systematically",
      stepsZh: ["打开学习路径", "按推荐顺序复习", "补前置知识", "沿文章推荐继续学习"],
      stepsEn: ["Open a learning path", "Review in the suggested order", "Review prerequisites", "Continue through article recommendations"]
    },
    {
      icon: Heart,
      titleZh: "长期积累",
      titleEn: "Build a Personal Trail",
      stepsZh: ["收藏重要文章", "在文章底部评论", "回复他人问题", "回到收藏页复习"],
      stepsEn: ["Save important articles", "Comment below articles", "Reply to others", "Review from Favorites"]
    }
  ];

  const faqItems = [
    {
      qZh: "为什么我看不到文章内容？",
      qEn: "Why can't I see article content?",
      aZh: "本站内容需要登录后查看。如果登录后仍被跳转，请确认 Supabase 配置、邮箱确认状态和浏览器登录状态。",
      aEn: "Content is available after login. If you are still redirected, check Supabase configuration, email confirmation, and browser session status."
    },
    {
      qZh: "如何在任意页面切换中英文？",
      qEn: "How do I switch Chinese and English?",
      aZh: "页面顶部有中英文切换控件。文章页也会保留当前语言，并把语言参数带到相关链接中。",
      aEn: "Use the language toggle in the header. Article pages keep the current language and pass it to related links."
    },
    {
      qZh: "如何修改或找回密码？",
      qEn: "How do I change or recover my password?",
      aZh: "登录后从右上角账号菜单进入“账号与安全”，验证当前密码后修改。忘记密码时，在登录页选择“忘记密码”，并在申请恢复的同一浏览器中打开邮件链接。",
      aEn: "Open Account and security from the signed-in account menu and verify the current password before changing it. If it is forgotten, choose Forgot password on the login page and open the email link in the same browser that requested it."
    },
    {
      qZh: "评论和回复在哪里？",
      qEn: "Where are comments and replies?",
      aZh: "每篇文章底部都有知识点讨论区。术语、方法、工具和学习路径也支持讨论。",
      aEn: "Each article has a discussion area at the bottom. Terms, methods, tools, and learning paths also support discussion."
    },
    {
      qZh: "智能回答会使用哪些资料？",
      qEn: "What sources does AI Answer use?",
      aZh: "“仅知识库”只依据本站文章并显示编号引用；“综合知识”会优先检索本站文章，再由 GLM 补充模型训练中已有的通用知识。综合模式不是实时联网搜索，最新信息仍需另行核验。",
      aEn: "Site-only mode uses site articles with numbered citations. Hybrid mode prioritizes site retrieval, then supplements it with general knowledge learned by GLM. Hybrid mode is not live web search, so verify recent information separately."
    },
    {
      qZh: "如何管理我的 AI 问答记录？",
      qEn: "How do I manage my AI question history?",
      aZh: "问答会按会话保存在你的账号记录中。你可以打开已有会话继续追问、删除单段会话或清除全部记录。",
      aEn: "Questions and answers are saved as conversations in your account history. Open one to continue, delete an individual conversation, or clear all history."
    },
    {
      qZh: "AI 会读取多少历史对话？",
      qEn: "How much conversation history does AI read?",
      aZh: "继续会话时，系统最多携带最近 6 轮问答来理解追问、指代和研究目标。每一轮仍会重新检索本站文章，历史回答不会替代本轮引用依据。",
      aEn: "When continuing, the system includes up to the latest six turns to understand follow-ups, references, and research goals. It retrieves site articles again for every turn, so earlier answers do not replace current citations."
    }
  ];

  return (
    <section className="help-page">
      <div className="resource-hero card help-hero">
        <span className="badge"><LifeBuoy size={15} /> WebHelp</span>
        <h1>{isZh ? "WebHelp 使用帮助" : "WebHelp Center"}</h1>
        <p>
          {isZh
            ? "这里集中说明译研知识库的主要使用方式：如何查找知识、按路径学习、理解知识关联、使用收藏评论，以及管理自己的账号。"
            : "This help center explains how to find knowledge, follow paths, understand connections, use favorites and discussions, and manage your account."}
        </p>
        <div className="hero-actions">
          <Link className="primary-button" href={withLanguage("/paths", lang)}>
            <Route size={16} /> {isZh ? "从学习路径开始" : "Start with Paths"}
          </Link>
          <Link className="secondary-button" href={withLanguage("/articles", lang)}>
            <Search size={16} /> {isZh ? "搜索知识点" : "Search Articles"}
          </Link>
        </div>
      </div>

      <section className="home-section">
        <div className="section-header">
          <div>
            <span className="badge"><ArrowRight size={15} /> Quick Access</span>
            <h2>{isZh ? "常用入口" : "Common Entry Points"}</h2>
          </div>
        </div>
        <div className="help-card-grid">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link className="card help-card" href={withLanguage(item.href, lang)} key={item.href}>
                <div className="icon-box"><Icon size={21} /></div>
                <div>
                  <h3>{isZh ? item.titleZh : item.titleEn}</h3>
                  <p>{isZh ? item.textZh : item.textEn}</p>
                </div>
                <ArrowRight size={17} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="home-section">
        <div className="section-header">
          <div>
            <span className="badge"><BookOpenCheck size={15} /> Workflows</span>
            <h2>{isZh ? "四种使用流程" : "Four Useful Workflows"}</h2>
          </div>
        </div>
        <div className="help-workflow-grid">
          {workflows.map((item) => {
            const Icon = item.icon;
            const steps = isZh ? item.stepsZh : item.stepsEn;
            return (
              <article className="card help-workflow-card" key={item.titleZh}>
                <div className="help-workflow-head">
                  <div className="icon-box"><Icon size={21} /></div>
                  <h3>{isZh ? item.titleZh : item.titleEn}</h3>
                </div>
                <ol>
                  {steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card panel help-admin-note">
        <div>
          <span className="badge"><KeyRound size={15} /> Account</span>
          <h2>{isZh ? "账号与个人内容" : "Account and Personal Content"}</h2>
          <p>
            {isZh
              ? "登录后可以学习、收藏、评论、回复和保存问答记录，也可以在账号与安全页面修改密码。"
              : "After signing in, you can learn, save articles, comment, reply, keep AI history, and change your password from Account Security."}
          </p>
        </div>
        <div className="help-admin-actions">
          <Link className="secondary-button" href={withLanguage("/favorites", lang)}>
            <Heart size={16} /> {isZh ? "我的收藏" : "Favorites"}
          </Link>
          <Link className="secondary-button" href={withLanguage("/terms", lang)}>
            <Languages size={16} /> {isZh ? "术语表" : "Terms"}
          </Link>
          <Link className="secondary-button" href="#faq">
            <MessageCircle size={16} /> {isZh ? "常见问题" : "FAQ"}
          </Link>
        </div>
      </section>

      <section className="home-section" id="faq">
        <div className="section-header">
          <div>
            <span className="badge"><MessageCircle size={15} /> FAQ</span>
            <h2>{isZh ? "常见问题" : "Frequently Asked Questions"}</h2>
          </div>
        </div>
        <div className="help-faq-list">
          {faqItems.map((item) => (
            <article className="card help-faq-item" key={item.qZh}>
              <h3>{isZh ? item.qZh : item.qEn}</h3>
              <p>{isZh ? item.aZh : item.aEn}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
