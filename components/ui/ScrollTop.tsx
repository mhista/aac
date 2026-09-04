"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight } from "./Icon";

/**
 * Scroll to top.
 *
 * Appears once you are two viewports down, which is roughly the point where
 * getting back to the nav by scrolling stops being reasonable. It sits above
 * the chat widget's eventual position and clears the mobile safe area.
 *
 * It scrolls the real window rather than calling into Lenis, so it works
 * identically whether smooth scroll is running or has been disabled by
 * prefers-reduced-motion.
 */
export function ScrollTop() {
  const [show, setShow] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 2);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toTop = () => {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    // Return focus to the top of the document so keyboard users land where the
    // page visually did, rather than being left at the bottom.
    document.getElementById("main")?.focus?.();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          onClick={toTop}
          aria-label="Scroll back to top"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.9 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.9 }}
          transition={{ duration: reduce ? 0.2 : 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 grid h-12 w-12 place-items-center rounded-pill border border-[var(--color-border-subtle)] bg-[rgba(250,248,244,.9)] text-[var(--color-text-display)] shadow-lift backdrop-blur-[12px] transition-colors duration-hover ease-entrance hover:bg-[var(--color-surface-raised)] md:bottom-8 md:right-8"
        >
          <ArrowRight className="h-5 w-5 -rotate-90" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
