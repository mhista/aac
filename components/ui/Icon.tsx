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

export function Phone(p: Props) {
  return (
    <Svg {...p}>
      <path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5L16 14l4 1.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z" />
    </Svg>
  );
}

export function MapPin(p: Props) {
  return (
    <Svg {...p}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </Svg>
  );
}

export function Chat(p: Props) {
  return (
    <Svg {...p}>
      <path d="M4.5 19.5l1.2-3.6A7.5 7.5 0 1 1 8.4 18.6l-3.9.9z" />
    </Svg>
  );
}

export function Mail(p: Props) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="M4 7l8 6 8-6" />
    </Svg>
  );
}

export function Globe(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5S9.7 5.9 12 3.5z" />
    </Svg>
  );
}

export function Clock(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}
