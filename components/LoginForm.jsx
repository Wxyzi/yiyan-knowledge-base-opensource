"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, AtSign, Eye, EyeOff, KeyRound, LockKeyhole, LogIn, Mail, UserRound, UserRoundPlus } from "lucide-react";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";

function getInitialMessage(messageCode, isZh) {
  if (messageCode === "confirm-error") {
    return isZh
      ? "邮箱确认链接没有完成登录，请重新打开邮件中的链接，或直接在这里登录。"
      : "The email confirmation link did not complete sign-in. Open the email link again, or log in here.";
  }

  if (messageCode === "password-updated") {
    return isZh
      ? "密码已更新，请使用新密码登录。"
      : "Your password has been updated. Sign in with the new password.";
  }

  return "";
}

function getFriendlyAuthMessage(errorMessage, isZh) {
  const text = errorMessage || "";
  const lower = text.toLowerCase();

  if (lower.includes("email not confirmed")) {
    return isZh
      ? "这个邮箱还没有完成验证，请打开注册邮件并点击确认链接后再登录。"
      : "This email has not been confirmed. Open the registration email and follow its confirmation link.";
  }

  if (lower.includes("invalid login credentials")) {
    return isZh ? "邮箱或密码不正确，请检查后重试。" : "The email or password is incorrect. Please try again.";
  }

  if (lower.includes("already registered") || lower.includes("user already registered")) {
    return isZh
      ? "这个邮箱已经注册，请切换到登录并使用原密码。"
      : "This email is already registered. Switch to Log In and use the existing password.";
  }

  if (lower.includes("rate limit")) {
    return isZh
      ? "操作过于频繁，请稍后再试。"
      : "Too many attempts. Please wait a moment and try again.";
  }

  if (lower.includes("signup") && lower.includes("disabled")) {
    return isZh ? "当前已关闭新用户注册。" : "New account registration is currently disabled.";
  }

  if (lower.includes("database error")) {
    return isZh
      ? "注册服务暂时不可用，请稍后再试。"
      : "Registration is temporarily unavailable. Please try again later.";
  }

  if (lower.includes("password")) {
    return isZh ? `密码不符合要求：${text}` : `Password issue: ${text}`;
  }

  return isZh ? `操作失败：${text}` : `Action failed: ${text}`;
}

