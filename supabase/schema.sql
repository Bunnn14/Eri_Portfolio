-- Erien Arcade content and image storage.
-- Create the CMS user in Supabase Authentication before running this script,
-- then replace the email below with that user's email address.

create table if not exists public.site_content (
  id text primary key default 'main' check (id = 'main'),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

insert into public.cms_admins (user_id)
select id
from auth.users
where lower(email) = lower('eriamamiya@gmail.com')
on conflict (user_id) do nothing;

create or replace function public.set_site_content_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_site_content_updated_at on public.site_content;
create trigger set_site_content_updated_at
  before update on public.site_content
  for each row
  execute function public.set_site_content_updated_at();

create or replace function public.is_cms_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.cms_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_cms_admin() from public;
grant execute on function public.is_cms_admin() to authenticated;

alter table public.site_content enable row level security;
alter table public.cms_admins enable row level security;

grant select on public.site_content to anon, authenticated;
grant insert, update on public.site_content to authenticated;

drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content"
  on public.site_content for select
  to anon, authenticated
  using (true);

drop policy if exists "CMS admins can insert site content" on public.site_content;
create policy "CMS admins can insert site content"
  on public.site_content for insert
  to authenticated
  with check (public.is_cms_admin());

drop policy if exists "CMS admins can update site content" on public.site_content;
create policy "CMS admins can update site content"
  on public.site_content for update
  to authenticated
  using (public.is_cms_admin())
  with check (public.is_cms_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-images',
  'site-images',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "CMS admins can list site images" on storage.objects;
create policy "CMS admins can list site images"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'site-images' and public.is_cms_admin());

drop policy if exists "CMS admins can upload site images" on storage.objects;
create policy "CMS admins can upload site images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-images' and public.is_cms_admin());
