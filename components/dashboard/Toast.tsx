"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Close } from "@/components/ui/Icon";

/**
 * Action feedback, where the person is actually looking.
 *
 * The dashboard used to answer every action with a banner at the top of the
 * page. On the short screens that is fine; on the long ones — the event
 * editor, a person's record, anything with a photograph picker in it — you
 * press Save at the bottom, the confirmation appears eight hundred pixels
 * above you, and as far as you can tell nothing happened. So you press Save
 * again.
 *
 * These appear in the bottom corner, near the buttons that cause them, and
 * take themselves away.
 *
 * WHAT BELONGS HERE AND WHAT DOES NOT. A toast is for the outcome of
 * something you just did: saved, published, deleted, failed. It is the wrong
 * home for a standing fact — "3 people have no photograph", "this chapter has
 * no coordinator" — because those are true until someone fixes them, and a
 * message that removes itself after five seconds cannot express that. Those
 * stay as banners.
 *
 * Accessibility. The live region is always in the DOM and never moves, which
 * is what lets a screen reader announce into it. Failures are assertive and
 * stay twice as long, because an error you did not finish reading is worse
 * than one that lingers.
 */

export type ToastTone = "success" | "danger" | "info";

type Toast = { id: number; tone: ToastTone; text: string; title?: string };

type Push = (t: { tone?: ToastTone; text: string; title?: string }) => void;

const ToastContext = createContext<Push | null>(null);

/**
 * Show a message in the corner.
 *
 * Safe to call from anywhere under the dashboard. Outside the provider it is
 * a no-op rather than a crash — a missing toast is not worth taking a page
 * down for.
 */
export function useToast(): Push {
  const push = useContext(ToastContext);
  return push ?? (() => {});
}

const LIFETIME: Record<ToastTone, number> = {
  success: 4500,
  info: 5500,
  /* Long enough to read a database error and decide what to do about it. */
  danger: 10000,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setToasts((list) => list.filter((x) => x.id !== id));
  }, []);

  const push = useCallback<Push>(
    ({ tone = "info", text, title }) => {
      if (!text) return;
      const id = nextId.current++;

      setToasts((list) => {
        /* Pressing Save twice should not stack two identical confirmations. */
        const deduped = list.filter((x) => !(x.text === text && x.tone === tone));
        /* Three at once is the most that can be read before they expire. */
        return [...deduped, { id, tone, text, title }].slice(-3);
      });

      timers.current.set(
        id,
        setTimeout(() => dismiss(id), LIFETIME[tone])
      );
    },
    [dismiss]
  );

  /* Clear pending timers on unmount so a navigation mid-toast cannot set
     state on a component that is gone. */
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      {mounted && createPortal(<Stack toasts={toasts} onDismiss={dismiss} />, document.body)}
    </ToastContext.Provider>
  );
}

const TONE: Record<ToastTone, { bg: string; fg: string; bar: string }> = {
  success: {
    bg: "var(--color-feedback-success-surface)",
    fg: "var(--color-feedback-success-text)",
    bar: "var(--color-feedback-success-text)",
  },
  danger: {
    bg: "var(--color-feedback-danger-surface)",
    fg: "var(--color-feedback-danger-text)",
    bar: "var(--color-feedback-danger-text)",
  },
  info: {
    bg: "var(--color-feedback-info-surface)",
    fg: "var(--color-feedback-info-text)",
    bar: "var(--color-feedback-info-text)",
  },
};

function Stack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div
      /* Bottom-right on a desktop, but full width along the bottom on a phone —
         a 320px card pinned to the right corner of a 360px screen looks like a
         mistake. `pointer-events-none` on the container so the empty space
         above the toasts never blocks a click on the page beneath. */
      className="pointer-events-none fixed inset-x-3 bottom-3 z-[100] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px] sm:items-end"
    >
      {/* Always present, never moved: what a screen reader is watching. */}
      <div aria-live="polite" aria-atomic="false" className="sr-only">
        {toasts.filter((t) => t.tone !== "danger").map((t) => (
          <p key={t.id}>{t.title ? `${t.title}. ${t.text}` : t.text}</p>
        ))}
      </div>
      <div aria-live="assertive" aria-atomic="false" className="sr-only">
        {toasts.filter((t) => t.tone === "danger").map((t) => (
          <p key={t.id}>{t.title ? `${t.title}. ${t.text}` : t.text}</p>
        ))}
      </div>

      {toasts.map((t) => {
        const tone = TONE[t.tone];
        return (
          <div
            key={t.id}
            className="toast-in pointer-events-auto w-full overflow-hidden rounded-dash-md border border-black/5 shadow-lg"
            style={{ background: tone.bg, color: tone.fg }}
          >
            <div className="flex items-start gap-3 p-4">
              <span className="mt-0.5 shrink-0" aria-hidden>
                {t.tone === "success" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span
                    className="grid h-4 w-4 place-items-center rounded-full text-[11px] font-bold"
                    style={{ border: `1.5px solid ${tone.fg}` }}
                  >
                    {t.tone === "danger" ? "!" : "i"}
                  </span>
                )}
              </span>

              <div className="min-w-0 flex-1">
                {t.title && <p className="text-[13px] font-semibold leading-snug">{t.title}</p>}
                <p className={`text-[13px] leading-relaxed ${t.title ? "mt-0.5 opacity-90" : ""}`}>
                  {t.text}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                aria-label="Dismiss"
                className="-m-1 grid h-7 w-7 shrink-0 place-items-center rounded-dash-sm opacity-60 transition-opacity hover:opacity-100"
                style={{ color: tone.fg }}
              >
                <Close className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* How long is left, without a number. */}
            <div
              className="toast-bar h-[2px] origin-left"
              style={{
                background: tone.bar,
                opacity: 0.35,
                animationDuration: `${LIFETIME[t.tone]}ms`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
