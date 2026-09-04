"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createChapter, saveChapter, deleteChapter } from "@/lib/cms/chapters";
import { ROLE_LABEL } from "@/lib/auth/permissions";
import { BTN, Field, inputCls, Notice, EmptyPanel } from "./ui";
import { ConfirmDelete } from "./ConfirmDelete";

/**
 * Chapters.
 *
 * Grouped by country, because that is how the organisation actually thinks
 * about itself — "how are we doing in Ghana" is a real question, "chapters
 * 40–60 alphabetically" is not.
 *
 * A chapter marked live with nobody attached is called out on its row. That
 * combination is the most common real failure: a chapter goes on the website,
 * a visitor writes to it, and nobody is listening.
 */

type Chapter = {
  id: string;
  name: string;
  university: string;
  city: string | null;
  country: string;
  region_id: string | null;
  zone_id: string | null;
  member_count: number | null;
  status: string;
  founded_at: string | null;
};

type Opt = { id: string; name: string };

const STATUS_LABEL: Record<string, string> = {
  pending: "Being set up",
  active: "Live on the site",
  dormant: "Dormant",
  closed: "Closed",
};

const STATUS_TONE: Record<string, string> = {
  pending: "var(--color-feedback-info-surface)",
  active: "var(--color-feedback-success-surface)",
  dormant: "var(--color-feedback-warning-surface)",
  closed: "var(--color-neutral-paper-alt)",
};

const COUNTRIES = ["Nigeria", "Ghana", "Kenya"];

