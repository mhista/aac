import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { ORG } from "@/lib/org";
import { pageMetadata } from "@/lib/seo";

/**
 * Legal pages.
 *
 * These are honest working drafts, not legal advice. They describe what the
 * site actually does today — which is the only defensible starting point.
 * A lawyer should review them before any campaign that collects data at scale,
 * and the safeguarding policy in particular needs sign-off from the board,
 * because AAC works with students, patients and survivors.
 */

const LAST_REVIEWED = "September 2026";

type Doc = { title: string; lede: string; sections: { h: string; p: string[] }[] };

const DOCS: Record<string, Doc> = {
  privacy: {
    title: "Privacy",
    lede: "What we collect, why, and what we will never do with it.",
    sections: [
      {
        h: "What we collect",
        p: [
          `This website collects only what you send us. If you email ${ORG.email.general} or ${ORG.email.support}, we hold your message and your email address. If you apply to be an advocate, a fellow, a volunteer or a chapter, we hold the details you give us in that application.`,
          "We use privacy-respecting analytics that count page views without tracking you across the web, without advertising cookies, and without building a profile of you.",
        ],
      },
      {
        h: "Health information",
        p: [
          "This site does not collect health information. We do not ask about your diagnosis, your treatment or your medical history through any form on this website.",
          "If you write to our patient support address and choose to tell us about your situation, that message is read only by the people in our patient support work, is not shared with other departments, and is not used for anything except helping you.",
        ],
      },
      {
        h: "What we will never do",
        p: [
          "We will never sell your data. We will never share it with advertisers. We will never add you to a mailing list because you contacted us about something else — you have to opt in, and confirm it.",
        ],
      },
      {
        h: "Your rights",
        p: [
          `You can ask us what we hold about you, ask us to correct it, or ask us to delete it. Write to ${ORG.email.general} and we will act on it.`,
          "Every marketing email we send has a one-click unsubscribe. If it does not work, tell us and we will remove you manually.",
        ],
      },
      {
        h: "Where your data sits",
        p: [
          "Our website and database are hosted with international providers. That means your data may be stored outside your country. We choose providers who commit to recognised data protection standards.",
        ],
      },
    ],
  },

  terms: {
    title: "Terms",
    lede: "The rules for using this website.",
    sections: [
      {
        h: "This is not medical advice",
        p: [
          `${ORG.name} does not provide medical diagnosis or treatment. Everything on this site is general and educational. It is not a substitute for advice from a qualified healthcare professional who knows your situation.`,
          "If you have symptoms that concern you, see a doctor. Do not delay care because of anything you read here.",
        ],
      },
      {
        h: "Accuracy",
        p: [
          "We work hard to base what we publish on credible evidence, and to correct anything we get wrong. Cancer science moves, and pages can go out of date. If you think something here is inaccurate, please tell us — we would rather be corrected than be wrong in public.",
        ],
      },
      {
        h: "Our content",
        p: [
          "The text, design and images on this site belong to AAC or are used with permission. You are welcome to quote us with attribution, and to share our prevention materials for non-commercial educational purposes. Please ask before anything else.",
        ],
      },
      {
        h: "Links out",
        p: [
          "We link to other organisations where they can help you. We do not control those sites and are not responsible for their content.",
        ],
      },
      {
        h: "Who we are",
        p: [
          `${ORG.name}, registered with the ${ORG.registration.body} under number ${ORG.registration.number}, ${ORG.registration.country}.`,
        ],
      },
    ],
  },

  safeguarding: {
    title: "Safeguarding",
    lede: "How we protect the people we work with — students, patients, survivors and volunteers.",
    sections: [
      {
        h: "Our commitment",
        p: [
          "AAC works with students, young people, patients and survivors. Some of them are vulnerable, and all of them are trusting us. We take that seriously.",
          "Nobody should be harmed, exploited, pressured or made to feel unsafe through contact with this organisation. That applies to our advocates, our coordinators, our volunteers and everyone we serve.",
        ],
      },
      {
        h: "What we expect of everyone in AAC",
        p: [
          "Treat people with dignity. Never use your position to obtain money, favours, or a personal relationship from someone you are supporting.",
          "Never share a patient's or survivor's information, photograph or story without their clear, informed and freely given permission — and honour it if they change their mind later.",
          "Never give medical advice you are not qualified to give, and never discourage anyone from seeking professional care.",
        ],
      },
      {
        h: "Consent and photography",
        p: [
          "We photograph our events, and we ask permission from identifiable people before we publish their image. Anyone can decline without any effect on the support or service they receive, and anyone can ask us to take a photograph down afterwards.",
          "We do not publish photographs of patients in clinical or distressing situations to illustrate general points.",
        ],
      },
      {
        h: "Raising a concern",
        p: [
          `If something has happened that worries you — about a coordinator, an advocate, a volunteer or anyone acting in our name — write to ${ORG.email.general} and mark it urgent. Concerns are taken to the board.`,
          "You can raise a concern about someone senior to you, and about someone we would rather not hear a concern about. That is exactly what this route is for.",
          "If someone is in immediate danger, contact your local emergency services first. We are not an emergency service.",
        ],
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) return { title: "Not found", robots: { index: false, follow: false } };
  return pageMetadata({ title: doc.title, description: doc.lede, path: `/legal/${slug}` });
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) notFound();

  return (
    <>
      <PageHero eyebrow="Legal" title={doc.title} lede={doc.lede} />
      <section className="section">
        <div className="wrap mx-auto max-w-[68ch]">
          {doc.sections.map((s, i) => (
            <Reveal key={s.h} delay={i * 0.04}>
              <div className="mb-12">
                <h2 className="display text-[clamp(1.4rem,1.15rem+1.1vw,1.9rem)]">{s.h}</h2>
                {s.p.map((p, j) => (
                  <p key={j} className="mt-4 text-body leading-body text-[var(--color-text-secondary)]">{p}</p>
                ))}
              </div>
            </Reveal>
          ))}
          <p className="mono border-t border-[var(--color-border-default)] pt-6">
            Last reviewed {LAST_REVIEWED} · Questions to {ORG.email.general}
          </p>
        </div>
      </section>
    </>
  );
}
