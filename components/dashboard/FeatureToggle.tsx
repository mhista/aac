"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setFeatured } from "@/lib/cms/featuring";
import { Notice } from "./ui";
import { useToast } from "./Toast";

/**
 * "Put this on the main AAC website."
 *
 * Shown only to the handful of people who curate the front page, and only for
 * work that belongs to a chapter — AAC's own entries are already on the main
 * site, so offering the switch there would be a control that does nothing.
 *
 * The wording avoids "feature", which sounds like a compliment being paid.
 * What is actually being decided is where something appears.
 */
export function FeatureToggle({
  kind,
  id,
  on,
  published,
  chapterName,
}: {
  kind: "events" | "posts" | "programmes";
  id: string;
  on: boolean;
  published: boolean;
  chapterName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState(on);
  const toast = useToast();

  const toggle = () =>
    start(async () => {
      const next = !state;
      const res = await setFeatured(kind, id, next);
      if (res.ok) {
        setState(next);
        toast({ tone: "success", text: res.message ?? "Saved." });
      } else {
        toast({ tone: "danger", text: res.error });
      }
      router.refresh();
    });

  const noun = kind === "events" ? "event" : kind === "posts" ? "article" : "programme";

  return (
    <div className="rounded-dash-md border border-[var(--color-border-default)] bg-white p-5">
      <p className="mono mb-1">The main AAC website</p>
      <p className="mb-3 max-w-[62ch] text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
        This {noun} belongs to {chapterName} and appears on their site. Switch this on to show it on
        aaci.ngo as well — the same entry, not a copy, so edits stay in one place.
      </p>


      <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={state}
          disabled={pending || (!state && !published)}
          onChange={toggle}
          className="h-4 w-4 accent-[var(--color-action-primary)]"
        />
        <span className="text-[13px] text-[var(--color-text-primary)]">
          Show on the main AAC website
        </span>
      </label>

      {!published && !state && (
        <p className="mono mt-1.5">Publish it first.</p>
      )}
    </div>
  );
}
