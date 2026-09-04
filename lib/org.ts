/**
 * Organisation constants — facts, not content.
 *
 * These are verified, non-negotiable details that belong in code rather than
 * the CMS: legal identity, contact routes, navigation, the six pillars, values,
 * and the real impact figures as of September 2026.
 *
 * Impact figures here are SEED values. Once `impact_metrics` has rows, the CMS
 * wins (see lib/cms/index.ts). Never edit a figure here to make it look better.
 */

export const ORG = {
  name: "All Against Cancer Initiative",
  shortName: "All Against Cancer",
  abbr: "AAC",
  tagline: "Bringing Hope through Awareness, Support and Research",
  rallyingLine: "One continent. One movement. A shared responsibility.",
  registration: {
    body: "Corporate Affairs Commission",
    number: "9812183",
    country: "Federal Republic of Nigeria",
    label: "Registered with the Corporate Affairs Commission · RN 9812183",
  },
  domain: "aaci.ngo",
  email: {
    general: "contact@aaci.ngo",
    support: "support@aaci.ngo",
  },
  social: [
    { name: "LinkedIn", url: "https://www.linkedin.com/company/all-against-cancer" },
    { name: "Facebook", url: "https://www.facebook.com/allagainstcancer" },
    { name: "X", url: "https://x.com/allagainstcancr" },
    { name: "Instagram", url: "https://www.instagram.com/allagainstcancer" },
    { name: "TikTok", url: "https://www.tiktok.com/@allagainstcancer" },
  ],
  countries: ["Nigeria", "Ghana", "Kenya"],

  mission:
    "To reduce the burden of cancer in Africa by empowering communities, strengthening cancer advocacy, supporting patients and survivors, advancing research, improving access to prevention and care, and using education, partnerships and innovation to create practical solutions to cancer challenges.",

  visionShort: "A future where no one in Africa is left behind because of cancer.",

  principle: "We do not only talk about the problem. We organise people to do something about it.",

  /* ── Six pillars ──────────────────────────────────────────────────── */
  pillars: [
    {
      slug: "awareness-advocacy",
      title: "Awareness, Advocacy & Campaigns",
      description:
        "We take cancer information into communities, schools, universities and digital spaces — so people learn, understand and act.",
      category: "awareness",
      image: "awareness-community-session",
    },
    {
      slug: "patient-survivor-support",
      title: "Patient & Survivor Support",
      description:
        "No one should face cancer alone. We connect patients and survivors to support, information and the people who can help.",
      category: "support",
      image: "screening-clinic",
    },
    {
      slug: "medication-access",
      title: "Medication Access & Global Partnerships",
      description:
        "We build partnerships with hospitals, pharmacies, pharmaceutical and biotechnology organisations to find practical ways of improving access to cancer medicines.",
      category: "support",
      image: "medication-pharmacy",
    },
    {
      slug: "research",
      title: "Research",
      description:
        "Africa cannot depend entirely on solutions developed for other populations. We support research that answers questions relevant to African communities.",
      category: "research",
      image: "research-laboratory",
    },
    {
      slug: "education-innovation",
      title: "Education & Innovation",
      description:
        "We train the next generation of advocates, researchers and innovators — and explore how technology can make prevention, research and care more accessible.",
      category: "innovation",
      image: "education-girls-studying",
    },
    {
      slug: "chapters-fellowship",
      title: "Chapters & Fellowship",
      description:
        "Our campus chapters and the AAC Fellowship turn students into cancer advocates who educate their peers and lead change in their own communities.",
      category: "prevention",
      image: "youth-students-walking",
    },
  ],

  /* ── Values ───────────────────────────────────────────────────────── */
  values: [
    { name: "Compassion", note: "Behind every cancer statistic is a person, a family and a story. We will never lose sight of that." },
    { name: "Integrity", note: "We will be honest about what we have achieved, what we have not achieved and where we still need to improve." },
    { name: "Evidence", note: "We promote information based on credible scientific evidence, and avoid spreading fear or misinformation." },
    { name: "Collaboration", note: "We believe we can achieve more by working together." },
    { name: "Inclusion", note: "Cancer affects everyone. Our movement welcomes people from different backgrounds and professions." },
    { name: "Innovation", note: "We are willing to explore new approaches when existing systems are not enough." },
    { name: "Accountability", note: "When we make commitments, we must be prepared to account for our actions and results." },
    { name: "Impact", note: "We measure ourselves by the difference our work makes — not by the number of people in our groups." },
  ],

  /* ── Real impact figures · September 2026 ─────────────────────────────
     Never invent. Never round 5 up to "5+". A null value renders the
     "measurement in progress" state, which is the honest answer.        */
  impact: [
    { key: "advocates", label: "Cancer Advocates", value_numeric: 800, value_display: "800+", unit: null, as_of: "2026-09-01", is_headline: true, methodology_note: null },
    { key: "leaders", label: "AAC Leaders", value_numeric: 50, value_display: "50+", unit: null, as_of: "2026-09-01", is_headline: true, methodology_note: null },
    { key: "countries_active", label: "Countries active", value_numeric: 3, value_display: "3", unit: null, as_of: "2026-09-01", is_headline: true, methodology_note: "Nigeria, Ghana and Kenya." },
    { key: "students_engaged", label: "Students & young people engaged", value_numeric: 500, value_display: "500+", unit: null, as_of: "2026-09-01", is_headline: true, methodology_note: null },
    { key: "healthcare_professionals", label: "Healthcare professionals in our network", value_numeric: 200, value_display: "200+", unit: null, as_of: "2026-09-01", is_headline: false, methodology_note: null },
    { key: "patients_supported", label: "Patients supported", value_numeric: 5, value_display: "5", unit: null, as_of: "2026-09-01", is_headline: false, methodology_note: "Our first cohort. Every one of them is a person we can name." },
    { key: "partners", label: "Healthcare & community partners", value_numeric: 2, value_display: "2", unit: null, as_of: "2026-09-01", is_headline: false, methodology_note: null },
    /* Held back from the site until there is something to report. The
       component still renders a "0" and an unmeasured state correctly — these
       simply are not published yet, and will arrive through the CMS:
         drug_access_support  — programme in development
         people_reached       — measurement system being built              */
  ],

  /* ── Structure ────────────────────────────────────────────────────── */
  structure: [
    { label: "Board of Directors", value: "7" },
    { label: "Departments", value: "4" },
    { label: "Department Directors", value: "4" },
    { label: "Regional Coordinators", value: "15+" },
    { label: "Campus Coordinators", value: "40+" },
  ],

  community: [
    "800+ Cancer Advocates",
    "50+ Leaders",
    "Students",
    "Health Professionals",
    "Researchers",
    "Non-Health Professionals",
    "Digital & Creative Professionals",
  ],

  focus: [
    "Cancer Awareness",
    "Prevention",
    "Patient & Survivor Support",
    "Research",
    "Education & Innovation",
    "Partnerships",
  ],
} as const;

