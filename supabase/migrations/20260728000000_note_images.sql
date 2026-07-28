-- Note images: private pasted/uploaded media attached to study notes.

create table public.note_images (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  storage_path text not null unique,
  original_filename text,
  mime_type text not null,
  file_size integer not null check (file_size > 0),
  created_at timestamptz not null default now()
);

create index note_images_note_id_idx on public.note_images(note_id);

alter table public.note_images enable row level security;
create policy "workspace members manage note_images" on public.note_images
  for all to authenticated using (public.can_access_workspace(workspace_id)) with check (public.can_access_workspace(workspace_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-note-images',
  'study-note-images',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "users upload private note images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'study-note-images' and owner_id = auth.uid()::text);

create policy "users read private note images" on storage.objects
  for select to authenticated
  using (bucket_id = 'study-note-images' and owner_id = auth.uid()::text);

create policy "users update private note images" on storage.objects
  for update to authenticated
  using (bucket_id = 'study-note-images' and owner_id = auth.uid()::text)
  with check (bucket_id = 'study-note-images' and owner_id = auth.uid()::text);

create policy "users delete private note images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'study-note-images' and owner_id = auth.uid()::text);
