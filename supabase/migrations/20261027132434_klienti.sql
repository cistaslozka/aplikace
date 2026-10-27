-- Krok 3: adresář klientů + limit dotazů do ARES

-- ---------------------------------------------------------------------------
-- Klienti (odběratelé) – patří firmě
-- ---------------------------------------------------------------------------
create extension if not exists unaccent with schema extensions;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  ico text,
  dic text,
  vat_payer boolean,
  street text,
  city text,
  zip text,
  country text not null default 'CZ',
  email text,
  phone text,
  note text,
  from_ares boolean not null default false,
  ares_checked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clients_name_len check (char_length(name) between 1 and 200),
  constraint clients_ico_format check (ico is null or ico ~ '^[0-9]{8}$'),
  constraint clients_dic_format check (dic is null or dic ~ '^[A-Z]{2}[0-9A-Z]{2,12}$'),
  constraint clients_zip_format check (zip is null or zip ~ '^[0-9]{3} ?[0-9]{2}$'),
  constraint clients_country check (country ~ '^[A-Z]{2}$'),
  constraint clients_text_len check (
    coalesce(char_length(street), 0) <= 200 and coalesce(char_length(city), 0) <= 100
    and coalesce(char_length(email), 0) <= 254 and coalesce(char_length(phone), 0) <= 30
    and coalesce(char_length(note), 0) <= 1000
  )
);

comment on table public.clients is 'Adresář odběratelů firmy. Klient načtený jednou z ARES se příště bere odsud.';

-- Jedno IČO jen jednou v adresáři firmy
create unique index clients_org_ico_unique on public.clients (organization_id, ico) where ico is not null;
create index clients_org_idx on public.clients (organization_id, last_used_at desc nulls last);

create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.nastav_updated_at();

alter table public.clients enable row level security;

create policy "Clenove vidi klienty sve firmy" on public.clients
  for select to authenticated using (private.je_clen(organization_id));
create policy "Clenove pridavaji klienty sve firmy" on public.clients
  for insert to authenticated with check (private.je_clen(organization_id));
create policy "Clenove upravuji klienty sve firmy" on public.clients
  for update to authenticated using (private.je_clen(organization_id)) with check (private.je_clen(organization_id));
create policy "Clenove mazou klienty sve firmy" on public.clients
  for delete to authenticated using (private.je_clen(organization_id));

revoke all on public.clients from anon;

-- Hledání podle jména nebo IČO, bez ohledu na háčky a velikost písmen
-- („novak" najde „Novák"). Běží s právy volajícího, takže platí RLS.
create or replace function public.hledat_klienty(p_org uuid, p_dotaz text, p_pocet int default 8)
returns setof public.clients
language sql
stable
security invoker
set search_path = ''
as $$
  select c.*
  from public.clients c
  where c.organization_id = p_org
    and (
      coalesce(trim(p_dotaz), '') = ''
      or extensions.unaccent(lower(c.name)) like '%' || extensions.unaccent(lower(trim(p_dotaz))) || '%'
      or c.ico like replace(trim(p_dotaz), ' ', '') || '%'
    )
  order by c.last_used_at desc nulls last, c.name
  limit least(greatest(p_pocet, 1), 50);
$$;

revoke all on function public.hledat_klienty(uuid, text, int) from public, anon;
grant execute on function public.hledat_klienty(uuid, text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Limit dotazů do ARES
-- ARES může zablokovat toho, kdo pošle víc než 500 dotazů za minutu.
-- Všechny dotazy jdou z našeho serveru, proto hlídáme:
--   - nejvýš 20 dotazů za minutu na uživatele
--   - nejvýš 250 dotazů za minutu za celou aplikaci (polovina limitu ARES)
-- ---------------------------------------------------------------------------
create table private.ares_dotazy (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);
create index ares_dotazy_cas_idx on private.ares_dotazy (created_at);
create index ares_dotazy_uzivatel_idx on private.ares_dotazy (user_id, created_at);
alter table private.ares_dotazy enable row level security;
revoke all on private.ares_dotazy from public, anon, authenticated;

-- Vrací 'ok' (dotaz zapsán, smí se poslat), 'uzivatel' (překročen limit uživatele)
-- nebo 'celkem' (překročen limit aplikace).
create or replace function public.ares_smim_se_zeptat()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Nepřihlášený uživatel' using errcode = '42501';
  end if;

  -- úklid starých záznamů
  delete from private.ares_dotazy where created_at < now() - interval '5 minutes';

  if (select count(*) from private.ares_dotazy
      where user_id = v_uid and created_at > now() - interval '1 minute') >= 20 then
    return 'uzivatel';
  end if;

  if (select count(*) from private.ares_dotazy
      where created_at > now() - interval '1 minute') >= 250 then
    return 'celkem';
  end if;

  insert into private.ares_dotazy (user_id) values (v_uid);
  return 'ok';
end;
$$;

revoke all on function public.ares_smim_se_zeptat() from public, anon;
grant execute on function public.ares_smim_se_zeptat() to authenticated;
