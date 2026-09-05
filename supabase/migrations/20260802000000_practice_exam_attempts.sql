-- Completed practice exam attempts. These are intentionally simple for now:
-- store the student's answers and summary counts so later scoring/AI feedback
-- can build on real attempt history.

create table if not exists public.practice_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  practice_exam_id uuid not null references public.practice_exams(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  answered_count integer not null default 0 check (answered_count >= 0),
  question_count integer not null default 0 check (question_count >= 0),
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists practice_exam_attempts_workspace_id_idx on public.practice_exam_attempts(workspace_id);
create index if not exists practice_exam_attempts_practice_exam_id_idx on public.practice_exam_attempts(practice_exam_id);
create index if not exists practice_exam_attempts_completed_at_idx on public.practice_exam_attempts(completed_at desc);

alter table public.practice_exam_attempts enable row level security;

drop policy if exists "workspace members manage practice_exam_attempts" on public.practice_exam_attempts;

create policy "workspace members manage practice_exam_attempts" on public.practice_exam_attempts
  for all to authenticated
  using (public.can_access_workspace(workspace_id))
  with check (public.can_access_workspace(workspace_id));
