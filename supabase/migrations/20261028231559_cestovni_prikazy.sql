-- Cestovní příkazy s vyúčtováním tuzemské pracovní cesty (CP20260001).
-- Vstupy jsou v `trip` (jsonb), součty spočítá aplikace stejnou funkcí jako náhled (src/lib/cestovni.ts).
-- Zapisuje jen funkce ulozit_cestovni_prikaz, storno stornovat_cestovni_prikaz.

alter table public.number_series drop constraint number_series_kind;
alter table public.number_series add constraint number_series_kind
  check (kind in ('faktura', 'zalohova', 'ddpp', 'dobropis', 'ppd', 'vpd', 'cp'));

create table public.travel_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  number text not null,
  traveler jsonb not null check (jsonb_typeof(traveler) = 'object' and pg_column_size(traveler) < 4000
    and char_length(coalesce(traveler ->> 'name', '')) between 1 and 200),
  purpose text not null check (char_length(purpose) between 1 and 500),
  destination text not null check (char_length(destination) between 1 and 300),
  departure_at timestamp not null,
  arrival_at timestamp not null,
  trip jsonb not null check (jsonb_typeof(trip) = 'object' and pg_column_size(trip) < 20000),
  supplier jsonb not null,
  meal_allowance numeric(14, 2) not null default 0 check (meal_allowance >= 0),
  vehicle_allowance numeric(14, 2) not null default 0 check (vehicle_allowance >= 0),
  expenses numeric(14, 2) not null default 0 check (expenses >= 0),
  advance numeric(14, 2) not null default 0 check (advance >= 0),
  total numeric(14, 2) not null default 0 check (total >= 0 and total < 100000000),
  note text check (note is null or char_length(note) <= 1000),
  status text not null default 'platny' check (status in ('platny', 'stornovany')),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number),
  check (arrival_at > departure_at and arrival_at - departure_at < interval '60 days')
);
create index travel_orders_org_idx on public.travel_orders (organization_id, departure_at desc);
create index travel_orders_created_by_idx on public.travel_orders (created_by);
create trigger travel_orders_updated_at before update on public.travel_orders
  for each row execute function public.nastav_updated_at();

alter table public.travel_orders enable row level security;
create policy "Clenove vidi cestovni prikazy sve firmy" on public.travel_orders
  for select to authenticated using (private.je_clen(organization_id));
revoke insert, update, delete on public.travel_orders from anon, authenticated;
revoke select on public.travel_orders from anon;

create or replace function public.dalsi_cislo_dokladu(p_org uuid, p_rok int, p_druh text)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select case p_druh when 'zalohova' then 'ZF' when 'ddpp' then 'DD' when 'dobropis' then 'OD'
    when 'ppd' then 'PPD' when 'vpd' then 'VPD' when 'cp' then 'CP' else '' end
    || p_rok::text || lpad((coalesce(
    (select last_number from public.number_series where organization_id = p_org and kind = p_druh and year = p_rok), 0
  ) + 1)::text, 4, '0');
$$;

create or replace function public.ulozit_cestovni_prikaz(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := (p ->> 'organization_id')::uuid;
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_odjezd timestamp := (p ->> 'departure_at')::timestamp;
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
  select * into v_firma from public.organizations where id = v_org;

  if v_id is null then
    v_rok := extract(year from v_odjezd)::int;
    insert into public.number_series (organization_id, kind, year, last_number)
    values (v_org, 'cp', v_rok, 1)
    on conflict (organization_id, kind, year) do update set last_number = public.number_series.last_number + 1
    returning last_number into v_poradi;
    insert into public.travel_orders (
      organization_id, number, traveler, purpose, destination, departure_at, arrival_at, trip, supplier,
      meal_allowance, vehicle_allowance, expenses, advance, total, note
    ) values (
      v_org, 'CP' || v_rok::text || lpad(v_poradi::text, 4, '0'), p -> 'traveler', trim(p ->> 'purpose'),
      trim(p ->> 'destination'), v_odjezd, (p ->> 'arrival_at')::timestamp, p -> 'trip',
      jsonb_build_object(
        'name', v_firma.name, 'ico', v_firma.ico, 'dic', v_firma.dic, 'street', v_firma.street,
        'city', v_firma.city, 'zip', v_firma.zip, 'country', v_firma.country, 'registry_note', v_firma.registry_note
      ),
      (p ->> 'meal_allowance')::numeric, (p ->> 'vehicle_allowance')::numeric, (p ->> 'expenses')::numeric,
      coalesce((p ->> 'advance')::numeric, 0), (p ->> 'total')::numeric, nullif(trim(p ->> 'note'), '')
    )
    returning id into v_id;
  else
    select status into v_stav from public.travel_orders where id = v_id and organization_id = v_org for update;
    if v_stav is null then
      raise exception 'Cestovní příkaz nenalezen' using errcode = 'P0002';
    end if;
    if v_stav = 'stornovany' then
      raise exception 'Stornovaný cestovní příkaz nelze upravit' using errcode = 'P0001';
    end if;
    update public.travel_orders set
      traveler = p -> 'traveler', purpose = trim(p ->> 'purpose'), destination = trim(p ->> 'destination'),
      departure_at = v_odjezd, arrival_at = (p ->> 'arrival_at')::timestamp, trip = p -> 'trip',
      meal_allowance = (p ->> 'meal_allowance')::numeric, vehicle_allowance = (p ->> 'vehicle_allowance')::numeric,
      expenses = (p ->> 'expenses')::numeric, advance = coalesce((p ->> 'advance')::numeric, 0),
      total = (p ->> 'total')::numeric, note = nullif(trim(p ->> 'note'), '')
    where id = v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function public.ulozit_cestovni_prikaz(jsonb) from public, anon;
grant execute on function public.ulozit_cestovni_prikaz(jsonb) to authenticated;

create or replace function public.stornovat_cestovni_prikaz(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Nepřihlášený uživatel' using errcode = '42501';
  end if;
  update public.travel_orders set status = 'stornovany'
    where id = p_id and private.je_clen(organization_id);
  if not found then
    raise exception 'Cestovní příkaz nenalezen' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.stornovat_cestovni_prikaz(uuid) from public, anon;
grant execute on function public.stornovat_cestovni_prikaz(uuid) to authenticated;
