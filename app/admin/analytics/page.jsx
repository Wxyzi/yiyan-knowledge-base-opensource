import Link from "next/link";
import { BarChart3, Clock3, Eye, Filter, Gauge, MapPin, MonitorSmartphone, RotateCcw, ShieldCheck, Users } from "lucide-react";
import AdminOnlyNotice from "@/components/AdminOnlyNotice";
import { getAdminAccess } from "@/lib/adminAccess";
import { createClient } from "@/lib/supabase/server";
import { getAllArticles } from "@/lib/markdown";
import { getCategoryById } from "@/lib/categories";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "学习数据 | 译研知识库",
  description: "管理员查看用户文章浏览记录、热门知识点和学习活跃情况。"
};

const RANGE_OPTIONS = new Set(["7d", "30d", "90d", "all"]);

function normalizeRange(value) {
  return RANGE_OPTIONS.has(String(value || "")) ? String(value) : "30d";
}

function getRangeStart(range) {
  if (range === "all") return null;
  const days = Number.parseInt(range, 10);
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function normalizeExcludedUsers(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values
    .map((item) => String(item))
    .filter((item) => /^[0-9a-f-]{36}$/i.test(item))
    .slice(0, 20);
}

function formatDate(value, lang) {
  if (!value) return "-";
  const locale = lang === "en" ? "en-US" : "zh-CN";
  return new Date(value).toLocaleString(locale, { timeZone: "Asia/Shanghai" });
}

function getUserName(view) {
  return view.profiles?.username || view.user_id?.slice(0, 8) || "User";
}

function getArticleTitle(view, articlesBySlug, lang) {
  const article = articlesBySlug.get(view.article_slug);
  if (article) return lang === "en" ? article.titleEn : article.titleZh;
  return view.article_title || view.article_slug;
}

function getCategoryLabel(categoryId, lang) {
  if (!categoryId) return "-";
  const category = getCategoryById(categoryId);
  if (!category || (category.id === "all" && categoryId !== "all")) return categoryId;
  return lang === "en" ? category.en : category.zh;
}

function summarizeViews(views, articlesBySlug, lang) {
  const articleMap = new Map();
  const userMap = new Map();

  for (const view of views) {
    const articleKey = view.article_slug;
    const articleSummary = articleMap.get(articleKey) || {
      slug: articleKey,
      title: getArticleTitle(view, articlesBySlug, lang),
      category: getCategoryLabel(view.category || articlesBySlug.get(articleKey)?.category, lang),
      count: 0,
      users: new Set(),
      lastViewedAt: view.viewed_at
    };

    articleSummary.count += 1;
    articleSummary.users.add(view.user_id);
    if (new Date(view.viewed_at) > new Date(articleSummary.lastViewedAt)) {
      articleSummary.lastViewedAt = view.viewed_at;
    }
    articleMap.set(articleKey, articleSummary);

    const userKey = view.user_id;
    const userSummary = userMap.get(userKey) || {
      id: userKey,
      name: getUserName(view),
      role: view.profiles?.role || "user",
      count: 0,
      articles: new Set(),
      lastViewedAt: view.viewed_at
    };

    userSummary.count += 1;
    userSummary.articles.add(articleKey);
    if (new Date(view.viewed_at) > new Date(userSummary.lastViewedAt)) {
      userSummary.lastViewedAt = view.viewed_at;
    }
    userMap.set(userKey, userSummary);
  }

  const popularArticles = [...articleMap.values()]
    .sort((a, b) => b.users.size - a.users.size || b.count - a.count || new Date(b.lastViewedAt) - new Date(a.lastViewedAt))
    .slice(0, 10);

  const allUsers = [...userMap.values()]
    .sort((a, b) => b.count - a.count || new Date(b.lastViewedAt) - new Date(a.lastViewedAt));

  return { popularArticles, activeUsers: allUsers.slice(0, 10), allUsers };
}

function summarizeSessions(views) {
  const viewsByUser = new Map();
  for (const view of views) {
    const userViews = viewsByUser.get(view.user_id) || [];
    userViews.push(view);
    viewsByUser.set(view.user_id, userViews);
  }

  const sessionLengths = [];
  for (const userViews of viewsByUser.values()) {
    const ordered = [...userViews].sort((a, b) => new Date(a.viewed_at) - new Date(b.viewed_at));
    let currentLength = 0;
    let previousTime = null;

    for (const view of ordered) {
      const currentTime = new Date(view.viewed_at).getTime();
      if (previousTime !== null && currentTime - previousTime > 30 * 60 * 1000) {
        sessionLengths.push(currentLength);
        currentLength = 0;
      }
      currentLength += 1;
      previousTime = currentTime;
    }

    if (currentLength) sessionLengths.push(currentLength);
  }

  const singlePageSessions = sessionLengths.filter((length) => length === 1).length;
  return {
    count: sessionLengths.length,
    averageDepth: sessionLengths.length ? views.length / sessionLengths.length : 0,
    singlePageRate: sessionLengths.length ? singlePageSessions / sessionLengths.length : 0
  };
}

function deviceLabel(view) {
  return [view.device_type, view.browser_name, view.os_name].filter(Boolean).join(" / ") || "-";
}

function locationLabel(view) {
  const headerLocation = [view.city, view.region, view.country].filter(Boolean).join(", ");
  if (headerLocation) return headerLocation;
  if (view.latitude != null && view.longitude != null) {
    return `${view.latitude}, ${view.longitude}`;
  }
  return "-";
}

export default async function AnalyticsPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const isZh = lang !== "en";
  const range = normalizeRange(sp?.range);
  const scope = sp?.scope === "all" ? "all" : "users";
  const excludedUserIds = new Set(normalizeExcludedUsers(sp?.exclude));
  const access = await getAdminAccess({ lang, redirectTo: `/admin/analytics?lang=${lang}` });

  if (!access.allowed) {
    return <AdminOnlyNotice lang={lang} reason={access.reason} />;
  }

  const supabase = await createClient();
  let analyticsQuery = supabase
    .from("article_views")
    .select(`
      id,
      user_id,
      article_slug,
      article_title,
      category,
      viewed_at,
      device_type,
      browser_name,
      os_name,
      timezone,
      locale,
      screen_width,
      screen_height,
      ip_address,
      country,
      region,
      city,
      latitude,
      longitude,
      location_source,
      profiles(username, role)
    `);

  const rangeStart = getRangeStart(range);
  if (rangeStart) analyticsQuery = analyticsQuery.gte("viewed_at", rangeStart.toISOString());

  const { data, error } = await analyticsQuery
    .order("viewed_at", { ascending: false })
    .limit(1000);

  const rawViews = data || [];
  const allArticles = getAllArticles();
  const articlesBySlug = new Map(allArticles.map((article) => [article.slug, article]));
  const rawSummary = summarizeViews(rawViews, articlesBySlug, lang);
  const views = rawViews.filter((view) => {
    if (scope === "users" && view.profiles?.role === "admin") return false;
    return !excludedUserIds.has(view.user_id);
  });
  const uniqueUsers = new Set(views.map((view) => view.user_id)).size;
  const uniqueArticles = new Set(views.map((view) => view.article_slug)).size;
  const { popularArticles, activeUsers } = summarizeViews(views, articlesBySlug, lang);
  const sessionSummary = summarizeSessions(views);
  const rangeLabel = range === "all"
    ? (isZh ? "全部时间" : "All time")
    : (isZh ? `最近 ${Number.parseInt(range, 10)} 天` : `Last ${Number.parseInt(range, 10)} days`);

  return (
    <section className="admin-analytics-page">
      <div className="settings-title">
        <span className="badge"><BarChart3 size={14} /> Learning Analytics</span>
        <h1>{isZh ? "用户学习数据" : "User Learning Data"}</h1>
        <p>
          {isZh
            ? "用独立用户、会话深度和知识点流向判断真实学习需求。管理员与测试账号可以从统计中排除，敏感明细默认收起。"
            : "Use unique users, session depth, and article paths to identify real learning needs. Admin and test accounts can be excluded, while sensitive details stay collapsed by default."}
        </p>
      </div>

      {error ? (
        <section className="card panel">
          <h2>{isZh ? "学习数据表还没有初始化" : "Analytics Table Is Not Ready"}</h2>
          <p className="notice">
            {isZh
              ? `请先在 Supabase SQL Editor 运行最新的 supabase/schema.sql。当前错误：${error.message}`
              : `Run the latest supabase/schema.sql in Supabase SQL Editor first. Current error: ${error.message}`}
          </p>
          <Link className="secondary-button" href={`/settings?lang=${lang}`}>
            {isZh ? "去设置页复制 SQL" : "Open Settings SQL"}
          </Link>
        </section>
      ) : (
        <>
          <form className="card analytics-filter-panel" method="get">
            <input name="lang" type="hidden" value={lang} />
            <div className="analytics-filter-heading">
              <Filter size={18} />
              <div>
                <strong>{isZh ? "统计范围" : "Analytics Scope"}</strong>
                <span>{rangeLabel} · {scope === "users" ? (isZh ? "普通用户" : "Regular users") : (isZh ? "全部账号" : "All accounts")}</span>
              </div>
            </div>

            <label>
              <span>{isZh ? "时间" : "Period"}</span>
              <select defaultValue={range} name="range">
                <option value="7d">{isZh ? "最近 7 天" : "Last 7 days"}</option>
                <option value="30d">{isZh ? "最近 30 天" : "Last 30 days"}</option>
                <option value="90d">{isZh ? "最近 90 天" : "Last 90 days"}</option>
                <option value="all">{isZh ? "全部时间" : "All time"}</option>
              </select>
            </label>

            <label>
              <span>{isZh ? "账号范围" : "Account Scope"}</span>
              <select defaultValue={scope} name="scope">
                <option value="users">{isZh ? "仅普通用户" : "Regular users only"}</option>
                <option value="all">{isZh ? "全部账号" : "All accounts"}</option>
              </select>
            </label>

            <details className="analytics-account-exclusions">
              <summary>{isZh ? `排除测试账号${excludedUserIds.size ? `（${excludedUserIds.size}）` : ""}` : `Exclude test accounts${excludedUserIds.size ? ` (${excludedUserIds.size})` : ""}`}</summary>
              <div>
                {rawSummary.allUsers.length ? rawSummary.allUsers.map((item) => (
                  <label key={item.id}>
                    <input defaultChecked={excludedUserIds.has(item.id)} name="exclude" type="checkbox" value={item.id} />
                    <span>{item.name} · {item.count} {isZh ? "次" : "views"}{item.role === "admin" ? ` · ${isZh ? "管理员" : "admin"}` : ""}</span>
                  </label>
                )) : <span>{isZh ? "当前范围没有账号。" : "No accounts in this period."}</span>}
              </div>
            </details>

            <div className="analytics-filter-actions">
              <button className="primary-button" type="submit"><Filter size={15} /> {isZh ? "应用" : "Apply"}</button>
              <Link className="secondary-button" href={`/admin/analytics?lang=${lang}`}><RotateCcw size={15} /> {isZh ? "重置" : "Reset"}</Link>
            </div>
          </form>

          <div className="analytics-scope-note">
            <ShieldCheck size={15} />
            <span>{isZh ? `当前纳入 ${views.length} 条记录，共 ${uniqueUsers} 位用户。热门知识点优先按独立用户数排序。` : `${views.length} records from ${uniqueUsers} users are included. Popular articles are ranked by unique users first.`}</span>
          </div>

          <div className="analytics-stat-grid analytics-stat-grid-adaptive">
            <div className="card stat-card">
              <div>
                <p>{isZh ? "浏览记录" : "Views"}</p>
                <strong>{views.length}</strong>
              </div>
              <Eye size={24} />
            </div>
            <div className="card stat-card">
              <div>
                <p>{isZh ? "活跃用户" : "Active Users"}</p>
                <strong>{uniqueUsers}</strong>
              </div>
              <Users size={24} />
            </div>
            <div className="card stat-card">
              <div>
                <p>{isZh ? "被查看知识点" : "Articles Viewed"}</p>
                <strong>{uniqueArticles}</strong>
              </div>
              <BarChart3 size={24} />
            </div>
            <div className="card stat-card">
              <div>
                <p>{isZh ? "平均会话深度" : "Average Session Depth"}</p>
                <strong>{sessionSummary.averageDepth.toFixed(1)}</strong>
                <small>{sessionSummary.count} {isZh ? "个会话" : "sessions"} · {Math.round(sessionSummary.singlePageRate * 100)}% {isZh ? "仅一篇" : "single-page"}</small>
              </div>
              <Gauge size={24} />
            </div>
          </div>

          <div className="analytics-grid">
            <section className="card panel">
              <h2 className="panel-title"><Eye size={15} /> {isZh ? "热门知识点" : "Popular Articles"}</h2>
              <div className="analytics-list">
                {popularArticles.length === 0 ? (
                  <p className="notice">{isZh ? "还没有浏览记录。" : "No view records yet."}</p>
                ) : popularArticles.map((item) => (
                  <Link className="analytics-list-item" href={`/articles/${item.slug}?lang=${lang}`} key={item.slug}>
                    <strong>{item.title}</strong>
                    <span>{item.category} · {item.count} {isZh ? "次浏览" : "views"} · {item.users.size} {isZh ? "位用户" : "users"}</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="card panel">
              <h2 className="panel-title"><Users size={15} /> {isZh ? "活跃用户" : "Active Users"}</h2>
              <div className="analytics-list">
                {activeUsers.length === 0 ? (
                  <p className="notice">{isZh ? "还没有用户学习数据。" : "No user learning data yet."}</p>
                ) : activeUsers.map((item) => (
                  <div className="analytics-list-item" key={item.id}>
                    <strong>{item.name}</strong>
                    <span>{item.count} {isZh ? "次浏览" : "views"} · {item.articles.size} {isZh ? "个知识点" : "articles"} · {formatDate(item.lastViewedAt, lang)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <details className="card analytics-sensitive-details">
            <summary>
              <ShieldCheck size={17} />
              <span><strong>{isZh ? "敏感浏览明细" : "Sensitive View Details"}</strong><small>{isZh ? "按需展开，仅用于故障排查和质量审核" : "Expand only for troubleshooting and quality review"}</small></span>
            </summary>
            <div className="analytics-sensitive-body">
              <p className="notice">
                {isZh
                  ? "最多查询当前范围内最近 1000 条。IP 为脱敏网段；位置来自平台粗略信息或用户授权后的低精度坐标。"
                  : "Queries up to 1,000 recent rows in the selected period. IPs are masked; location is approximate or based on low-precision user permission."}
              </p>
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>{isZh ? "时间" : "Time"}</th>
                      <th>{isZh ? "用户" : "User"}</th>
                      <th>{isZh ? "文章" : "Article"}</th>
                      <th>{isZh ? "设备" : "Device"}</th>
                      <th>{isZh ? "IP / 位置" : "IP / Location"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {views.length === 0 ? (
                      <tr><td colSpan="5">{isZh ? "当前筛选范围没有浏览记录。" : "No views match the current filters."}</td></tr>
                    ) : views.map((view) => (
                      <tr key={view.id}>
                        <td><Clock3 size={13} /> {formatDate(view.viewed_at, lang)}</td>
                        <td>{getUserName(view)}</td>
                        <td><Link className="text-link" href={`/articles/${view.article_slug}?lang=${lang}`}>{getArticleTitle(view, articlesBySlug, lang)}</Link></td>
                        <td><MonitorSmartphone size={13} /> {deviceLabel(view)}</td>
                        <td><MapPin size={13} /> {view.ip_address || "-"} · {locationLabel(view)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
