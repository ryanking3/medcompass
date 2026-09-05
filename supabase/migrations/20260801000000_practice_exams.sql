-- Practice exams generated from planner exams. Output is stored as structured
-- JSON so fake AI papers and future real AI papers share the same persistence
-- surface while the product shape is still moving quickly.

create table public.practice_exams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_exam_id uuid references public.study_exams(id) on delete set null,
  title text not null,
  format text not null check (format in ('mcq', 'written', 'mixed')),
  mode text not null default 'fake' check (mode in ('fake', 'openai')),
  question_count integer not null default 0 check (question_count >= 0),
  questions jsonb not null default '[]'::jsonb,
  standards jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index practice_exams_workspace_id_idx on public.practice_exams(workspace_id);
create index practice_exams_source_exam_id_idx on public.practice_exams(source_exam_id);
create index practice_exams_created_at_idx on public.practice_exams(created_at desc);

alter table public.practice_exams enable row level security;

create policy "workspace members manage practice_exams" on public.practice_exams
  for all to authenticated
  using (public.can_access_workspace(workspace_id))
  with check (public.can_access_workspace(workspace_id));

create trigger practice_exams_set_updated_at
  before update on public.practice_exams
  for each row execute procedure public.set_updated_at();
