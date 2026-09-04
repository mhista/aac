"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createZone, saveZone, deleteZone } from "@/lib/cms/zones";
import { BTN, Field, inputCls, Notice } from "./ui";
import { ConfirmDelete } from "./ConfirmDelete";
import { Plus } from "@/components/ui/Icon";

/**
 * Zones.
 *
 * Sits with chapters rather than on its own screen: a zone is only meaningful
 * as a grouping of chapters, and splitting them across two pages would mean
 * navigating away to answer "which zone does Nsukka sit in?".
 *
 * Collapsed by default. Zones change once a year at most, while chapters
 * change weekly — the common case should not have to scroll past the rare one.
 */

type Zone = {
  id: string;
  name: string;
  country: string;
  covers: string | null;
  region_id: string | null;
  chapters?: number;
  coordinator?: string | null;
};

type Opt = { id: string; name: string };

const COUNTRIES = ["Nigeria", "Ghana", "Kenya"];

export function ZonesPanel({
  zones,
  regions,
  canEdit,
  canDelete,
  available,
}: {
  zones: Zone[];
  regions: Opt[];
  canEdit: boolean;
  canDelete: boolean;
  /** False when migration 011 has not been run. */
  available: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) setMsg({ ok: false, text: res.error ?? "That did not work." });
      else {
        if (res.message) setMsg({ ok: true, text: res.message });
        setAdding(false);
        setEditing(null);
      }
      router.refresh();
    });

  if (!available) {
    return (
      <section className="rounded-dash-md border border-[var(--color-border-default)] bg-white p-5">
        <p className="mono mb-2">Zones</p>
        <Notice tone="warning" title="Not set up yet">
          Zones sit between a campus and a region. Run migration <code>010_zones.sql</code> on its
          own, then <code>011_zones.sql</code>, and they appear here.
        </Notice>
      </section>
    );
  }

  const form = (z?: Zone) => (
    <form
      action={(fd) => run(() => (z ? saveZone(z.id, fd) : createZone(fd)))}
      className="space-y-4 rounded-dash-sm border border-[var(--color-border-default)] bg-[var(--color-surface-page-alt)] p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={`zn-${z?.id ?? "new"}`} required>
          <input id={`zn-${z?.id ?? "new"}`} name="name" defaultValue={z?.name ?? ""} className={inputCls} placeholder="South West" />
        </Field>
        <Field label="Country" htmlFor={`zc-${z?.id ?? "new"}`} required>
          <input
            id={`zc-${z?.id ?? "new"}`}
            name="country"
            defaultValue={z?.country ?? "Nigeria"}
            list="zone-countries"
            className={inputCls}
          />
          <datalist id="zone-countries">
            {COUNTRIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field
          label="What it covers"
          htmlFor={`zv-${z?.id ?? "new"}`}
          hint="In plain words — a new coordinator reads this, not a list of codes."
        >
          <input
            id={`zv-${z?.id ?? "new"}`}
            name="covers"
            defaultValue={z?.covers ?? ""}
            className={inputCls}
            placeholder="Ekiti, Lagos, Ogun, Ondo, Osun, Oyo"
          />
        </Field>
        <Field label="Region" htmlFor={`zr-${z?.id ?? "new"}`}>
          <select id={`zr-${z?.id ?? "new"}`} name="region_id" defaultValue={z?.region_id ?? ""} className={inputCls}>
            <option value="">Not set</option>
            {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={BTN.primary}>
          {z ? "Save" : "Add zone"}
        </button>
        <button
          type="button"
          onClick={() => { setAdding(false); setEditing(null); }}
          className={BTN.ghost}
        >
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <section className="rounded-dash-md border border-[var(--color-border-default)] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-5 text-left"
      >
        <span className="flex-1">
          <span className="mono block">Zones</span>
          <span className="mt-1 block text-[13px] text-[var(--color-text-secondary)]">
            {zones.length} zone{zones.length === 1 ? "" : "s"} — the tier between a campus and a
            region.
          </span>
        </span>
        <span className="mono">{open ? "Hide" : "Manage"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-[var(--color-border-subtle)] p-5">
          {msg && <Notice tone={msg.ok ? "success" : "danger"}>{msg.text}</Notice>}

          <ul className="space-y-2">
            {zones.map((z) => (
              <li key={z.id} className="rounded-dash-sm border border-[var(--color-border-default)] p-3">
                {editing === z.id ? (
                  form(z)
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-[180px] flex-1">
                      <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                        {z.name} <span className="mono">{z.country}</span>
                      </p>
                      {z.covers && (
                        <p className="mt-0.5 text-[12px] text-[var(--color-text-secondary)]">{z.covers}</p>
                      )}
                    </div>
                    <span className="mono">
                      {z.coordinator ?? "No coordinator"}
                    </span>
                    {typeof z.chapters === "number" && (
                      <span className="mono">
                        {z.chapters} chapter{z.chapters === 1 ? "" : "s"}
                      </span>
                    )}
                    {canEdit && (
                      <button type="button" onClick={() => setEditing(z.id)} className={BTN.ghost}>
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <ConfirmDelete
                        compact
                        icon
                        what={z.name}
                        action={() => deleteZone(z.id)}
                      />
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {canEdit &&
            (adding ? (
              form()
            ) : (
              <button type="button" onClick={() => setAdding(true)} className={BTN.secondary}>
                <Plus className="h-4 w-4" /> Add a zone
              </button>
            ))}
        </div>
      )}
    </section>
  );
}
