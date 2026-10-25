"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartOff } from "lucide-react";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";

export default function FavoritesList({ articles, lang = "zh" }) {
  const router = useRouter();
  const isZh = lang !== "en";
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState(isZh ? "加载中……" : "Loading...");
  const configured = hasSupabaseConfig();

  const articleMap = useMemo(() => {
    return new Map(articles.map((article) => [article.slug, article]));
  }, [articles]);

  async function loadFavorites() {
    if (!configured) {
      setMessage(isZh ? "请先配置 Supabase 环境变量，再使用收藏功能。" : "Please configure Supabase before using favorites.");
      return;
    }

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData.user;
    setUser(currentUser || null);

    if (!currentUser) {
      router.replace(`/login?redirectTo=/favorites&lang=${lang}`);
      return;
    }

    const { data, error } = await supabase
      .from("favorites")
      .select("article_slug, created_at")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setItems(data || []);
    setMessage("");
  }

  useEffect(() => {
    loadFavorites();
  }, [configured]);

  async function removeFavorite(articleSlug) {
    if (!configured || !user) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("article_slug", articleSlug)
      .eq("user_id", user.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setItems((currentItems) => currentItems.filter((item) => item.article_slug !== articleSlug));
  }

  return (
    <div className="card panel">
      <h1>我的收藏 My Favorites</h1>
      <p className="notice">
        {isZh
          ? "收藏记录保存在 Supabase 中，文章信息来自本地 Markdown 内容库。"
          : "Favorite records are stored in Supabase, while article metadata comes from local Markdown files."}
      </p>
      {message ? <p className="notice">{message}</p> : null}
      {!message && items.length === 0 ? <p className="notice">{isZh ? "暂无收藏。" : "No favorites yet."}</p> : null}
      <div className="article-grid" style={{ marginTop: 16 }}>
        {items.map((item) => {
          const article = articleMap.get(item.article_slug);
          return (
            <article key={item.article_slug} className="card article-card">
              <Link href={`/articles/${item.article_slug}?lang=${lang}`}>
                <h3>{article ? (isZh ? article.titleZh : article.titleEn) : item.article_slug}</h3>
                <p>{article ? (isZh ? article.summaryZh : article.summaryEn) : (isZh ? "这篇文章可能已移动或还没有本地元数据。" : "This article may have moved or does not have local metadata yet.")}</p>
              </Link>
              <div className="meta-row">
                <span className="pill">Favorite</span>
                <span className="pill">{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
              <button
                className="secondary-button"
                type="button"
                style={{ marginTop: 14 }}
                onClick={() => removeFavorite(item.article_slug)}
              >
                <HeartOff size={16} /> {isZh ? "取消收藏" : "Remove"}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
