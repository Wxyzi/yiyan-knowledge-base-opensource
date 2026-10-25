"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";

function friendlyResetError(message, isZh) {
  const lower = String(message || "").toLowerCase();

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return isZh
      ? "重置邮件发送过于频繁，请稍后再试。"
      : "Too many recovery emails were requested. Please try again later.";
  }

  if (lower.includes("email")) {
    return isZh ? "请输入有效的邮箱地址。" : "Enter a valid email address.";
  }

  return isZh
    ? "暂时无法发送重置邮件，请稍后再试。"
    : "The recovery email could not be sent. Please try again later.";
}

export default function ForgotPasswordForm({ lang = "zh", initialMessage = "" }) {
  const isZh = lang !== "en";
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState(initialMessage);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!hasSupabaseConfig()) {
      setMessage(isZh ? "网站账号服务尚未完成配置。" : "Account services have not been configured yet.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("redirectTo", `/update-password?lang=${lang}`);
    callbackUrl.searchParams.set("lang", lang);
    callbackUrl.searchParams.set("flow", "recovery");

    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: callbackUrl.toString()
    });

    if (error) {
      setMessage(friendlyResetError(error.message, isZh));
      setPending(false);
      return;
    }

    setSent(true);
    setPending(false);
    setMessage(isZh
      ? "如果该邮箱已注册，重置邮件会很快送达。请在申请重置的同一浏览器中打开邮件链接。"
      : "If the address is registered, a recovery email will arrive shortly. Open its link in the same browser that requested it.");
  }

  return (
    <section className="card auth-flow-card" aria-labelledby="forgot-password-title">
      <div className="login-card-head">
        <span className="login-card-icon"><Mail size={20} /></span>
        <div>
          <p>{isZh ? "账号恢复" : "Account recovery"}</p>
          <h1 id="forgot-password-title">{isZh ? "找回密码" : "Reset your password"}</h1>
        </div>
      </div>

      <p className="auth-flow-lead">
        {isZh ? "输入注册邮箱，我们会发送一次性恢复链接。" : "Enter your sign-in email and we will send a one-time recovery link."}
      </p>

      <form className="form-stack login-form" onSubmit={handleSubmit}>
        <label className="field-stack" htmlFor="recovery-email">
          <span className="field-label">{isZh ? "注册邮箱" : "Registered email"}</span>
          <span className="auth-input-wrap">
            <Mail size={17} aria-hidden="true" />
            <input
              className="input"
              id="recovery-email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              disabled={pending || sent}
            />
          </span>
        </label>

        <button className="primary-button login-submit" type="submit" disabled={pending || sent}>
          {pending ? (isZh ? "发送中……" : "Sending...") : sent ? (isZh ? "邮件已申请" : "Email requested") : (isZh ? "发送重置邮件" : "Send recovery email")}
          {!pending ? <ArrowRight size={17} /> : null}
        </button>
      </form>

      {message ? <p className="auth-message" role="status" aria-live="polite"><ShieldCheck size={15} /> {message}</p> : null}

      <Link className="auth-flow-back" href={`/login?lang=${lang}`}><ArrowLeft size={15} /> {isZh ? "返回登录" : "Back to login"}</Link>
    </section>
  );
}
