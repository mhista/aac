import { pageMetadata, JsonLd, breadcrumbLd } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { Steps } from "@/components/ui/Steps";
import { ApplyPanel } from "@/components/ui/ApplyPanel";
import { Reveal } from "@/components/motion/Reveal";

export const metadata = pageMetadata({
  title: 'AAC Fellowship',
  description: 'A leadership and capacity-building programme equipping young Africans to become cancer advocates, researchers and changemakers.',
  path: '/get-involved/fellowship',
});

export default function FellowshipPage() {
  return (
    <>
      <PageHero
        eyebrow="Get involved · Fellowship"
        title="The AAC Fellowship."
        lede="A leadership and capacity-building programme for young Africans who want to lead cancer work in their own regions — with training, mentorship and a real project to run."
      />

      <section className="section">
        <div className="wrap grid gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <h2 className="display text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">What fellows receive</h2>
            <ul className="measure mt-6 space-y-3 text-body leading-body text-[var(--color-text-secondary)]">
              <li>Structured training in cancer prevention, advocacy and communication</li>
              <li>Mentorship from healthcare professionals and researchers in the network</li>
              <li>Hands-on experience leading an awareness or community impact project</li>
              <li>A regional cohort — people doing the same work near you</li>
              <li>A Certificate of Impact recording what you actually delivered</li>
            </ul>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="display text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">Who it is for</h2>
            <div className="measure mt-6 space-y-4 text-body leading-body text-[var(--color-text-secondary)]">
              <p>Students, early-career health professionals, researchers, and non-health professionals with skills the movement needs — design, data, software, writing, organising.</p>
              <p>You do not need a medical background. You do need to be willing to lead something and see it through.</p>
            </div>
          </Reveal>
        </div>
      </section>

      <Steps
        heading="The path"
        steps={[
          { title: "Apply", body: "A written application covering your background, your region and the problem you want to work on." },
          { title: "Interview", body: "A conversation with a department director or regional coordinator." },
          { title: "Onboarding", body: "You join a cohort and are matched with a mentor." },
          { title: "Training", body: "Core curriculum in cancer prevention, advocacy, evidence and communication." },
          { title: "Project", body: "You design and lead a project in your own region, with support." },
          { title: "Report & certify", body: "You present what happened and what it changed. The certificate reflects that." },
        ]}
      />

      <ApplyPanel
        title="Applications"
        body="Fellowship intakes are announced through our channels and to existing advocates first. Register your interest and we will tell you when the next cohort opens."
        subject="AAC Fellowship — register interest"
        note="We will contact you when the next intake opens."
      />
    </>
  );
}
