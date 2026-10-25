-- 译研知识库 Supabase schema
-- Run this file in Supabase SQL Editor after creating your project.
-- This schema stores only dynamic user data. Official knowledge content remains in local Markdown files.

create extension if not exists pgcrypto;
grant usage on schema public to authenticated;

-- 1. User profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- Older versions of this project used a unique username constraint. It can block
-- signup when two users choose the same username or share the same email prefix.
alter table public.profiles drop constraint if exists profiles_username_key;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

alter table public.profiles enable row level security;

drop policy if exists "Profiles are readable by everyone" on public.profiles;
drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
  on public.profiles for select
  using (auth.uid() is not null);

drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can update their own username" on public.profiles;
create policy "Users can update their own username"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Authenticated users may update only their username. The role column is admin-only.
revoke all on public.profiles from anon;
revoke update on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(username) on public.profiles to authenticated;

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.role is distinct from new.role and auth.uid() is not null then
    raise exception 'Only administrators may change profile roles.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_role_change on public.profiles;
create trigger prevent_profile_role_change
  before update on public.profiles
  for each row execute procedure public.prevent_profile_role_change();

-- Automatically create a profile after signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), nullif(split_part(new.email, '@', 1), ''), 'user'),
    'user'
  )
  on conflict (id) do update set
    username = coalesce(public.profiles.username, excluded.username),
    role = coalesce(public.profiles.role, 'user');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Favorites
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  article_slug text not null,
  created_at timestamptz not null default now(),
  unique (user_id, article_slug)
);

create index if not exists favorites_user_id_idx on public.favorites(user_id);
create index if not exists favorites_article_slug_idx on public.favorites(article_slug);

alter table public.favorites enable row level security;

revoke all on public.favorites from anon;

drop policy if exists "Users can read their own favorites" on public.favorites;
create policy "Users can read their own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own favorites" on public.favorites;
create policy "Users can insert their own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own favorites" on public.favorites;
create policy "Users can delete their own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

grant select, insert, delete on public.favorites to authenticated;

-- 3. Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  -- For articles this is the article slug; for other knowledge units it uses
  -- typed keys such as term:target-corpus, method:bertopic, tool:antconc.
  article_slug text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.comments add column if not exists parent_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'comments_parent_id_fkey'
  ) then
    alter table public.comments
      add constraint comments_parent_id_fkey
      foreign key (parent_id)
      references public.comments(id)
      on delete cascade;
  end if;
end;
$$;

create index if not exists comments_article_slug_idx on public.comments(article_slug);
create index if not exists comments_user_id_idx on public.comments(user_id);
create index if not exists comments_parent_id_idx on public.comments(parent_id);

alter table public.comments enable row level security;

revoke all on public.comments from anon;

create or replace function public.ensure_comment_parent_matches_target()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.parent_id is not null and not exists (
    select 1
    from public.comments parent
    where parent.id = new.parent_id
      and parent.article_slug = new.article_slug
  ) then
    raise exception 'Reply target must belong to the same discussion.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_comment_parent_matches_target on public.comments;
create trigger ensure_comment_parent_matches_target
  before insert or update on public.comments
  for each row execute procedure public.ensure_comment_parent_matches_target();

drop policy if exists "Comments are readable by everyone" on public.comments;
drop policy if exists "Authenticated users can read comments" on public.comments;
create policy "Authenticated users can read comments"
  on public.comments for select
  using (auth.uid() is not null);

drop policy if exists "Authenticated users can create their own comments" on public.comments;
create policy "Authenticated users can create their own comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own comments" on public.comments;
create policy "Users can update their own comments"
  on public.comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users or admins can delete comments" on public.comments;
create policy "Users or admins can delete comments"
  on public.comments for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

grant select, insert, update, delete on public.comments to authenticated;

-- 4. Article view analytics
-- Stores privacy-conscious learning analytics. IPs are masked in the app route;
-- precise browser location is optional and rounded before storage.
create table if not exists public.article_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  article_slug text not null,
  article_title text,
  category text,
  viewed_at timestamptz not null default now(),
  device_type text,
  browser_name text,
  os_name text,
  timezone text,
  locale text,
  screen_width integer,
  screen_height integer,
  ip_address text,
  ip_hash text,
  country text,
  region text,
  city text,
  latitude numeric(5, 1),
  longitude numeric(5, 1),
  location_accuracy_m integer,
  location_source text not null default 'none'
);

