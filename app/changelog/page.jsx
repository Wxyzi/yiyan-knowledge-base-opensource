import { ArrowRight, Clock, Route, Sparkles } from "lucide-react";
import Link from "next/link";
import AdminOnlyNotice from "@/components/AdminOnlyNotice";
import { changelogEntries, siteVersion } from "@/data/changelog";
import { getAdminAccess } from "@/lib/adminAccess";

export const metadata = {
  title: "更新日志 | 译研知识库",
  description: "译研知识库的版本记录、功能更新和内容维护说明。"
};

export const dynamic = "force-dynamic";

function withLanguage(href, language) {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}lang=${language}`;
}

export default async function ChangelogPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const isZh = lang !== "en";
  const access = await getAdminAccess({ lang, redirectTo: `/changelog?lang=${lang}` });

  if (!access.allowed) {
    return <AdminOnlyNotice lang={lang} reason={access.reason} />;
  }

  return (
    <section className="resource-page changelog-page">
      <div className="resource-hero card">
        <span className="badge"><Clock size={15} /> {isZh ? "版本记录" : "Version Log"}</span>
        <h1>{isZh ? "更新日志" : "Changelog"}</h1>
        <p>
          {isZh
            ? "这里记录网站功能、界面、内容结构和帮助文档的主要变化，方便了解当前版本，也方便以后回溯修改。"
            : "This page records major changes to features, UI, content structure, and help documentation so the site can be reviewed and maintained over time."}
        </p>
        <div className="hero-actions">
          <Link className="primary-button" href={withLanguage("/help", lang)}>
            {isZh ? "查看 WebHelp" : "Open WebHelp"} <ArrowRight size={16} />
          </Link>
          <Link className="secondary-button" href={withLanguage("/articles", lang)}>
            {isZh ? "进入知识点" : "Open Articles"}
          </Link>
        </div>
      </div>

      <section className="card panel changelog-current">
        <div>
          <span className="badge"><Sparkles size={15} /> {isZh ? "当前版本" : "Current Version"}</span>
          <h2>{siteVersion}</h2>
          <p className="notice">
            {isZh
              ? "当前版本重点强化文章阅读、知识连接和文档维护能力。"
              : "The current version focuses on article reading, knowledge connections, and documentation maintenance."}
          </p>
        </div>
        <Link className="secondary-button" href={withLanguage("/paths", lang)}>
          <Route size={16} /> {isZh ? "查看学习路径" : "Learning Paths"}
        </Link>
      </section>

      <div className="changelog-timeline">
        {changelogEntries.map((entry) => (
          <article className="card changelog-entry" key={`${entry.version}-${entry.date}`}>
            <div className="changelog-marker" aria-hidden="true" />
            <div className="changelog-entry-head">
              <div>
                <span className="pill">{isZh ? entry.typeZh : entry.typeEn}</span>
                <h2>{isZh ? entry.titleZh : entry.titleEn}</h2>
              </div>
              <div className="changelog-version">
                <strong>{entry.version}</strong>
                <span>{entry.date}</span>
              </div>
            </div>
            <ul className="changelog-list">
              {(isZh ? entry.itemsZh : entry.itemsEn).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
