/**
 * The care directory's vocabulary.
 *
 * A listing's `services` column holds slugs from this file, so the public
 * "who does mammograms?" page is one array lookup rather than a guess at how
 * somebody spelled it. The descriptions are deliberately short and general:
 * they say what a test is, never who should have it or when. That is a
 * clinician's conversation, and the pages say so.
 *
 * Pure data. No database, no React: safe to import anywhere.
 */

export type PlaceKind =
  | "pharmacy"
  | "cancer_centre"
  | "hospital"
  | "diagnostic_centre"
  | "clinic"
  | "laboratory"
  | "other";

export const KINDS: { id: PlaceKind; label: string; plural: string }[] = [
  { id: "pharmacy", label: "Pharmacy", plural: "Pharmacies" },
  { id: "cancer_centre", label: "Cancer centre", plural: "Cancer centres" },
  { id: "hospital", label: "Hospital", plural: "Hospitals" },
  { id: "diagnostic_centre", label: "Diagnostic centre", plural: "Diagnostic centres" },
  { id: "clinic", label: "Clinic", plural: "Clinics" },
  { id: "laboratory", label: "Laboratory", plural: "Laboratories" },
  { id: "other", label: "Other", plural: "Other" },
];

export const kindLabel = (k: string) => KINDS.find((x) => x.id === k)?.label ?? "Facility";

export type Service = {
  slug: string;
  name: string;
  /** Which cancers it relates to, in plain words. */
  about: string;
  /** One or two sentences on what it is. */
  blurb: string;
  group: "screening" | "treatment" | "pharmacy";
};

export const SCREENINGS: Service[] = [
  {
    slug: "mammogram",
    name: "Mammogram",
    about: "Breast cancer",
    blurb: "An X-ray of the breast that can show changes too small to feel.",
    group: "screening",
  },
  {
    slug: "breast-ultrasound",
    name: "Breast ultrasound",
    about: "Breast cancer",
    blurb: "Uses sound waves to look more closely at a lump or an area seen on a mammogram.",
    group: "screening",
  },
  {
    slug: "clinical-breast-exam",
    name: "Clinical breast exam",
    about: "Breast cancer",
    blurb: "A physical examination of the breasts and armpits by a trained health worker.",
    group: "screening",
  },
  {
    slug: "pap-smear",
    name: "Pap smear",
    about: "Cervical cancer",
    blurb: "Cells are taken from the cervix and checked for changes that could become cancer.",
    group: "screening",
  },
  {
    slug: "hpv-test",
    name: "HPV test",
    about: "Cervical cancer",
    blurb: "Checks for the types of human papillomavirus that cause most cervical cancers.",
    group: "screening",
  },
  {
    slug: "via",
    name: "VIA (visual inspection with acetic acid)",
    about: "Cervical cancer",
    blurb: "A quick cervical check done in the clinic, with results the same day.",
    group: "screening",
  },
  {
    slug: "psa-test",
    name: "PSA test",
    about: "Prostate cancer",
    blurb: "A blood test that measures prostate-specific antigen.",
    group: "screening",
  },
  {
    slug: "stool-test",
    name: "Stool test (FIT / FOBT)",
    about: "Bowel cancer",
    blurb: "Checks a stool sample for hidden blood.",
    group: "screening",
  },
  {
    slug: "colonoscopy",
    name: "Colonoscopy",
    about: "Bowel cancer",
    blurb: "A camera examination of the bowel. Growths can often be removed during it.",
    group: "screening",
  },
  {
    slug: "biopsy",
    name: "Biopsy",
    about: "Most cancers",
    blurb: "A small sample of tissue is taken and examined to confirm or rule out cancer.",
    group: "screening",
  },
  {
    slug: "ct-scan",
    name: "CT scan",
    about: "Most cancers",
    blurb: "Detailed cross-section X-ray images of the inside of the body.",
    group: "screening",
  },
  {
    slug: "mri",
    name: "MRI scan",
    about: "Most cancers",
    blurb: "Detailed images made with magnets and radio waves rather than X-rays.",
    group: "screening",
  },
];

