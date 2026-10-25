"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import PasswordField from "@/components/PasswordField";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";

function friendlyPasswordError(message, isZh) {
  const lower = String(message || "").toLowerCase();
  if (lower.includes("same password")) return isZh ? "新密码不能与原密码相同。" : "The new password must differ from the old password.";
  if (lower.includes("weak") || lower.includes("password")) return isZh ? `密码未通过安全检查：${message}` : `Password security check failed: ${message}`;
  if (lower.includes("session") || lower.includes("jwt")) return isZh ? "恢复链接已经失效，请重新申请。" : "This recovery link has expired. Request a new one.";
  return isZh ? "密码更新失败，请重新申请恢复链接后再试。" : "The password could not be updated. Request a new recovery link and try again.";
}

export default function ResetPasswordForm({ email = "", lang = "zh" }) {
  const isZh = lang !== "en";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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

    if (!hasSupabaseConfig()) {
      setMessage(isZh ? "网站尚未配置账号服务。" : "Account services are not configured.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setMessage(friendlyPasswordError(error.message, isZh));
      setPending(false);
      return;
    }

    setMessage(isZh ? "密码已更新，正在返回登录页……" : "Password updated. Returning to login...");
    await supabase.auth.signOut({ scope: "global" });
    window.location.replace(`/login?lang=${lang}&message=password-updated`);
  }

  return (
    <section className="card auth-flow-card" aria-labelledby="reset-password-title">
      <div className="login-card-head">
        <span className="login-card-icon"><ShieldCheck size={20} /></span>
        <div>
          <p>{isZh ? "恢复链接已验证" : "Recovery link verified"}</p>
          <h1 id="reset-password-title">{isZh ? "设置新密码" : "Set a new password"}</h1>
        </div>
      </div>

      <div className="auth-recovery-identity"><CheckCircle2 size={16} /><span>{email || (isZh ? "当前恢复账号" : "Current recovery account")}</span></div>

      <form className="form-stack login-form" onSubmit={handleSubmit}>
        <PasswordField
          id="new-password"
          label={isZh ? "新密码" : "New password"}
          value={newPassword}
          onChange={setNewPassword}
          visible={showNew}
          onToggle={() => setShowNew((value) => !value)}
          autoComplete="new-password"
          placeholder={isZh ? "至少 6 个字符" : "At least 6 characters"}
          disabled={pending}
          lang={lang}
        />
        <PasswordField
          id="confirm-password"
          label={isZh ? "确认新密码" : "Confirm new password"}
          value={confirmPassword}
          onChange={setConfirmPassword}
          visible={showConfirm}
          onToggle={() => setShowConfirm((value) => !value)}
          autoComplete="new-password"
          placeholder={isZh ? "再次输入新密码" : "Enter the new password again"}
          disabled={pending}
          lang={lang}
        />

        <p className="auth-password-guidance">{isZh ? "建议使用与其他网站不同的密码。更新后，所有设备都需要重新登录。" : "Use a password that is unique to this site. All devices must sign in again after the update."}</p>

        <button className="primary-button login-submit" type="submit" disabled={pending}>
          {pending ? (isZh ? "更新中……" : "Updating...") : (isZh ? "更新密码" : "Update password")}
          {!pending ? <ArrowRight size={17} /> : null}
        </button>
      </form>

      {message ? <p className="auth-message" role="status" aria-live="polite">{message}</p> : null}
    </section>
  );
}
