-- Pomocná funkce pro pravidla nemá být volatelná přes API (/rest/v1/rpc).
-- Schéma "private" Supabase do API nevystavuje.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.je_clen(org uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = (select auth.uid())
  );
$$;
revoke all on function private.je_clen(uuid) from public, anon;
grant execute on function private.je_clen(uuid) to authenticated;

drop policy "Clenove vidi svou firmu" on public.organizations;
drop policy "Clenove upravuji svou firmu" on public.organizations;
drop policy "Uzivatel vidi clenstvi ve svych firmach" on public.memberships;

create policy "Clenove vidi svou firmu" on public.organizations for select to authenticated using (private.je_clen(id));
create policy "Clenove upravuji svou firmu" on public.organizations for update to authenticated using (private.je_clen(id)) with check (private.je_clen(id));
create policy "Uzivatel vidi clenstvi ve svych firmach" on public.memberships for select to authenticated using (user_id = (select auth.uid()) or private.je_clen(organization_id));

drop function public.je_clen(uuid);
