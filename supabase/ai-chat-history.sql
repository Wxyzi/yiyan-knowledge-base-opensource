-- Add persistent multi-turn AI conversations to an existing project.
-- Run this file in the Supabase SQL Editor. It is safe to run again.

create extension if not exists pgcrypto;
grant usage on schema public to authenticated;

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

-- Preserve existing one-turn records by making each one its own conversation.
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
