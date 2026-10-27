-- Vlastní rozložení přehledu: každý uživatel má v každé firmě své pořadí a zapnuté dlaždice.
create table public.dashboard_layouts (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- [{"id": "neuhrazeno", "zapnuto": true}, ...] v pořadí zobrazení
  tiles jsonb not null default '[]'::jsonb check (jsonb_typeof(tiles) = 'array' and jsonb_array_length(tiles) <= 30),
  updated_at timestamptz not null default now(),
  primary key (user_id, organization_id)
);
create index dashboard_layouts_org_idx on public.dashboard_layouts (organization_id);

alter table public.dashboard_layouts enable row level security;
create policy "Uzivatel vidi sve rozlozeni" on public.dashboard_layouts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Uzivatel uklada sve rozlozeni" on public.dashboard_layouts
  for insert to authenticated with check (user_id = (select auth.uid()) and private.je_clen(organization_id));
create policy "Uzivatel meni sve rozlozeni" on public.dashboard_layouts
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and private.je_clen(organization_id));
create policy "Uzivatel maze sve rozlozeni" on public.dashboard_layouts
  for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.dashboard_layouts from anon;
