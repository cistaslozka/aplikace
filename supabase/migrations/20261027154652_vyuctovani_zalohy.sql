-- Vyúčtování zálohy: konečná faktura (kind = faktura, related_invoice_id = záloha) odečte zaplacenou zálohu.
-- U plátce DPH se odečítá základ a DPH podle daňového dokladu k přijaté platbě, u neplátce jen částka.

alter table public.invoices
  add column advance_amount numeric(14, 2) not null default 0,
  add column advance_recap jsonb not null default '[]'::jsonb,
  add constraint invoices_advance_check check (advance_amount >= 0 and total >= advance_amount);

create or replace function public.ulozit_konecnou_fakturu(p_faktura jsonb, p_polozky jsonb, p_zaloha uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_z public.invoices;
  v_dd public.invoices;
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Nepřihlášený uživatel' using errcode = '42501';
  end if;
  select * into v_z from public.invoices where id = p_zaloha for update;
  if v_z.id is null or not private.je_clen(v_z.organization_id) or v_z.organization_id <> (p_faktura ->> 'organization_id')::uuid then
    raise exception 'Záloha nenalezena' using errcode = 'P0002';
  end if;
  if v_z.kind <> 'zalohova' or v_z.status <> 'uhrazena' then
    raise exception 'Vyúčtovat lze jen uhrazenou zálohovou fakturu' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.invoices where related_invoice_id = p_zaloha and kind = 'faktura' and status <> 'stornovana') then
    raise exception 'Záloha už je vyúčtovaná na jiné faktuře' using errcode = 'P0001';
  end if;
  if v_z.vat_payer then
    select * into v_dd from public.invoices
      where related_invoice_id = p_zaloha and kind = 'ddpp' and status <> 'stornovana' limit 1;
    if v_dd.id is null then
      raise exception 'Nejdřív vystavte daňový doklad k přijaté platbě' using errcode = 'P0001';
    end if;
  end if;

  v_id := public.ulozit_fakturu((p_faktura - 'id') || jsonb_build_object('kind', 'faktura'), p_polozky);

  update public.invoices set
    related_invoice_id = v_z.id,
    advance_amount = case when v_z.vat_payer then v_dd.total else v_z.total end,
    advance_recap = case when v_z.vat_payer then v_dd.vat_recap
                         else jsonb_build_array(jsonb_build_object('rate', 0, 'base', v_z.total, 'vat', 0)) end
  where id = v_id;
  return v_id;
end;
$$;
revoke all on function public.ulozit_konecnou_fakturu(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.ulozit_konecnou_fakturu(jsonb, jsonb, uuid) to authenticated;

-- Zálohu s platným daňovým dokladem nebo konečnou fakturou nejde vrátit na neuhrazenou ani stornovat
create or replace function private.hlidat_zalohu()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.kind = 'zalohova' and new.status <> 'uhrazena' and old.status = 'uhrazena' then
    if exists (select 1 from public.invoices where related_invoice_id = old.id and kind = 'ddpp' and status <> 'stornovana') then
      raise exception 'K záloze je vystavený daňový doklad. Nejdřív stornujte ten.' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.invoices where related_invoice_id = old.id and kind = 'faktura' and status <> 'stornovana') then
      raise exception 'Záloha je vyúčtovaná na konečné faktuře. Nejdřív stornujte tu.' using errcode = 'P0001';
    end if;
  end if;
  -- daňový doklad nejde stornovat, dokud je záloha vyúčtovaná na konečné faktuře
  if old.kind = 'ddpp' and new.status = 'stornovana' and old.status <> 'stornovana'
     and exists (select 1 from public.invoices where related_invoice_id = old.related_invoice_id and kind = 'faktura' and status <> 'stornovana') then
    raise exception 'Záloha je vyúčtovaná na konečné faktuře. Nejdřív stornujte tu.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Úpravy: odpočet zálohy na konečné faktuře nejde přepsat ručně
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
    if old.kind = 'zalohova' and exists (select 1 from public.invoices where related_invoice_id = old.id and kind in ('ddpp', 'faktura') and status <> 'stornovana') then
      raise exception 'Záloha už má daňový doklad nebo konečnou fakturu, nelze ji upravit' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
