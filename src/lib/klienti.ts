import "server-only";

export type Klient = {
  id: string;
  organization_id: string;
  name: string;
  ico: string | null;
  dic: string | null;
  vat_payer: boolean | null;
  street: string | null;
  city: string | null;
  zip: string | null;
  country: string;
  email: string | null;
  phone: string | null;
  note: string | null;
  from_ares: boolean;
  ares_checked_at: string | null;
  last_used_at: string | null;
  created_at: string;
};

export const SLOUPCE_KLIENTA =
  "id, organization_id, name, ico, dic, vat_payer, street, city, zip, country, email, phone, note, from_ares, ares_checked_at, last_used_at, created_at";

/** Zkrácená podoba pro našeptávač (posílá se do prohlížeče). */
export type KlientNavrh = Pick<
  Klient,
  "id" | "name" | "ico" | "dic" | "vat_payer" | "street" | "city" | "zip" | "country" | "email"
>;

export function naNavrh(k: Klient): KlientNavrh {
  return {
    id: k.id,
    name: k.name,
    ico: k.ico,
    dic: k.dic,
    vat_payer: k.vat_payer,
    street: k.street,
    city: k.city,
    zip: k.zip,
    country: k.country,
    email: k.email,
  };
}
