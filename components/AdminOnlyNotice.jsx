import Link from "next/link";

export default function AdminOnlyNotice({ lang = "zh", reason = "not-admin" }) {
  const isZh = lang !== "en";
  const missingConfig = reason === "missing-config";

  return (
    <section style={{ margin: "34px 0 60px" }}>
      <div className="card panel" style={{ maxWidth: 720 }}>
        <span className="badge">Admin Only</span>
        <h1>{isZh ? "仅管理员可访问" : "Admins Only"}</h1>
        <p className="notice">
          {missingConfig
            ? (isZh
                ? "当前没有配置服务端 Supabase 环境变量，网站无法验证管理员身份。请先在 .env.local 或部署环境变量中配置 Supabase URL 和 anon key。"
                : "Server-side Supabase environment variables are not configured, so the site cannot verify admin access. Configure the Supabase URL and anon key in .env.local or deployment environment variables first.")
            : (isZh
                ? "当前账号不是管理员，或尚未登录管理员账号。关于页、后台说明和设置页只对管理员显示。"
                : "The current account is not an admin, or no admin account is logged in. About, Admin, and Settings are visible to admins only.")}
        </p>
        <div className="hero-actions">
          {!missingConfig ? (
            <Link className="primary-button" href={`/login?redirectTo=/&lang=${lang}`}>
              {isZh ? "登录管理员账号" : "Log In as Admin"}
            </Link>
          ) : null}
          <Link className="secondary-button" href={`/?lang=${lang}`}>
            {isZh ? "返回首页" : "Back Home"}
          </Link>
        </div>
      </div>
    </section>
  );
}
