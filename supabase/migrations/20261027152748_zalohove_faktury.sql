-- Zálohové faktury (nedaňový doklad). Daňový doklad k přijaté platbě (ddpp) přibude v dalším kroku.

alter table public.number_series drop constraint number_series_kind;
alter table public.number_series add constraint number_series_kind check (kind in ('faktura', 'zalohova', 'ddpp'));

alter table public.invoices
  add column kind text not null default 'faktura' check (kind in ('faktura', 'zalohova', 'ddpp')),
  -- vazba: daňový doklad / konečná faktura → zálohová faktura
  add column related_invoice_id uuid references public.invoices (id) on delete restrict;
create index invoices_related_idx on public.invoices (related_invoice_id);
create index invoices_org_kind_idx on public.invoices (organization_id, kind);

-- Náhled dalšího čísla podle druhu dokladu (nic nerezervuje)
create or replace function public.dalsi_cislo_dokladu(p_org uuid, p_rok int, p_druh text)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select case when p_druh = 'zalohova' then 'ZF' when p_druh = 'ddpp' then 'DD' else '' end
    || p_rok::text || lpad((coalesce(
    (select last_number from public.number_series where organization_id = p_org and kind = p_druh and year = p_rok), 0
  ) + 1)::text, 4, '0');
$$;
revoke all on function public.dalsi_cislo_dokladu(uuid, int, text) from public, anon;
grant execute on function public.dalsi_cislo_dokladu(uuid, int, text) to authenticated;

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
  v_logo_pozice text := nullif(p_faktura ->> 'logo_position', '');
  v_druh text := coalesce(nullif(p_faktura ->> 'kind', ''), 'faktura');
  v_vs text;
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
  if v_druh not in ('faktura', 'zalohova') then
    raise exception 'Neznámý druh dokladu' using errcode = '22023';
  end if;

  if v_id is null then
    -- Nová faktura: přidělit další číslo v řadě daného roku
    v_rok := extract(year from v_issue)::int;
    insert into public.number_series (organization_id, kind, year, last_number)
    values (v_org, v_druh, v_rok, 1)
    on conflict (organization_id, kind, year) do update set last_number = public.number_series.last_number + 1
    returning last_number into v_poradi;
    -- Faktura 20260001 (VS stejný), zálohová faktura ZF20260001 (VS 920260001)
    v_cislo := case when v_druh = 'zalohova' then 'ZF' else '' end || v_rok::text || lpad(v_poradi::text, 4, '0');
    v_vs := case when v_druh = 'zalohova' then '9' else '' end || v_rok::text || lpad(v_poradi::text, 4, '0');
    v_platce := coalesce(v_firma.vat_payer, false);

    insert into public.invoices (
      organization_id, kind, number, variable_symbol, client_id, supplier, customer,
      issue_date, taxable_date, due_date, payment_method, vat_payer, template, note,
      intro_text, logo_position, logo_path
    ) values (
      v_org, v_druh, v_cislo, v_vs, v_client,
      jsonb_build_object(
        'name', v_firma.name, 'legal_form', v_firma.legal_form, 'ico', v_firma.ico, 'dic', v_firma.dic,
        'street', v_firma.street, 'city', v_firma.city, 'zip', v_firma.zip, 'country', v_firma.country,
        'registry_note', v_firma.registry_note, 'bank_account', v_firma.bank_account, 'iban', v_firma.iban,
        'email', v_firma.email, 'phone', v_firma.phone, 'web', v_firma.web
      ),
      p_faktura -> 'customer',
      v_issue,
      -- Zálohová faktura není daňový doklad, nemá DUZP
      case when v_firma.vat_payer and v_druh = 'faktura' then coalesce((p_faktura ->> 'taxable_date')::date, v_issue) end,
      (p_faktura ->> 'due_date')::date,
      coalesce(p_faktura ->> 'payment_method', 'prevod'),
      v_firma.vat_payer,
      coalesce(p_faktura ->> 'template', 'minimal'),
      nullif(p_faktura ->> 'note', ''),
      nullif(p_faktura ->> 'intro_text', ''),
      v_logo_pozice,
      case when v_logo_pozice is not null then v_firma.logo_path end
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
      taxable_date = case when vat_payer and kind = 'faktura' then coalesce((p_faktura ->> 'taxable_date')::date, v_issue) end,
      due_date = (p_faktura ->> 'due_date')::date,
      payment_method = coalesce(p_faktura ->> 'payment_method', 'prevod'),
      template = coalesce(p_faktura ->> 'template', 'minimal'),
      note = nullif(p_faktura ->> 'note', ''),
      intro_text = nullif(p_faktura ->> 'intro_text', ''),
      logo_position = v_logo_pozice,
      logo_path = case when v_logo_pozice is not null then v_firma.logo_path end
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

