"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, HeartOff } from "lucide-react";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";

export default function FavoriteButton({ articleSlug }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [favorite, setFavorite] = useState(false);
  const [message, setMessage] = useState("");
  const configured = hasSupabaseConfig();

  useEffect(() => {
    async function loadFavorite() {
      if (!configured) return;

      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user;
      setUser(currentUser || null);

      if (!currentUser) return;

      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("article_slug", articleSlug)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      setFavorite(Boolean(data));
    }

    loadFavorite();
  }, [articleSlug, configured]);

  async function toggleFavorite() {
    if (!configured) {
      setMessage("请先配置 Supabase 环境变量，再使用收藏功能。");
      return;
    }

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData.user;

    if (!currentUser) {
      const redirectTo = `${window.location.pathname}${window.location.search}`;
      router.push(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
      return;
    }

    if (favorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("article_slug", articleSlug)
        .eq("user_id", currentUser.id);

      if (!error) {
        setFavorite(false);
        setMessage("已取消收藏。 / Removed from favorites.");
      }
      return;
    }

    const { error } = await supabase
      .from("favorites")
      .insert({ article_slug: articleSlug, user_id: currentUser.id });

    if (!error) {
      setFavorite(true);
      setMessage("已收藏。 / Added to favorites.");
    } else {
      setMessage(error.message);
    }
  }

  return (
    <div>
      <button onClick={toggleFavorite} className="secondary-button">
        {favorite ? <HeartOff size={17} /> : <Heart size={17} />}
        {favorite ? "取消收藏" : "收藏文章"}
      </button>
      {message && <p className="notice">{message}</p>}
    </div>
  );
}
