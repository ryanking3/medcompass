-- MedCompass initial data model. Every student-owned row is scoped to a private
-- workspace; Row Level Security is enabled before any client access is granted.

create extension if not exists pgcrypto;

create type public.document_kind as enum ('textbook', 'lecture', 'note_import', 'other');
create type public.document_status as enum ('pending', 'processing', 'ready', 'failed');
create type public.flashcard_kind as enum ('basic', 'cloze');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My study workspace',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  institution text,
  programme text,
  academic_year text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  last_studied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_objectives (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  body text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  kind public.document_kind not null default 'other',
  status public.document_status not null default 'pending',
  title text not null,
  original_filename text not null,
  storage_path text not null unique,
  page_count integer check (page_count is null or page_count > 0),
  metadata jsonb not null default '{}'::jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_topics (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (document_id, topic_id)
);

create table public.document_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  extracted_text text,
  created_at timestamptz not null default now(),
  unique (document_id, page_number)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.note_citations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  page_start integer check (page_start is null or page_start > 0),
  page_end integer check (page_end is null or page_end >= page_start),
  excerpt text,
  created_at timestamptz not null default now()
);

create table public.flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
  kind public.flashcard_kind not null default 'basic',
  front text not null,
  back text not null,
  is_kept boolean not null default false,
  source_document_id uuid references public.documents(id) on delete set null,
  source_page_start integer check (source_page_start is null or source_page_start > 0),
  source_page_end integer check (source_page_end is null or source_page_end >= source_page_start),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_workspace_id_idx on public.courses(workspace_id);
create index modules_course_id_idx on public.modules(course_id);
create index topics_module_id_idx on public.topics(module_id);
create index documents_workspace_id_idx on public.documents(workspace_id);
create index notes_topic_id_idx on public.notes(topic_id);
create index flashcards_deck_id_idx on public.flashcards(deck_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.can_access_workspace(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspaces
    where id = target_workspace_id and owner_id = auth.uid()
  );
$$;

grant execute on function public.can_access_workspace(uuid) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'courses', 'modules', 'topics', 'learning_objectives', 'documents',
    'document_topics', 'document_pages', 'notes', 'note_citations',
    'flashcard_decks', 'flashcards'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy "workspace members manage %I" on public.%I for all to authenticated using (public.can_access_workspace(workspace_id)) with check (public.can_access_workspace(workspace_id))', table_name, table_name);
  end loop;
end;
$$;

alter table public.profiles enable row level security;
create policy "users manage own profile" on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

alter table public.workspaces enable row level security;
create policy "owners manage own workspaces" on public.workspaces
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('study-sources', 'study-sources', false, 104857600, array['application/pdf'])
on conflict (id) do nothing;

create policy "users upload private study sources" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'study-sources' and owner_id = auth.uid()::text);

create policy "users read private study sources" on storage.objects
  for select to authenticated
  using (bucket_id = 'study-sources' and owner_id = auth.uid()::text);

create policy "users update private study sources" on storage.objects
  for update to authenticated
  using (bucket_id = 'study-sources' and owner_id = auth.uid()::text)
  with check (bucket_id = 'study-sources' and owner_id = auth.uid()::text);

create policy "users delete private study sources" on storage.objects
  for delete to authenticated
  using (bucket_id = 'study-sources' and owner_id = auth.uid()::text);

create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger workspaces_set_updated_at before update on public.workspaces for each row execute procedure public.set_updated_at();
create trigger courses_set_updated_at before update on public.courses for each row execute procedure public.set_updated_at();
create trigger modules_set_updated_at before update on public.modules for each row execute procedure public.set_updated_at();
create trigger topics_set_updated_at before update on public.topics for each row execute procedure public.set_updated_at();
create trigger learning_objectives_set_updated_at before update on public.learning_objectives for each row execute procedure public.set_updated_at();
create trigger documents_set_updated_at before update on public.documents for each row execute procedure public.set_updated_at();
create trigger notes_set_updated_at before update on public.notes for each row execute procedure public.set_updated_at();
create trigger flashcard_decks_set_updated_at before update on public.flashcard_decks for each row execute procedure public.set_updated_at();
create trigger flashcards_set_updated_at before update on public.flashcards for each row execute procedure public.set_updated_at();
