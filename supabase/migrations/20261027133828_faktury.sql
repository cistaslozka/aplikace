-- Krok 4a: faktury, položky a číselné řady
--
-- Výpočet částek dělá databáze (funkce ulozit_fakturu), aby byl vždy stejný:
--   základ položky = round(množství × cena za jednotku, 2)
--   rekapitulace DPH po sazbách: daň = round(součet základů v sazbě × sazba / 100, 2)
--   celkem = součet základů + součet daní
-- Údaje dodavatele se při uložení zkopírují z firmy (snímek), aby se stará faktura
-- nezměnila, když firma později změní adresu nebo účet.

-- ---------------------------------------------------------------------------
-- Číselné řady (faktury 2026xxxx)
-- ---------------------------------------------------------------------------
create table public.number_series (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null,
  year int not null,
  last_number int not null default 0,
  primary key (organization_id, kind, year),
  constraint number_series_kind check (kind in ('faktura')),
  constraint number_series_year check (year between 2000 and 2100),
  constraint number_series_last check (last_number between 0 and 9999)
);

alter table public.number_series enable row level security;
create policy "Clenove vidi ciselne rady" on public.number_series
  for select to authenticated using (private.je_clen(organization_id));
-- Zápis jen přes funkci ulozit_fakturu (security definer část níže).
revoke insert, update, delete on public.number_series from anon, authenticated;
revoke all on public.number_series from anon;

-- ---------------------------------------------------------------------------
-- Faktury
-- ---------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  number text not null,
  variable_symbol text not null,
  client_id uuid references public.clients (id) on delete set null,
  supplier jsonb not null,           -- snímek firmy v okamžiku vystavení
  customer jsonb not null,           -- odběratel: name, ico, dic, street, city, zip, country, email
  issue_date date not null,
  taxable_date date,                 -- DUZP (jen plátce DPH)
  due_date date not null,
  payment_method text not null default 'prevod',
  currency text not null default 'CZK',
  vat_payer boolean not null,        -- byl dodavatel při vystavení plátce DPH?
  template text not null default 'minimal',
  note text,
  status text not null default 'vystavena',
  paid_at date,
  subtotal numeric(14, 2) not null default 0,
  vat_total numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  vat_recap jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint invoices_number_unique unique (organization_id, number),
  constraint invoices_vs check (variable_symbol ~ '^[0-9]{1,10}$'),
  constraint invoices_dates check (due_date >= issue_date),
  constraint invoices_payment check (payment_method in ('prevod', 'hotove', 'karta', 'dobirka')),
  constraint invoices_currency check (currency in ('CZK')),
  constraint invoices_template check (template in ('minimal', 'corporate', 'creative')),
  constraint invoices_status check (status in ('vystavena', 'uhrazena', 'stornovana')),
  constraint invoices_paid check ((status = 'uhrazena') = (paid_at is not null)),
  constraint invoices_note_len check (coalesce(char_length(note), 0) <= 1000),
  constraint invoices_customer check (
    jsonb_typeof(customer) = 'object'
    and char_length(coalesce(customer ->> 'name', '')) between 1 and 200
    and pg_column_size(customer) < 4000
  )
);

create index invoices_org_idx on public.invoices (organization_id, issue_date desc);
create index invoices_client_idx on public.invoices (client_id);

create trigger invoices_updated_at
  before update on public.invoices
  for each row execute function public.nastav_updated_at();

comment on table public.invoices is 'Vystavené faktury. Nemažou se, ruší se stornem (číselná řada musí zůstat souvislá).';

-- ---------------------------------------------------------------------------
-- Položky faktur
-- ---------------------------------------------------------------------------
create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  position int not null,
  description text not null,
  quantity numeric(14, 3) not null,
  unit text,
  unit_price numeric(14, 2) not null,  -- u plátce bez DPH
  vat_rate int not null default 0,
  base numeric(14, 2) not null,        -- množství × cena, zaokrouhleno na haléře

  constraint invoice_items_desc check (char_length(description) between 1 and 500),
  constraint invoice_items_unit check (coalesce(char_length(unit), 0) <= 20),
  constraint invoice_items_vat check (vat_rate in (0, 12, 21)),
  constraint invoice_items_qty check (quantity <> 0 and abs(quantity) < 100000000),
  constraint invoice_items_price check (abs(unit_price) < 1000000000)
);

