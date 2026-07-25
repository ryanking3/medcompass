-- Study planner: exams, weekly availability, and generated topic-linked study blocks.

create type public.study_block_status as enum ('planned', 'done', 'skipped');

create table public.study_exams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  exam_date date not null,
  target_minutes integer not null default 600 check (target_minutes between 30 and 60000),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_exam_topics (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  exam_id uuid not null references public.study_exams(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  weight integer not null default 1 check (weight between 1 and 5),
  confidence integer not null default 3 check (confidence between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (exam_id, topic_id)
);

create table public.study_availability_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  minutes_available integer not null check (minutes_available between 0 and 720),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, day_of_week)
);

create table public.study_plan_blocks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  exam_id uuid not null references public.study_exams(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  starts_on date not null,
  duration_minutes integer not null check (duration_minutes between 15 and 720),
  title text not null,
  status public.study_block_status not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index study_exams_workspace_id_idx on public.study_exams(workspace_id);
create index study_exams_exam_date_idx on public.study_exams(exam_date);
create index study_exam_topics_topic_id_idx on public.study_exam_topics(topic_id);
create index study_plan_blocks_exam_id_idx on public.study_plan_blocks(exam_id);
create index study_plan_blocks_starts_on_idx on public.study_plan_blocks(starts_on);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'study_exams', 'study_exam_topics', 'study_availability_rules', 'study_plan_blocks'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy "workspace members manage %I" on public.%I for all to authenticated using (public.can_access_workspace(workspace_id)) with check (public.can_access_workspace(workspace_id))', table_name, table_name);
  end loop;
end;
$$;

create trigger study_exams_set_updated_at before update on public.study_exams for each row execute procedure public.set_updated_at();
create trigger study_availability_rules_set_updated_at before update on public.study_availability_rules for each row execute procedure public.set_updated_at();
create trigger study_plan_blocks_set_updated_at before update on public.study_plan_blocks for each row execute procedure public.set_updated_at();
