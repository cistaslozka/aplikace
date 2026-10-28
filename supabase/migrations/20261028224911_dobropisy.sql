-- Dobropis = opravný daňový doklad (§ 45 zákona o DPH) ke snížení ceny faktury.
-- U neplátce DPH jde o opravnou fakturu (nedaňový doklad). Částky jsou záporné.
-- Dobropis nejde upravit, jen stornovat (oprava se dělá dalším dobropisem).

alter table public.number_series drop constraint number_series_kind;
alter table public.number_series add constraint number_series_kind check (kind in ('faktura', 'zalohova', 'ddpp', 'dobropis'));

alter table public.invoices drop constraint invoices_kind_check;
alter table public.invoices add constraint invoices_kind_check check (kind in ('faktura', 'zalohova', 'ddpp', 'dobropis'));
alter table public.invoices drop constraint invoices_advance_check;
alter table public.invoices add constraint invoices_advance_check
  check (advance_amount >= 0 and (kind = 'dobropis' or total >= advance_amount));
alter table public.invoices add constraint invoices_dobropis_zaporny
  check (kind <> 'dobropis' or (total < 0 and related_invoice_id is not null));
alter table public.invoices add column correction_reason text
  check (correction_reason is null or char_length(correction_reason) <= 500);

create or replace function public.dalsi_cislo_dokladu(p_org uuid, p_rok int, p_druh text)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select case p_druh when 'zalohova' then 'ZF' when 'ddpp' then 'DD' when 'dobropis' then 'OD' else '' end
    || p_rok::text || lpad((coalesce(
    (select last_number from public.number_series where organization_id = p_org and kind = p_druh and year = p_rok), 0
  ) + 1)::text, 4, '0');
$$;

-- Vystavení dobropisu k faktuře. Položky mají zápornou částku (např. množství -1).
create or replace function public.vystavit_dobropis(p_faktura uuid, p_doklad jsonb, p_polozky jsonb, p_dnes date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_f public.invoices;
  v_firma public.organizations;
  v_issue date := (p_doklad ->> 'issue_date')::date;
  v_due date := (p_doklad ->> 'due_date')::date;
  v_rok int;
  v_poradi int;
  v_cislo text;
  v_id uuid;
  v_recap jsonb;
  v_zaklad numeric;
  v_dan numeric;
  v_celkem numeric;
  v_drive numeric;
  v_pozice int := 0;
  v_p jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Nepřihlášený uživatel' using errcode = '42501';
  end if;
  select * into v_f from public.invoices where id = p_faktura for update;
  if v_f.id is null or not private.je_clen(v_f.organization_id) then
    raise exception 'Faktura nenalezena' using errcode = 'P0002';
  end if;
  if v_f.kind <> 'faktura' or v_f.status = 'stornovana' then
    raise exception 'Dobropis lze vystavit jen k platné faktuře' using errcode = 'P0001';
  end if;
  if p_dnes is null or abs(p_dnes - (now() at time zone 'Europe/Prague')::date) > 1 then
    raise exception 'Neplatné datum' using errcode = '22023';
  end if;
  if v_issue is null or v_issue < v_f.issue_date or v_issue > p_dnes + 30 then
    raise exception 'Datum vystavení dobropisu nesmí být dříve než u faktury' using errcode = '22023';
  end if;
  if v_due is null or v_due < v_issue then
    raise exception 'Splatnost nesmí být dříve než datum vystavení' using errcode = '22023';
  end if;
  if jsonb_typeof(p_polozky) <> 'array' or jsonb_array_length(p_polozky) = 0 or jsonb_array_length(p_polozky) > 200 then
    raise exception 'Dobropis musí mít aspoň jednu položku' using errcode = '22023';
  end if;

  -- Součty z položek (sazba DPH jen u plátce)
  with p as (
    select round((x ->> 'quantity')::numeric, 3) as q, round((x ->> 'unit_price')::numeric, 2) as c,
           case when v_f.vat_payer then coalesce((x ->> 'vat_rate')::int, 21) else 0 end as s
    from jsonb_array_elements(p_polozky) x
  ), r as (
    select s, sum(round(q * c, 2)) as zaklad, round(sum(round(q * c, 2)) * s / 100.0, 2) as dan from p group by s
  )
  select coalesce(jsonb_agg(jsonb_build_object('rate', s, 'base', zaklad, 'vat', dan) order by s desc), '[]'::jsonb),
         coalesce(sum(zaklad), 0), coalesce(sum(dan), 0), coalesce(sum(zaklad) + sum(dan), 0)
    into v_recap, v_zaklad, v_dan, v_celkem from r;

  if v_celkem >= 0 then
    raise exception 'Dobropis musí cenu snižovat. Zadejte položky se zápornou částkou.' using errcode = '22023';
  end if;
  select coalesce(sum(total), 0) into v_drive from public.invoices
    where related_invoice_id = v_f.id and kind = 'dobropis' and status <> 'stornovana';
  if v_f.total + v_drive + v_celkem < 0 then
    raise exception 'Dobropisy nesmí dohromady přesáhnout částku faktury' using errcode = '22023';
  end if;

  select * into v_firma from public.organizations where id = v_f.organization_id;
  v_rok := extract(year from v_issue)::int;
  insert into public.number_series (organization_id, kind, year, last_number)
  values (v_f.organization_id, 'dobropis', v_rok, 1)
  on conflict (organization_id, kind, year) do update set last_number = public.number_series.last_number + 1
  returning last_number into v_poradi;
  v_cislo := 'OD' || v_rok::text || lpad(v_poradi::text, 4, '0');

  insert into public.invoices (
    organization_id, kind, related_invoice_id, number, variable_symbol, client_id, supplier, customer,
    issue_date, taxable_date, due_date, payment_method, vat_payer, template, note, intro_text,
    logo_position, logo_path, correction_reason, subtotal, vat_total, total, vat_recap
  ) values (
    v_f.organization_id, 'dobropis', v_f.id, v_cislo, v_f.variable_symbol, v_f.client_id, v_f.supplier, v_f.customer,
    v_issue, case when v_f.vat_payer then v_issue end, v_due, v_f.payment_method, v_f.vat_payer,
    coalesce(nullif(p_doklad ->> 'template', ''), v_f.template),
    nullif(trim(p_doklad ->> 'note'), ''),
    nullif(trim(p_doklad ->> 'intro_text'), ''),
    v_f.logo_position, v_f.logo_path,
    nullif(trim(p_doklad ->> 'correction_reason'), ''),
    v_zaklad, v_dan, v_celkem, v_recap
  )
  returning id into v_id;

  for v_p in select * from jsonb_array_elements(p_polozky) loop
    v_pozice := v_pozice + 1;
    insert into public.invoice_items (invoice_id, position, description, quantity, unit, unit_price, vat_rate, base)
    values (
      v_id, v_pozice, trim(v_p ->> 'description'), round((v_p ->> 'quantity')::numeric, 3), nullif(trim(v_p ->> 'unit'), ''),
      round((v_p ->> 'unit_price')::numeric, 2),
      case when v_f.vat_payer then coalesce((v_p ->> 'vat_rate')::int, 21) else 0 end,
      round(round((v_p ->> 'quantity')::numeric, 3) * round((v_p ->> 'unit_price')::numeric, 2), 2)
    );
  end loop;
  return v_id;
end;
$$;
revoke all on function public.vystavit_dobropis(uuid, jsonb, jsonb, date) from public, anon;
grant execute on function public.vystavit_dobropis(uuid, jsonb, jsonb, date) to authenticated;

-- Dobropis nejde upravit; fakturu s dobropisem nejde upravit ani stornovat, dokud dobropis platí
create or replace function private.hlidat_upravy_dokladu()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.customer, new.issue_date, new.taxable_date, new.due_date, new.total, new.note, new.intro_text)
     is distinct from (old.customer, old.issue_date, old.taxable_date, old.due_date, old.total, old.note, old.intro_text) then
    if old.kind = 'ddpp' then
      raise exception 'Daňový doklad k přijaté platbě nelze upravit, jen stornovat' using errcode = 'P0001';
    end if;
    if old.kind = 'dobropis' then
      raise exception 'Dobropis nelze upravit, jen stornovat' using errcode = 'P0001';
    end if;
    if old.kind = 'zalohova' and exists (select 1 from public.invoices where related_invoice_id = old.id and kind in ('ddpp', 'faktura') and status <> 'stornovana') then
      raise exception 'Záloha už má daňový doklad nebo konečnou fakturu, nelze ji upravit' using errcode = 'P0001';
    end if;
    if old.kind = 'faktura' and exists (select 1 from public.invoices where related_invoice_id = old.id and kind = 'dobropis' and status <> 'stornovana') then
      raise exception 'K faktuře je vystavený dobropis, nelze ji upravit' using errcode = 'P0001';
    end if;
  end if;
  if old.kind = 'faktura' and new.status = 'stornovana' and old.status <> 'stornovana'
     and exists (select 1 from public.invoices where related_invoice_id = old.id and kind = 'dobropis' and status <> 'stornovana') then
    raise exception 'K faktuře je vystavený dobropis. Nejdřív stornujte ten.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Upomínka jen k faktuře nebo záloze; částka po odečtení zálohy a dobropisů
