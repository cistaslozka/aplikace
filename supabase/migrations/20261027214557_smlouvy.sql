-- Smlouvy. Obsah vzoru (předmět, cena, termíny…) je ve `fields`, text smlouvy skládá aplikace podle druhu.
alter table public.number_series drop constraint number_series_kind;
alter table public.number_series add constraint number_series_kind check (kind in ('faktura', 'zalohova', 'ddpp', 'smlouva'));

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('dilo', 'sluzby', 'licence', 'nda', 'predavaci', 'cestovni')),
  number text not null,
  client_id uuid references public.clients (id) on delete set null,
  -- naše firma v roli zhotovitele / poskytovatele (true), nebo objednatele (false)
  we_supply boolean not null default true,
  supplier jsonb not null,
  customer jsonb not null,
  title text not null check (length(title) between 1 and 200),
  fields jsonb not null default '{}'::jsonb check (jsonb_typeof(fields) = 'object'),
  place text check (length(place) <= 100),
  signed_on date,
  valid_until date,
  template text not null default 'minimal' check (template in ('minimal', 'corporate', 'creative')),
  status text not null default 'koncept' check (status in ('koncept', 'uzavrena', 'ukoncena')),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contracts_number_unique unique (organization_id, number)
);
create index contracts_org_idx on public.contracts (organization_id, created_at desc);
create index contracts_client_idx on public.contracts (client_id);
create index contracts_created_by_idx on public.contracts (created_by);

alter table public.contracts enable row level security;
create policy "Clenove vidi smlouvy sve firmy" on public.contracts
  for select to authenticated using (private.je_clen(organization_id));
create policy "Clenove meni stav smluv sve firmy" on public.contracts
  for update to authenticated using (private.je_clen(organization_id)) with check (private.je_clen(organization_id));
revoke insert, update, delete on public.contracts from anon, authenticated;
grant update (status) on public.contracts to authenticated;
revoke select on public.contracts from anon;

-- Uložení smlouvy: nová dostane číslo S20260001, úprava zachová číslo. Uzavřenou smlouvu nejde upravit.
create or replace function public.ulozit_smlouvu(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := (p ->> 'organization_id')::uuid;
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_client uuid := nullif(p ->> 'client_id', '')::uuid;
  v_firma public.organizations;
  v_rok int;
  v_poradi int;
  v_stav text;
begin
  if (select auth.uid()) is null then
    raise exception 'Nepřihlášený uživatel' using errcode = '42501';
  end if;
  if v_org is null or not private.je_clen(v_org) then
    raise exception 'Nemáte přístup k této firmě' using errcode = '42501';
  end if;
  if v_client is not null and not exists (select 1 from public.clients where id = v_client and organization_id = v_org) then
    raise exception 'Klient nepatří k této firmě' using errcode = '42501';
  end if;
  if coalesce(p -> 'customer' ->> 'name', '') = '' then
    raise exception 'Vyberte druhou smluvní stranu' using errcode = '22023';
  end if;
  select * into v_firma from public.organizations where id = v_org;

  if v_id is null then
    v_rok := extract(year from (now() at time zone 'Europe/Prague'))::int;
    insert into public.number_series (organization_id, kind, year, last_number)
    values (v_org, 'smlouva', v_rok, 1)
    on conflict (organization_id, kind, year) do update set last_number = public.number_series.last_number + 1
    returning last_number into v_poradi;

    insert into public.contracts (organization_id, kind, number, client_id, we_supply, supplier, customer, title, fields,
                                  place, signed_on, valid_until, template)
    values (
      v_org, p ->> 'kind', 'S' || v_rok::text || lpad(v_poradi::text, 4, '0'), v_client,
      coalesce((p ->> 'we_supply')::boolean, true),
      jsonb_build_object(
        'name', v_firma.name, 'legal_form', v_firma.legal_form, 'ico', v_firma.ico, 'dic', v_firma.dic,
        'street', v_firma.street, 'city', v_firma.city, 'zip', v_firma.zip, 'country', v_firma.country,
        'registry_note', v_firma.registry_note, 'bank_account', v_firma.bank_account, 'iban', v_firma.iban,
        'email', v_firma.email, 'phone', v_firma.phone, 'web', v_firma.web, 'vat_payer', v_firma.vat_payer
      ),
      p -> 'customer', trim(p ->> 'title'), coalesce(p -> 'fields', '{}'::jsonb),
      nullif(trim(p ->> 'place'), ''), nullif(p ->> 'signed_on', '')::date, nullif(p ->> 'valid_until', '')::date,
      coalesce(p ->> 'template', 'minimal')
    )
    returning id into v_id;
  else
    select status into v_stav from public.contracts where id = v_id and organization_id = v_org;
    if v_stav is null then
      raise exception 'Smlouva nenalezena' using errcode = 'P0002';
    end if;
    if v_stav <> 'koncept' then
      raise exception 'Uzavřenou smlouvu nelze upravit. Případné změny řešte dodatkem.' using errcode = 'P0001';
    end if;
    update public.contracts set
      client_id = v_client,
      we_supply = coalesce((p ->> 'we_supply')::boolean, we_supply),
      customer = p -> 'customer',
      title = trim(p ->> 'title'),
      fields = coalesce(p -> 'fields', '{}'::jsonb),
      place = nullif(trim(p ->> 'place'), ''),
      signed_on = nullif(p ->> 'signed_on', '')::date,
      valid_until = nullif(p ->> 'valid_until', '')::date,
      template = coalesce(p ->> 'template', template),
      updated_at = now()
    where id = v_id;
  end if;

  if v_client is not null then
    update public.clients set last_used_at = now() where id = v_client;
  end if;
  return v_id;
end;
$$;
revoke all on function public.ulozit_smlouvu(jsonb) from public, anon;
grant execute on function public.ulozit_smlouvu(jsonb) to authenticated;
