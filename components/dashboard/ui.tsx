import Link from "next/link";
import clsx from "clsx";

/**
 * Dashboard primitives.
 *
 * Quiet and modern: one sans typeface, neutral surfaces, soft rounded cards,
 * AAC violet only for what is primary or active. The shell's .dash-ui scope
 * (app/globals.css) supplies the colours; these supply the shapes.
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
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium"
      style={{ background: s.surface, color: s.text }}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor", opacity: 0.7 }} />
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
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-9">
      <div>
        <h1 className="font-display text-[26px] leading-tight text-[var(--color-text-display)] sm:text-[32px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
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
  "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl px-4 text-[13.5px] font-medium transition duration-hover ease-entrance disabled:opacity-50 disabled:pointer-events-none";

export const BTN = {
  primary: clsx(btn, "dash-btn-primary text-white"),
  secondary: clsx(btn, "border border-[var(--color-border-default)] bg-white text-[var(--color-text-primary)] shadow-[0_1px_2px_rgb(24_24_27/.05)] hover:bg-[var(--color-surface-page-alt)]"),
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
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-primary)]">
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
  "w-full rounded-dash-sm border border-[var(--color-border-default)] bg-white px-3.5 py-2.5 text-[14px] text-[var(--color-text-primary)] shadow-[0_1px_2px_rgb(24_24_27/.04)] outline-none transition duration-hover placeholder:text-[var(--dash-faint)] focus:border-[var(--color-violet-400)] focus:ring-4 focus:ring-[var(--color-violet-100)] disabled:bg-[var(--color-surface-disabled)]";

/* ── Empty state ─────────────────────────────────────────────────── */
export function EmptyPanel({
  title, body, action,
}: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-dash-md border border-dashed border-[var(--dash-line-strong)] bg-white/60 px-6 py-16 text-center">
      <h2 className="font-display text-[20px] text-[var(--color-text-display)]">{title}</h2>
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
      className="rounded-dash-sm border-l-[3px] px-4 py-3 text-[13px] leading-relaxed"
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