export default function LoginForm({
  redirectTo = "/",
  lang = "zh",
  messageCode = "",
  emailConfirmationRequired = null
}) {
  const isZh = lang !== "en";
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(() => getInitialMessage(messageCode, isZh));
  const [pending, setPending] = useState(false);

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!hasSupabaseConfig()) {
      setMessage(isZh
        ? "网站账号服务尚未完成配置。"
        : "Account services have not been configured yet.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    if (mode === "register" && (cleanUsername.length < 2 || cleanUsername.length > 30)) {
      setMessage(isZh ? "用户名请输入 2 至 30 个字符。" : "Enter a username between 2 and 30 characters.");
      return;
    }

    const supabase = createClient();
    setPending(true);

    if (mode === "register") {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("redirectTo", redirectTo);
      callbackUrl.searchParams.set("lang", lang);

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { username: cleanUsername },
          emailRedirectTo: callbackUrl.toString()
        }
      });

      if (error) {
        setMessage(getFriendlyAuthMessage(error.message, isZh));
        setPending(false);
        return;
      }

      if (data.user?.identities?.length === 0) {
        setMode("login");
        setPassword("");
        setMessage(isZh
          ? "这个邮箱可能已经注册，请直接登录；如果忘记密码，请使用登录页的找回密码入口。"
          : "This email may already be registered. Log in directly or use the password recovery link.");
        setPending(false);
        return;
      }

      if (data.session) {
        setMessage(isZh ? "注册成功，正在进入知识库……" : "Registration complete. Opening the knowledge base...");
        window.location.assign(redirectTo);
        return;
      }

      setMode("login");
      setPassword("");
      setMessage(isZh
        ? `注册申请已提交，请打开 ${cleanEmail} 的收件箱并完成确认，然后回来登录。`
        : `Registration submitted. Open the inbox for ${cleanEmail}, confirm the account, then return to log in.`);
      setPending(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error) {
      setMessage(getFriendlyAuthMessage(error.message, isZh));
      setPending(false);
      return;
    }

    await supabase.auth.getSession();
    window.location.assign(redirectTo);
  }

  const confirmationCopy = emailConfirmationRequired === true
    ? (isZh ? "注册后需要打开邮箱完成确认。" : "Email confirmation is required after registration.")
    : emailConfirmationRequired === false
      ? (isZh ? "当前注册后可直接登录，无需邮箱验证码。" : "New accounts can sign in immediately; no email code is required.")
      : (isZh ? "是否需要邮箱确认取决于当前账号设置。" : "Email confirmation depends on the current account settings.");

  return (
    <section className="card login-card" aria-labelledby="auth-form-title">
      <div className="login-card-head">
        <span className="login-card-icon" aria-hidden="true">
          {mode === "login" ? <LogIn size={20} /> : <UserRoundPlus size={20} />}
        </span>
        <div>
          <p>{mode === "login" ? (isZh ? "欢迎回来" : "Welcome back") : (isZh ? "建立学习账号" : "Create your learning account")}</p>
          <h2 id="auth-form-title">{mode === "login" ? (isZh ? "登录知识库" : "Log in") : (isZh ? "注册账号" : "Register")}</h2>
        </div>
      </div>

      <div className="auth-mode-toggle" role="tablist" aria-label={isZh ? "选择登录或注册" : "Choose login or registration"}>
        <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")} disabled={pending}>
          {isZh ? "登录" : "Log In"}
        </button>
        <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => changeMode("register")} disabled={pending}>
          {isZh ? "注册" : "Register"}
        </button>
      </div>

      {mode === "register" ? (
        <div className="auth-identity-note">
          <div><Mail size={16} /><span><strong>{isZh ? "邮箱" : "Email"}</strong>{isZh ? "用于登录，仅你自己可见" : "Private sign-in account"}</span></div>
          <div><AtSign size={16} /><span><strong>{isZh ? "用户名" : "Username"}</strong>{isZh ? "用于评论和回复，可公开显示" : "Public name for comments and replies"}</span></div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="form-stack login-form">
        {mode === "register" ? (
          <label className="field-stack">
            <span className="field-label">{isZh ? "用户名" : "Username"}</span>
            <span className="auth-input-wrap">
              <UserRound size={17} aria-hidden="true" />
              <input
                className="input"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={isZh ? "例如：王子" : "e.g. Wang Zi"}
                minLength={2}
                maxLength={30}
                required
                disabled={pending}
              />
            </span>
          </label>
        ) : null}

        <label className="field-stack">
          <span className="field-label">{isZh ? "登录邮箱" : "Login email"}</span>
          <span className="auth-input-wrap">
            <Mail size={17} aria-hidden="true" />
            <input
              className="input"
              type="email"
              name="email"
              autoComplete="email"
              autoCapitalize="none"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              disabled={pending}
            />
          </span>
        </label>

        <label className="field-stack">
          <span className="field-label">{isZh ? "密码" : "Password"}</span>
          <span className="auth-input-wrap auth-password-wrap">
            <LockKeyhole size={17} aria-hidden="true" />
            <input
              className="input"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isZh ? "输入密码" : "Enter password"}
              minLength={6}
              required
              disabled={pending}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              title={showPassword ? (isZh ? "隐藏密码" : "Hide password") : (isZh ? "显示密码" : "Show password")}
              aria-label={showPassword ? (isZh ? "隐藏密码" : "Hide password") : (isZh ? "显示密码" : "Show password")}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>

        {mode === "login" ? (
          <div className="auth-login-options">
            <Link href={`/forgot-password?lang=${lang}`}><KeyRound size={14} /> {isZh ? "忘记密码？" : "Forgot password?"}</Link>
          </div>
        ) : null}

        {mode === "register" ? <p className="auth-confirmation-note"><Mail size={14} /> {confirmationCopy}</p> : null}

        <button className="primary-button login-submit" type="submit" disabled={pending}>
          {pending
            ? (isZh ? "处理中……" : "Working...")
            : mode === "login"
              ? (isZh ? "登录并进入" : "Log in and continue")
              : (isZh ? "创建账号" : "Create account")}
          {!pending ? <ArrowRight size={17} /> : null}
        </button>
      </form>

      {message ? <p className="auth-message" role="status" aria-live="polite">{message}</p> : null}
    </section>
  );
}
