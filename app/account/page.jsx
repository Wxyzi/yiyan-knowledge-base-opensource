import { redirect } from "next/navigation";
import { KeyRound, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import AccountSecurityForm from "@/components/AccountSecurityForm";
import { createClient, hasSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "账号安全 | 译研知识库",
  description: "查看账号身份并安全修改译研知识库登录密码。"
};

export default async function AccountPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const isZh = lang !== "en";

  if (!hasSupabaseServerConfig()) {
    return <section className="resource-page"><div className="card panel"><h1>{isZh ? "账号服务尚未配置" : "Account services are not configured"}</h1></div></section>;
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    const params = new URLSearchParams({ redirectTo: `/account?lang=${lang}`, lang });
    redirect(`/login?${params.toString()}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role")
    .eq("id", userData.user.id)
    .maybeSingle();
  const displayName = profile?.username || userData.user.user_metadata?.username || userData.user.email?.split("@")[0] || (isZh ? "用户" : "User");

  return (
    <section className="resource-page account-security-page">
      <div className="settings-title">
        <span className="badge"><ShieldCheck size={15} /> {isZh ? "个人账号" : "Personal account"}</span>
        <h1>{isZh ? "账号与安全" : "Account and security"}</h1>
        <p>{isZh ? "确认当前登录身份，并通过旧密码验证后更新登录密码。" : "Review your current identity and verify the existing password before changing it."}</p>
      </div>

      <div className="account-security-layout">
        <section className="account-identity-panel" aria-label={isZh ? "当前账号信息" : "Current account information"}>
          <div className="account-identity-avatar">{displayName.trim().slice(0, 1).toUpperCase() || "U"}</div>
          <div><span>{isZh ? "当前登录" : "Signed in as"}</span><h2>{displayName}</h2><p>{profile?.role === "admin" ? (isZh ? "管理员账号" : "Administrator") : (isZh ? "普通用户" : "Member")}</p></div>
          <dl>
            <div><dt><UserRound size={15} /> {isZh ? "公开用户名" : "Public username"}</dt><dd>{displayName}</dd></div>
            <div><dt><Mail size={15} /> {isZh ? "登录邮箱" : "Sign-in email"}</dt><dd>{userData.user.email || "-"}</dd></div>
            <div><dt><LockKeyhole size={15} /> {isZh ? "密码保存" : "Password storage"}</dt><dd>{isZh ? "由 Supabase 加密管理" : "Encrypted by Supabase"}</dd></div>
          </dl>
          <p className="account-identity-note"><KeyRound size={15} /> {isZh ? "忘记当前密码时，请退出登录并使用登录页的“忘记密码”。" : "If you forgot the current password, sign out and use Forgot password on the login page."}</p>
        </section>

        <AccountSecurityForm email={userData.user.email || ""} lang={lang} />
      </div>
    </section>
  );
}
