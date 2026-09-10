import { unstable_cache } from "next/cache";
import { getChapters, getEvents, getFaqs, getPosts, getProgrammes, getImpactMetrics } from "@/lib/cms";
import { ORG } from "@/lib/org";

/**
 * What the assistant is allowed to know.
 *
 * This is the "never invent a figure" rule applied to the one part of the site
 * that would otherwise invent things enthusiastically. A language model asked
 * "how many people has AAC helped" will produce a number, and it will sound
 * right, and it will be fiction. So it is not asked to know anything: it is
 * handed the organisation's real facts and told to answer from them or say it
 * does not know.
 *
 * Only published rows go in, because this is read by the public. A draft event
 * quoted back to a visitor by a chatbot is a leak with extra steps.
 *
 * Cached for ten minutes. The alternative is six database queries on every
 * message, which at a few hundred conversations is real money and real latency
 * for facts that change weekly at most.
 */

const CACHE_SECONDS = 600;

export const buildContext = unstable_cache(
  async (): Promise<string> => {
    const [events, posts, programmes, chapters, faqs, metrics] = await Promise.all([
      getEvents({ limit: 8 }),
      getPosts({ limit: 8 }),
      getProgrammes({ limit: 8 }),
      getChapters(),
      getFaqs(),
      getImpactMetrics(),
    ]);

    const lines: string[] = [];

    lines.push(`ORGANISATION`);
    lines.push(`Name: ${ORG.name} (${ORG.abbr}). Registered in ${ORG.registration.country}, ${ORG.registration.body} ${ORG.registration.number}.`);
    lines.push(`Tagline: ${ORG.tagline}`);
    lines.push(`Mission: ${ORG.mission}`);
    lines.push(`General enquiries: ${ORG.email.general}. Patient and survivor support: ${ORG.email.support}.`);
    lines.push(`Countries: Nigeria, Ghana, Kenya.`);

    lines.push(`\nWHAT AAC DOES (the six pillars)`);
    for (const p of ORG.pillars) {
      lines.push(`- ${p.title}: ${p.description}`);
    }

    /* Figures, with their dates, exactly as published. The model is told
       elsewhere not to do arithmetic on these. */
    const published = metrics.filter((m) => m.value_display);
    if (published.length) {
      lines.push(`\nPUBLISHED FIGURES (quote exactly, never round or add up)`);
      for (const m of published) {
        lines.push(`- ${m.label}: ${m.value_display}${m.as_of ? ` (as of ${m.as_of})` : ""}`);
      }
    }

    if (chapters.length) {
      lines.push(`\nACTIVE CHAPTERS (${chapters.length})`);
      for (const c of chapters.slice(0, 60)) {
        lines.push(`- ${c.university}${c.city ? `, ${c.city}` : ""}, ${c.country}`);
      }
    }

    if (programmes.length) {
      lines.push(`\nPROGRAMMES`);
      for (const p of programmes) {
        lines.push(`- ${p.title}${p.status_label ? ` (${p.status_label})` : ""}: ${p.excerpt ?? p.subtitle ?? ""} → /programmes/${p.slug}`);
      }
    }

    if (events.length) {
      lines.push(`\nRECENT EVENTS`);
      for (const e of events) {
        const when = e.starts_at ? new Date(e.starts_at).toISOString().slice(0, 10) : "date not given";
        lines.push(`- ${e.title} (${when}${e.city ? `, ${e.city}` : ""}) → /events/${e.slug}`);
      }
    }

    if (posts.length) {
      lines.push(`\nARTICLES`);
      for (const p of posts) {
        lines.push(`- ${p.title}: ${p.excerpt ?? ""} → /blog/${p.slug}`);
      }
    }

    if (faqs.length) {
      lines.push(`\nFREQUENTLY ASKED`);
      for (const f of faqs.slice(0, 25)) {
        lines.push(`Q: ${f.question}\nA: ${f.answer}`);
      }
    }

    lines.push(`\nKEY PAGES`);
    lines.push(`- Join as an advocate: /join`);
    lines.push(`- What being an advocate involves: /get-involved/advocates`);
    lines.push(`- Start a chapter: /get-involved/chapters`);
    lines.push(`- Patient and survivor support: /support`);
    lines.push(`- Partner with us: /get-involved/partner`);
    lines.push(`- Contact: /contact`);
    lines.push(`- Events: /events · Blog: /blog · Programmes: /programmes · About: /about`);

    return lines.join("\n");
  },
  ["aac-assistant-context"],
  { revalidate: CACHE_SECONDS, tags: ["assistant-context"] }
);