alter table public.article_views add column if not exists article_title text;
alter table public.article_views add column if not exists category text;
alter table public.article_views add column if not exists viewed_at timestamptz not null default now();
alter table public.article_views add column if not exists device_type text;
alter table public.article_views add column if not exists browser_name text;
alter table public.article_views add column if not exists os_name text;
alter table public.article_views add column if not exists timezone text;
alter table public.article_views add column if not exists locale text;
alter table public.article_views add column if not exists screen_width integer;
alter table public.article_views add column if not exists screen_height integer;
alter table public.article_views add column if not exists ip_address text;
alter table public.article_views add column if not exists ip_hash text;
alter table public.article_views add column if not exists country text;
alter table public.article_views add column if not exists region text;
alter table public.article_views add column if not exists city text;
alter table public.article_views add column if not exists latitude numeric(5, 1);
alter table public.article_views add column if not exists longitude numeric(5, 1);
alter table public.article_views add column if not exists location_accuracy_m integer;
alter table public.article_views add column if not exists location_source text not null default 'none';

alter table public.article_views drop constraint if exists article_views_location_source_check;
alter table public.article_views
  add constraint article_views_location_source_check
  check (location_source in ('none', 'ip', 'browser'));

create index if not exists article_views_user_id_idx on public.article_views(user_id);
create index if not exists article_views_article_slug_idx on public.article_views(article_slug);
create index if not exists article_views_viewed_at_idx on public.article_views(viewed_at desc);

alter table public.article_views enable row level security;

revoke all on public.article_views from anon;
revoke update on public.article_views from authenticated;

drop policy if exists "Users can insert their own article views" on public.article_views;
create policy "Users can insert their own article views"
  on public.article_views for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can read their own article views" on public.article_views;
create policy "Users can read their own article views"
  on public.article_views for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own article view location" on public.article_views;
create policy "Users can update their own article view location"
  on public.article_views for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins can read article views" on public.article_views;
create policy "Admins can read article views"
  on public.article_views for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "Admins can delete article views" on public.article_views;
create policy "Admins can delete article views"
  on public.article_views for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

grant select, insert, delete on public.article_views to authenticated;
grant update(latitude, longitude, location_accuracy_m, location_source) on public.article_views to authenticated;

-- 5. AI conversations and question history
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  language text not null default 'zh',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_conversations add column if not exists title text;
alter table public.ai_conversations add column if not exists language text not null default 'zh';
alter table public.ai_conversations add column if not exists created_at timestamptz not null default now();
alter table public.ai_conversations add column if not exists updated_at timestamptz not null default now();

alter table public.ai_conversations drop constraint if exists ai_conversations_title_length_check;
alter table public.ai_conversations
  add constraint ai_conversations_title_length_check
  check (char_length(title) between 1 and 180);

alter table public.ai_conversations drop constraint if exists ai_conversations_language_check;
alter table public.ai_conversations
  add constraint ai_conversations_language_check
  check (language in ('zh', 'en'));

create index if not exists ai_conversations_user_updated_idx
  on public.ai_conversations(user_id, updated_at desc);
create index if not exists ai_conversations_updated_idx
  on public.ai_conversations(updated_at desc);

alter table public.ai_conversations enable row level security;
revoke all on public.ai_conversations from anon;
revoke update on public.ai_conversations from authenticated;

drop policy if exists "Users can insert their own AI conversations" on public.ai_conversations;
create policy "Users can insert their own AI conversations"
  on public.ai_conversations for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can read their own AI conversations" on public.ai_conversations;
create policy "Users can read their own AI conversations"
  on public.ai_conversations for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own AI conversations" on public.ai_conversations;
create policy "Users can update their own AI conversations"
  on public.ai_conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own AI conversations" on public.ai_conversations;
create policy "Users can delete their own AI conversations"
  on public.ai_conversations for delete
  using (auth.uid() = user_id);

drop policy if exists "Admins can read AI conversations" on public.ai_conversations;
create policy "Admins can read AI conversations"
  on public.ai_conversations for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "Admins can delete AI conversations" on public.ai_conversations;
create policy "Admins can delete AI conversations"
  on public.ai_conversations for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

grant select, insert, delete on public.ai_conversations to authenticated;
grant update(title, updated_at) on public.ai_conversations to authenticated;

create table if not exists public.ai_chat_history (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  answer text not null,
  sources jsonb not null default '[]'::jsonb,
  language text not null default 'zh',
  model text,
  provider text,
  created_at timestamptz not null default now()
);

