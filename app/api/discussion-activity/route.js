import { NextResponse } from "next/server";
import { getDiscussionTarget } from "@/lib/discussionTargets";
import { createClient, hasSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function parseLimit(value) {
  const parsed = Number.parseInt(String(value || "12"), 10);
  if (!Number.isFinite(parsed)) return 12;
  return Math.min(Math.max(parsed, 1), 30);
}

export async function GET(request) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang") === "en" ? "en" : "zh";
  const limit = parseLimit(searchParams.get("limit"));
  const { data, error } = await supabase
    .from("comments")
    .select("id, article_slug, parent_id, created_at, profiles(username)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: "Discussion activity is temporarily unavailable." }, { status: 500 });
  }

  const items = (data || []).map((item) => {
    const target = getDiscussionTarget(item.article_slug, lang);
    return {
      id: item.id,
      username: String(item.profiles?.username || (lang === "zh" ? "用户" : "User")).slice(0, 40),
      activityKind: item.parent_id ? "reply" : "comment",
      createdAt: item.created_at,
      target
    };
  });

  return NextResponse.json(
    { items, refreshedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } }
  );
}
