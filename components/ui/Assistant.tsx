"use client";

import { useEffect, useRef, useState } from "react";
import { Close } from "./Icon";

/**
 * The assistant window.
 *
 * Deliberately modest. It sits in the corner, opens on a click, and never
 * appears on its own — a chat bubble that pops open unprompted on a page about
 * cancer is an interruption at exactly the wrong moment, and the person
 * reading that page may be having the worst week of their life.
 *
 * The first thing it says is what it is for and what it is not for. That is
 * not boilerplate: a visitor who thinks they are talking to a nurse will ask a
 * nurse's question, and the honest answer is disappointing. Saying so up front
 * costs one line and avoids that.
 *
 * The whole conversation lives in component state and is gone when the tab
 * closes. Nothing about it is stored, which is the right default for a place
 * where somebody might type their diagnosis.
 */

type Turn = { role: "user" | "assistant"; content: string };

const OPENER =
  "Hello. I can help with questions about All Against Cancer — what we do, how to join, where our chapters are, or how to reach our support team.\n\nI cannot give medical advice or say what a symptom might mean. For anything about your own health, please speak to a doctor.";

const SUGGESTIONS = [
  "How do I become an advocate?",
  "Is there a chapter near me?",
  "How can I get support?",
];

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  /* Keep the newest message in view as answers arrive. */
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  /* Escape closes it, wherever focus is. */
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;

    setError(null);
    setText("");
    const next: Turn[] = [...turns, { role: "user", content: q }];
    setTurns(next);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.reply) {
        setError(data?.error ?? "I could not answer just then. Try again in a moment.");
      } else {
        setTurns((t) => [...t, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setError("Something went wrong reaching the assistant. Check your connection and try again.");
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask a question about AAC"
        className="fixed bottom-5 right-5 z-40 inline-flex min-h-[48px] items-center gap-2 rounded-pill bg-[var(--color-action-primary)] px-5 py-3 text-body font-medium text-white shadow-lg transition-colors duration-hover ease-entrance hover:bg-[var(--color-action-primary-hover)]"
      >
        Ask a question
      </button>
    );
  }

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label="Ask AAC"
      className="fixed inset-x-3 bottom-3 z-40 flex max-h-[min(78vh,620px)] flex-col overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[400px]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3">
        <div>
          <p className="text-body font-medium text-[var(--color-text-primary)]">Ask AAC</p>
          <p className="mono">Not medical advice</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="grid h-9 w-9 place-items-center rounded-pill text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]"
        >
          <Close className="h-4 w-4" />
        </button>
      </header>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
        <Bubble role="assistant">{OPENER}</Bubble>

        {turns.map((t, i) => (
          <Bubble key={i} role={t.role}>
            {t.content}
          </Bubble>
        ))}

        {busy && (
          <p className="mono" role="status">
            Thinking…
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-md px-3 py-2 text-caption leading-body"
            style={{
              background: "var(--color-feedback-danger-surface)",
              color: "var(--color-feedback-danger-text)",
            }}
          >
            {error}
          </p>
        )}

        {turns.length === 0 && !busy && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-pill border border-[var(--color-border-default)] px-3 py-2 text-caption text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-brand)] hover:text-[var(--color-text-primary)]"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="border-t border-[var(--color-border-subtle)] p-3"
      >
        <div className="flex items-end gap-2">
          <label htmlFor="assistant-input" className="sr-only">
            Your question
          </label>
          <textarea
            id="assistant-input"
            ref={input}
            value={text}
            rows={1}
            maxLength={1200}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              /* Enter sends, Shift+Enter makes a new line — what people expect
                 from every other chat they have used. */
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(text);
              }
            }}
            placeholder="Ask about AAC…"
            className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-3 py-3 text-body text-[var(--color-text-primary)] outline-none focus-visible:border-[var(--color-border-brand)]"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="min-h-[44px] rounded-pill bg-[var(--color-action-primary)] px-5 text-body font-medium text-white transition-colors duration-hover hover:bg-[var(--color-action-primary-hover)] disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const mine = role === "user";
  return (
    <div className={mine ? "flex justify-end" : "flex justify-start"}>
      <div
        className="max-w-[85%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-body leading-body"
        style={
          mine
            ? { background: "var(--color-action-primary)", color: "#fff" }
            : {
                background: "var(--color-surface-sunken)",
                color: "var(--color-text-primary)",
              }
        }
      >
        {children}
      </div>
    </div>
  );
}