/* ── Navigation ─────────────────────────────────────────────────────── */

export const NAV = [
  { label: "About", href: "/about" },
  { label: "What We Do", href: "/what-we-do" },
  { label: "Programmes", href: "/programmes" },
  { label: "Events", href: "/events" },
  { label: "Blog", href: "/blog" },
  {
    label: "Get Involved",
    href: "/get-involved",
    children: [
      { label: "Become an Advocate", href: "/get-involved/advocates" },
      { label: "AAC Fellowship", href: "/get-involved/fellowship" },
      { label: "University Chapters", href: "/get-involved/chapters" },
      { label: "Volunteer", href: "/get-involved/volunteer" },
      { label: "Partner with us", href: "/get-involved/partner" },
    ],
  },
] as const;

export const FOOTER_NAV = {
  Navigate: [
    { label: "About", href: "/about" },
    { label: "What We Do", href: "/what-we-do" },
    { label: "Programmes", href: "/programmes" },
    { label: "Events", href: "/events" },
    { label: "Blog", href: "/blog" },
    { label: "Impact", href: "/impact" },
  ],
  "Get Involved": [
    { label: "Become an Advocate", href: "/get-involved/advocates" },
    { label: "AAC Fellowship", href: "/get-involved/fellowship" },
    { label: "University Chapters", href: "/get-involved/chapters" },
    { label: "Volunteer", href: "/get-involved/volunteer" },
    { label: "Partner with us", href: "/get-involved/partner" },
  ],
  Support: [
    { label: "For Patients & Survivors", href: "/support" },
    { label: "Research", href: "/research" },
    { label: "Innovation", href: "/innovation" },
    { label: "Resources", href: "/resources" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy", href: "/legal/privacy" },
    { label: "Terms", href: "/legal/terms" },
    { label: "Safeguarding", href: "/legal/safeguarding" },
  ],
} as const;

/** Shown wherever the site touches medical territory. Never softened. */
export const MEDICAL_NOTICE =
  "All Against Cancer Initiative does not provide medical diagnosis or treatment. The information here is general and educational. Please speak to a qualified healthcare professional about your own health.";
