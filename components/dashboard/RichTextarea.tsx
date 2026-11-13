"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Markdown, readingMinutes } from "@/lib/markdown";
import { youTubeId, youTubeThumb } from "@/lib/media/youtube";
import { MediaUploader } from "./MediaUploader";
import { BTN, inputCls } from "./ui";

/**
 * The writing editor — articles, event recaps, programme descriptions.
 *
 * What is stored is still plain Markdown, rendered by lib/markdown.tsx, so
 * nothing about how content is saved or published changes. What changes is
 * that nobody has to know Markdown to use it:
 *
 * · A toolbar for every format the site supports — headings, bold, italic,
 *   lists, quotes, links, images, YouTube videos, dividers. Each button wraps
 *   the selection, or inserts a placeholder and selects it so the next thing
 *   typed replaces it.
 * · Ctrl/⌘+B, I and K, because that is what people's fingers already do.
 * · Pasting from Word or Google Docs keeps the headings, bold, italic, lists
 *   and links instead of flattening them into one paragraph. Anything else
 *   (fonts, colours, tables) is dropped, deliberately — the site's own
 *   typography is the point.
 * · A Preview tab that uses the exact renderer the public page uses.
 *
 * Works as a controlled field (value + onChange) or inside an ordinary form
 * (name + defaultValue). Either way a real <textarea name=…> is submitted, and
 * toolbar edits fire a normal input event so a form's "unsaved changes" guard
 * notices them.
 */

type Panel = "link" | "image" | "video" | null;

