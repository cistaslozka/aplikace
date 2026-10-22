-- Seznam zájemců o spuštění aplikace (formulář na awao.cz)
-- Už je nasazeno v Supabase (22. 10. 2026). Soubor je tu kvůli historii.
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  consent boolean not null,
  source text not null default 'awao.cz',
  created_at timestamptz not null default now(),
  constraint waitlist_email_format check (length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint waitlist_consent_given check (consent = true),
  constraint waitlist_source_len check (length(source) <= 50)
);

create unique index waitlist_email_unique on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

-- Návštěvník webu se může jen zapsat. Číst seznam nesmí nikdo zvenku.
create policy "Kdokoli se muze zapsat na waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (consent = true);

revoke select, update, delete on public.waitlist from anon, authenticated;

comment on table public.waitlist is 'Zájemci o spuštění čistásložka.cz. Sbíráno se souhlasem přes formulář na awao.cz.';
