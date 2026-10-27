-- Daňový doklad k přijaté platbě (ddpp) k uhrazené zálohové faktuře plátce DPH (§ 28 zákona o DPH:
-- vystavit do 15 dnů od přijetí úplaty). DUZP = den přijetí platby.

create or replace function public.vystavit_ddpp(p_zaloha uuid, p_datum_platby date, p_dnes date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_z public.invoices;
  v_firma public.organizations;
  v_rok int;
  v_poradi int;
  v_cislo text;
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Nepřihlášený uživatel' using errcode = '42501';
  end if;
  select * into v_z from public.invoices where id = p_zaloha for update;
  if v_z.id is null or not private.je_clen(v_z.organization_id) then
    raise exception 'Doklad nenalezen' using errcode = 'P0002';
  end if;
  if v_z.kind <> 'zalohova' or v_z.status <> 'uhrazena' then
    raise exception 'Daňový doklad lze vystavit jen k uhrazené zálohové faktuře' using errcode = 'P0001';
  end if;
  if not v_z.vat_payer then
    raise exception 'Daňový doklad k platbě vystavuje jen plátce DPH' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.invoices where related_invoice_id = p_zaloha and kind = 'ddpp' and status <> 'stornovana') then
    raise exception 'K záloze už daňový doklad existuje' using errcode = 'P0001';
  end if;
  if p_dnes is null or abs(p_dnes - (now() at time zone 'Europe/Prague')::date) > 1 then
    raise exception 'Neplatné datum' using errcode = '22023';
  end if;
  if p_datum_platby is null or p_datum_platby > p_dnes or p_datum_platby < v_z.issue_date - 365 then
    raise exception 'Zkontrolujte datum přijetí platby' using errcode = '22023';
  end if;

  select * into v_firma from public.organizations where id = v_z.organization_id;
  v_rok := extract(year from p_dnes)::int;
  insert into public.number_series (organization_id, kind, year, last_number)
  values (v_z.organization_id, 'ddpp', v_rok, 1)
  on conflict (organization_id, kind, year) do update set last_number = public.number_series.last_number + 1
  returning last_number into v_poradi;
  v_cislo := 'DD' || v_rok::text || lpad(v_poradi::text, 4, '0');

  insert into public.invoices (
    organization_id, kind, related_invoice_id, number, variable_symbol, client_id, supplier, customer,
    issue_date, taxable_date, due_date, payment_method, vat_payer, template, note, intro_text,
    logo_position, logo_path, status, paid_at, subtotal, vat_total, total, vat_recap
  ) values (
    v_z.organization_id, 'ddpp', v_z.id, v_cislo, v_z.variable_symbol, v_z.client_id, v_z.supplier, v_z.customer,
    p_dnes, p_datum_platby, p_dnes, v_z.payment_method, true, v_z.template, v_z.note,
    'Daňový doklad k přijaté platbě k zálohové faktuře č. ' || v_z.number || '. Platba přijata ' ||
      to_char(p_datum_platby, 'FMDD. FMMM. YYYY') || '.',
    v_z.logo_position, v_z.logo_path, 'uhrazena', p_datum_platby, v_z.subtotal, v_z.vat_total, v_z.total, v_z.vat_recap
  )
  returning id into v_id;

  insert into public.invoice_items (invoice_id, position, description, quantity, unit, unit_price, vat_rate, base)
  select v_id, position, description, quantity, unit, unit_price, vat_rate, base
  from public.invoice_items where invoice_id = v_z.id;

  return v_id;
end;
$$;
revoke all on function public.vystavit_ddpp(uuid, date, date) from public, anon;
grant execute on function public.vystavit_ddpp(uuid, date, date) to authenticated;

-- Hlídání vazeb: zálohu s platným daňovým dokladem nejde vrátit na neuhrazenou ani stornovat
-- (nejdřív se musí stornovat daňový doklad).
create or replace function private.hlidat_zalohu()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.kind = 'zalohova' and new.status <> 'uhrazena' and old.status = 'uhrazena'
     and exists (select 1 from public.invoices where related_invoice_id = old.id and kind = 'ddpp' and status <> 'stornovana') then
    raise exception 'K záloze je vystavený daňový doklad. Nejdřív stornujte ten.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger invoices_hlidat_zalohu before update of status on public.invoices
  for each row execute function private.hlidat_zalohu();

-- Úpravy: daňový doklad k platbě se neupravuje (jen storno) a zálohu s daňovým dokladem také ne
create or replace function private.hlidat_upravy_dokladu()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- změnu stavu a data úhrady hlídá hlidat_zalohu; tady jen obsah dokladu
  if (new.customer, new.issue_date, new.taxable_date, new.due_date, new.total, new.note, new.intro_text)
     is distinct from (old.customer, old.issue_date, old.taxable_date, old.due_date, old.total, old.note, old.intro_text) then
    if old.kind = 'ddpp' then
      raise exception 'Daňový doklad k přijaté platbě nelze upravit, jen stornovat' using errcode = 'P0001';
    end if;
    if old.kind = 'zalohova' and exists (select 1 from public.invoices where related_invoice_id = old.id and kind = 'ddpp' and status <> 'stornovana') then
      raise exception 'K záloze je vystavený daňový doklad, zálohu už nelze upravit' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
create trigger invoices_hlidat_upravy before update on public.invoices
  for each row execute function private.hlidat_upravy_dokladu();