create or replace function public.vytvorit_upominku(p_faktura uuid, p_dnes date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_f public.invoices;
  v_level int;
  v_dobropisy numeric;
begin
  if (select auth.uid()) is null then
    raise exception 'Nepřihlášený uživatel' using errcode = '42501';
  end if;
  select * into v_f from public.invoices where id = p_faktura for update;
  if v_f.id is null or not private.je_clen(v_f.organization_id) then
    raise exception 'Faktura nenalezena' using errcode = 'P0002';
  end if;
  if p_dnes is null or abs(p_dnes - (now() at time zone 'Europe/Prague')::date) > 1 then
    raise exception 'Neplatné datum' using errcode = '22023';
  end if;
  if v_f.kind not in ('faktura', 'zalohova') then
    raise exception 'Upomínku lze vytvořit jen k faktuře' using errcode = 'P0001';
  end if;
  if v_f.status <> 'vystavena' or v_f.due_date >= p_dnes then
    raise exception 'Upomínku lze vytvořit jen k neuhrazené faktuře po splatnosti' using errcode = 'P0001';
  end if;
  select coalesce(sum(total), 0) into v_dobropisy from public.invoices
    where related_invoice_id = v_f.id and kind = 'dobropis' and status <> 'stornovana';
  if v_f.total - v_f.advance_amount + v_dobropisy <= 0 then
    raise exception 'Po odečtení dobropisu už není co upomínat' using errcode = 'P0001';
  end if;
  select coalesce(max(level), 0) + 1 into v_level from public.invoice_reminders where invoice_id = p_faktura;
  if v_level > 3 then
    raise exception 'K faktuře už jsou 3 upomínky' using errcode = 'P0001';
  end if;
  insert into public.invoice_reminders (invoice_id, organization_id, level, amount, new_due_date)
  values (p_faktura, v_f.organization_id, v_level, v_f.total - v_f.advance_amount + v_dobropisy, p_dnes + 7);
  return v_level;
end;
$$;
