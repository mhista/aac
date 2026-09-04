/**
 * Icon set.
 *
 * One family, 24×24 grid, 1.5px stroke, `currentColor` — per the design system.
 * These replace the typed characters (→ ← ▾ ×) that were standing in: those
 * render differently in every font, sit off the optical centre, and get read
 * aloud by screen readers as words. Real paths solve all three.
 *
 * Every icon is decorative by default (`aria-hidden`), because in this codebase
 * they always sit next to a text label that carries the meaning.
 */

type Props = {
  className?: string;
  /** Set when the icon is the only content of a control and must be announced. */
  title?: string;
  strokeWidth?: number;
};

function Svg({ children, className = "", title, strokeWidth = 1.5 }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function ArrowRight(p: Props) {
  return (
    <Svg {...p}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Svg>
  );
}

export function ArrowLeft(p: Props) {
  return (
    <Svg {...p}>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </Svg>
  );
}

export function ArrowUpRight(p: Props) {
  return (
    <Svg {...p}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </Svg>
  );
}

export function ChevronDown(p: Props) {
  return (
    <Svg {...p}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function Close(p: Props) {
  return (
    <Svg {...p}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Svg>
  );
}

export function Menu(p: Props) {
  return (
    <Svg {...p}>
      <path d="M4 8h16" />
      <path d="M4 16h16" />
    </Svg>
  );
}

export function Search(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </Svg>
  );
}

export function Check(p: Props) {
  return (
    <Svg {...p}>
      <path d="m4.5 12.5 5 5 10-11" />
    </Svg>
  );
}

export function Trash(p: Props) {
  return (
    <Svg {...p}>
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </Svg>
  );
}

export function Plus(p: Props) {
  return (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function Pencil(p: Props) {
  return (
    <Svg {...p}>
      <path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20z" />
    </Svg>
  );
}
