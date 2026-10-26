-- Krok 2: firmy a jejich členové
-- Data v aplikaci patří firmě (organizations), ne uživateli. Kdo má k firmě přístup,
-- určuje tabulka memberships. Viz ZADANI.md → Datový model.

-- ---------------------------------------------------------------------------
-- Firmy
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_form text not null default 'osvc',
  ico text,
  dic text,
  vat_payer boolean not null default false,
  street text,
  city text,
  zip text,
  country text not null default 'CZ',
  registry_note text,          -- údaj o zápisu (živnostenský / obchodní rejstřík) pro doklady
  bank_account text,           -- český formát předčíslí-číslo/kód banky
  iban text,
  email text,
  phone text,
  web text,
  plan text not null default 'basic',
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organizations_name_len check (char_length(name) between 1 and 200),
  constraint organizations_legal_form check (legal_form in ('osvc', 'sro', 'jina')),
  constraint organizations_ico_format check (ico is null or ico ~ '^[0-9]{8}$'),
  constraint organizations_dic_format check (dic is null or dic ~ '^[A-Z]{2}[0-9A-Z]{2,12}$'),
  constraint organizations_zip_format check (zip is null or zip ~ '^[0-9]{3} ?[0-9]{2}$'),
  constraint organizations_bank_format check (bank_account is null or bank_account ~ '^([0-9]{1,6}-)?[0-9]{2,10}/[0-9]{4}$'),
  constraint organizations_iban_format check (iban is null or iban ~ '^[A-Z]{2}[0-9]{2}[0-9A-Z]{10,30}$'),
  constraint organizations_plan check (plan in ('basic', 'pro')),
  constraint organizations_text_len check (
    coalesce(char_length(street), 0) <= 200 and coalesce(char_length(city), 0) <= 100
    and coalesce(char_length(registry_note), 0) <= 300 and coalesce(char_length(email), 0) <= 254
    and coalesce(char_length(phone), 0) <= 30 and coalesce(char_length(web), 0) <= 200
  )
);

comment on table public.organizations is 'Firma nebo živnostník, pod kterým uživatel vystavuje doklady.';

-- ---------------------------------------------------------------------------
-- Členové firem
-- ---------------------------------------------------------------------------
create table public.memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  constraint memberships_role check (role in ('owner', 'member'))
);

create index memberships_user_idx on public.memberships (user_id);

comment on table public.memberships is 'Kdo má přístup k jaké firmě a s jakou rolí.';

-- ---------------------------------------------------------------------------
-- Pomocné funkce pro pravidla (security definer, aby se pravidla nezacyklila)
-- ---------------------------------------------------------------------------
create or replace function public.je_clen(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = (select auth.uid())
  );
$$;

revoke all on function public.je_clen(uuid) from public, anon;
grant execute on function public.je_clen(uuid) to authenticated;

-- Založení firmy: vytvoří firmu a zapíše zakladatele jako vlastníka, obojí najednou.
create or replace function public.zalozit_firmu(
  p_name text,
  p_legal_form text,
  p_ico text,
  p_dic text,
  p_vat_payer boolean,
  p_street text,
  p_city text,
  p_zip text,
  p_registry_note text,
  p_bank_account text,
  p_iban text,
  p_email text,
  p_phone text,
  p_web text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Nepřihlášený uživatel' using errcode = '42501';
  end if;

  -- Ochrana proti zahlcení: jeden uživatel může založit nejvýš 10 firem.
  if (select count(*) from public.organizations where created_by = v_uid) >= 10 then
    raise exception 'Příliš mnoho firem' using errcode = 'P0001';
  end if;

  insert into public.organizations (
    name, legal_form, ico, dic, vat_payer, street, city, zip, registry_note,
    bank_account, iban, email, phone, web, created_by
  ) values (
    p_name, p_legal_form, p_ico, p_dic, coalesce(p_vat_payer, false), p_street, p_city, p_zip, p_registry_note,
    p_bank_account, p_iban, p_email, p_phone, p_web, v_uid
  )
  returning id into v_id;

  insert into public.memberships (organization_id, user_id, role) values (v_id, v_uid, 'owner');

  return v_id;
end;
$$;

revoke all on function public.zalozit_firmu(text, text, text, text, boolean, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.zalozit_firmu(text, text, text, text, boolean, text, text, text, text, text, text, text, text, text) to authenticated;

-- Čas poslední úpravy
create or replace function public.nastav_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function public.nastav_updated_at();

-- ---------------------------------------------------------------------------
-- Pravidla přístupu (RLS)
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;

create policy "Clenove vidi svou firmu"
  on public.organizations for select
  to authenticated
  using (public.je_clen(id));

create policy "Clenove upravuji svou firmu"
  on public.organizations for update
  to authenticated
  using (public.je_clen(id))
  with check (public.je_clen(id));

create policy "Uzivatel vidi clenstvi ve svych firmach"
  on public.memberships for select
  to authenticated
  using (user_id = (select auth.uid()) or public.je_clen(organization_id));

-- Firmy se zakládají jen funkcí zalozit_firmu. Mazání zatím není.
-- Tarif, zkušební dobu a zakladatele uživatel sám měnit nesmí.
revoke insert, update, delete on public.organizations from anon, authenticated;
grant update (
  name, legal_form, ico, dic, vat_payer, street, city, zip, registry_note,
  bank_account, iban, email, phone, web
) on public.organizations to authenticated;

revoke insert, update, delete on public.memberships from anon, authenticated;
revoke select on public.organizations, public.memberships from anon;
