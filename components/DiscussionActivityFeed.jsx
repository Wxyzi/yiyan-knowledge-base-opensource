"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3, LockKeyhole, MessageCircle, MessageSquareReply, RefreshCw } from "lucide-react";

const REFRESH_INTERVAL_MS = 10000;

function formatRelativeTime(value, isZh) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";

  const seconds = Math.min(0, Math.round((timestamp - Date.now()) / 1000));
  const absoluteSeconds = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat(isZh ? "zh-CN" : "en", { numeric: "auto" });

  if (absoluteSeconds < 60) return formatter.format(seconds, "second");
  if (absoluteSeconds < 3600) return formatter.format(Math.round(seconds / 60), "minute");
  if (absoluteSeconds < 86400) return formatter.format(Math.round(seconds / 3600), "hour");
  return formatter.format(Math.round(seconds / 86400), "day");
}

function ActivitySkeleton() {
  return (
    <div className="discussion-activity-skeleton" aria-hidden="true">
      {[0, 1, 2, 3].map((item) => <span key={item} />)}
    </div>
  );
}

export default function DiscussionActivityFeed({ lang = "zh", limit = 16 }) {
  const isZh = lang !== "en";
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");

  const loadActivity = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState((current) => current === "ready" ? current : "loading");
    setRefreshing(silent);

    try {
      const response = await fetch(`/api/discussion-activity?limit=${limit}&lang=${lang}`, {
        credentials: "same-origin",
        cache: "no-store"
      });

      if (response.status === 401) {
        window.location.assign(`/login?redirectTo=${encodeURIComponent(`/discussions?lang=${lang}`)}&lang=${lang}`);
        return;
      }

      if (!response.ok) throw new Error("activity-unavailable");

      const payload = await response.json();
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setUpdatedAt(payload.refreshedAt || new Date().toISOString());
      setState("ready");
    } catch {
      setState("error");
    } finally {
      setRefreshing(false);
    }
  }, [lang, limit]);

  useEffect(() => {
    loadActivity();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadActivity({ silent: true });
    }, REFRESH_INTERVAL_MS);

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") loadActivity({ silent: true });
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadActivity]);

  return (
    <section className="card discussion-activity-panel" aria-labelledby="discussion-activity-title">
      <header className="discussion-activity-head">
        <div>
          <span className="discussion-live-label"><i /> {isZh ? "自动更新" : "Auto-updating"}</span>
          <h2 id="discussion-activity-title">{isZh ? "最新讨论与回复" : "Latest discussions and replies"}</h2>
          <p>{isZh ? "查看大家正在交流的知识点，点击即可继续阅读和讨论。" : "See which knowledge items are being discussed and open any item to join in."}</p>
        </div>
        <button
          className="discussion-refresh-button"
          type="button"
          onClick={() => loadActivity({ silent: true })}
          disabled={refreshing}
          title={isZh ? "刷新讨论动态" : "Refresh discussion activity"}
          aria-label={isZh ? "刷新讨论动态" : "Refresh discussion activity"}
        >
          <RefreshCw size={17} className={refreshing ? "is-spinning" : ""} />
        </button>
      </header>

      {state === "loading" ? <ActivitySkeleton /> : null}
      {state === "error" ? (
        <div className="discussion-activity-empty">
          <MessageCircle size={22} />
          <strong>{isZh ? "暂时无法加载讨论动态" : "Discussion activity is unavailable"}</strong>
          <button type="button" className="text-link" onClick={() => loadActivity()}>{isZh ? "重新加载" : "Try again"}</button>
        </div>
      ) : null}
      {state === "ready" && items.length === 0 ? (
        <div className="discussion-activity-empty">
          <MessageCircle size={22} />
          <strong>{isZh ? "还没有讨论动态" : "No discussion activity yet"}</strong>
          <span>{isZh ? "第一条评论会出现在这里。" : "The first comment will appear here."}</span>
        </div>
      ) : null}

      {state === "ready" && items.length > 0 ? (
        <div className="discussion-activity-list">
          {items.map((item) => {
            const isReply = item.activityKind === "reply";
            return (
              <Link className="discussion-activity-item" href={item.target.href} key={item.id}>
                <span className={`discussion-user-avatar ${isReply ? "reply" : ""}`} aria-hidden="true">
                  {item.username.trim().slice(0, 1).toUpperCase() || "U"}
                </span>
                <span className="discussion-activity-copy">
                  <span>
                    <strong>{item.username}</strong>
                    {isReply ? (isZh ? " 回复了" : " replied in") : (isZh ? " 评论了" : " commented on")}
                  </span>
                  <b>{item.target.title}</b>
                </span>
                <span className="discussion-activity-meta">
                  <span>{isReply ? <MessageSquareReply size={13} /> : <MessageCircle size={13} />}{isReply ? (isZh ? "回复" : "Reply") : (isZh ? "评论" : "Comment")}</span>
                  <time dateTime={item.createdAt}><Clock3 size={13} /> {formatRelativeTime(item.createdAt, isZh)}</time>
                </span>
                <ArrowUpRight className="discussion-activity-arrow" size={17} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      ) : null}

      <footer className="discussion-activity-foot">
        <span><LockKeyhole size={13} /> {isZh ? "仅登录用户可见，不展示邮箱与评论正文" : "Visible to signed-in users only; emails and comment text stay private"}</span>
        {updatedAt ? <time dateTime={updatedAt}>{isZh ? "每 10 秒更新" : "Updates every 10 seconds"}</time> : null}
      </footer>
    </section>
  );
}