create index invoice_items_invoice_idx on public.invoice_items (invoice_id, position);

-- ---------------------------------------------------------------------------
-- Pravidla přístupu
-- ---------------------------------------------------------------------------
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

create policy "Clenove vidi faktury sve firmy" on public.invoices
  for select to authenticated using (private.je_clen(organization_id));
create policy "Clenove meni stav faktur sve firmy" on public.invoices
  for update to authenticated using (private.je_clen(organization_id)) with check (private.je_clen(organization_id));

create policy "Clenove vidi polozky faktur sve firmy" on public.invoice_items
  for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and private.je_clen(i.organization_id)));

-- Faktury a položky se zakládají a upravují jen funkcí ulozit_fakturu.
-- Přímo smí uživatel měnit jen stav (uhrazeno / storno).
revoke insert, update, delete on public.invoices from anon, authenticated;
grant update (status, paid_at) on public.invoices to authenticated;
revoke insert, update, delete on public.invoice_items from anon, authenticated;
revoke all on public.invoices, public.invoice_items from anon;

-- ---------------------------------------------------------------------------
-- Uložení faktury (nová i úprava) v jedné transakci
-- ---------------------------------------------------------------------------
create or replace function public.ulozit_fakturu(p_faktura jsonb, p_polozky jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid := (p_faktura ->> 'organization_id')::uuid;
  v_id uuid := nullif(p_faktura ->> 'id', '')::uuid;
  v_firma public.organizations;
  v_issue date := (p_faktura ->> 'issue_date')::date;
  v_rok int;
  v_poradi int;
  v_cislo text;
  v_client uuid := nullif(p_faktura ->> 'client_id', '')::uuid;
  v_polozka jsonb;
  v_pozice int := 0;
  v_qty numeric;
  v_cena numeric;
  v_sazba int;
  v_stav text;
  v_platce boolean;
begin
  if v_uid is null then
    raise exception 'Nepřihlášený uživatel' using errcode = '42501';
  end if;
  if v_org is null or not private.je_clen(v_org) then
    raise exception 'Nemáte přístup k této firmě' using errcode = '42501';
  end if;
  if jsonb_typeof(p_polozky) <> 'array' or jsonb_array_length(p_polozky) = 0 then
    raise exception 'Faktura musí mít aspoň jednu položku' using errcode = '22023';
  end if;
  if jsonb_array_length(p_polozky) > 200 then
    raise exception 'Příliš mnoho položek' using errcode = '22023';
  end if;
  if v_client is not null and not exists (select 1 from public.clients where id = v_client and organization_id = v_org) then
    raise exception 'Klient nepatří k této firmě' using errcode = '42501';
  end if;

  select * into v_firma from public.organizations where id = v_org;

  if v_id is null then
    -- Nová faktura: přidělit další číslo v řadě daného roku
    v_rok := extract(year from v_issue)::int;
    insert into public.number_series (organization_id, kind, year, last_number)
    values (v_org, 'faktura', v_rok, 1)
    on conflict (organization_id, kind, year) do update set last_number = public.number_series.last_number + 1
    returning last_number into v_poradi;
    v_cislo := v_rok::text || lpad(v_poradi::text, 4, '0');
    v_platce := coalesce(v_firma.vat_payer, false);

    insert into public.invoices (
      organization_id, number, variable_symbol, client_id, supplier, customer,
      issue_date, taxable_date, due_date, payment_method, vat_payer, template, note
    ) values (
      v_org, v_cislo, v_cislo, v_client,
      jsonb_build_object(
        'name', v_firma.name, 'legal_form', v_firma.legal_form, 'ico', v_firma.ico, 'dic', v_firma.dic,
        'street', v_firma.street, 'city', v_firma.city, 'zip', v_firma.zip, 'country', v_firma.country,
        'registry_note', v_firma.registry_note, 'bank_account', v_firma.bank_account, 'iban', v_firma.iban,
        'email', v_firma.email, 'phone', v_firma.phone, 'web', v_firma.web
      ),
      p_faktura -> 'customer',
      v_issue,
      case when v_firma.vat_payer then coalesce((p_faktura ->> 'taxable_date')::date, v_issue) end,
      (p_faktura ->> 'due_date')::date,
      coalesce(p_faktura ->> 'payment_method', 'prevod'),
      v_firma.vat_payer,
      coalesce(p_faktura ->> 'template', 'minimal'),
      nullif(p_faktura ->> 'note', '')
    )
    returning id into v_id;
  else
    -- Úprava: číslo, dodavatel a plátcovství zůstávají, stornovanou fakturu upravit nejde
    select status, vat_payer into v_stav, v_platce from public.invoices where id = v_id and organization_id = v_org;
    if v_stav is null then
      raise exception 'Faktura nenalezena' using errcode = 'P0002';
    end if;
    if v_stav = 'stornovana' then
      raise exception 'Stornovanou fakturu nelze upravit' using errcode = '22023';
    end if;
    update public.invoices set
      client_id = v_client,
      customer = p_faktura -> 'customer',
      issue_date = v_issue,
      taxable_date = case when vat_payer then coalesce((p_faktura ->> 'taxable_date')::date, v_issue) end,
      due_date = (p_faktura ->> 'due_date')::date,
      payment_method = coalesce(p_faktura ->> 'payment_method', 'prevod'),
      template = coalesce(p_faktura ->> 'template', 'minimal'),
      note = nullif(p_faktura ->> 'note', '')
    where id = v_id;
    delete from public.invoice_items where invoice_id = v_id;
  end if;

  -- Položky
  for v_polozka in select * from jsonb_array_elements(p_polozky) loop
    v_pozice := v_pozice + 1;
    v_qty := (v_polozka ->> 'quantity')::numeric;
    v_cena := (v_polozka ->> 'unit_price')::numeric;
    v_sazba := case when v_platce then coalesce((v_polozka ->> 'vat_rate')::int, 21) else 0 end;
    insert into public.invoice_items (invoice_id, position, description, quantity, unit, unit_price, vat_rate, base)
    values (
      v_id, v_pozice, trim(v_polozka ->> 'description'), round(v_qty, 3), nullif(trim(v_polozka ->> 'unit'), ''),
      round(v_cena, 2), v_sazba, round(round(v_qty, 3) * round(v_cena, 2), 2)
    );
  end loop;

  -- Rekapitulace DPH a součty
  with r as (
    select vat_rate, sum(base) as zaklad, round(sum(base) * vat_rate / 100.0, 2) as dan
    from public.invoice_items where invoice_id = v_id group by vat_rate
  )
  update public.invoices set
    vat_recap = coalesce((select jsonb_agg(jsonb_build_object('rate', vat_rate, 'base', zaklad, 'vat', dan) order by vat_rate desc) from r), '[]'::jsonb),
    subtotal = coalesce((select sum(zaklad) from r), 0),
    vat_total = coalesce((select sum(dan) from r), 0),
    total = coalesce((select sum(zaklad) + sum(dan) from r), 0)
  where id = v_id;

  if v_client is not null then
    update public.clients set last_used_at = now() where id = v_client;
  end if;

  return v_id;
end;
$$;

revoke all on function public.ulozit_fakturu(jsonb, jsonb) from public, anon;
grant execute on function public.ulozit_fakturu(jsonb, jsonb) to authenticated;

-- Náhled dalšího čísla (nic nerezervuje)
create or replace function public.dalsi_cislo_faktury(p_org uuid, p_rok int)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select p_rok::text || lpad((coalesce(
    (select last_number from public.number_series where organization_id = p_org and kind = 'faktura' and year = p_rok), 0
  ) + 1)::text, 4, '0');
$$;

revoke all on function public.dalsi_cislo_faktury(uuid, int) from public, anon;
grant execute on function public.dalsi_cislo_faktury(uuid, int) to authenticated;
