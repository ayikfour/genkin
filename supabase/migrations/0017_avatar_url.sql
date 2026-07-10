-- Profile avatars: space_members.avatar_url (nullable — null means
-- "render the default boring-avatars identicon, derived client-side
-- from user_id"), plus a public-read Storage bucket for uploaded
-- photos with owner-scoped write access.
--
-- Bucket is public-read (not signed-URL) deliberately: avatar photos
-- are low-sensitivity, and public-read avoids signed-URL refresh
-- machinery. Flip later if this tradeoff doesn't sit right (make
-- bucket private + switch reads to createSignedUrl()) without
-- touching this schema.
--
-- Run manually in Supabase Dashboard → SQL Editor, on BOTH projects:
--   1. genkin-dev (nvoevzkqaczhvttfdvqh) — test here first
--   2. genkin     (production) — only after verifying dev works

alter table space_members add column avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Path convention: avatars/{user_id}/avatar.jpg — first path segment
-- is the owner, checked against auth.uid() for every write.
create policy "avatar files are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
