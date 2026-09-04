"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import clsx from "clsx";
import { NAV, ORG } from "@/lib/org";
import { Button } from "./Button";
import { SocialIcon } from "./SocialIcon";
import { ChevronDown, Close } from "./Icon";

/**
 * Floating pill navigation.
 * Shrinks and gains a backdrop blur on scroll down; re-expands on scroll up.
 * Mobile collapses to a full-screen overlay.
 */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll and close on Escape while the mobile menu is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 md:pt-6">
        <nav
          aria-label="Main"
          className={clsx(
            "pointer-events-auto flex w-full max-w-[1160px] items-center justify-between gap-6 rounded-pill border transition-all duration-standard ease-entrance",
            scrolled
              ? "border-[var(--color-border-subtle)] bg-[rgba(250,248,244,.88)] px-4 py-2 shadow-soft backdrop-blur-[16px] md:px-5 md:py-2.5"
              : "border-transparent bg-[rgba(250,248,244,.72)] px-5 py-3 backdrop-blur-[10px] md:px-6 md:py-3.5"
          )}
        >
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${ORG.name} — home`}>
            <img
              src="/aac-icon-96.png"
              alt=""
              width={36}
              height={36}
              className={clsx("transition-all duration-standard ease-entrance", scrolled ? "h-8 w-8" : "h-9 w-9")}
            />
            <span className="font-display text-[1.05rem] leading-none text-[var(--color-text-display)] md:text-[1.15rem]">
              All Against Cancer <span className="text-[0.72em] opacity-70">Initiative</span>
            </span>
          </Link>

          {/* Desktop */}
          <ul className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <li
                key={item.label}
                className="relative"
                onMouseEnter={() => "children" in item && setOpenMenu(item.label)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <Link
                  href={item.href}
                  className="inline-flex min-h-[44px] items-center rounded-pill px-3.5 text-caption text-[var(--color-text-primary)] transition-colors duration-hover hover:bg-[var(--color-action-ghost-hover-surface)]"
                  aria-haspopup={"children" in item ? "true" : undefined}
                  aria-expanded={"children" in item ? openMenu === item.label : undefined}
                >
                  {item.label}
                  {"children" in item && <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />}
                </Link>

                {"children" in item && openMenu === item.label && (
                  <div className="absolute left-0 top-full pt-2">
                    <ul className="min-w-[248px] rounded-md border border-[var(--color-border-subtle)] bg-white p-2 shadow-lift">
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link
                            href={c.href}
                            className="block rounded-sm px-3 py-2.5 text-caption transition-colors duration-hover hover:bg-[var(--color-surface-sunken)]"
                          >
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Button href="/donate" size="sm" className="hidden sm:inline-flex" arrow>
              Donate
            </Button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="grid h-11 w-11 place-items-center rounded-pill lg:hidden"
            >
              <span className="relative block h-[10px] w-5">
                <motion.span
                  className="absolute inset-x-0 top-0 h-[1.5px] bg-[var(--color-text-primary)]"
                  animate={open ? { rotate: 45, y: 4.25 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                />
                <motion.span
                  className="absolute inset-x-0 bottom-0 h-[1.5px] bg-[var(--color-text-primary)]"
                  animate={open ? { rotate: -45, y: -4.25 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                />
              </span>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile overlay — slides down, items stagger in behind it */}
      <AnimatePresence>
        {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col bg-[var(--color-surface-page)] lg:hidden"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: "-100%" }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: "-100%" }}
          transition={reduce ? { duration: 0.2 } : { duration: 0.44, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-between px-5 py-5">
            <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
              <img src="/aac-icon-96.png" alt="" width={36} height={36} className="h-9 w-9" />
              <span className="font-display text-[1.1rem] text-[var(--color-text-display)]">All Against Cancer <span className="text-[0.72em] opacity-70">Initiative</span></span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="grid h-11 w-11 place-items-center rounded-pill"
            >
              <Close className="h-5 w-5" />
            </button>
          </div>

          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 pb-8">
            <ul className="flex flex-col">
              {NAV.map((item, idx) => (
                <motion.li
                  key={item.label}
                  className="border-b border-[var(--color-border-default)]"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    reduce
                      ? { duration: 0.2 }
                      : { duration: 0.5, delay: 0.14 + idx * 0.06, ease: [0.16, 1, 0.3, 1] }
                  }
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block py-4 font-display text-[1.75rem] text-[var(--color-text-display)]"
                  >
                    {item.label}
                  </Link>
                  {"children" in item && (
                    <ul className="pb-4">
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link
                            href={c.href}
                            onClick={() => setOpen(false)}
                            className="block py-2 pl-4 text-caption text-[var(--color-text-secondary)]"
                          >
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3">
              <Button href="/donate" size="lg" arrow>Donate</Button>
              <Button href="/get-involved" variant="secondary" size="lg">Join the movement</Button>
            </div>

            <div className="mt-10 space-y-2">
              <a href={`mailto:${ORG.email.general}`} className="mono block">{ORG.email.general}</a>
              <ul className="flex flex-wrap gap-1 pt-2">
                {ORG.social.map((s) => (
                  <li key={s.name}>
                    <a href={s.url} rel="noopener noreferrer" target="_blank" aria-label={s.name}
                       className="grid h-11 w-11 place-items-center rounded-pill text-[var(--color-text-secondary)] transition-colors duration-hover hover:bg-[var(--color-action-ghost-hover-surface)] hover:text-[var(--color-text-primary)]">
                      <SocialIcon name={s.name} className="h-[18px] w-[18px]" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
