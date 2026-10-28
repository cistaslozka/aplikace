-- Pokladní doklady: příjmový (PPD20260001) a výdajový (VPD20260001).
-- Zapisuje jen funkce ulozit_pokladni_doklad, storno jen stornovat_pokladni_doklad.

alter table public.number_series drop constraint number_series_kind;
alter table public.number_series add constraint number_series_kind
  check (kind in ('faktura', 'zalohova', 'ddpp', 'dobropis', 'ppd', 'vpd'));

create table public.cash_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('prijem', 'vydej')),
  number text not null,
  issue_date date not null,
  amount numeric(14, 2) not null check (amount > 0 and amount < 1000000000),
  purpose text not null check (char_length(purpose) between 1 and 300),
  partner jsonb not null check (jsonb_typeof(partner) = 'object' and pg_column_size(partner) < 4000
    and char_length(coalesce(partner ->> 'name', '')) between 1 and 200),
  supplier jsonb not null,
  vat_payer boolean not null default false,
  vat_rate int check (vat_rate in (0, 12, 21)),
  vat_base numeric(14, 2),
  vat_amount numeric(14, 2),
  invoice_id uuid references public.invoices (id) on delete set null,
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'platny' check (status in ('platny', 'stornovany')),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (organization_id, number)
);
create index cash_documents_org_date_idx on public.cash_documents (organization_id, issue_date desc);
create index cash_documents_invoice_idx on public.cash_documents (invoice_id);
create index cash_documents_created_by_idx on public.cash_documents (created_by);

alter table public.cash_documents enable row level security;
create policy "Clenove vidi pokladni doklady sve firmy" on public.cash_documents
  for select to authenticated using (private.je_clen(organization_id));
revoke insert, update, delete on public.cash_documents from anon, authenticated;
revoke select on public.cash_documents from anon;

create or replace function public.dalsi_cislo_dokladu(p_org uuid, p_rok int, p_druh text)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select case p_druh when 'zalohova' then 'ZF' when 'ddpp' then 'DD' when 'dobropis' then 'OD'
    when 'ppd' then 'PPD' when 'vpd' then 'VPD' else '' end
    || p_rok::text || lpad((coalesce(
    (select last_number from public.number_series where organization_id = p_org and kind = p_druh and year = p_rok), 0
  ) + 1)::text, 4, '0');
$$;

create or replace function public.ulozit_pokladni_doklad(p jsonb, p_dnes date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := (p ->> 'organization_id')::uuid;
  v_druh text := p ->> 'kind';
  v_datum date := (p ->> 'issue_date')::date;
  v_castka numeric := round((p ->> 'amount')::numeric, 2);
  v_sazba int := nullif(p ->> 'vat_rate', '')::int;
  v_faktura uuid := nullif(p ->> 'invoice_id', '')::uuid;
  v_f public.invoices;
  v_firma public.organizations;
  v_rada text;
  v_poradi int;
  v_rok int;
  v_zaklad numeric;
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Nepřihlášený uživatel' using errcode = '42501';
  end if;
  if v_org is null or not private.je_clen(v_org) then
    raise exception 'Nemáte přístup k této firmě' using errcode = '42501';
  end if;
  if v_druh not in ('prijem', 'vydej') then
    raise exception 'Neznámý druh dokladu' using errcode = '22023';
  end if;
  if p_dnes is null or abs(p_dnes - (now() at time zone 'Europe/Prague')::date) > 1 then
    raise exception 'Neplatné datum' using errcode = '22023';
  end if;
  if v_datum is null or v_datum > p_dnes or v_datum < p_dnes - 400 then
    raise exception 'Datum dokladu nesmí být v budoucnosti' using errcode = '22023';
  end if;
  if v_castka is null or v_castka <= 0 then
    raise exception 'Zadejte částku' using errcode = '22023';
  end if;

  select * into v_firma from public.organizations where id = v_org;
  if not coalesce(v_firma.vat_payer, false) then
    v_sazba := null;
  end if;

  -- Úhrada faktury v hotovosti: faktura se zároveň označí jako uhrazená
  if v_faktura is not null then
    select * into v_f from public.invoices where id = v_faktura and organization_id = v_org for update;
    if v_f.id is null then
      raise exception 'Faktura nenalezena' using errcode = 'P0002';
    end if;
    if v_druh <> 'prijem' or v_f.kind not in ('faktura', 'zalohova') or v_f.status <> 'vystavena' then
      raise exception 'Příjmový doklad lze spojit jen s neuhrazenou fakturou' using errcode = 'P0001';
    end if;
  end if;

  v_rada := case v_druh when 'prijem' then 'ppd' else 'vpd' end;
  v_rok := extract(year from v_datum)::int;
  insert into public.number_series (organization_id, kind, year, last_number)
  values (v_org, v_rada, v_rok, 1)
  on conflict (organization_id, kind, year) do update set last_number = public.number_series.last_number + 1
  returning last_number into v_poradi;

  -- DPH výpočtem shora z částky včetně daně
  v_zaklad := case when v_sazba is not null then round(v_castka * 100 / (100 + v_sazba), 2) end;

  insert into public.cash_documents (
    organization_id, kind, number, issue_date, amount, purpose, partner, supplier,
    vat_payer, vat_rate, vat_base, vat_amount, invoice_id, note
  ) values (
    v_org, v_druh, upper(v_rada) || v_rok::text || lpad(v_poradi::text, 4, '0'), v_datum, v_castka,
    trim(p ->> 'purpose'), p -> 'partner',
    jsonb_build_object(
      'name', v_firma.name, 'legal_form', v_firma.legal_form, 'ico', v_firma.ico, 'dic', v_firma.dic,
      'street', v_firma.street, 'city', v_firma.city, 'zip', v_firma.zip, 'country', v_firma.country,
      'registry_note', v_firma.registry_note
    ),
    coalesce(v_firma.vat_payer, false), v_sazba, v_zaklad, case when v_sazba is not null then v_castka - v_zaklad end,
    v_faktura, nullif(trim(p ->> 'note'), '')
  )
  returning id into v_id;

  if v_faktura is not null then
    update public.invoices set status = 'uhrazena', paid_at = v_datum, payment_method = 'hotove' where id = v_faktura;
  end if;
  return v_id;
end;
$$;
revoke all on function public.ulozit_pokladni_doklad(jsonb, date) from public, anon;
grant execute on function public.ulozit_pokladni_doklad(jsonb, date) to authenticated;

create or replace function public.stornovat_pokladni_doklad(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_d public.cash_documents;
begin
  if (select auth.uid()) is null then
    raise exception 'Nepřihlášený uživatel' using errcode = '42501';
  end if;
  select * into v_d from public.cash_documents where id = p_id for update;
  if v_d.id is null or not private.je_clen(v_d.organization_id) then
    raise exception 'Doklad nenalezen' using errcode = 'P0002';
  end if;
  if v_d.status = 'stornovany' then
    return;
  end if;
  update public.cash_documents set status = 'stornovany' where id = p_id;
  -- faktura zaplacená tímto dokladem se vrátí na neuhrazenou
  if v_d.invoice_id is not null then
    update public.invoices set status = 'vystavena', paid_at = null
      where id = v_d.invoice_id and status = 'uhrazena' and paid_at = v_d.issue_date;
  end if;
end;
$$;
revoke all on function public.stornovat_pokladni_doklad(uuid) from public, anon;
grant execute on function public.stornovat_pokladni_doklad(uuid) to authenticated;
