import Link from "next/link";
import clsx from "clsx";

/**
 * Dashboard primitives.
 *
 * Denser and squarer than the public site — 13–14px type, 6/10px radii — using
 * the dashboard token set. A tool should not look like a marketing page.
 */

/* ── Status ──────────────────────────────────────────────────────────
   One vocabulary, used everywhere. Colour is never the only signal: each
   pill carries its label, so it survives greyscale and colour blindness. */
export const STATUS: Record<string, { label: string; surface: string; text: string }> = {
  draft:             { label: "Draft",            surface: "var(--color-neutral-paper-alt)",        text: "var(--color-neutral-ink-muted)" },
  in_review:         { label: "In review",        surface: "var(--color-feedback-warning-surface)", text: "var(--color-feedback-warning-text)" },
  changes_requested: { label: "Changes requested", surface: "var(--color-feedback-danger-surface)",  text: "var(--color-feedback-danger-text)" },
  scheduled:         { label: "Scheduled",        surface: "var(--color-feedback-info-surface)",    text: "var(--color-feedback-info-text)" },
  published:         { label: "Published",        surface: "var(--color-feedback-success-surface)", text: "var(--color-feedback-success-text)" },
  archived:          { label: "Archived",         surface: "var(--color-neutral-paper-alt)",        text: "var(--color-neutral-ink-muted)" },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.draft;
  return (
    <span
      className="mono inline-block whitespace-nowrap rounded-pill px-2 py-1"
      style={{ background: s.surface, color: s.text }}
    >
      {s.label}
    </span>
  );
}

/* ── Page header ─────────────────────────────────────────────────── */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-[clamp(1.5rem,1.25rem+1vw,2rem)] text-[var(--color-text-display)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}

/* ── Buttons ─────────────────────────────────────────────────────── */
const btn =
  "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-pill px-5 text-[13px] font-medium transition-colors duration-hover ease-entrance disabled:opacity-50 disabled:pointer-events-none";

export const BTN = {
  primary: clsx(btn, "bg-[var(--color-action-primary)] text-white hover:bg-[var(--color-action-primary-hover)]"),
  secondary: clsx(btn, "border border-[var(--color-action-secondary-border)] text-[var(--color-action-secondary-text)] hover:bg-[var(--color-action-secondary-hover-surface)]"),
  ghost: clsx(btn, "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-page-alt)] hover:text-[var(--color-text-primary)]"),
  danger: clsx(btn, "border border-[var(--color-feedback-danger-base)] text-[var(--color-feedback-danger-text)] hover:bg-[var(--color-feedback-danger-surface)]"),
};

export function LinkButton({
  href, variant = "primary", children, ...rest
}: { href: string; variant?: keyof typeof BTN; children: React.ReactNode } & React.ComponentProps<typeof Link>) {
  return <Link href={href} className={BTN[variant]} {...rest}>{children}</Link>;
}

/* ── Fields ──────────────────────────────────────────────────────── */
export function Field({
  label, hint, error, required, htmlFor, children,
}: {
  label: string; hint?: string; error?: string | null; required?: boolean;
  htmlFor?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mono mb-1.5 block">
        {label}
        {required && <span className="ml-1 text-[var(--color-feedback-danger-base)]" aria-hidden="true">*</span>}
      </label>
      {hint && <p className="mb-2 text-[12px] text-[var(--color-text-secondary)]">{hint}</p>}
      {children}
      {error && (
        <p role="alert" className="mt-1.5 text-[12px] text-[var(--color-feedback-danger-text)]">{error}</p>
      )}
    </div>
  );
}

export const inputCls =
  "w-full rounded-dash-sm border border-[var(--color-border-default)] bg-white px-3 py-2.5 text-[14px] text-[var(--color-text-primary)] outline-none transition-colors duration-hover focus-visible:border-[var(--color-border-brand)] disabled:bg-[var(--color-surface-disabled)]";

/* ── Empty state ─────────────────────────────────────────────────── */
export function EmptyPanel({
  title, body, action,
}: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-dash-md border border-dashed border-[var(--color-border-default)] bg-white px-6 py-14 text-center">
      <h2 className="font-display text-[1.35rem] text-[var(--color-text-display)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-[52ch] text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/* ── Notice ──────────────────────────────────────────────────────── */
export function Notice({
  tone = "info", title, children,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title?: string;
  children: React.ReactNode;
}) {
  const map = {
    info:    ["var(--color-feedback-info-surface)",    "var(--color-feedback-info-text)",    "var(--color-feedback-info-base)"],
    warning: ["var(--color-feedback-warning-surface)", "var(--color-feedback-warning-text)", "var(--color-feedback-warning-base)"],
    danger:  ["var(--color-feedback-danger-surface)",  "var(--color-feedback-danger-text)",  "var(--color-feedback-danger-base)"],
    success: ["var(--color-feedback-success-surface)", "var(--color-feedback-success-text)", "var(--color-feedback-success-base)"],
  }[tone];
  return (
    <div
      className="rounded-dash-sm border-l-2 px-4 py-3 text-[13px] leading-relaxed"
      style={{ background: map[0], color: map[1], borderColor: map[2] }}
    >
      {title && <p className="mb-1 font-medium">{title}</p>}
      {children}
    </div>
  );
}

/* ── Date helpers ────────────────────────────────────────────────── */
export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

export const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/** For <input type="datetime-local">, which will not accept an ISO string. */
export const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
