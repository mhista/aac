"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * Inertial smooth scroll — on the public site only.
 *
 * Lenis takes over wheel events for the entire document and drives scrolling
 * itself. That is what makes the marketing pages feel the way they do, and it
 * is also why it must never run in the dashboard: every nested scroll
 * container — the sidebar, a modal, a long dropdown — has its wheel events
 * swallowed by Lenis and simply stops scrolling. No amount of CSS on the
 * container fixes it, because the events never reach the element.
 *
 * That was the cause of both the sidebar and the media dialog refusing to
 * scroll. It is not a styling problem and it never was.
 *
 * A tool wants immediate, predictable scrolling anyway. Inertia in an admin
 * interface is an obstacle: you overshoot the row you were aiming for.
 *
 * Disabled entirely under prefers-reduced-motion.
 */

const NO_SMOOTH = ["/dashboard", "/login", "/auth"];

export function SmoothScroll() {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    if (NO_SMOOTH.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
    let id = 0;
    const raf = (t: number) => {
      lenis.raf(t);
      id = requestAnimationFrame(raf);
    };
    id = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(id);
      lenis.destroy();
    };
    /* Re-evaluated on navigation: moving from a public page into the
       dashboard must tear Lenis down, not leave it running. */
  }, [pathname]);

  return null;
}
