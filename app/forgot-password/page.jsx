import { MailCheck, ShieldCheck } from "lucide-react";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export const metadata = {
  title: "找回密码 | 译研知识库",
  description: "通过注册邮箱安全恢复译研知识库账号密码。"
};

export default async function ForgotPasswordPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const isZh = lang !== "en";
  const initialMessage = sp?.message === "reset-error"
    ? (isZh ? "恢复链接无效、已过期或不是在原浏览器中打开，请重新申请。" : "The recovery link is invalid, expired, or opened in a different browser. Request a new link.")
    : "";

  return (
    <section className="auth-flow-page">
      <div className="auth-flow-intro">
        <span className="badge"><ShieldCheck size={15} /> {isZh ? "安全恢复" : "Secure recovery"}</span>
        <h1>{isZh ? "重新获得账号访问权限" : "Recover access to your account"}</h1>
        <p>{isZh ? "恢复邮件只会发送到注册邮箱。网站不会读取或保存你的明文密码。" : "Recovery mail is sent only to the registered address. The site never reads or stores your plaintext password."}</p>
        <div className="auth-flow-steps">
          <div><span>1</span><p><strong>{isZh ? "提交邮箱" : "Submit email"}</strong><small>{isZh ? "输入登录时使用的邮箱" : "Use the address used to sign in"}</small></p></div>
          <div><span>2</span><p><strong>{isZh ? "打开邮件" : "Open the email"}</strong><small>{isZh ? "在同一浏览器点击一次性链接" : "Use the one-time link in the same browser"}</small></p></div>
          <div><span>3</span><p><strong>{isZh ? "设置新密码" : "Set a new password"}</strong><small>{isZh ? "完成后重新登录所有设备" : "Sign in again on every device"}</small></p></div>
        </div>
        <p className="auth-flow-delivery-note"><MailCheck size={16} /> {isZh ? "没有收到时，请检查垃圾邮件，并等待几分钟后再试。" : "If it does not arrive, check spam and wait a few minutes before retrying."}</p>
      </div>

      <ForgotPasswordForm lang={lang} initialMessage={initialMessage} />
    </section>
  );
}
