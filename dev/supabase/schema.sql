-- Larry Fried Chicken — schéma larryfc (contenu du site + admins + historique). Idempotent. Modèle : Larry Fried Chicken.
create schema if not exists larryfc;
grant usage on schema larryfc to anon, authenticated;
create table if not exists larryfc.admins (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create table if not exists larryfc.site_content (id int primary key default 1 check (id = 1), data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), updated_by uuid);
create table if not exists larryfc.site_content_history (id bigint generated always as identity primary key, saved_at timestamptz not null default now(), saved_by uuid, data jsonb not null);
create or replace function larryfc.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from larryfc.admins a where a.user_id = auth.uid()) or coalesce(public.is_owner(), false);
$$;
create or replace function larryfc.site_content_before_update() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.data is distinct from old.data then
    insert into larryfc.site_content_history (saved_by, data) values (old.updated_by, old.data);
    delete from larryfc.site_content_history where id not in (select id from larryfc.site_content_history order by id desc limit 50);
  end if;
  new.updated_at := now(); new.updated_by := auth.uid(); new.id := old.id; return new;
end; $$;
drop trigger if exists trg_site_content_before_update on larryfc.site_content;
create trigger trg_site_content_before_update before update on larryfc.site_content for each row execute function larryfc.site_content_before_update();
alter table larryfc.admins enable row level security;
alter table larryfc.site_content enable row level security;
alter table larryfc.site_content_history enable row level security;
drop policy if exists "admins: soi-même" on larryfc.admins;
create policy "admins: soi-même" on larryfc.admins for select to authenticated using (user_id = auth.uid() or larryfc.is_admin());
drop policy if exists "contenu: lecture publique" on larryfc.site_content;
create policy "contenu: lecture publique" on larryfc.site_content for select to anon, authenticated using (true);
drop policy if exists "contenu: modif admin" on larryfc.site_content;
create policy "contenu: modif admin" on larryfc.site_content for update to authenticated using (larryfc.is_admin()) with check (larryfc.is_admin());
drop policy if exists "historique: lecture admin" on larryfc.site_content_history;
create policy "historique: lecture admin" on larryfc.site_content_history for select to authenticated using (larryfc.is_admin());
revoke all on all tables in schema larryfc from anon, authenticated;
grant select on larryfc.site_content to anon, authenticated;
grant update (data) on larryfc.site_content to authenticated;
grant select on larryfc.site_content_history, larryfc.admins to authenticated;
grant execute on function larryfc.is_admin() to anon, authenticated;
drop policy if exists "images : ajout admin larryfc" on storage.objects;
create policy "images : ajout admin larryfc" on storage.objects for insert to authenticated with check (bucket_id = 'images' and larryfc.is_admin() and name ~ '^up-larryfc_[a-z0-9]+-[0-9]+\.(webp|jpg|png)$');
insert into larryfc.site_content (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;