export const TREATMENTS: Service[] = [
  { slug: "oncology-consultation", name: "Oncology consultation", about: "", blurb: "", group: "treatment" },
  { slug: "chemotherapy", name: "Chemotherapy", about: "", blurb: "", group: "treatment" },
  { slug: "radiotherapy", name: "Radiotherapy", about: "", blurb: "", group: "treatment" },
  { slug: "surgery", name: "Cancer surgery", about: "", blurb: "", group: "treatment" },
  { slug: "palliative-care", name: "Palliative care", about: "", blurb: "", group: "treatment" },
  { slug: "counselling", name: "Counselling and support", about: "", blurb: "", group: "treatment" },
];

export const PHARMACY: Service[] = [
  { slug: "cancer-medicines", name: "Cancer medicines", about: "", blurb: "", group: "pharmacy" },
];

export const SERVICES: Service[] = [...SCREENINGS, ...TREATMENTS, ...PHARMACY];

export const serviceBySlug = (slug: string) => SERVICES.find((s) => s.slug === slug);
export const serviceName = (slug: string) => serviceBySlug(slug)?.name ?? slug;

export type CarePlace = {
  id: string;
  name: string;
  kind: PlaceKind;
  summary: string | null;
  services: string[];
  medicines: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  phone: string | null;
  phone_alt: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  notes: string | null;
  is_partner: boolean;
  is_published: boolean;
  verified_on: string | null;
  updated_at?: string;
};

export const CARE_COLUMNS =
  "id,name,kind,summary,services,medicines,address,city,state,country,phone,phone_alt,whatsapp,email,website,hours,notes,is_partner,is_published,verified_on,updated_at";

/** Which listings belong on which public page. */
export const isPharmacy = (p: CarePlace) => p.kind === "pharmacy" || p.services.includes("cancer-medicines");
export const isCancerCentre = (p: CarePlace) =>
  p.kind === "cancer_centre" || p.services.some((s) => TREATMENTS.some((t) => t.slug === s));
export const offers = (p: CarePlace, slug: string) => p.services.includes(slug);

/**
 * A phone number in international digits (no plus), however it was typed.
 *
 * Listings are typed by many people, and Nigerian numbers arrive in every
 * form: "0803 123 4567", "+234 803 123 4567", "+234 (0) 803 123 4567",
 * "2340803…", or just "803 123 4567". wa.me needs exactly 234803…, and a
 * wrong form there opens a chat with a stranger or with nobody, so every
 * shape is brought to the same one. Numbers that are already international
 * for another country pass through unchanged.
 */
export function intlDigits(n: string): string {
  let d = n.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2); // 00234… dialling prefix
  if (d.startsWith("2340")) d = "234" + d.slice(4); // +234 (0) 803…
  else if (d.startsWith("0") && d.length >= 9 && d.length <= 11) d = "234" + d.slice(1); // 0803… mobile, 01 / 09 landline
  else if (d.length === 10 && /^[789]/.test(d)) d = "234" + d; // 803…
  return d;
}

/** tel: links: the international form when we can be sure of it, otherwise
    the digits exactly as typed, which a phone dials as a local call. */
export const telHref = (n: string) => {
  const d = intlDigits(n);
  const international = d.startsWith("234") || n.trim().startsWith("+") || n.trim().startsWith("00");
  return `tel:${international ? "+" + d : n.replace(/[^\d]/g, "")}`;
};

/** wa.me wants the international number without the plus. */
export function waHref(n: string) {
  return `https://wa.me/${intlDigits(n)}`;
}

/**
 * One spelling per state, so "Lagos", "lagos" and "Lagos State" are a single
 * entry in the "filter by state" list rather than three — otherwise a visitor
 * who picks one silently misses the listings typed the other ways.
 */
export function normState(s: string | null | undefined): string {
  const t = (s ?? "").trim().replace(/\s+/g, " ").replace(/\s+state$/i, "");
  if (!t) return "";
  if (/^(fct|f\.c\.t\.?)$/i.test(t)) return "FCT";
  return t
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function mapsHref(p: Pick<CarePlace, "name" | "address" | "city" | "state" | "country">) {
  const q = [p.name, p.address, p.city, p.state, p.country].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export const placeLine = (p: Pick<CarePlace, "address" | "city" | "state">) =>
  [p.address, p.city, p.state].filter(Boolean).join(", ");
