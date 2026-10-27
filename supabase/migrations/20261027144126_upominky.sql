-- Upomínky k fakturám po splatnosti. Nejvýš 3 na fakturu.
create table public.invoice_reminders (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  level int not null check (level between 1 and 3),
  amount numeric(14, 2) not null,
  new_due_date date not null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (invoice_id, level)
);
create index invoice_reminders_org_idx on public.invoice_reminders (organization_id);
create index invoice_reminders_created_by_idx on public.invoice_reminders (created_by);

alter table public.invoice_reminders enable row level security;
create policy "Clenove vidi upominky sve firmy" on public.invoice_reminders
  for select to authenticated using (private.je_clen(organization_id));
-- Zapisuje jen funkce vytvorit_upominku
revoke insert, update, delete on public.invoice_reminders from anon, authenticated;
revoke select on public.invoice_reminders from anon;

create or replace function public.vytvorit_upominku(p_faktura uuid, p_dnes date)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_f public.invoices;
  v_level int;
begin
  if (select auth.uid()) is null then
    raise exception 'Nepřihlášený uživatel' using errcode = '42501';
  end if;
  select * into v_f from public.invoices where id = p_faktura for update;
  if v_f.id is null or not private.je_clen(v_f.organization_id) then
    raise exception 'Faktura nenalezena' using errcode = 'P0002';
  end if;
  -- Datum "dnes" posílá aplikace v českém čase; nesmí se lišit o víc než den od serveru
  if p_dnes is null or abs(p_dnes - (now() at time zone 'Europe/Prague')::date) > 1 then
    raise exception 'Neplatné datum' using errcode = '22023';
  end if;
  if v_f.status <> 'vystavena' or v_f.due_date >= p_dnes then
    raise exception 'Upomínku lze vytvořit jen k neuhrazené faktuře po splatnosti' using errcode = 'P0001';
  end if;
  select coalesce(max(level), 0) + 1 into v_level from public.invoice_reminders where invoice_id = p_faktura;
  if v_level > 3 then
    raise exception 'K faktuře už jsou 3 upomínky' using errcode = 'P0001';
  end if;
  insert into public.invoice_reminders (invoice_id, organization_id, level, amount, new_due_date)
  values (p_faktura, v_f.organization_id, v_level, v_f.total, p_dnes + 7);
  return v_level;
end;
$$;

revoke all on function public.vytvorit_upominku(uuid, date) from public, anon;
grant execute on function public.vytvorit_upominku(uuid, date) to authenticated;
