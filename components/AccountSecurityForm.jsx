"use client";

import { useState } from "react";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import PasswordField from "@/components/PasswordField";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";

function friendlyAccountError(message, isZh) {
  const lower = String(message || "").toLowerCase();
  if (lower.includes("invalid login credentials")) return isZh ? "当前密码不正确。" : "The current password is incorrect.";
  if (lower.includes("rate limit") || lower.includes("too many")) return isZh ? "尝试次数过多，请稍后再试。" : "Too many attempts. Please try again later.";
  if (lower.includes("same password")) return isZh ? "新密码不能与当前密码相同。" : "The new password must differ from the current password.";
  if (lower.includes("weak") || lower.includes("password")) return isZh ? `密码未通过安全检查：${message}` : `Password security check failed: ${message}`;
  return isZh ? "密码修改失败，请稍后重试。" : "The password could not be changed. Please try again later.";
}

export default function AccountSecurityForm({ email, lang = "zh" }) {
  const isZh = lang !== "en";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visibleField, setVisibleField] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (newPassword.length < 6) {
      setMessage(isZh ? "新密码至少需要 6 个字符。" : "The new password must contain at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage(isZh ? "两次输入的新密码不一致。" : "The two new passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setMessage(isZh ? "新密码不能与当前密码相同。" : "The new password must differ from the current password.");
      return;
    }

    if (!hasSupabaseConfig()) {
      setMessage(isZh ? "网站尚未配置账号服务。" : "Account services are not configured.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword
    });

    if (signInError) {
      setMessage(friendlyAccountError(signInError.message, isZh));
      setPending(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setMessage(friendlyAccountError(updateError.message, isZh));
      setPending(false);
      return;
    }

    setMessage(isZh ? "密码修改成功，正在退出并返回登录页……" : "Password changed. Signing out and returning to login...");
    await supabase.auth.signOut({ scope: "global" });
    window.location.replace(`/login?lang=${lang}&message=password-updated`);
  }

  function toggleVisibility(field) {
    setVisibleField((current) => current === field ? "" : field);
  }

  return (
    <section className="card account-security-card" aria-labelledby="change-password-title">
      <div className="settings-heading">
        <div className="icon-box"><KeyRound size={20} /></div>
        <div><h2 id="change-password-title">{isZh ? "修改登录密码" : "Change sign-in password"}</h2><p>{email}</p></div>
      </div>

      <form className="form-stack account-security-form" onSubmit={handleSubmit}>
        <PasswordField
          id="current-password"
          label={isZh ? "当前密码" : "Current password"}
          value={currentPassword}
          onChange={setCurrentPassword}
          visible={visibleField === "current"}
          onToggle={() => toggleVisibility("current")}
          autoComplete="current-password"
          placeholder={isZh ? "输入当前密码" : "Enter current password"}
          minLength={6}
          disabled={pending}
          lang={lang}
        />
        <PasswordField
          id="account-new-password"
          label={isZh ? "新密码" : "New password"}
          value={newPassword}
          onChange={setNewPassword}
          visible={visibleField === "new"}
          onToggle={() => toggleVisibility("new")}
          autoComplete="new-password"
          placeholder={isZh ? "至少 6 个字符" : "At least 6 characters"}
          disabled={pending}
          lang={lang}
        />
        <PasswordField
          id="account-confirm-password"
          label={isZh ? "确认新密码" : "Confirm new password"}
          value={confirmPassword}
          onChange={setConfirmPassword}
          visible={visibleField === "confirm"}
          onToggle={() => toggleVisibility("confirm")}
          autoComplete="new-password"
          placeholder={isZh ? "再次输入新密码" : "Enter the new password again"}
          disabled={pending}
          lang={lang}
        />

        <div className="account-security-impact"><ShieldCheck size={16} /><p>{isZh ? "提交前会验证当前密码。修改成功后，所有设备上的登录会话都会退出。" : "Your current password is verified before the update. A successful change signs out sessions on every device."}</p></div>

        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? (isZh ? "验证并修改中……" : "Verifying and updating...") : (isZh ? "确认修改" : "Change password")}
          {!pending ? <ArrowRight size={16} /> : null}
        </button>
      </form>

      {message ? <p className="auth-message" role="status" aria-live="polite">{message}</p> : null}
    </section>
  );
}