alter table public.ai_chat_history add column if not exists conversation_id uuid;
alter table public.ai_chat_history add column if not exists question text;
alter table public.ai_chat_history add column if not exists answer text;
alter table public.ai_chat_history add column if not exists sources jsonb not null default '[]'::jsonb;
alter table public.ai_chat_history add column if not exists language text not null default 'zh';
alter table public.ai_chat_history add column if not exists model text;
alter table public.ai_chat_history add column if not exists provider text;
alter table public.ai_chat_history add column if not exists created_at timestamptz not null default now();

do $$
declare
  history_row record;
  new_conversation_id uuid;
begin
  for history_row in
    select id, user_id, question, language, created_at
    from public.ai_chat_history
    where conversation_id is null
  loop
    new_conversation_id := gen_random_uuid();
    insert into public.ai_conversations (
      id, user_id, title, language, created_at, updated_at
    ) values (
      new_conversation_id,
      history_row.user_id,
      left(coalesce(nullif(history_row.question, ''), 'AI conversation'), 180),
      case when history_row.language = 'en' then 'en' else 'zh' end,
      history_row.created_at,
      history_row.created_at
    );
    update public.ai_chat_history
    set conversation_id = new_conversation_id
    where id = history_row.id;
  end loop;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_chat_history_conversation_id_fkey'
  ) then
    alter table public.ai_chat_history
      add constraint ai_chat_history_conversation_id_fkey
      foreign key (conversation_id)
      references public.ai_conversations(id)
      on delete cascade;
  end if;
end;
$$;

alter table public.ai_chat_history alter column conversation_id set not null;

alter table public.ai_chat_history drop constraint if exists ai_chat_history_question_length_check;
alter table public.ai_chat_history
  add constraint ai_chat_history_question_length_check
  check (char_length(question) between 2 and 600);

alter table public.ai_chat_history drop constraint if exists ai_chat_history_answer_length_check;
alter table public.ai_chat_history
  add constraint ai_chat_history_answer_length_check
  check (char_length(answer) between 1 and 14000);

alter table public.ai_chat_history drop constraint if exists ai_chat_history_sources_array_check;
alter table public.ai_chat_history
  add constraint ai_chat_history_sources_array_check
  check (jsonb_typeof(sources) = 'array');

alter table public.ai_chat_history drop constraint if exists ai_chat_history_language_check;
alter table public.ai_chat_history
  add constraint ai_chat_history_language_check
  check (language in ('zh', 'en'));

create index if not exists ai_chat_history_user_created_idx
  on public.ai_chat_history(user_id, created_at desc);
create index if not exists ai_chat_history_conversation_created_idx
  on public.ai_chat_history(conversation_id, created_at asc);
create index if not exists ai_chat_history_created_idx
  on public.ai_chat_history(created_at desc);

create or replace function public.ensure_ai_history_conversation_owner()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.ai_conversations conversation
    where conversation.id = new.conversation_id
      and conversation.user_id = new.user_id
  ) then
    raise exception 'AI history must belong to the same user as its conversation.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_ai_history_conversation_owner on public.ai_chat_history;
create trigger ensure_ai_history_conversation_owner
  before insert or update on public.ai_chat_history
  for each row execute procedure public.ensure_ai_history_conversation_owner();

create or replace function public.touch_ai_conversation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.ai_conversations
  set updated_at = greatest(updated_at, new.created_at)
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists touch_ai_conversation on public.ai_chat_history;
create trigger touch_ai_conversation
  after insert on public.ai_chat_history
  for each row execute procedure public.touch_ai_conversation();

alter table public.ai_chat_history enable row level security;

revoke all on public.ai_chat_history from anon;
revoke update on public.ai_chat_history from authenticated;

drop policy if exists "Users can insert their own AI history" on public.ai_chat_history;
create policy "Users can insert their own AI history"
  on public.ai_chat_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can read their own AI history" on public.ai_chat_history;
create policy "Users can read their own AI history"
  on public.ai_chat_history for select
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own AI history" on public.ai_chat_history;
create policy "Users can delete their own AI history"
  on public.ai_chat_history for delete
  using (auth.uid() = user_id);

drop policy if exists "Admins can read AI history" on public.ai_chat_history;
create policy "Admins can read AI history"
  on public.ai_chat_history for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "Admins can delete AI history" on public.ai_chat_history;
create policy "Admins can delete AI history"
  on public.ai_chat_history for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

grant select, insert, delete on public.ai_chat_history to authenticated;
