import AdminOnlyNotice from "@/components/AdminOnlyNotice";
import { getAdminAccess } from "@/lib/adminAccess";

export const metadata = {
  title: "后台发布说明 | 译研知识库"
};

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const isZh = lang !== "en";
  const access = await getAdminAccess({ lang, redirectTo: `/admin?lang=${lang}` });

  if (!access.allowed) {
    return <AdminOnlyNotice lang={lang} reason={access.reason} />;
  }

  return (
    <section style={{ margin: "34px 0 60px" }}>
      <div className="card article-body">
        <h1>{isZh ? "Markdown 发布流程" : "Markdown Publishing Workflow"}</h1>
        <p className="notice">
          {isZh
            ? "当前方案不使用 MDX。正式知识点由本地 Markdown 文件管理，适合通过 CC 自动生成、修改和提交。"
            : "This project does not use MDX. Official knowledge articles are managed as local Markdown files, which makes them easy to generate, revise, and commit."}
        </p>

        <h2>一、推荐工作流</h2>
        <pre className="codeblock">{`你提出知识点主题
↓
CC 在 content/ 对应分类下创建 .md 文件
↓
本地 npm run dev 预览
↓
确认内容与格式
↓
git add / commit / push
↓
Vercel 自动部署
↓
用户在线访问`}</pre>

        <h2>二、Markdown 文件模板</h2>
        <pre className="codeblock">{`---
slug: keyword-analysis
titleZh: 什么是关键词分析？
titleEn: What Is Keyword Analysis?
category: corpus
levelZh: 入门
levelEn: Beginner
readingTimeZh: 10 分钟
readingTimeEn: 10 min
tags: [关键词分析, 语料库语言学, 参照语料库]
date: 2026-05-10
author: 译研知识库
summaryZh: 关键词分析用于识别目标语料库中具有显著性的词汇。
summaryEn: Keyword analysis identifies words that are statistically salient in a target corpus.
---

<!-- zh -->
# 什么是关键词分析？

## 一、定义

在这里写中文正文。
<!-- /zh -->

<!-- en -->
# What Is Keyword Analysis?

## 1. Definition

Write the English body here.
<!-- /en -->`}</pre>

        <h2>三、Supabase 负责的动态功能</h2>
        <ul>
          <li>用户注册与登录：Supabase Auth</li>
          <li>用户资料与角色：profiles 表</li>
          <li>评论：comments 表</li>
          <li>收藏：favorites 表</li>
          <li>安全权限：Row Level Security policies</li>
        </ul>

        <h2>四、为什么不把文章放进 Supabase？</h2>
        <p>
          因为你希望通过本地 CC 自动编辑和上传知识点，Markdown 文件更适合版本管理、批量修改、长期归档和学术写作。Supabase 更适合保存用户行为数据，例如账号、评论和收藏。
        </p>
      </div>
    </section>
  );
}
