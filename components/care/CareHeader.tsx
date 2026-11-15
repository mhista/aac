import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { ArrowLeft } from "@/components/ui/Icon";

/**
 * The top of every find-care page: a way back, a label tying it to the
 * department that keeps the list, the title and one line of explanation.
 */
export function CareHeader({
  back = { href: "/departments/medication-access-partnerships", label: "Medication Access & Global Partnership" },
  eyebrow = "Find care",
  title,
  lede,
}: {
  back?: { href: string; label: string };
  eyebrow?: string;
  title: string;
  lede?: string;
}) {
  return (
    <header className="border-b border-[var(--color-border-default)] pt-28 md:pt-36">
      <div className="wrap pb-10 md:pb-14">
        <Link
          href={back.href}
          className="group inline-flex items-center gap-2 text-caption text-[var(--color-text-secondary)] transition-colors duration-hover hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 transition-transform duration-hover ease-entrance group-hover:-translate-x-1" />
          {back.label}
        </Link>
        <Reveal>
          <p className="mono mt-10">{eyebrow}</p>
          <h1 className="display mt-4 max-w-[18ch] text-[clamp(2.5rem,1.7rem+3.4vw,4.5rem)]">{title}</h1>
          {lede && (
            <p className="measure mt-6 text-body-l leading-lede text-[var(--color-text-secondary)]">{lede}</p>
          )}
        </Reveal>
      </div>
    </header>
  );
}
