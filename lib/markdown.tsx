import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A small Markdown renderer, deliberately hand-written.
 *
 * Two reasons it is not a library:
 *
 * 1. SAFETY. This returns React elements, never HTML strings, so there is no
 *    `dangerouslySetInnerHTML` anywhere near article bodies. A compromised
 *    contributor account cannot inject a script tag, because there is no path
 *    from text to markup — the worst it can do is write odd prose. For a
 *    health charity publishing medical information, that guarantee is worth
 *    more than the features a full parser would add.
 *
 * 2. SCOPE. Articles here need headings, paragraphs, emphasis, links, lists,
 *    quotes, images and rules. That is the whole grammar the editor documents
 *    and the whole grammar supported. Anything unrecognised renders as the
 *    plain text it is, which fails visibly rather than silently.
 *
 * Links to other pages on the site use next/link; external links open in a new
 * tab with rel="noopener", because an article that throws the reader off the
 * site mid-sentence has lost them.
 */

/* ── Inline ────────────────────────────────────────────────────────
   Order matters: code first (its contents must not be re-parsed), then
   links, then bold before italic so `**text**` is not read as two italics. */
function inline(text: string, keyPrefix = ""): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let k = 0;

  const patterns: [RegExp, (m: RegExpMatchArray, key: string) => ReactNode][] = [
    [
      /`([^`]+)`/,
      (m, key) => (
        <code key={key} className="rounded bg-[var(--color-surface-sunken)] px-1.5 py-0.5 text-[0.9em]">
          {m[1]}
        </code>
      ),
    ],
    [
      /\[([^\]]+)\]\(([^)\s]+)\)/,
      (m, key) => {
        const href = m[2];
        const internal = href.startsWith("/");
        if (internal) {
          return (
            <Link key={key} href={href} className="text-[var(--color-text-emphasis)] underline underline-offset-4">
              {m[1]}
            </Link>
          );
        }
        const safe = /^https?:\/\//i.test(href) || href.startsWith("mailto:");
        if (!safe) return <span key={key}>{m[1]}</span>;
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-text-emphasis)] underline underline-offset-4"
          >
            {m[1]}
          </a>
        );
      },
    ],
    [/\*\*([^*]+)\*\*/, (m, key) => <strong key={key} className="font-semibold">{m[1]}</strong>],
    [/(?<!\*)\*([^*]+)\*(?!\*)/, (m, key) => <em key={key}>{m[1]}</em>],
  ];

  outer: while (rest.length > 0) {
    let best: { index: number; match: RegExpMatchArray; render: (m: RegExpMatchArray, key: string) => ReactNode } | null =
      null;

    for (const [re, render] of patterns) {
      const m = rest.match(re);
      if (m && m.index !== undefined && (best === null || m.index < best.index)) {
        best = { index: m.index, match: m, render };
      }
    }

    if (!best) break outer;

    if (best.index > 0) out.push(rest.slice(0, best.index));
    out.push(best.render(best.match, `${keyPrefix}i${k++}`));
    rest = rest.slice(best.index + best.match[0].length);
  }

  if (rest) out.push(rest);
  return out;
}

/* ── Blocks ───────────────────────────────────────────────────────── */
export function Markdown({ children }: { children: string | null | undefined }) {
  if (!children?.trim()) return null;

  /* Normalise line endings so a body pasted from Word behaves like one typed
     in the editor. */
  const lines = children.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={`p${key++}`} className="mt-6 first:mt-0">
        {inline(paragraph.join(" "), `p${key}`)}
      </p>
    );
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag
        key={`l${key++}`}
        className={`mt-6 space-y-2 pl-6 ${list.ordered ? "list-decimal" : "list-disc"} marker:text-[var(--color-text-secondary)]`}
      >
        {list.items.map((it, i) => (
          <li key={i}>{inline(it, `l${key}-${i}`)}</li>
        ))}
      </Tag>
    );
    list = null;
  };

  const flushQuote = () => {
    if (quote.length === 0) return;
    blocks.push(
      <blockquote
        key={`q${key++}`}
        className="mt-8 border-l-2 border-[var(--color-border-brand)] pl-6 text-body-l leading-lede text-[var(--color-text-primary)]"
      >
        {inline(quote.join(" "), `q${key}`)}
      </blockquote>
    );
    quote = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim() === "") {
      flushAll();
      continue;
    }

    /* Image on its own line: ![alt](url) */
    const img = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (img && /^https?:\/\//i.test(img[2])) {
      flushAll();
      blocks.push(
        <figure key={`f${key++}`} className="mt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img[2]} alt={img[1]} loading="lazy" className="w-full rounded-lg" />
          {img[1] && (
            <figcaption className="mono mt-3">{img[1]}</figcaption>
          )}
        </figure>
      );
      continue;
    }

    if (/^(---|\*\*\*)$/.test(line.trim())) {
      flushAll();
      blocks.push(<hr key={`h${key++}`} className="mt-10 border-[var(--color-border-default)]" />);
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.*)$/);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      const size =
        level === 2
          ? "text-[clamp(1.4rem,1.2rem+0.9vw,1.9rem)] mt-12"
          : level === 3
            ? "text-[1.3rem] mt-10"
            : "text-[1.1rem] mt-8";
      const Tag = (`h${level}` as unknown) as "h2";
      blocks.push(
        <Tag key={`t${key++}`} className={`font-display leading-heading text-[var(--color-text-display)] ${size}`}>
          {inline(heading[2], `t${key}`)}
        </Tag>
      );
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushParagraph();
      flushQuote();
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }

    const q = line.match(/^>\s?(.*)$/);
    if (q) {
      flushParagraph();
      flushList();
      quote.push(q[1]);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }

  flushAll();
  return <>{blocks}</>;
}

/** Rough reading time. Used when an author has not set one. */
export function readingMinutes(body?: string | null) {
  if (!body) return null;
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}
