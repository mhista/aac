import Link from "next/link";
import { ORG, FOOTER_NAV } from "@/lib/org";
import { SocialIcon } from "./SocialIcon";
import { getPublicSettings } from "@/lib/cms/public-settings";

export async function Footer() {
  /* Resolved settings: the database where set, the coded defaults otherwise.
     Cached and cookie-free, so this does not make every page dynamic. */
  const S = await getPublicSettings();

  return (
    <footer className="bg-[var(--color-surface-inverse)] text-[var(--color-text-on-inverse)]">
      <div className="wrap py-20 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
          {/* Identity */}
          <div className="max-w-[42ch]">
            <Link href="/" className="mb-5 inline-flex items-center gap-3" aria-label={`${S.name} — home`}>
              <img src="/aac-icon-96.png" alt="" width={48} height={48} className="h-12 w-12" />
              <span className="font-display text-[1.4rem] leading-tight">All Against Cancer <span className="text-[0.72em] opacity-75">Initiative</span></span>
            </Link>
            <p className="text-caption text-[var(--color-text-on-inverse-muted)]">{S.tagline}</p>
            <p className="mt-5 text-body text-[var(--color-violet-200)]">{ORG.rallyingLine}</p>

            <ul className="mt-8 flex flex-wrap gap-2">
              {S.social.map((s) => (
                <li key={s.name}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${S.abbr} on ${s.name}`}
                    className="grid h-11 w-11 place-items-center rounded-pill text-[var(--color-violet-200)] transition-colors duration-hover ease-entrance hover:bg-white/10 hover:text-white"
                  >
                    <SocialIcon name={s.name} className="h-[18px] w-[18px]" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(FOOTER_NAV).map(([heading, links]) => (
              <div key={heading}>
                <h2 className="mono mb-4 !text-[var(--color-violet-300)]">{heading}</h2>
                <ul className="space-y-2.5">
                  {links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-caption text-[var(--color-violet-200)] transition-colors duration-hover hover:text-white"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Contact + registration */}
        <div className="mt-16 grid gap-8 border-t border-[var(--color-border-inverse)] pt-10 md:grid-cols-3">
          <div>
            <h2 className="mono mb-3 !text-[var(--color-violet-300)]">General enquiries</h2>
            <a href={`mailto:${S.email.general}`} className="text-body text-white underline-offset-4 hover:underline">
              {S.email.general}
            </a>
          </div>
          <div>
            <h2 className="mono mb-3 !text-[var(--color-violet-300)]">Patient &amp; survivor support</h2>
            <a href={`mailto:${S.email.support}`} className="text-body text-white underline-offset-4 hover:underline">
              {S.email.support}
            </a>
          </div>
          <div>
            <h2 className="mono mb-3 !text-[var(--color-violet-300)]">Registered</h2>
            <p className="text-caption text-[var(--color-violet-200)]">
              {S.registration.body}
              <br />
              RN {S.registration.number}
              <br />
              {S.registration.country}
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[var(--color-border-inverse)] pt-8 text-caption text-[var(--color-violet-300)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {S.name}. All rights reserved.
          </p>
          <p>{ORG.domain}</p>
        </div>
      </div>
    </footer>
  );
}
