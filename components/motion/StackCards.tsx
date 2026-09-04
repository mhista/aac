"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";

/**
 * Scroll-linked stacking rows.
 *
 * How this actually works, because the obvious approach fails:
 *
 * All rows are ordinary siblings in one container, each `position: sticky` with
 * a slightly larger `top` than the last. As you scroll, row 1 pins near the top
 * and row 2 flows up and covers it — leaving a sliver of row 1 visible because
 * its top offset is smaller. That sliver is what makes it read as a deck rather
 * than as one replacing card.
 *
 * The mistake to avoid: wrapping each row in its own tall container. Siblings
 * that occupy separate vertical space can never overlap, so nothing stacks —
 * you just get a normal list with sticky doing nothing visible.
 *
 * Reading time comes from `marginBottom` on each row, which adds scroll
 * distance between arrivals. The cards carry a heading and a paragraph, so they
 * need time at rest; the scale/dim only begins in the last stretch before the
 * next row lands.
 */

/* Scroll distance between row arrivals, in vh. 62 made the section 3,425px
   tall for six cards — long stretches where a pinned row just sits there.
   40 keeps each row readable without the dead scroll. */
const GAP_VH = 40;

function Row({
  children,
  index,
  total,
  progress,
}: {
  children: React.ReactNode;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const isLast = index === total - 1;

  // Each row owns a slice of the container's scroll. It recedes only in the
  // final ~40% of its slice, i.e. as the next row is arriving over it.
  const end = (index + 1) / total;
  const start = end - 0.4 / total;

  /* Scale only — NO opacity fade.
     Fading a row that is still on top makes it translucent, so the row beneath
     shows straight through it and you get the ghosted double-exposure. Rows
     must stay fully opaque; depth comes from scale and the offset sliver. */
  const scale = useTransform(progress, [start, end], [1, isLast ? 1 : 0.93]);

  return (
    <motion.div
      className="sticky"
      style={{
        // 104px clears the floating nav; +18 per row leaves the visible sliver
        top: `calc(104px + ${index * 18}px)`,
        marginBottom: isLast ? 0 : `${GAP_VH}vh`,
        scale,
        transformOrigin: "center top",
        zIndex: index + 1,
      }}
    >
      {children}
    </motion.div>
  );
}

export function StackCards({ children }: { children: React.ReactNode[] }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const total = children.length;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  return (
    <>
      {/* Desktop — the stacking deck */}
      {reduce ? (
        <div className="hidden space-y-6 lg:block">
          {children.map((child, i) => (
            <div key={i}>{child}</div>
          ))}
        </div>
      ) : (
        <div ref={ref} className="relative hidden lg:block">
          {children.map((child, i) => (
            <Row key={i} index={i} total={total} progress={scrollYProgress}>
              {child}
            </Row>
          ))}
        </div>
      )}

      {/* Mobile & tablet — plain stacked rows. Sticky stacking on a short
          viewport traps the reader mid-scroll, and cards are already 1-up. */}
      <div className="space-y-6 lg:hidden">
        {children.map((child, i) => (
          <div key={i}>{child}</div>
        ))}
      </div>
    </>
  );
}
