import fs from "fs";
import path from "path";
import AdminOnlyNotice from "@/components/AdminOnlyNotice";
import SettingsPanel from "@/components/SettingsPanel";
import { getAdminAccess } from "@/lib/adminAccess";
import { getAiProviderConfig } from "@/lib/aiProvider";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "设置 | 译研知识库",
  description: "集中检查 Supabase、OpenCode Go 智能回答、数据库初始化、管理员权限和部署环境变量。"
};

function maskKey(value) {
  if (!value) return "";
  if (value.length <= 16) return `${value.slice(0, 4)}...`;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default async function SettingsPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const isZh = lang !== "en";
  const access = await getAdminAccess({ lang, redirectTo: `/settings?lang=${lang}` });

  if (!access.allowed) {
    return <AdminOnlyNotice lang={lang} reason={access.reason} />;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  const aiHistoryPath = path.join(process.cwd(), "supabase", "ai-chat-history.sql");
  const aiHistorySql = fs.readFileSync(aiHistoryPath, "utf8");
  const envExample = [
    "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key",
    "OPENCODE_API_KEY=your-opencode-go-api-key",
    "OPENCODE_CHAT_MODEL=glm-5.3"
  ].join("\n");
  const adminSql = [
    "update public.profiles",
    "set role = 'admin'",
    "where id = (",
    "  select id from auth.users",
    "  where email = 'your-email@example.com'",
    ");"
  ].join("\n");
  const signupFixSql = [
    "-- Fix signup failure caused by missing profile table, old constraints, or broken trigger.",
    "create extension if not exists pgcrypto;",
    "",
    "create table if not exists public.profiles (",
    "  id uuid primary key references auth.users(id) on delete cascade,",
    "  username text,",
    "  role text not null default 'user',",
    "  created_at timestamptz not null default now()",
    ");",
    "",
    "alter table public.profiles add column if not exists username text;",
    "alter table public.profiles add column if not exists role text not null default 'user';",
    "alter table public.profiles add column if not exists created_at timestamptz not null default now();",
    "",
    "alter table public.profiles drop constraint if exists profiles_username_key;",
    "alter table public.profiles drop constraint if exists profiles_role_check;",
    "alter table public.profiles",
    "  add constraint profiles_role_check check (role in ('user', 'admin'));",
    "",
    "alter table public.profiles enable row level security;",
    "",
    "grant usage on schema public to authenticated;",
    "",
    "drop policy if exists \"Profiles are readable by everyone\" on public.profiles;",
    "drop policy if exists \"Authenticated users can read profiles\" on public.profiles;",
    "create policy \"Authenticated users can read profiles\"",
    "  on public.profiles for select",
    "  using (auth.uid() is not null);",
    "",
    "drop policy if exists \"Users can update their own profile\" on public.profiles;",
    "drop policy if exists \"Users can update their own username\" on public.profiles;",
    "create policy \"Users can update their own username\"",
    "  on public.profiles for update",
    "  using (auth.uid() = id)",
    "  with check (auth.uid() = id);",
    "",
    "revoke all on public.profiles from anon;",
    "revoke update on public.profiles from anon, authenticated;",
    "grant select on public.profiles to authenticated;",
    "grant update(username) on public.profiles to authenticated;",
    "",
    "create or replace function public.prevent_profile_role_change()",
    "returns trigger",
    "language plpgsql",
    "security definer set search_path = public",
    "as $$",
    "begin",
    "  if old.role is distinct from new.role and auth.uid() is not null then",
    "    raise exception 'Only administrators may change profile roles.';",
    "  end if;",
    "",
    "  return new;",
    "end;",
    "$$;",
    "",
    "drop trigger if exists prevent_profile_role_change on public.profiles;",
    "create trigger prevent_profile_role_change",
    "  before update on public.profiles",
    "  for each row execute procedure public.prevent_profile_role_change();",
    "",
    "create or replace function public.handle_new_user()",
    "returns trigger",
    "language plpgsql",
    "security definer set search_path = public",
    "as $$",
    "begin",
    "  insert into public.profiles (id, username, role)",
    "  values (",
    "    new.id,",
    "    coalesce(nullif(new.raw_user_meta_data->>'username', ''), nullif(split_part(new.email, '@', 1), ''), 'user'),",
    "    'user'",
    "  )",
    "  on conflict (id) do update set",
    "    username = coalesce(public.profiles.username, excluded.username),",
    "    role = coalesce(public.profiles.role, 'user');",
    "  return new;",
    "end;",
    "$$;",
    "",
    "drop trigger if exists on_auth_user_created on auth.users;",
    "create trigger on_auth_user_created",
    "  after insert on auth.users",
    "  for each row execute procedure public.handle_new_user();",
    "",
    "-- Backfill missing profiles for users that already exist.",
    "insert into public.profiles (id, username, role)",
    "select",
    "  id,",
    "  coalesce(nullif(raw_user_meta_data->>'username', ''), nullif(split_part(email, '@', 1), ''), 'user'),",
    "  'user'",
    "from auth.users",
    "on conflict (id) do nothing;"
  ].join("\n");
  const commentRepliesSql = [
    "-- Add threaded replies to comments.",
    "alter table public.comments add column if not exists parent_id uuid;",
    "",
    "do $$",
    "begin",
    "  if not exists (",
    "    select 1 from pg_constraint",
    "    where conname = 'comments_parent_id_fkey'",
    "  ) then",
    "    alter table public.comments",
    "      add constraint comments_parent_id_fkey",
    "      foreign key (parent_id)",
    "      references public.comments(id)",
    "      on delete cascade;",
    "  end if;",
    "end;",
    "$$;",
    "",
    "create index if not exists comments_parent_id_idx on public.comments(parent_id);",
    "",
    "create or replace function public.ensure_comment_parent_matches_target()",
    "returns trigger",
    "language plpgsql",
    "security definer set search_path = public",
    "as $$",
    "begin",
    "  if new.parent_id is not null and not exists (",
    "    select 1",
    "    from public.comments parent",
    "    where parent.id = new.parent_id",
    "      and parent.article_slug = new.article_slug",
    "  ) then",
    "    raise exception 'Reply target must belong to the same discussion.';",
    "  end if;",
    "",
    "  return new;",
    "end;",
    "$$;",
    "",
    "drop trigger if exists ensure_comment_parent_matches_target on public.comments;",
    "create trigger ensure_comment_parent_matches_target",
    "  before insert or update on public.comments",
    "  for each row execute procedure public.ensure_comment_parent_matches_target();"
  ].join("\n");
  const analyticsSql = [
    "-- Add privacy-conscious article view analytics.",
    "create table if not exists public.article_views (",
    "  id uuid primary key default gen_random_uuid(),",
    "  user_id uuid not null references public.profiles(id) on delete cascade,",
    "  article_slug text not null,",
    "  article_title text,",
    "  category text,",
    "  viewed_at timestamptz not null default now(),",
    "  device_type text,",
    "  browser_name text,",
    "  os_name text,",
    "  timezone text,",
    "  locale text,",
    "  screen_width integer,",
    "  screen_height integer,",
    "  ip_address text,",
    "  ip_hash text,",
    "  country text,",
    "  region text,",
    "  city text,",
    "  latitude numeric(5, 1),",
    "  longitude numeric(5, 1),",
    "  location_accuracy_m integer,",
    "  location_source text not null default 'none'",
    ");",
    "",
    "alter table public.article_views add column if not exists article_title text;",
    "alter table public.article_views add column if not exists category text;",
    "alter table public.article_views add column if not exists viewed_at timestamptz not null default now();",
    "alter table public.article_views add column if not exists device_type text;",
    "alter table public.article_views add column if not exists browser_name text;",
    "alter table public.article_views add column if not exists os_name text;",
    "alter table public.article_views add column if not exists timezone text;",
    "alter table public.article_views add column if not exists locale text;",
    "alter table public.article_views add column if not exists screen_width integer;",
    "alter table public.article_views add column if not exists screen_height integer;",
    "alter table public.article_views add column if not exists ip_address text;",
    "alter table public.article_views add column if not exists ip_hash text;",
    "alter table public.article_views add column if not exists country text;",
    "alter table public.article_views add column if not exists region text;",
    "alter table public.article_views add column if not exists city text;",
    "alter table public.article_views add column if not exists latitude numeric(5, 1);",
    "alter table public.article_views add column if not exists longitude numeric(5, 1);",
    "alter table public.article_views add column if not exists location_accuracy_m integer;",
    "alter table public.article_views add column if not exists location_source text not null default 'none';",
    "",
    "alter table public.article_views drop constraint if exists article_views_location_source_check;",
    "alter table public.article_views",
    "  add constraint article_views_location_source_check",
    "  check (location_source in ('none', 'ip', 'browser'));",
    "",
    "create index if not exists article_views_user_id_idx on public.article_views(user_id);",
    "create index if not exists article_views_article_slug_idx on public.article_views(article_slug);",
    "create index if not exists article_views_viewed_at_idx on public.article_views(viewed_at desc);",
    "",
    "alter table public.article_views enable row level security;",
    "revoke all on public.article_views from anon;",
    "revoke update on public.article_views from authenticated;",
    "",
    "drop policy if exists \"Users can insert their own article views\" on public.article_views;",
    "create policy \"Users can insert their own article views\"",
    "  on public.article_views for insert",
    "  with check (auth.uid() = user_id);",
    "",
    "drop policy if exists \"Users can read their own article views\" on public.article_views;",
    "create policy \"Users can read their own article views\"",
    "  on public.article_views for select",
    "  using (auth.uid() = user_id);",
    "",
    "drop policy if exists \"Users can update their own article view location\" on public.article_views;",
    "create policy \"Users can update their own article view location\"",
    "  on public.article_views for update",
    "  using (auth.uid() = user_id)",
    "  with check (auth.uid() = user_id);",
    "",
    "drop policy if exists \"Admins can read article views\" on public.article_views;",
    "create policy \"Admins can read article views\"",
    "  on public.article_views for select",
    "  using (",
    "    exists (",
    "      select 1 from public.profiles",
    "      where profiles.id = auth.uid() and profiles.role = 'admin'",
    "    )",
    "  );",
    "",
    "drop policy if exists \"Admins can delete article views\" on public.article_views;",
    "create policy \"Admins can delete article views\"",
    "  on public.article_views for delete",
    "  using (",
    "    exists (",
    "      select 1 from public.profiles",
    "      where profiles.id = auth.uid() and profiles.role = 'admin'",
    "    )",
    "  );",
    "",
    "grant select, insert, delete on public.article_views to authenticated;",
    "grant update(latitude, longitude, location_accuracy_m, location_source) on public.article_views to authenticated;"
  ].join("\n");

  const serverConfig = {
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
    hasCompleteEnv: Boolean(supabaseUrl && supabaseAnonKey),
    supabaseUrl,
    anonKeyPreview: maskKey(supabaseAnonKey)
  };
  const providerConfig = getAiProviderConfig();
  const aiConfig = {
    hasApiKey: providerConfig.hasApiKey,
    keySource: providerConfig.keySource,
    model: providerConfig.model,
    provider: providerConfig.provider
  };

  return (
    <section style={{ margin: "34px 0 60px" }}>
      <div className="settings-title">
        <span className="badge">Configuration Center</span>
        <h1>{isZh ? "设置" : "Settings"}</h1>
        <p>
          {isZh
            ? "这里集中检查网站运行需要的配置：Supabase 连接、OpenCode Go 智能回答、数据库 SQL、管理员权限和部署环境变量。"
            : "This page gathers the configuration needed to run the site: Supabase, OpenCode Go AI answers, database SQL, admin roles, and deployment environment variables."}
        </p>
      </div>

      <SettingsPanel
        serverConfig={serverConfig}
        aiConfig={aiConfig}
        schemaSql={schemaSql}
        adminSql={adminSql}
        signupFixSql={signupFixSql}
        commentRepliesSql={commentRepliesSql}
        analyticsSql={analyticsSql}
        aiHistorySql={aiHistorySql}
        envExample={envExample}
      />
    </section>
  );
}
