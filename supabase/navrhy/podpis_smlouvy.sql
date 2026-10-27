-- ⚠️ ZATÍM NENAHRÁNO DO SUPABASE (krok 7c). Nahrát přes apply_migration pod názvem podpis_smlouvy,
-- pak přesunout do supabase/migrations/ s číslem verze, které Supabase přidělí.
-- Podpis smlouvy na obrazovce (prostý elektronický podpis): obrázek PNG, jméno podepisujícího a čas.
-- {"my": {"obrazek": "data:image/png;base64,…", "jmeno": "Jan Novák", "kdy": "…"}, "oni": {…}}
alter table public.contracts
  add column signatures jsonb not null default '{}'::jsonb
  check (jsonb_typeof(signatures) = 'object' and length(signatures::text) < 400000);

create or replace function public.podepsat_smlouvu(p_smlouva uuid, p_strana text, p_obrazek text, p_jmeno text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.contracts;
  v_podpisy jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Nepřihlášený uživatel' using errcode = '42501';
  end if;
  select * into v_s from public.contracts where id = p_smlouva for update;
  if v_s.id is null or not private.je_clen(v_s.organization_id) then
    raise exception 'Smlouva nenalezena' using errcode = 'P0002';
  end if;
  if v_s.status <> 'koncept' then
    raise exception 'Podepisovat lze jen smlouvu, která ještě není uzavřená' using errcode = 'P0001';
  end if;
  if p_strana not in ('my', 'oni') then
    raise exception 'Neznámá strana' using errcode = '22023';
  end if;
  if p_obrazek is null or p_obrazek !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$' or length(p_obrazek) > 180000 then
    raise exception 'Podpis se nepodařilo uložit, zkuste ho nakreslit znovu' using errcode = '22023';
  end if;
  if coalesce(trim(p_jmeno), '') = '' or length(p_jmeno) > 120 then
    raise exception 'Zadejte jméno podepisujícího' using errcode = '22023';
  end if;

  v_podpisy := v_s.signatures || jsonb_build_object(p_strana, jsonb_build_object(
    'obrazek', p_obrazek, 'jmeno', trim(p_jmeno), 'kdy', now(), 'kdo', (select auth.uid())));

  update public.contracts set
    signatures = v_podpisy,
    status = case when v_podpisy ? 'my' and v_podpisy ? 'oni' then 'uzavrena' else status end,
    signed_on = case when v_podpisy ? 'my' and v_podpisy ? 'oni' then coalesce(signed_on, (now() at time zone 'Europe/Prague')::date) else signed_on end,
    updated_at = now()
  where id = p_smlouva;

  return case when v_podpisy ? 'my' and v_podpisy ? 'oni' then 'uzavrena' else 'koncept' end;
end;
$$;
revoke all on function public.podepsat_smlouvu(uuid, text, text, text) from public, anon;
grant execute on function public.podepsat_smlouvu(uuid, text, text, text) to authenticated;

create or replace function public.smazat_podpisy_smlouvy(p_smlouva uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.contracts where id = p_smlouva and private.je_clen(organization_id) and status = 'koncept') then
    raise exception 'Podpisy lze smazat jen u konceptu smlouvy' using errcode = 'P0001';
  end if;
  update public.contracts set signatures = '{}'::jsonb, updated_at = now() where id = p_smlouva;
end;
$$;
revoke all on function public.smazat_podpisy_smlouvy(uuid) from public, anon;
grant execute on function public.smazat_podpisy_smlouvy(uuid) to authenticated;

create or replace function private.hlidat_podepsanou_smlouvu()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.signatures <> '{}'::jsonb and new.signatures = old.signatures
     and (new.customer, new.title, new.fields, new.place, new.we_supply, new.template)
         is distinct from (old.customer, old.title, old.fields, old.place, old.we_supply, old.template) then
    raise exception 'Smlouva už je podepsaná, nelze ji upravit. Nejdřív smažte podpisy.' using errcode = 'P0001';
  end if;
  if old.status <> 'koncept' and new.status = 'koncept' then
    new.signatures := '{}'::jsonb;
  end if;
  return new;
end;
$$;
create trigger contracts_hlidat_podpis before update on public.contracts
  for each row execute function private.hlidat_podepsanou_smlouvu();
