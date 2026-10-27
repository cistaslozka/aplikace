-- Změna tarifu. Zatím jen během zkušební doby (zdarma).
-- Po jejím konci se tarif mění až po zaplacení (krok 6), to udělá server po potvrzení platby.
-- Měnit smí jen vlastník firmy.
create or replace function public.zmenit_tarif(p_org uuid, p_plan text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_konec timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Nepřihlášený uživatel' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.memberships
    where organization_id = p_org and user_id = (select auth.uid()) and role = 'owner'
  ) then
    raise exception 'Tarif může změnit jen vlastník firmy' using errcode = '42501';
  end if;
  if p_plan not in ('basic', 'pro') then
    raise exception 'Neznámý tarif' using errcode = '22023';
  end if;
  select trial_ends_at into v_konec from public.organizations where id = p_org;
  if v_konec is null or v_konec <= now() then
    raise exception 'Zkušební doba skončila, změna tarifu bude možná po zaplacení' using errcode = 'P0001';
  end if;
  update public.organizations set plan = p_plan where id = p_org;
  return p_plan;
end;
$$;

revoke all on function public.zmenit_tarif(uuid, text) from public, anon;
grant execute on function public.zmenit_tarif(uuid, text) to authenticated;