export function ChaptersManager({
  chapters,
  regions,
  zones,
  people,
  filter,
  canCreate,
  canDelete,
  canPublish,
}: {
  chapters: Chapter[];
  regions: Opt[];
  zones: Opt[];
  people: Record<string, { name: string; role: string }[]>;
  filter: string;
  canCreate: boolean;
  canDelete: boolean;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string; id?: string }>) =>
    start(async () => {
      const res = await fn();
      setMsg({ ok: res.ok, text: res.ok ? res.message ?? "Saved." : res.error ?? "That did not work." });
      if (res.ok && res.id) setOpenId(res.id);
      router.refresh();
    });

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return chapters;
    return chapters.filter(
      (c) =>
        c.university.toLowerCase().includes(needle) ||
        c.name.toLowerCase().includes(needle) ||
        c.city?.toLowerCase().includes(needle) ||
        c.country.toLowerCase().includes(needle)
    );
  }, [chapters, q]);

  const grouped = useMemo(() => {
    const map: Record<string, Chapter[]> = {};
    for (const c of shown) (map[c.country] ??= []).push(c);
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [shown]);

  const liveEmpty = chapters.filter(
    (c) => c.status === "active" && (people[c.id]?.length ?? 0) === 0
  ).length;

  return (
    <div className="space-y-6">
      {msg && <Notice tone={msg.ok ? "success" : "danger"}>{msg.text}</Notice>}

      {liveEmpty > 0 && (
        <Notice tone="warning" title={`${liveEmpty} live chapter${liveEmpty === 1 ? " has" : "s have"} nobody attached`}>
          They are on the public site with no coordinator. Someone writing to them gets no reply.
          Assign a campus coordinator in Users &amp; roles, or set the chapter back to “Being set up”.
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {["all", "active", "pending", "dormant", "closed"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() =>
              router.push(`/dashboard/chapters${s === "all" ? "" : `?status=${s}`}`)
            }
            className={`mono rounded-pill px-3 py-1.5 transition-colors ${
              filter === s
                ? "bg-[var(--color-action-primary)] text-white"
                : "border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-page-alt)]"
            }`}
          >
            {s === "all" ? "All" : STATUS_LABEL[s]}
          </button>
        ))}

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search university, city or country"
          aria-label="Search chapters"
          className={`${inputCls} ml-auto max-w-[300px]`}
        />
        {canCreate && (
          <button type="button" disabled={pending} onClick={() => run(createChapter)} className={BTN.primary}>
            Add a chapter
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyPanel
          title={q || filter !== "all" ? "Nothing matches" : "No chapters yet"}
          body={
            q || filter !== "all"
              ? "Try a different search, or clear the filter."
              : "A chapter is a university group. Adding one here lets you attach a campus coordinator to it and list it on the public site."
          }
        />
      ) : (
        grouped.map(([country, list]) => (
          <section key={country}>
            <p className="mono mb-2">
              {country} · {list.length}
            </p>
            <ul className="space-y-3">
              {list.map((c) => {
                const open = openId === c.id;
                const attached = people[c.id] ?? [];
                return (
                  <li
                    key={c.id}
                    className="overflow-hidden rounded-dash-md border border-[var(--color-border-default)] bg-white"
                  >
                    <div className="flex flex-wrap items-center gap-4 p-4">
                      <div className="min-w-[220px] flex-1">
                        <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
                          {c.university}
                        </p>
                        <p className="mono mt-0.5">
                          {[c.city, c.name !== c.university ? c.name : null].filter(Boolean).join(" · ") ||
                            "No city yet"}
                        </p>
                      </div>

                      <span className="mono">
                        {attached.length > 0
                          ? attached.map((p) => p.name).join(", ")
                          : "Nobody attached"}
                      </span>

                      {c.member_count ? <span className="mono">{c.member_count} members</span> : null}

                      <span
                        className="mono rounded-pill px-2 py-1"
                        style={{ background: STATUS_TONE[c.status] }}
                      >
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>

                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : c.id)}
                        className={BTN.secondary}
                        aria-expanded={open}
                      >
                        {open ? "Close" : "Edit"}
                      </button>
                      {canDelete && (
                        <ConfirmDelete
                          compact
                          icon
                          what={c.university}
                          consequence={
                            c.status === "active"
                              ? "It is listed on the public site and will disappear from it."
                              : undefined
                          }
                          action={() => deleteChapter(c.id)}
                        />
                      )}
                    </div>

                    {open && (
                      <div className="space-y-5 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-page-alt)] p-5">
                        <form action={(fd) => run(() => saveChapter(c.id, fd))} className="space-y-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="University" htmlFor={`u-${c.id}`} required>
                              <input id={`u-${c.id}`} name="university" defaultValue={c.university} className={inputCls} />
                            </Field>
                            <Field
                              label="Chapter name"
                              htmlFor={`n-${c.id}`}
                              hint="How it is written on the site. Leave blank to use the university."
                            >
                              <input id={`n-${c.id}`} name="name" defaultValue={c.name} className={inputCls} />
                            </Field>
                            <Field label="City" htmlFor={`c-${c.id}`}>
                              <input id={`c-${c.id}`} name="city" defaultValue={c.city ?? ""} className={inputCls} />
                            </Field>
                            <Field label="Country" htmlFor={`co-${c.id}`} required>
                              <input
                                id={`co-${c.id}`}
                                name="country"
                                defaultValue={c.country}
                                list={`countries-${c.id}`}
                                className={inputCls}
                              />
                              <datalist id={`countries-${c.id}`}>
                                {COUNTRIES.map((x) => <option key={x} value={x} />)}
                              </datalist>
                            </Field>
                            <Field
                              label="Zone"
                              htmlFor={`z-${c.id}`}
                              hint={zones.length ? "Which zone this campus sits in." : "No zones yet — add one above."}
                            >
                              <select id={`z-${c.id}`} name="zone_id" defaultValue={c.zone_id ?? ""} className={inputCls}>
                                <option value="">Not set</option>
                                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                              </select>
                            </Field>
                            <Field label="Region" htmlFor={`r-${c.id}`}>
                              <select id={`r-${c.id}`} name="region_id" defaultValue={c.region_id ?? ""} className={inputCls}>
                                <option value="">Not set</option>
                                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                              </select>
                            </Field>
                            <Field
                              label="Members"
                              htmlFor={`m-${c.id}`}
                              hint="Leave blank rather than guessing — the site shows nothing instead of a made-up number."
                            >
                              <input
                                id={`m-${c.id}`}
                                name="member_count"
                                type="number"
                                min={0}
                                defaultValue={c.member_count ?? ""}
                                className={inputCls}
                              />
                            </Field>
                            <Field label="Founded" htmlFor={`f-${c.id}`}>
                              <input
                                id={`f-${c.id}`}
                                name="founded_at"
                                type="date"
                                defaultValue={c.founded_at ?? ""}
                                className={inputCls}
                              />
                            </Field>
                            <Field
                              label="Status"
                              htmlFor={`s-${c.id}`}
                              hint={
                                canPublish
                                  ? "Only “Live on the site” is visible to the public."
                                  : "Making a chapter live needs a regional coordinator."
                              }
                            >
                              <select id={`s-${c.id}`} name="status" defaultValue={c.status} className={inputCls}>
                                {Object.entries(STATUS_LABEL).map(([v, l]) => (
                                  <option key={v} value={v} disabled={v === "active" && !canPublish}>
                                    {l}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          </div>

                          <button type="submit" disabled={pending} className={BTN.primary}>
                            Save
                          </button>
                        </form>

                        <div className="border-t border-[var(--color-border-subtle)] pt-4">
                          <p className="mono mb-2">Attached to this chapter</p>
                          {attached.length === 0 ? (
                            <p className="text-[12px] text-[var(--color-text-secondary)]">
                              Nobody yet. People are attached by giving them a role in Users &amp;
                              roles and choosing this chapter — not here, so there is one place
                              where access is decided.
                            </p>
                          ) : (
                            <ul className="space-y-1">
                              {attached.map((p) => (
                                <li key={p.name} className="text-[13px] text-[var(--color-text-secondary)]">
                                  {p.name} <span className="mono">{ROLE_LABEL[p.role as never] ?? p.role}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => {
                                if (confirm(`Delete the ${c.university} chapter permanently?`)) {
                                  run(() => deleteChapter(c.id));
                                }
                              }}
                              className={`${BTN.danger} mt-4`}
                            >
                              Delete chapter
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
