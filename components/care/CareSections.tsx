import Link from "next/link";
import { ArrowRight } from "@/components/ui/Icon";

/**
 * The four doors into the Medication Access & Global Partnership department's
 * help: the same set on the department page, the find-care hub and the
 * homepage, so a visitor learns them once.
 */
export const CARE_DOORS = [
  {
    href: "/find-care/pharmacies",
    title: "Pharmacies",
    body: "Pharmacies that stock cancer medicines, with their address and phone number.",
  },
  {
    href: "/find-care/cancer-centres",
    title: "Cancer centres",
    body: "Hospitals and centres that treat cancer, and the services each one offers.",
  },
  {
    href: "/find-care/screenings",
    title: "Screenings & tests",
    body: "Choose a test, such as a mammogram, and see the facilities that offer it.",
  },
  {
    href: "/get-involved/partner",
    title: "Partner with us",
    body: "Hospitals, pharmacies and organisations that want to work with us on access to care.",
  },
] as const;

export function CareDoors({ exclude, numbered = true }: { exclude?: string; numbered?: boolean }) {
  const doors = CARE_DOORS.filter((d) => d.href !== exclude);
  return (
    <ul className={`grid gap-px overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-border-default)] ${
        doors.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4"
      }`}>
      {doors.map((d, i) => (
        <li key={d.href} className="bg-[var(--color-surface-raised)]">
          <Link href={d.href} className="group flex h-full flex-col p-6 md:p-7">
            {numbered && <span className="mono">{String(i + 1).padStart(2, "0")}</span>}
            <span className="mt-4 font-display text-[1.375rem] leading-heading text-[var(--color-text-display)]">
              {d.title}
            </span>
            <span className="mt-2 text-caption leading-body text-[var(--color-text-secondary)]">{d.body}</span>
            <ArrowRight className="mt-6 h-5 w-5 text-[var(--color-text-display)] transition-transform duration-hover ease-entrance group-hover:translate-x-1.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Said once on every listing page, plainly. */
export function CareNote() {
  return (
    <p className="measure text-caption leading-body text-[var(--color-text-secondary)]">
      Please call before you travel: opening hours, prices and stock change. A listing here is not a medical
      recommendation. Your doctor is the right person to say which test or treatment you need. Spotted a wrong number,
      or know a place we should add?{" "}
      <Link href="/contact" className="underline underline-offset-4 hover:text-[var(--color-text-primary)]">
        Tell us
      </Link>
      .
    </p>
  );
}
