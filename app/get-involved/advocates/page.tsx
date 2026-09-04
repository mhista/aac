import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Steps } from "@/components/ui/Steps";
import { ApplyPanel } from "@/components/ui/ApplyPanel";
import { Reveal } from "@/components/motion/Reveal";
import { Img } from "@/components/media/Img";

export const metadata: Metadata = {
  title: "Become a Cancer Advocate",
  description: "Join 800+ AAC Cancer Advocates across Nigeria, Ghana and Kenya. Learn, act, report your impact, and earn a Certificate of Impact based on what you actually did.",
};

export default function AdvocatesPage() {
  return (
    <>
      <PageHero
        eyebrow="Get involved · Advocates"
        title="Become a Cancer Advocate."
        lede="We do not want people who join an organisation and collect a certificate. We want people who take what they learn and bring it to someone else."
      />

      <section className="section">
        <div className="wrap grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <Reveal>
            <h2 className="display text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">What an advocate actually does</h2>
            <div className="measure mt-6 space-y-4 text-body leading-body text-[var(--color-text-secondary)]">
              <p>A student educates classmates. A healthcare professional educates patients and communities. A researcher communicates evidence. A community member challenges misinformation. A survivor uses their experience to encourage others. A young innovator builds something.</p>
              <p>Everyone has a role. What matters is that you do something with what you learn — and that you tell us what happened, so it can be counted.</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <Img src="youth-students-walking" ratio="4/3" sizes="(max-width:768px) 100vw, 50vw" className="rounded-xl" />
          </Reveal>
        </div>
      </section>

      <Steps
        heading="How it works"
        steps={[
          { title: "Apply", body: "Tell us who you are, where you are, and why cancer advocacy matters to you. No qualifications required." },
          { title: "Screening", body: "A short conversation so we understand what you want to do and what support you will need." },
          { title: "Orientation & training", body: "You learn the essentials: prevention, early detection, how to talk about cancer without spreading fear or misinformation." },
          { title: "Deploy", body: "You take it into your community, campus, clinic or feed — with materials and a coordinator behind you." },
          { title: "Report your impact", body: "You tell us what you did and what changed. Evidence, not estimates." },
          { title: "Certificate of Impact", body: "Awarded on participation and measurable contribution — never on membership alone." },
        ]}
      />

      <ApplyPanel
        title="Ready to start?"
        body="Applications are reviewed by a regional coordinator. Tell us your name, country, what you do, and one sentence on why you want to be an advocate."
        subject="Cancer Advocate application"
      />
    </>
  );
}
