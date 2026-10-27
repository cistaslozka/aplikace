-- Zahraniční klienti mají PSČ v jiném tvaru: český formát hlídáme jen pro CZ.
alter table public.clients drop constraint clients_zip_format;
alter table public.clients add constraint clients_zip_format check (
  zip is null
  or (country = 'CZ' and zip ~ '^[0-9]{3} ?[0-9]{2}$')
  or (country <> 'CZ' and char_length(zip) <= 20)
);
