import Link from "next/link";
import { BookOpen, CheckCircle2, Database, GraduationCap, MessageCircle, ShieldCheck } from "lucide-react";
import AdminOnlyNotice from "@/components/AdminOnlyNotice";
import { getAdminAccess } from "@/lib/adminAccess";
import { getAllArticles } from "@/lib/markdown";
import { categories } from "@/lib/categories";

export const metadata = {
  title: "关于 | 译研知识库",
  description: "了解译研知识库的定位、内容范围、学习方式和用户功能。"
};

export const dynamic = "force-dynamic";

function withLanguage(href, language) {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}lang=${language}`;
}

export default async function AboutPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const isZh = lang !== "en";
  const access = await getAdminAccess({ lang, redirectTo: `/about?lang=${lang}` });

  if (!access.allowed) {
    return <AdminOnlyNotice lang={lang} reason={access.reason} />;
  }

  const articles = getAllArticles();
  const categoryStats = categories
    .filter((category) => category.id !== "all")
    .map((category) => ({
      ...category,
      count: articles.filter((article) => article.category === category.id).length
    }));

  const featureItems = [
    {
      icon: BookOpen,
      titleZh: "双语知识文章",
      titleEn: "Bilingual Articles",
      textZh: "每篇文章都包含中文和英文内容，适合术语学习、双语理解和领域知识积累。",
      textEn: "Each article includes Chinese and English content for terminology learning, bilingual understanding, and domain knowledge building."
    },
    {
      icon: Database,
      titleZh: "Markdown 内容库",
      titleEn: "Markdown Content Library",
      textZh: "正式知识内容保存在本地 Markdown 文件中，便于长期维护、版本管理和批量扩充。",
      textEn: "Official knowledge content is stored in local Markdown files for maintenance, versioning, and long-term expansion."
    },
    {
      icon: MessageCircle,
      titleZh: "学习互动",
      titleEn: "Learning Interaction",
      textZh: "登录用户可以收藏文章、发表评论和回复评论，逐步形成围绕知识点的讨论记录。",
      textEn: "Logged-in users can save articles, post comments, and reply to others around specific knowledge points."
    },
    {
      icon: ShieldCheck,
      titleZh: "权限区分",
      titleEn: "Role-Based Access",
      textZh: "普通用户可以学习和互动，管理员可以进入后台说明页，并具备评论管理权限。",
      textEn: "Regular users can learn and interact, while administrators can access the admin guide and manage comments."
    }
  ];

  const workflowItemsZh = [
    "先从首页的学习路径进入一个主题方向。",
    "在文章列表中按分类筛选，也可以用关键词搜索术语。",
    "阅读文章时使用中文 / English 切换对照理解。",
    "遇到重要知识点时收藏，之后在我的收藏中复习。",
    "有疑问或补充时在评论区留言，也可以回复其他用户的评论。"
  ];
  const workflowItemsEn = [
    "Start from a learning path on the home page.",
    "Filter articles by category or search for terms in the article list.",
    "Use the Chinese / English switch while reading articles.",
    "Save important knowledge points and review them later in Favorites.",
    "Ask questions in the comments and reply to other learners."
  ];
  const workflowItems = isZh ? workflowItemsZh : workflowItemsEn;

  return (
    <section className="about-page">
      <div className="about-hero card">
        <span className="badge"><GraduationCap size={15} /> About This Knowledge Base</span>
        <h1>{isZh ? "关于译研知识库" : "About Yiyan Knowledge Base"}</h1>
        <p>
          {isZh
            ? "译研知识库面向语言学基础、应用语言学、翻译技术、语料库语言学、话语分析、人工智能基础、统计学和研究方法学习者。它既是一个个人复习系统，也可以发展为面向同学和研究伙伴的开放学习平台。"
            : "Yiyan Knowledge Base is built for learners of linguistics, applied linguistics, translation technology, corpus linguistics, discourse analysis, AI fundamentals, statistics, and research methods. It can serve both as a personal review system and as an open learning platform for classmates and research partners."}
        </p>
        <div className="hero-actions">
          <Link className="primary-button" href={withLanguage("/articles", lang)}>{isZh ? "开始阅读" : "Start Reading"}</Link>
          <Link className="secondary-button" href={withLanguage("/settings", lang)}>{isZh ? "检查设置" : "Check Settings"}</Link>
        </div>
      </div>

      <div className="about-grid">
        <section className="card panel">
          <h2>{isZh ? "内容范围" : "Content Scope"}</h2>
          <p className="notice">
            {isZh
              ? `当前知识库已有 ${articles.length} 篇中英双语文章，覆盖八个相互关联的知识方向。`
              : `The knowledge base currently contains ${articles.length} bilingual articles across eight connected knowledge areas.`}
          </p>
          <div className="status-list">
            {categoryStats.map((category) => {
              const Icon = category.icon;
              return (
                <Link className="status-item" href={withLanguage(`/articles?category=${category.id}`, lang)} key={category.id}>
                  <Icon size={17} />
                  <span>{isZh ? `${category.zh} / ${category.en}` : category.en}</span>
                  <strong>{category.count}</strong>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="card panel">
          <h2>{isZh ? "推荐使用方式" : "How to Use It"}</h2>
          <div className="check-list">
            {workflowItems.map((item) => (
              <div className="check-item" key={item}>
                <CheckCircle2 size={17} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="home-section">
        <div className="section-header">
          <div>
            <span className="badge">Platform</span>
            <h2>{isZh ? "网站能力" : "Platform Features"}</h2>
          </div>
        </div>
        <div className="feature-grid">
          {featureItems.map((item) => {
            const Icon = item.icon;
            return (
              <article className="card feature-card" key={item.titleZh}>
                <div className="icon-box"><Icon size={22} /></div>
                <h3>{isZh ? item.titleZh : item.titleEn}</h3>
                <p>{isZh ? item.textZh : item.textEn}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card panel public-ready">
        <h2>{isZh ? "公开试用前的检查" : "Before Public Testing"}</h2>
        <p>
          {isZh
            ? "如果准备把网站发给别人使用，建议先完成 Supabase 配置、数据库 SQL、管理员账号、普通用户测试和 Vercel 部署。这样他人访问公网地址时，就能正常注册、登录、收藏和评论。"
            : "Before sharing the site with others, configure Supabase, run the database SQL, set up an admin account, test with a regular user, and deploy to Vercel. Then visitors can register, log in, save articles, and comment from the public URL."}
        </p>
        <div className="hero-actions">
          <Link className="secondary-button" href={withLanguage("/settings", lang)}>{isZh ? "查看设置中心" : "Settings Center"}</Link>
          <Link className="secondary-button" href={withLanguage("/admin", lang)}>{isZh ? "查看后台说明" : "Admin Guide"}</Link>
        </div>
      </section>
    </section>
  );
}
