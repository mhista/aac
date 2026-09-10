/**
 * The advocate application, defined once.
 *
 * Both the form on the website and the importer that reads the old Google
 * Forms responses are generated from this file. That is the whole point: if
 * the two drifted apart, the 800 people who joined through Google and the
 * people who join through the site would stop being comparable, and every
 * count of "how many advocates do we have" would need a caveat.
 *
 * The option lists are copied verbatim from the live Google Forms (Nigeria
 * and Ghana, September 2026). Do not tidy the wording — an imported answer is
 * matched against these strings, and "Non-health Volunteer" quietly becoming
 * "Non-Health Volunteer" would leave a few hundred rows unclassified.
 *
 * `googleHeaders` are the column names Google Sheets writes when you download
 * the responses. They carry the question's own stray whitespace and, in two
 * cases, several lines of examples. Matching is done on a normalised prefix
 * rather than an exact string, so a small edit to a question in Google Forms
 * does not break the import.
 */

export const COUNTRIES = ["Nigeria", "Ghana", "Kenya"] as const;

/** Nigeria asks for a state; Ghana asks for region and district. Same field. */
export const LOCALITY_LABEL: Record<string, string> = {
  Nigeria: "State of residence",
  Ghana: "Region and district",
  Kenya: "County of residence",
};

export const GENDERS = ["Male", "Female", "Prefer not to say"] as const;

export const AGE_RANGES = ["Under 18", "18–24", "25–34", "35+"] as const;

export const PROFILE_KINDS = [
  "Student",
  "Health Professional",
  "Non-health Volunteer",
] as const;

export const INTERESTS = [
  "Awareness & Advocacy",
  "Research & Data Community",
  "Outreach Media & Content Creation",
  "Fundraising & Partnerships",
  "Campus Coordination (for students)",
  "Patient & Survivor Support",
  "Public Health Project Management",
] as const;

export const INVOLVEMENT = [
  "Just want to stay informed",
  "Occasionally participate",
  "Actively involved in programs",
  "Interested in leadership roles",
] as const;

export const EXPERIENCE = [
  "Less than 1 year",
  "1–3 years",
  "4–7 years",
  "8–15 years",
  "15+ years",
] as const;

export type AdvocateInput = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string[];
  age_range: string;
  country: string;
  locality: string;
  profile_kind: string;
  interests: string[];
  involvement: string;
  motivation: string;
  school: string;
  faculty: string;
  study_level: string;
  professional_title: string;
  workplace: string;
  years_experience: string;
  occupation: string;
  consent_updates: boolean;
};

/**
 * How each database column maps back to the Google Sheets column.
 *
 * `multi` marks the two questions Google exports as a comma-separated list
 * because they are checkbox groups.
 */
export const GOOGLE_COLUMNS: {
  field: keyof AdvocateInput | "submitted_at";
  headers: string[];
  multi?: boolean;
}[] = [
  { field: "submitted_at", headers: ["Timestamp"] },
  { field: "email", headers: ["Email Address", "Email"] },
  { field: "first_name", headers: ["First Name"] },
  { field: "last_name", headers: ["Last Name"] },
  { field: "gender", headers: ["Gender"], multi: true },
  { field: "age_range", headers: ["Age Range"] },
  { field: "phone", headers: ["Phone Number"] },
  {
    field: "locality",
    headers: ["State of residence", "Region of Residence & District / Municipality", "County"],
  },
  { field: "profile_kind", headers: ["Which best describes you?"] },
  { field: "interests", headers: ["Which area are you most interested in?"], multi: true },
  { field: "involvement", headers: ["How actively would you like to be involved?"] },
  {
    field: "motivation",
    headers: ["Why are you interested in joining this initiative"],
  },
  { field: "school", headers: ["Name of School/University"] },
  { field: "faculty", headers: ["Faculty/Department"] },
  { field: "study_level", headers: ["Level (e.g."] },
  { field: "professional_title", headers: ["What is your professional title?"] },
  {
    field: "workplace",
    headers: ["Where do you currently work or practice?", "Where do you currently work or study?"],
  },
  { field: "years_experience", headers: ["How many years of professional experience"] },
  { field: "occupation", headers: ["What is your current occupation or field of work?"] },
];

/**
 * Flatten a header for comparison.
 *
 * Google's headers carry the question's exact text, which in this form means
 * trailing spaces, a leading newline on one question, and multi-line examples
 * on two others. Comparing raw strings would fail on all of them.
 */
export function normaliseHeader(h: string): string {
  return h
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-");
}

/** Which field, if any, a spreadsheet column belongs to. */
export function fieldForHeader(header: string): (typeof GOOGLE_COLUMNS)[number] | null {
  const h = normaliseHeader(header);
  if (!h) return null;

  /* Longest match wins, so "Email Address" is not claimed by "Email". */
  let best: (typeof GOOGLE_COLUMNS)[number] | null = null;
  let bestLen = 0;

  for (const col of GOOGLE_COLUMNS) {
    for (const candidate of col.headers) {
      const c = normaliseHeader(candidate);
      if (h === c || h.startsWith(c)) {
        if (c.length > bestLen) {
          best = col;
          bestLen = c.length;
        }
      }
    }
  }
  return best;
}

/**
 * Match a free-text answer to one of a known option list.
 *
 * Google stores exactly what the option said, so this normally hits on the
 * first comparison — but a form edited after some responses were collected,
 * or a sheet someone has opened in Excel, can leave near-misses. Returning the
 * original when nothing matches keeps the answer rather than discarding it.
 */
export function matchOption(value: string, options: readonly string[]): string {
  const v = normaliseHeader(value);
  if (!v) return "";
  for (const o of options) {
    if (normaliseHeader(o) === v) return o;
  }
  for (const o of options) {
    const n = normaliseHeader(o);
    if (n.startsWith(v) || v.startsWith(n)) return o;
  }
  return value.trim();
}

/** Split a checkbox answer as Google writes it. */
export function splitMulti(value: string, options: readonly string[]): string[] {
  if (!value.trim()) return [];
  /* Commas appear inside option labels — "Campus Coordination (for students)"
     is safe, but a future option containing a comma would not be. Split on
     commas that are followed by a space and a capital letter, which is how
     Google joins them, and fall back to a plain comma split. */
  const parts = value.split(/,\s*(?=[A-Z])/).flatMap((p) => (p.includes(",") && !options.some((o) => o.includes(p.trim())) ? p.split(",") : [p]));
  return parts.map((p) => matchOption(p, options)).filter(Boolean);
}