export function RichTextarea({
  id,
  name,
  value,
  defaultValue,
  onChange,
  rows = 18,
  placeholder,
  disabled = false,
  uploadFolder = "/blog",
  label,
}: {
  id: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  /** Where images inserted from the toolbar are uploaded. */
  uploadFolder?: string;
  /** A screen-reader label, only when no visible <label for={id}> exists. */
  label?: string;
}) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? "");
  const text = controlled ? value! : inner;
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [panel, setPanel] = useState<Panel>(null);
  const [panelValue, setPanelValue] = useState("");
  /* Selection to restore after an async edit (a panel or an upload). */
  const pendingSel = useRef<[number, number] | null>(null);
  const savedSel = useRef<[number, number]>([0, 0]);

  const set = (next: string) => {
    if (!controlled) setInner(next);
    onChange?.(next);
  };

  /* Put the caret where the edit left it, once React has rendered the text. */
  useEffect(() => {
    const sel = pendingSel.current;
    const el = ref.current;
    if (!sel || !el) return;
    pendingSel.current = null;
    el.focus();
    el.setSelectionRange(sel[0], sel[1]);
    /* Let the surrounding form know something changed. */
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, [text]);

  const selection = (): [number, number] => {
    const el = ref.current;
    return el ? [el.selectionStart, el.selectionEnd] : savedSel.current;
  };

  /** Replace [from, to) with `insert`, then select [selFrom, selTo) within it. */
  function replace(from: number, to: number, insert: string, selFrom: number, selTo: number) {
    const next = text.slice(0, from) + insert + text.slice(to);
    pendingSel.current = [from + selFrom, from + selTo];
    set(next);
  }

  /** Wrap the selection in `mark` (bold, italic), or insert a placeholder. */
  function wrap(mark: string, placeholderText: string) {
    const [a, b] = selection();
    const sel = text.slice(a, b);
    if (sel && sel.startsWith(mark) && sel.endsWith(mark) && sel.length >= mark.length * 2) {
      const inner = sel.slice(mark.length, sel.length - mark.length);
      return replace(a, b, inner, 0, inner.length); // toggle off
    }
    const body = sel || placeholderText;
    replace(a, b, `${mark}${body}${mark}`, mark.length, mark.length + body.length);
  }

  /** Apply a line prefix (## , - , 1. , > ) to every line in the selection. */
  function prefixLines(kind: "h2" | "h3" | "ul" | "ol" | "quote") {
    const [a, b] = selection();
    const start = text.lastIndexOf("\n", a - 1) + 1;
    const endNl = text.indexOf("\n", b);
    const end = endNl === -1 ? text.length : endNl;
    const lines = text.slice(start, end).split("\n");
    const strip = (l: string) => l.replace(/^(#{2,4}\s+|[-*]\s+|\d+[.)]\s+|>\s?)/, "");
    const marker = (i: number) =>
      kind === "h2" ? "## " : kind === "h3" ? "### " : kind === "ul" ? "- " : kind === "ol" ? `${i + 1}. ` : "> ";
    const already = lines.every((l, i) => l.startsWith(marker(i)) || (kind === "ol" && /^\d+[.)]\s/.test(l)));
    const out = lines
      .map((l, i) => (already ? strip(l) : marker(i) + (strip(l) || (kind.startsWith("h") ? "Heading" : ""))))
      .join("\n");
    /* Headings and blocks need a blank line around them to be read as such. */
    const before = start > 0 && text[start - 2] !== "\n" && !already ? "\n" : "";
    replace(start, end, before + out, before.length, before.length + out.length);
  }

  /** Insert a block (image, video, divider) on its own line. */
  function insertBlock(block: string, select?: [number, number]) {
    const [a, b] = pendingSel.current ?? selection();
    const lead = a === 0 ? "" : text[a - 1] === "\n" ? (text[a - 2] === "\n" ? "" : "\n") : "\n\n";
    const tail = text[b] === "\n" ? "\n" : "\n\n";
    const insert = lead + block + tail;
    const [s0, s1] = select ?? [block.length, block.length];
    replace(a, b, insert, lead.length + s0, lead.length + s1);
  }

  function openPanel(p: Panel) {
    savedSel.current = selection();
    setPanelValue("");
    setPanel(panel === p ? null : p);
  }

  function applyLink() {
    const url = panelValue.trim();
    if (!/^(https?:\/\/|mailto:|\/)/i.test(url)) return;
    const [a, b] = savedSel.current;
    const sel = text.slice(a, b) || "link text";
    const insert = `[${sel}](${url})`;
    setPanel(null);
    replace(a, b, insert, 1, 1 + sel.length);
  }

  function applyVideo() {
    const vid = youTubeId(panelValue);
    if (!vid) return;
    setPanel(null);
    pendingSel.current = savedSel.current;
    insertBlock(`https://www.youtube.com/watch?v=${vid}`);
  }

  function applyImage(url: string) {
    setPanel(null);
    pendingSel.current = savedSel.current;
    const alt = "Describe this image";
    /* The description is selected, so typing replaces it — alt text is not
       optional on this site. */
    insertBlock(`![${alt}](${url})`, [2, 2 + alt.length]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === "b") { e.preventDefault(); wrap("**", "bold text"); }
    else if (k === "i") { e.preventDefault(); wrap("*", "italic text"); }
    else if (k === "k") { e.preventDefault(); openPanel("link"); }
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const html = e.clipboardData.getData("text/html");
    if (!html) return; // plain text pastes as itself
    const md = htmlToMarkdown(html);
    if (!md.trim()) return;
    e.preventDefault();
    const [a, b] = selection();
    replace(a, b, md, md.length, md.length);
  }

  const tools: { label: string; title: string; run: () => void; el: ReactNode }[] = [
    { label: "Heading", title: "Section heading", run: () => prefixLines("h2"), el: <span className="font-semibold">H</span> },
    { label: "Subheading", title: "Smaller heading", run: () => prefixLines("h3"), el: <span className="text-[11px] font-semibold">H2</span> },
    { label: "Bold", title: "Bold (Ctrl+B)", run: () => wrap("**", "bold text"), el: <span className="font-bold">B</span> },
    { label: "Italic", title: "Italic (Ctrl+I)", run: () => wrap("*", "italic text"), el: <span className="italic">I</span> },
    { label: "Bullet list", title: "Bullet list", run: () => prefixLines("ul"), el: <span>•≡</span> },
    { label: "Numbered list", title: "Numbered list", run: () => prefixLines("ol"), el: <span className="text-[11px]">1≡</span> },
    { label: "Quote", title: "Pull quote", run: () => prefixLines("quote"), el: <span className="text-[16px] leading-none">“</span> },
    { label: "Link", title: "Link (Ctrl+K)", run: () => openPanel("link"), el: <span className="underline">link</span> },
    { label: "Image", title: "Insert an image", run: () => openPanel("image"), el: <span>Image</span> },
    { label: "Video", title: "Insert a YouTube video", run: () => openPanel("video"), el: <span>Video</span> },
    { label: "Divider", title: "Horizontal divider", run: () => insertBlock("---"), el: <span>—</span> },
  ];

  const videoId = panel === "video" ? youTubeId(panelValue) : null;

  return (
    <div className="rounded-dash-md border border-[var(--color-border-default)] bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--color-border-subtle)] px-2 py-1.5">
        {(["write", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setPanel(null); }}
            aria-pressed={tab === t}
            className={`mono rounded-dash-sm px-3 py-1.5 transition-colors ${
              tab === t ? "bg-[var(--color-violet-100)] !text-[var(--color-violet-700)]" : "hover:bg-[var(--color-surface-page-alt)]"
            }`}
          >
            {t === "write" ? "Write" : "Preview"}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-[var(--color-border-subtle)]" aria-hidden="true" />
        {tab === "write" &&
          tools.map((t) => (
            <button
              key={t.label}
              type="button"
              title={t.title}
              aria-label={t.label}
              disabled={disabled}
              /* Keep the textarea's selection: a mousedown on a button would
                 otherwise blur it and lose what the person had selected. */
              onMouseDown={(e) => e.preventDefault()}
              onClick={t.run}
              className="min-h-[32px] min-w-[32px] rounded-dash-sm px-2 text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-page-alt)] disabled:opacity-40"
            >
              {t.el}
            </button>
          ))}
        <span className="mono ml-auto pr-2">{text.trim() ? `${readingMinutes(text)} min read` : "empty"}</span>
      </div>

      {tab === "write" && panel && (
        <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-page-alt)] px-4 py-3">
          {panel === "image" ? (
            <div className="space-y-2">
              <MediaUploader
                folder={uploadFolder}
                accept="image/*"
                label="Insert an image"
                hint="It goes in where the cursor was. You will be asked to describe it."
                onUploaded={(r) => applyImage(r.url)}
              />
              <button type="button" onClick={() => setPanel(null)} className={BTN.ghost}>Cancel</button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor={`${id}-panel`} className="mono shrink-0">
                {panel === "link" ? "Link to" : "YouTube link"}
              </label>
              <input
                id={`${id}-panel`}
                autoFocus
                value={panelValue}
                onChange={(e) => setPanelValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); panel === "link" ? applyLink() : applyVideo(); }
                  if (e.key === "Escape") { e.preventDefault(); setPanel(null); }
                }}
                placeholder={panel === "link" ? "https://… or /events" : "https://youtu.be/…"}
                className={inputCls}
              />
              <button
                type="button"
                onClick={panel === "link" ? applyLink : applyVideo}
                disabled={panel === "link" ? !/^(https?:\/\/|mailto:|\/)/i.test(panelValue.trim()) : !videoId}
                className={`${BTN.primary} shrink-0`}
              >
                Insert
              </button>
              <button type="button" onClick={() => setPanel(null)} className={`${BTN.ghost} shrink-0`}>Cancel</button>
            </div>
          )}
          {panel === "video" && (
            <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">
              {videoId ? (
                <span className="inline-flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={youTubeThumb(videoId)} alt="" className="h-9 w-16 rounded object-cover" /> Found it.
                </span>
              ) : (
                "Upload the video to AAC's YouTube channel, press Share under it, and paste the link here."
              )}
            </p>
          )}
        </div>
      )}

      {/* The textarea stays mounted on the Preview tab (just hidden), so a form
          always submits the current text. */}
      <div className={tab === "write" ? "p-4" : "hidden"}>
        {label && <label htmlFor={id} className="sr-only">{label}</label>}
        <textarea
          ref={ref}
          id={id}
          name={name}
          value={text}
          onChange={(e) => set(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onSelect={() => { savedSel.current = selection(); }}
          rows={rows}
          disabled={disabled}
          placeholder={placeholder}
          className={`${inputCls} resize-y text-[15px] leading-[1.7]`}
        />
        <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">
          Use the buttons above, or paste straight from Word or Google Docs — headings, bold, lists and links come
          across. Leave a blank line between paragraphs.
        </p>
      </div>

      {tab === "preview" && (
        <div className="p-5">
          {text.trim() ? (
            <div className="mx-auto max-w-[68ch] text-[15px] leading-relaxed">
              <Markdown>{text}</Markdown>
            </div>
          ) : (
            <p className="py-10 text-center text-[13px] text-[var(--color-text-secondary)]">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Paste from Word / Google Docs ──────────────────────────────────
   Turns pasted HTML into the Markdown the site renders. Only the formats the
   site supports survive; everything else becomes plain text. Runs in the
   browser on the clipboard's HTML, which is parsed into an inert document —
   nothing in it is ever executed or inserted into the page. */
export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,meta,link,title,head").forEach((n) => n.remove());

  const isBold = (el: HTMLElement) =>
    ["B", "STRONG"].includes(el.tagName) ||
    /font-weight:\s*(bold|[6-9]00)/i.test(el.getAttribute("style") ?? "");
  const isItalic = (el: HTMLElement) =>
    ["I", "EM"].includes(el.tagName) || /font-style:\s*italic/i.test(el.getAttribute("style") ?? "");

  function inline(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").replace(/\s+/g, " ");
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    if (el.tagName === "BR") return "\n";
    let inner = Array.from(el.childNodes).map(inline).join("");
    if (el.tagName === "A") {
      const href = el.getAttribute("href") ?? "";
      if (/^(https?:|mailto:|\/)/i.test(href) && inner.trim()) return `[${inner.trim()}](${href})`;
      return inner;
    }
    /* Google Docs wraps the whole paste in <b style="font-weight:normal">. */
    const weightNormal = /font-weight:\s*(normal|400)/i.test(el.getAttribute("style") ?? "");
    /* Markers hug the words; any space inside the tag moves outside it, so
       "<b>bold </b>next" becomes "**bold** next", not "**bold **next". */
    const hug = (s: string, m: string) => {
      const lead = s.match(/^\s*/)![0];
      const trail = s.match(/\s*$/)![0];
      return `${lead}${m}${s.trim()}${m}${trail}`;
    };
    if (inner.trim() && isBold(el) && !weightNormal) inner = hug(inner, "**");
    if (inner.trim() && isItalic(el)) inner = hug(inner, "*");
    return inner;
  }

  const out: string[] = [];
  function block(node: Node, listDepth = 0) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? "").trim();
      if (t) out.push(t);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName;
    const text = () => Array.from(el.childNodes).map(inline).join("").replace(/[ \t]+/g, " ").trim();

    if (/^H[1-2]$/.test(tag)) { const t = text(); if (t) out.push(`## ${t.replace(/\*+/g, "")}`); return; }
    if (/^H[3-6]$/.test(tag)) { const t = text(); if (t) out.push(`### ${t.replace(/\*+/g, "")}`); return; }
    if (tag === "UL" || tag === "OL") {
      const items = Array.from(el.children).filter((c) => c.tagName === "LI");
      out.push(items.map((li, i) => `${tag === "OL" ? `${i + 1}.` : "-"} ${Array.from(li.childNodes).map(inline).join("").replace(/\s+/g, " ").trim()}`).join("\n"));
      return;
    }
    if (tag === "BLOCKQUOTE") { const t = text(); if (t) out.push(`> ${t}`); return; }
    if (tag === "HR") { out.push("---"); return; }
    if (tag === "IMG") return; // pasted images are not uploaded; use the Image button
    if (tag === "P" || tag === "LI") { const t = text(); if (t) out.push(t); return; }
    /* DIV, SPAN, B (Google Docs wrapper), BODY … descend. */
    const hasBlocks = Array.from(el.children).some((c) => /^(P|H[1-6]|UL|OL|DIV|BLOCKQUOTE|HR|TABLE)$/.test(c.tagName));
    if (hasBlocks) Array.from(el.childNodes).forEach((c) => block(c, listDepth));
    else { const t = text(); if (t) out.push(t); }
  }

  Array.from(doc.body.childNodes).forEach((n) => block(n));
  return out
    .map((b) => b.replace(/\*\*\*\*/g, "").replace(/ +\n/g, "\n").trim())
    .filter(Boolean)
    .join("\n\n");
}
