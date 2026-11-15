"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  createCarePlace,
  saveCarePlace,
  setCarePublished,
  deleteCarePlace,
  importCarePlaces,
} from "@/lib/cms/care";
import { KINDS, SCREENINGS, TREATMENTS, PHARMACY, kindLabel, placeLine, type CarePlace } from "@/lib/care";
import { BTN, Field, inputCls, EmptyPanel, fmtDate } from "./ui";
import { useToast } from "./Toast";
import { ConfirmDelete } from "./ConfirmDelete";

/**
 * The care directory, as the department keeps it.
 *
 * A list you can filter, a form that opens under the row you are editing, and
 * a paste-in import for the spreadsheets partners send. Publishing is one
 * click on the row once the details are in, and refused without a phone
 * number or a place: an unreachable listing is worse than none.
 */

type Filter = "all" | "draft" | "live" | "pharmacy" | "centre" | "screening";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "live", label: "Live" },
  { id: "pharmacy", label: "Pharmacies" },
  { id: "centre", label: "Cancer centres" },
  { id: "screening", label: "Screenings" },
];

export function DirectoryManager({
  places,
  canEdit,
  canRemove,
}: {
  places: CarePlace[];
  canEdit: boolean;
  canRemove: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return places.filter((p) => {
      if (filter === "draft" && p.is_published) return false;
      if (filter === "live" && !p.is_published) return false;
      if (filter === "pharmacy" && !(p.kind === "pharmacy" || p.services.includes("cancer-medicines"))) return false;
      if (filter === "centre" && !(p.kind === "cancer_centre" || p.services.some((s) => TREATMENTS.some((t) => t.slug === s))))
        return false;
      if (filter === "screening" && !p.services.some((s) => SCREENINGS.some((t) => t.slug === s))) return false;
      if (!needle) return true;
      return [p.name, p.city, p.state, p.address, p.phone].filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [places, filter, q]);

  const drafts = places.filter((p) => !p.is_published).length;

  const add = () =>
    start(async () => {
      const res = await createCarePlace();
      if (!res.ok) return toast({ tone: "danger", text: res.error });
      setOpen(res.id ?? null);
      router.refresh();
    });

  const publish = (p: CarePlace, on: boolean) =>
    start(async () => {
      const res = await setCarePublished(p.id, on);
      toast({ tone: res.ok ? "success" : "danger", text: res.ok ? res.message ?? "Done." : res.error });
      if (res.ok) router.refresh();
    });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 text-[13px] transition ${
                filter === f.id
                  ? "dash-btn-primary text-white"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-page-alt)]"
              }`}
            >
              {f.label}
              {f.id === "draft" && drafts > 0 ? ` (${drafts})` : ""}
            </button>
          ))}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button type="button" className={BTN.secondary} onClick={() => setImporting((v) => !v)}>
              Import from a spreadsheet
            </button>
            <button type="button" className={BTN.primary} onClick={add} disabled={pending}>
              Add a listing
            </button>
          </div>
        )}
      </div>

      {importing && canEdit && <ImportPanel onDone={() => setImporting(false)} />}

      {places.length > 0 && (
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, town, state or phone"
          className={`${inputCls} mb-4`}
          aria-label="Search the directory"
        />
      )}

      {places.length === 0 ? (
        <EmptyPanel
          title="No listings yet"
          body="Add the pharmacies, cancer centres and screening facilities you work with. Each one stays a draft until you publish it, so you can fill in the details and call to confirm first."
          action={
            canEdit ? (
              <button type="button" className={BTN.primary} onClick={add} disabled={pending}>
                Add the first listing
              </button>
            ) : undefined
          }
        />
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-[var(--color-text-secondary)]">Nothing matches.</p>
      ) : (
        <ul className="divide-y divide-[var(--dash-line,var(--color-border-default))] overflow-hidden rounded-dash-md border border-[var(--color-border-default)] bg-white">
          {shown.map((p) => (
            <li key={p.id}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-[var(--color-text-primary)]">
                    {p.name}
                    {p.is_partner && (
                      <span className="ml-2 rounded-full bg-[var(--color-violet-100,#ede9fe)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-violet-700,#6d28d9)]">
                        Partner
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-[12.5px] text-[var(--color-text-secondary)]">
                    {kindLabel(p.kind)}
                    {placeLine(p) ? ` · ${placeLine(p)}` : ""}
                    {p.phone ? ` · ${p.phone}` : ""}
                  </p>
                </div>
                <span
                  className="whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium"
                  style={
                    p.is_published
                      ? { background: "var(--color-feedback-success-surface)", color: "var(--color-feedback-success-text)" }
                      : { background: "var(--color-neutral-paper-alt)", color: "var(--color-neutral-ink-muted)" }
                  }
                >
                  {p.is_published ? "Live" : "Draft"}
                </span>
                {canEdit && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className={BTN.ghost}
                      disabled={pending}
                      onClick={() => publish(p, !p.is_published)}
                    >
                      {p.is_published ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      type="button"
                      className={BTN.secondary}
                      aria-expanded={open === p.id}
                      onClick={() => setOpen(open === p.id ? null : p.id)}
                    >
                      {open === p.id ? "Close" : "Edit"}
                    </button>
                    {canRemove && (
                      <ConfirmDelete
                        icon
                        compact
                        what={p.name}
                        consequence={p.is_published ? "it disappears from the website" : undefined}
                        action={deleteCarePlace.bind(null, p.id)}
                      />
                    )}
                  </div>
                )}
              </div>
              {open === p.id && canEdit && (
                <PlaceForm
                  place={p}
                  onSaved={() => {
                    setOpen(null);
                    router.refresh();
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ServiceGroup({
  title,
  items,
  chosen,
}: {
  title: string;
  items: { slug: string; name: string }[];
  chosen: string[];
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-medium text-[var(--color-text-primary)]">{title}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {items.map((s) => (
          <label key={s.slug} className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[var(--color-text-primary)]">
            <input type="checkbox" name="services" value={s.slug} defaultChecked={chosen.includes(s.slug)} />
            {s.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PlaceForm({ place, onSaved }: { place: CarePlace; onSaved: () => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const id = (k: string) => `${place.id}-${k}`;

  return (
    <form
      className="border-t border-[var(--color-border-default)] bg-[var(--color-surface-page-alt)] px-4 py-6 sm:px-6"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        start(async () => {
          setError(null);
          const res = await saveCarePlace(place.id, form);
          if (!res.ok) return setError(res.error);
          toast({ tone: "success", text: res.message ?? "Saved." });
          onSaved();
        });
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" required htmlFor={id("name")}>
          <input id={id("name")} name="name" defaultValue={place.name} className={inputCls} required />
        </Field>
        <Field label="What it mainly is" htmlFor={id("kind")}>
          <select id={id("kind")} name="kind" defaultValue={place.kind} className={inputCls}>
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Short description" hint="One line a visitor sees under the name. Optional." htmlFor={id("summary")}>
            <input id={id("summary")} name="summary" defaultValue={place.summary ?? ""} className={inputCls} />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Street address" htmlFor={id("address")}>
            <input id={id("address")} name="address" defaultValue={place.address ?? ""} className={inputCls} />
          </Field>
        </div>
        <Field label="Town or city" htmlFor={id("city")}>
          <input id={id("city")} name="city" defaultValue={place.city ?? ""} className={inputCls} />
        </Field>
        <Field label="State" hint="Visitors filter by this, so spell it the same way each time." htmlFor={id("state")}>
          <input id={id("state")} name="state" defaultValue={place.state ?? ""} className={inputCls} />
        </Field>
        <Field label="Country" htmlFor={id("country")}>
          <input id={id("country")} name="country" defaultValue={place.country ?? "Nigeria"} className={inputCls} />
        </Field>
        <Field label="Opening hours" hint="For example: Mon to Fri, 8am to 5pm" htmlFor={id("hours")}>
          <input id={id("hours")} name="hours" defaultValue={place.hours ?? ""} className={inputCls} />
        </Field>

        <Field label="Phone" hint="The number people should call. Shown as a big Call button." htmlFor={id("phone")}>
          <input id={id("phone")} name="phone" type="tel" defaultValue={place.phone ?? ""} className={inputCls} />
        </Field>
        <Field label="Second phone" htmlFor={id("phone_alt")}>
          <input id={id("phone_alt")} name="phone_alt" type="tel" defaultValue={place.phone_alt ?? ""} className={inputCls} />
        </Field>
        <Field label="WhatsApp" htmlFor={id("whatsapp")}>
          <input id={id("whatsapp")} name="whatsapp" type="tel" defaultValue={place.whatsapp ?? ""} className={inputCls} />
        </Field>
        <Field label="Email" htmlFor={id("email")}>
          <input id={id("email")} name="email" type="email" defaultValue={place.email ?? ""} className={inputCls} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Website" htmlFor={id("website")}>
            <input id={id("website")} name="website" defaultValue={place.website ?? ""} className={inputCls} />
          </Field>
        </div>

        <div className="space-y-5 rounded-dash-sm border border-[var(--color-border-default)] bg-white p-4 sm:col-span-2">
          <p className="text-[12.5px] text-[var(--color-text-secondary)]">
            Tick what this place offers. The screenings pages list a place under each test ticked here.
          </p>
          <ServiceGroup title="Screenings & tests" items={SCREENINGS} chosen={place.services} />
          <ServiceGroup title="Treatment" items={TREATMENTS} chosen={place.services} />
          <ServiceGroup title="Pharmacy" items={PHARMACY} chosen={place.services} />
        </div>

        <div className="sm:col-span-2">
          <Field
            label="Medicines stocked"
            hint="Optional. Names of cancer medicines they usually have, if they have told you."
            htmlFor={id("medicines")}
          >
            <textarea id={id("medicines")} name="medicines" rows={2} defaultValue={place.medicines ?? ""} className={inputCls} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Internal notes" hint="Only staff see this: who you spoke to, anything to check." htmlFor={id("notes")}>
            <textarea id={id("notes")} name="notes" rows={2} defaultValue={place.notes ?? ""} className={inputCls} />
          </Field>
        </div>

        <Field
          label="Details last confirmed on"
          hint="The day someone called and checked. Shown to visitors."
          htmlFor={id("verified_on")}
        >
          <input
            id={id("verified_on")}
            name="verified_on"
            type="date"
            defaultValue={place.verified_on ?? ""}
            className={inputCls}
          />
        </Field>
        <div className="flex flex-col justify-end gap-3 pb-1">
          <label className="inline-flex cursor-pointer items-center gap-2 text-[13.5px]">
            <input type="checkbox" name="is_partner" defaultChecked={place.is_partner} />
            A partner of ours (shows a partner badge)
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[13.5px]">
            <input type="checkbox" name="is_published" defaultChecked={place.is_published} />
            Show on the website
          </label>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-5 text-[13px] text-[var(--color-feedback-danger-text)]">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button type="submit" className={BTN.primary} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        {place.updated_at && (
          <span className="text-[12px] text-[var(--color-text-secondary)]">Last changed {fmtDate(place.updated_at)}</span>
        )}
      </div>
    </form>
  );
}

function ImportPanel({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="mb-6 rounded-dash-md border border-[var(--color-border-default)] bg-white p-5">
      <p className="text-[14px] font-medium text-[var(--color-text-primary)]">Import from a spreadsheet</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
        Copy the rows from Excel or Google Sheets and paste them below, one place per row, with the columns in this
        order: <strong>name, type, address, city, state, phone, email, services</strong>. Type is a word like
        pharmacy, cancer centre or hospital. Services can be a list such as “mammogram; pap smear”. Everything comes in
        as a draft for you to check.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className={`${inputCls} mt-4 font-mono text-[12.5px]`}
        placeholder={"name\ttype\taddress\tcity\tstate\tphone\temail\tservices"}
        aria-label="Rows to import"
      />
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className={BTN.primary}
          disabled={pending || !text.trim()}
          onClick={() =>
            start(async () => {
              const res = await importCarePlaces(text);
              toast({ tone: res.ok ? "success" : "danger", text: res.ok ? res.message ?? "Imported." : res.error });
              if (res.ok) {
                setText("");
                onDone();
                router.refresh();
              }
            })
          }
        >
          {pending ? "Importing…" : "Import as drafts"}
        </button>
        <button type="button" className={BTN.ghost} onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}
