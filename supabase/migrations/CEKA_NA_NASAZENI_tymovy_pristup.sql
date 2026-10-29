-- Týmový přístup: vlastník firmy pozve další lidi odkazem (bez e-mailu, odkaz pošle sám).
-- V databázi je jen otisk (sha256) tajného kódu z odkazu. Odkaz platí 7 dní a jde použít jednou.

create extension if not exists pgcrypto with schema extensions;

create or replace function private.je_vlastnik(org uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = (select auth.uid()) and m.role = 'owner'
  );
$$;
revoke all on function private.je_vlastnik(uuid) from public, anon;
grant execute on function private.je_vlastnik(uuid) to authenticated;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  token_hash text not null unique,
  label text check (label is null or char_length(label) <= 100),
  role text not null default 'member' check (role in ('member')),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz
);
create index invitations_org_idx on public.invitations (organization_id);
create index invitations_created_by_idx on public.invitations (created_by);
create index invitations_accepted_by_idx on public.invitations (accepted_by);

alter table public.invitations enable row level security;
create policy "Vlastnik vidi pozvanky sve firmy" on public.invitations
  for select to authenticated using (private.je_vlastnik(organization_id));
revoke insert, update, delete on public.invitations from anon, authenticated;
revoke select on public.invitations from anon;

-- Nejvýš 10 lidí ve firmě (členové + platné pozvánky)
create or replace function public.vytvorit_pozvanku(p_org uuid, p_label text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if (select auth.uid()) is null or not private.je_vlastnik(p_org) then
    raise exception 'Pozvat může jen vlastník firmy' using errcode = '42501';
  end if;
  if (select count(*) from public.memberships where organization_id = p_org)
     + (select count(*) from public.invitations where organization_id = p_org and accepted_at is null and revoked_at is null and expires_at > now()) >= 10 then
    raise exception 'Ve firmě může být nejvýš 10 lidí' using errcode = 'P0001';
  end if;
  insert into public.invitations (organization_id, token_hash, label)
  values (p_org, encode(extensions.digest(v_token, 'sha256'), 'hex'), nullif(trim(p_label), ''));
  return v_token;
end;
$$;
revoke all on function public.vytvorit_pozvanku(uuid, text) from public, anon;
grant execute on function public.vytvorit_pozvanku(uuid, text) to authenticated;

create or replace function public.zrusit_pozvanku(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.invitations set revoked_at = now()
    where id = p_id and accepted_at is null and revoked_at is null and private.je_vlastnik(organization_id);
  if not found then
    raise exception 'Pozvánka nenalezena' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.zrusit_pozvanku(uuid) from public, anon;
grant execute on function public.zrusit_pozvanku(uuid) to authenticated;

-- Náhled pozvánky pro stránku /pozvanka/<kód> (i nepřihlášený). Vrací jen název firmy a stav.
create or replace function public.nahled_pozvanky(p_token text)
returns table (firma text, stav text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name,
    case when i.accepted_at is not null then 'pouzita'
         when i.revoked_at is not null then 'zrusena'
         when i.expires_at <= now() then 'vyprsela'
         else 'platna' end
  from public.invitations i join public.organizations o on o.id = i.organization_id
  where i.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;
revoke all on function public.nahled_pozvanky(text) from public;
grant execute on function public.nahled_pozvanky(text) to anon, authenticated;

create or replace function public.prijmout_pozvanku(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_i public.invitations;
begin
  if v_uid is null then
    raise exception 'Nepřihlášený uživatel' using errcode = '42501';
  end if;
  select * into v_i from public.invitations
    where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex') for update;
  if v_i.id is null then
    raise exception 'Pozvánka nenalezena' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.memberships where organization_id = v_i.organization_id and user_id = v_uid) then
    return v_i.organization_id;
  end if;
  if v_i.accepted_at is not null or v_i.revoked_at is not null or v_i.expires_at <= now() then
    raise exception 'Pozvánka už neplatí. Požádejte o nový odkaz.' using errcode = 'P0001';
  end if;
  insert into public.memberships (organization_id, user_id, role) values (v_i.organization_id, v_uid, v_i.role);
  update public.invitations set accepted_by = v_uid, accepted_at = now() where id = v_i.id;
  return v_i.organization_id;
end;
$$;
revoke all on function public.prijmout_pozvanku(text) from public, anon;
grant execute on function public.prijmout_pozvanku(text) to authenticated;

-- Členové firmy s e-mailem (vidí jen členové té firmy)
create or replace function public.clenove_firmy(p_org uuid)
returns table (user_id uuid, email text, role text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, u.email::text, m.role, m.created_at
  from public.memberships m join auth.users u on u.id = m.user_id
  where m.organization_id = p_org and private.je_clen(p_org)
  order by m.role desc, m.created_at;
$$;
revoke all on function public.clenove_firmy(uuid) from public, anon;
grant execute on function public.clenove_firmy(uuid) to authenticated;

-- Vlastník odebere člena; člen může odejít sám. Vlastníka odebrat nejde.
create or replace function public.odebrat_clena(p_org uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not (private.je_vlastnik(p_org) or p_user = v_uid) then
    raise exception 'Odebrat člena může jen vlastník firmy' using errcode = '42501';
  end if;
  delete from public.memberships where organization_id = p_org and user_id = p_user and role <> 'owner';
  if not found then
    raise exception 'Vlastníka firmy nejde odebrat' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function public.odebrat_clena(uuid, uuid) from public, anon;
grant execute on function public.odebrat_clena(uuid, uuid) to authenticated;
