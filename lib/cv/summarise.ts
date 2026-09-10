/**
 * Reading a CV into fields.
 *
 * What a coordinator actually wants from 800 CVs is not the CVs. It is
 * "who here is a nurse", "who has run a project before", "who can edit video".
 * That is a set of fields, and turning prose into fields is what a language
 * model is genuinely good at.
 *
 * TWO RULES SHAPE THIS FILE.
 *
 * It never invents. The prompt says to leave a field out rather than guess,
 * and the schema treats every field as optional. A CV with no stated years of
 * experience produces no years of experience — not a plausible number. That is
 * the same rule the rest of this project follows about figures, applied to the
 * one place where a machine would otherwise happily make one up.
 *
 * It is never the decision. The output is a reading aid stapled to a record a
 * human opens; nobody is accepted or declined by it, and the original file is
 * always one click away. A summary that is wrong is a mild annoyance, not a
 * person turned away by a parser.
 */

export type CvSummary = {
  headline?: string;
  skills?: string[];
  education?: { qualification?: string; institution?: string; year?: string }[];
  experience?: { role?: string; organisation?: string; period?: string }[];
  languages?: string[];
  /* Only when the CV states it outright. Never computed from dates. */
  years_experience?: string;
  notable?: string;
  /** Set when the model was asked and declined to fill anything in. */
  empty?: boolean;
};

const MODEL = "llama-3.3-70b-versatile";
const MAX_CHARS = 24_000;

const SYSTEM = `You extract structured facts from a CV for a cancer NGO's volunteer coordinator.

Return ONLY a JSON object. No prose, no markdown fence.

Rules, in order of importance:
1. Never invent anything. If the CV does not state something, omit that field entirely. An absent field is correct; a guessed one is a lie a coordinator may act on.
2. Do not infer years of experience from dates. Only fill years_experience if the CV says it in words.
3. Copy qualifications and job titles as written. Do not translate "B.Sc" into "Bachelor of Science" or expand abbreviations you are not certain of.
4. skills: only things the CV claims. Max 12, shortest useful form.
5. headline: one sentence, max 20 words, describing who this person is professionally. No adjectives of praise.
6. notable: at most one sentence, only for something a volunteer coordinator would want to know — health qualifications, community or campaign experience, leadership of a group. Omit otherwise.

Shape:
{"headline":string,"skills":string[],"education":[{"qualification":string,"institution":string,"year":string}],"experience":[{"role":string,"organisation":string,"period":string}],"languages":string[],"years_experience":string,"notable":string}`;

export function groqConfigured() {
  return !!process.env.GROQ_API_KEY;
}

export async function summariseCv(
  text: string
): Promise<{ ok: true; summary: CvSummary } | { ok: false; error: string }> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return {
      ok: false,
      error: "No GROQ_API_KEY is set on this deployment, so CVs cannot be summarised automatically. The text is still stored and searchable.",
    };
  }
  if (!text || text.trim().length < 80) {
    return { ok: false, error: "There is not enough text in this CV to read." };
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        /* Deterministic. Two coordinators opening the same CV should not see
           two different readings of it. */
        temperature: 0,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: text.slice(0, MAX_CHARS) },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401) return { ok: false, error: "The Groq key was refused. It may have been rotated." };
      if (res.status === 429) return { ok: false, error: "Groq is rate-limiting us. Try again in a minute." };
      return { ok: false, error: `Groq returned ${res.status}. ${body.slice(0, 140)}` };
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return { ok: false, error: "Groq returned nothing readable." };

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { ok: false, error: "Groq did not return valid JSON." };
    }

    return { ok: true, summary: clean(parsed) };
  } catch (err: any) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    return {
      ok: false,
      error: timedOut ? "Groq took too long to answer. Try again." : "Could not reach Groq.",
    };
  }
}

/**
 * Keep only what the schema allows.
 *
 * A model told to return one shape mostly does, and "mostly" is not something
 * to render straight into a page. Anything unexpected is dropped rather than
 * displayed, and an object with nothing left in it is marked empty so the
 * interface can say "nothing could be read" instead of showing a blank card.
 */
function clean(raw: any): CvSummary {
  const s = (v: unknown, max = 300) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

  const list = (v: unknown, max: number) =>
    Array.isArray(v)
      ? v.map((x) => s(x, 80)).filter((x): x is string => !!x).slice(0, max)
      : undefined;

  const rows = (v: unknown, keys: string[], max: number) =>
    Array.isArray(v)
      ? v
          .map((r) => {
            if (!r || typeof r !== "object") return null;
            const out: Record<string, string> = {};
            for (const k of keys) {
              const val = s((r as any)[k], 140);
              if (val) out[k] = val;
            }
            return Object.keys(out).length ? out : null;
          })
          .filter(Boolean)
          .slice(0, max)
      : undefined;

  const out: CvSummary = {
    headline: s(raw?.headline, 200),
    skills: list(raw?.skills, 12),
    languages: list(raw?.languages, 8),
    education: rows(raw?.education, ["qualification", "institution", "year"], 6) as CvSummary["education"],
    experience: rows(raw?.experience, ["role", "organisation", "period"], 6) as CvSummary["experience"],
    years_experience: s(raw?.years_experience, 40),
    notable: s(raw?.notable, 240),
  };

  for (const k of Object.keys(out) as (keyof CvSummary)[]) {
    const v = out[k];
    if (v === undefined || (Array.isArray(v) && v.length === 0)) delete out[k];
  }

  if (Object.keys(out).length === 0) out.empty = true;
  return out;
}
