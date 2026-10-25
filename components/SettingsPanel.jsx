"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { CheckCircle2, Clipboard, Database, RotateCcw, Sparkles, Trash2, XCircle } from "lucide-react";
import {
  clearBrowserSupabaseConfig,
  getBrowserSupabaseConfig,
  saveBrowserSupabaseConfig
} from "@/lib/supabase/client";

export default function SettingsPanel({
  serverConfig,
  aiConfig,
  schemaSql,
  adminSql,
  signupFixSql,
  commentRepliesSql,
  analyticsSql,
  aiHistorySql,
  envExample
}) {
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [configSource, setConfigSource] = useState("missing");
  const [message, setMessage] = useState("");
  const [testState, setTestState] = useState("idle");

  useEffect(() => {
    const config = getBrowserSupabaseConfig();
    setConfigSource(config.source);

    if (config.source === "browser") {
      setSupabaseUrl(config.supabaseUrl);
      setSupabaseAnonKey(config.supabaseAnonKey);
    }
  }, []);

  function copyText(text, successMessage) {
    navigator.clipboard.writeText(text);
    setMessage(successMessage);
  }

  function saveConfig(event) {
    event.preventDefault();

    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setMessage("请填写 Supabase URL 和 anon public key。");
      return;
    }

    saveBrowserSupabaseConfig({ supabaseUrl, supabaseAnonKey });
    setConfigSource("browser");
    setMessage("已保存到当前浏览器。刷新页面后，登录、收藏和评论会使用这组配置。");
  }

  function clearConfig() {
    clearBrowserSupabaseConfig();
    setSupabaseUrl("");
    setSupabaseAnonKey("");
    setConfigSource(serverConfig.hasCompleteEnv ? "env" : "missing");
    setMessage("已清除浏览器本地配置。");
  }

  async function testConnection() {
    setMessage("");
    setTestState("testing");

    try {
      const config = getBrowserSupabaseConfig();

      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        setTestState("failed");
        setMessage("还没有可测试的 Supabase 配置。请先保存网页设置或配置 .env.local。");
        return;
      }

      const supabase = createBrowserClient(config.supabaseUrl, config.supabaseAnonKey);
      const { error } = await supabase.from("profiles").select("id").limit(1);

      if (error) {
        setTestState("failed");
        setMessage(`连接到了 Supabase，但数据库表可能还没初始化：${error.message}`);
        return;
      }

      setTestState("passed");
      setMessage("连接测试通过，profiles 表可以读取。");
    } catch (error) {
      setTestState("failed");
      setMessage(error.message || "连接测试失败。");
    }
  }

  const sourceLabel = {
    env: "使用 .env.local / 部署环境变量",
    browser: "使用网页设置中的浏览器本地配置",
    missing: "尚未配置"
  }[configSource];

  return (
    <div className="settings-grid">
      <section className="card panel">
        <div className="settings-heading">
          <Database size={20} />
          <div>
            <h2>Supabase 连接</h2>
            <p className="notice">URL 和 anon / publishable key 不是 service role / secret key，可以用于前端连接。</p>
          </div>
        </div>

        <div className="status-list">
          <div className="status-item">
            {serverConfig.hasUrl ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            <span>环境变量 URL：{serverConfig.hasUrl ? serverConfig.supabaseUrl : "未配置"}</span>
          </div>
          <div className="status-item">
            {serverConfig.hasAnonKey ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            <span>环境变量 anon / publishable key：{serverConfig.hasAnonKey ? serverConfig.anonKeyPreview : "未配置"}</span>
          </div>
          <div className="status-item">
            {configSource !== "missing" ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            <span>当前客户端来源：{sourceLabel}</span>
          </div>
        </div>

        <form className="form-stack" onSubmit={saveConfig} style={{ marginTop: 18 }}>
          <label className="field-label" htmlFor="supabase-url">Supabase Project URL</label>
          <input
            id="supabase-url"
            className="input"
            value={supabaseUrl}
            onChange={(event) => setSupabaseUrl(event.target.value)}
            placeholder="https://your-project.supabase.co"
          />

          <label className="field-label" htmlFor="supabase-anon-key">Supabase anon public key / publishable key</label>
          <textarea
            id="supabase-anon-key"
            className="textarea"
            value={supabaseAnonKey}
            onChange={(event) => setSupabaseAnonKey(event.target.value)}
            placeholder="eyJhbGciOi..."
          />

          <div className="hero-actions" style={{ marginTop: 4 }}>
            <button className="primary-button" type="submit">保存到网页设置</button>
            <button className="secondary-button" type="button" onClick={testConnection}>
              <RotateCcw size={16} /> {testState === "testing" ? "测试中" : "测试连接"}
            </button>
            <button className="secondary-button" type="button" onClick={clearConfig}>
              <Trash2 size={16} /> 清除
            </button>
          </div>
        </form>

        {message ? <p className="notice">{message}</p> : null}
      </section>

      <aside className="side-stack">
        <section className="card panel">
          <div className="settings-heading">
            <Sparkles size={20} />
            <div>
              <h2>OpenCode Go 智能回答</h2>
              <p className="notice">API Key 只读取服务端环境变量，不会保存到浏览器或发送给普通用户。</p>
            </div>
          </div>
          <div className="status-list">
            <div className="status-item">
              {aiConfig.hasApiKey ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
              <span>{aiConfig.keySource || "OPENCODE_API_KEY"}：{aiConfig.hasApiKey ? "已配置" : "未配置"}</span>
            </div>
            <div className="status-item">
              <CheckCircle2 size={17} />
              <span>{aiConfig.provider} 回答模型：{aiConfig.model}</span>
            </div>
          </div>
        </section>

        <section className="card panel">
          <h2 className="panel-title">本地与部署环境变量</h2>
          <p className="notice">网页设置只能影响当前浏览器。部署到 Vercel 或需要服务端权限页时，仍应配置环境变量。</p>
          <pre className="codeblock">{envExample}</pre>
          <button
            className="secondary-button"
            type="button"
            onClick={() => copyText(envExample, "已复制环境变量模板。")}
          >
            <Clipboard size={16} /> 复制
          </button>
        </section>

        <section className="card panel">
          <h2 className="panel-title">注册错误修复 SQL</h2>
          <p className="notice">如果注册新账号时出现 Database error saving new user，先在 SQL Editor 运行这一段。</p>
          <pre className="codeblock">{signupFixSql}</pre>
          <button
            className="secondary-button"
            type="button"
            onClick={() => copyText(signupFixSql, "已复制注册错误修复 SQL。")}
          >
            <Clipboard size={16} /> 复制
          </button>
        </section>

        <section className="card panel">
          <h2 className="panel-title">评论回复功能 SQL</h2>
          <p className="notice">如果数据库已经初始化过，新增评论回复功能时运行这一段即可。</p>
          <pre className="codeblock">{commentRepliesSql}</pre>
          <button
            className="secondary-button"
            type="button"
            onClick={() => copyText(commentRepliesSql, "已复制评论回复功能 SQL。")}
          >
            <Clipboard size={16} /> 复制
          </button>
        </section>

        <section className="card panel">
          <h2 className="panel-title">学习数据统计 SQL</h2>
          <p className="notice">新增用户文章浏览记录、热门知识点和管理员学习数据后台时运行这一段。</p>
          <pre className="codeblock">{analyticsSql}</pre>
          <button
            className="secondary-button"
            type="button"
            onClick={() => copyText(analyticsSql, "已复制学习数据统计 SQL。")}
          >
            <Clipboard size={16} /> 复制
          </button>
        </section>

        <section className="card panel">
          <h2 className="panel-title">AI 问答记录 SQL</h2>
          <p className="notice">启用多轮 AI 会话、旧记录迁移与管理员审阅时，在 Supabase SQL Editor 运行这一段；可重复执行。</p>
          <pre className="codeblock">{aiHistorySql}</pre>
          <button
            className="secondary-button"
            type="button"
            onClick={() => copyText(aiHistorySql, "已复制 AI 问答记录 SQL。")}>
            <Clipboard size={16} /> 复制
          </button>
        </section>

        <section className="card panel">
          <h2 className="panel-title">管理员账号 SQL</h2>
          <p className="notice">注册登录一次后，在 Supabase SQL Editor 中把邮箱改成你的账号邮箱并执行。</p>
          <pre className="codeblock">{adminSql}</pre>
          <button
            className="secondary-button"
            type="button"
            onClick={() => copyText(adminSql, "已复制管理员 SQL。")}
          >
            <Clipboard size={16} /> 复制
          </button>
        </section>
      </aside>

      <section className="card panel settings-wide">
        <h2>数据库初始化 SQL</h2>
        <p className="notice">第一次使用 Supabase 时，把下面内容复制到 Supabase SQL Editor 执行。</p>
        <pre className="codeblock settings-sql">{schemaSql}</pre>
        <button
          className="secondary-button"
          type="button"
          onClick={() => copyText(schemaSql, "已复制数据库初始化 SQL。")}
        >
          <Clipboard size={16} /> 复制全部 SQL
        </button>
      </section>
    </div>
  );
}
