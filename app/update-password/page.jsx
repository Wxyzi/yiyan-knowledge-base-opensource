import Link from "next/link";
import { ArrowRight, KeyRound, ShieldAlert } from "lucide-react";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import { createClient, hasSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "设置新密码 | 译研知识库",
  description: "使用经过验证的账号恢复会话设置新密码。"
};

function isRecoveryClaims(claims) {
  const methods = Array.isArray(claims?.amr) ? claims.amr : [];
  return methods.some((entry) => entry?.method === "recovery");
}

export default async function UpdatePasswordPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const isZh = lang !== "en";

  if (!hasSupabaseServerConfig()) {
    return <section className="resource-page"><div className="card panel"><h1>{isZh ? "账号服务尚未配置" : "Account services are not configured"}</h1></div></section>;
  }

  const supabase = await createClient();
  const [{ data: userData }, { data: claimsData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims()
  ]);
  const recoveryVerified = Boolean(userData.user && isRecoveryClaims(claimsData?.claims));

  if (!recoveryVerified) {
    return (
      <section className="auth-flow-page auth-flow-single">
        <section className="card auth-flow-card auth-flow-invalid">
          <span className="login-card-icon"><ShieldAlert size={21} /></span>
          <h1>{isZh ? "需要有效的恢复链接" : "A valid recovery link is required"}</h1>
          <p>{isZh ? "这个页面只接受邮箱中的一次性恢复链接。链接可能已过期、已使用，或在另一台设备中打开。" : "This page accepts only a one-time email recovery link. It may be expired, already used, or opened on another device."}</p>
          <Link className="primary-button" href={`/forgot-password?lang=${lang}`}>{isZh ? "重新申请" : "Request another link"} <ArrowRight size={16} /></Link>
        </section>
      </section>
    );
  }

  return (
    <section className="auth-flow-page">
      <div className="auth-flow-intro">
        <span className="badge"><KeyRound size={15} /> {isZh ? "最后一步" : "Final step"}</span>
        <h1>{isZh ? "为账号设置新的登录密码" : "Set a new sign-in password"}</h1>
        <p>{isZh ? "恢复身份已经验证。新密码将由 Supabase 安全加密存储，网站无法查看密码原文。" : "Your recovery identity is verified. Supabase stores the new password securely and the site cannot view it."}</p>
      </div>
      <ResetPasswordForm email={userData.user.email || ""} lang={lang} />
    </section>
  );
}
