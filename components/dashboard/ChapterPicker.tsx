"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Which chapter am I looking at?
 *
 * A plain select that rewrites the URL, so the chosen chapter survives a
 * refresh and can be sent to somebody else in a link. Only rendered when there
 * is more than one to choose between.
 */
export function ChapterPicker({
  chapters,
  selected,
  className,
}: {
  chapters: { id: string; name: string }[];
  selected: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Chapter</span>
      <select
        value={selected}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set("chapter", e.target.value);
          router.push(`${pathname}?${next.toString()}`);
        }}
        className={className}
      >
        {chapters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
