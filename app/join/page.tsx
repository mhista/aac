import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { AdvocateForm } from "@/components/ui/AdvocateForm";
import { getApplicationSettings } from "@/lib/cms";
import { WaitlistForm } from "@/components/ui/WaitlistForm";
import { ORG } from "@/lib/org";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Join as a Cancer Advocate",
  description:
    "Apply to become an AAC Cancer Advocate in Nigeria, Ghana or Kenya. Students, health professionals and volunteers from any background are welcome. Takes about two minutes.",
  path: "/join",
});

/**
 * The application itself.
 *
 * A page of its own rather than a form dropped at the bottom of the advocates
 * page, for one reason: this is the link that gets shared. It goes in a
 * WhatsApp group, an Instagram bio, the end of a campus talk — and a link that
 * lands someone at the top of a 300-line explainer, needing to scroll to find
 * the form, loses people who had already decided to join.
 *
 * The explaining still exists, and is linked both above and below, for anyone
 * who arrives undecided.
 */
export default async function JoinPage() {
  const settings = await getApplicationSettings();

  return (
    <>
      <PageHero
        eyebrow="Join AAC"
        title="Become a Cancer Advocate"
        lede="Students, health professionals and people from every other background. You do not need a medical qualification and you do not need experience — you need to be willing to do something in your own community."
      />

      <section className="section pt-0">
        <div className="wrap">
          <div className="mx-auto max-w-[760px]">
            {settings.open ? (
              <Reveal>
                <AdvocateForm />
              </Reveal>
            ) : (
              <Reveal>
                <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] p-8 md:p-10">
                  <h2 className="display text-[clamp(1.5rem,1.2rem+1.4vw,2.25rem)]">
                    Applications are closed at the moment
                  </h2>
                  <p className="measure mt-4 text-body leading-body text-[var(--color-text-secondary)]">
                    {settings.closedNote ??
                      "Intakes run in batches so that every advocate who joins actually gets a coordinator, a chapter and something to do. Leave your details and we will email you the moment the next one opens — one email, with the link and the deadline."}
                  </p>
                  <WaitlistForm interest="advocate" />
                </div>
              </Reveal>
            )}

            <Reveal>
              <p className="mono mt-10">
                Not sure yet?{" "}
                <Link href="/get-involved/advocates" className="underline underline-offset-4">
                  Read what being an advocate actually involves
                </Link>{" "}
                · Questions:{" "}
                <a href={`mailto:${ORG.email.general}`} className="underline underline-offset-4">
                  {ORG.email.general}
                </a>
              </p>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
