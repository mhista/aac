"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  setApplicationsOpen,
  setClosedNote,
  setWaitlistStatus,
  notifyWaitlist,
} from "@/lib/waitlist/admin";
import { INTEREST_LABEL, BATCH_SIZE, WAITLIST_STATUSES, type WaitlistRow } from "@/lib/waitlist/shared";
import { BTN, Field, inputCls, EmptyPanel, Notice, fmtDate } from "./ui";
import { useToast } from "./Toast";

/**
 * Applications manager.
 *
 * The switch at the top is the whole feature in one control: open shows the
 * country forms on the site, closed turns every apply panel into a waitlist.
 * It is stated in plain words rather than as a toggle labelled "applications"
 * — someone who has not touched this screen before should not have to guess
 * what the "on" position does.
 *
 * Sending is capped per press so it stays inside a serverless request. The
 * copy says so, because a Send button that quietly does 40 of 300 and looks
 * finished is worse than one that tells you to press it again.
 */

const WAITLIST_STATUS: Record<string, { label: string; tone: string }> = {
  new: { label: "New", tone: "var(--color-neutral-paper-alt)" },
  notified: { label: "Emailed", tone: "var(--color-feedback-info-surface)" },
  applied: { label: "Applied", tone: "var(--color-feedback-success-surface)" },
  declined: { label: "Declined", tone: "var(--color-neutral-paper-alt)" },
  spam: { label: "Spam", tone: "var(--color-feedback-danger-surface)" },
};

export function ApplicationsManager({
  rows,
  open,
  closedNote,
  formCount,
  emailReady,
  canAdmin,
  filter,
}: {
  rows: WaitlistRow[];
  open: boolean;
  closedNote: string | null;
  formCount: number;
  emailReady: boolean;
  canAdmin: boolean;
  filter: { interest: string; status: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const toast = useToast();

  const [note, setNote] = useState(closedNote ?? "");
  const [subject, setSubject] = useState("Applications are open");
  const [body, setBody] = useState("");
  const [composing, setComposing] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      toast(
        res.ok
          ? { tone: "success", text: res.message ?? "Saved." }
          : { tone: "danger", text: res.error ?? "That did not work." }
      );
      router.refresh();
    });

  /* Counts drive the header and tell whoever is about to press Send how many
     people that actually means. */
  const counts = useMemo(() => {
    const waiting = rows.filter(
      (r) => !r.unsubscribed_at && !r.notified_at && r.status !== "spam" && r.status !== "declined"
    ).length;
    return {
      total: rows.length,
      waiting,
      unsubscribed: rows.filter((r) => r.unsubscribed_at).length,
      failed: rows.filter((r) => r.last_error).length,
    };
  }, [rows]);

  const exportCsv = () => {
    const head = [
      "name", "email", "country", "interest", "institution", "note",
      "status", "joined", "emailed", "unsubscribed",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      head.join(","),
      ...rows.map((r) =>
        [
          r.full_name, r.email, r.country, INTEREST_LABEL[r.interest] ?? r.interest,
          r.institution, r.note, r.status,
          r.created_at?.slice(0, 10), r.notified_at?.slice(0, 10) ?? "",
          r.unsubscribed_at ? "yes" : "",
        ].map(esc).join(",")
      ),
    ].join("\r\n");

    /* BOM so Excel opens accented names correctly rather than as mojibake. */
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `aac-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams({ ...filter } as Record<string, string>);
    p.set(key, value);
    router.push(`/dashboard/applications?${p.toString()}`);
  };

  return (
    <div className="space-y-7">
      {/* ── The switch ───────────────────────────────────────────── */}
      <section className="rounded-dash-md border border-[var(--color-border-default)] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-[54ch]">
            <p className="mono mb-2">Status</p>
            <h2 className="font-display text-[1.4rem] text-[var(--color-text-display)]">
              {open ? "Applications are open" : "Applications are closed"}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
              {open
                ? `Every apply panel on the site is showing the ${formCount} country form${formCount === 1 ? "" : "s"}. Nobody is being added to the waitlist while this is on.`
                : "Every apply panel on the site is showing the waitlist form instead of a dead end. People who sign up are listed below."}
            </p>
          </div>

          {canAdmin ? (
            <button
              type="button"
              disabled={pending || (!open && formCount === 0)}
              onClick={() => run(() => setApplicationsOpen(!open))}
              className={open ? BTN.secondary : BTN.primary}
            >
              {open ? "Close applications" : "Open applications"}
            </button>
          ) : (
            <p className="mono max-w-[24ch] text-right">Only an admin can change this</p>
          )}
        </div>

        {!open && formCount === 0 && (
          <div className="mt-5">
            <Notice tone="warning" title="No application forms are configured">
              Opening applications would show an empty panel. Add at least one country form before
              opening — they live in <code>lib/org.ts</code>, or in the{" "}
              <code>application_forms</code> site setting.
            </Notice>
          </div>
        )}

        {!open && canAdmin && (
          <div className="mt-6 border-t border-[var(--color-border-subtle)] pt-5">
            <Field
              label="What the site says while closed"
              hint="Leave empty to use the default wording. This sits directly above the form."
              htmlFor="closed-note"
            >
              <textarea
                id="closed-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={inputCls}
                placeholder="Applications are closed at the moment. Leave your details and we will email you the moment the next intake opens."
              />
            </Field>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setClosedNote(note))}
              className={`${BTN.secondary} mt-3`}
            >
              Save wording
            </button>
          </div>
        )}
      </section>

      {/* ── Counts ───────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-4">
        {[
          ["On the list", counts.total],
          ["Not yet emailed", counts.waiting],
          ["Unsubscribed", counts.unsubscribed],
          ["Send failed", counts.failed],
        ].map(([label, n]) => (
          <div
            key={label as string}
            className="rounded-dash-sm border border-[var(--color-border-default)] bg-white px-4 py-3.5"
          >
            <p className="mono mb-1.5">{label}</p>
            <p className="font-display text-[1.6rem] leading-none text-[var(--color-text-display)]">
              {n as number}
            </p>
          </div>
        ))}
      </section>

      {/* ── Send ─────────────────────────────────────────────────── */}
      {canAdmin && counts.waiting > 0 && (
        <section className="rounded-dash-md border border-[var(--color-border-default)] bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-[54ch]">
              <p className="mono mb-2">Batch email</p>
              <h2 className="font-display text-[1.3rem] text-[var(--color-text-display)]">
                Tell {counts.waiting} {counts.waiting === 1 ? "person" : "people"} applications are
                open
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
                One email each, addressed by first name, each carrying its own unsubscribe link.
                Up to {BATCH_SIZE} go out per press — press again to continue where it stopped.
                Nobody is emailed twice.
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={exportCsv} className={BTN.secondary}>
                Export CSV
              </button>
              {emailReady && (
                <button
                  type="button"
                  onClick={() => setComposing((v) => !v)}
                  className={BTN.primary}
                >
                  {composing ? "Cancel" : "Compose"}
                </button>
              )}
            </div>
          </div>

          {!emailReady && (
            <div className="mt-5">
              <Notice tone="info" title="No email provider connected yet">
                Set <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> in the environment and
                this becomes a Send button. Until then, export the CSV and send from your own mail
                client — and remember to include the unsubscribe line.
              </Notice>
            </div>
          )}

          {composing && emailReady && (
            <div className="mt-6 space-y-4 border-t border-[var(--color-border-subtle)] pt-5">
              <Field label="Subject" htmlFor="mail-subject" required>
                <input
                  id="mail-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field
                label="Message"
                hint="Leave empty to use the standard wording. The greeting, the signature and the unsubscribe line are added automatically."
                htmlFor="mail-body"
              >
                <textarea
                  id="mail-body"
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className={inputCls}
                  placeholder="Applications for the Cancer Advocate programme are now open…"
                />
              </Field>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => notifyWaitlist(filter.interest, subject, body))}
                className={BTN.primary}
              >
                {pending
                  ? "Sending…"
                  : `Send to the next ${Math.min(counts.waiting, BATCH_SIZE)}`}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mono mr-1">Programme</span>
        {["all", "advocate", "fellowship", "chapter", "volunteer", "other"].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setParam("interest", k)}
            className={`mono rounded-pill px-3 py-1.5 transition-colors ${
              filter.interest === k
                ? "bg-[var(--color-action-primary)] text-white"
                : "border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-page-alt)]"
            }`}
          >
            {k === "all" ? "All" : INTEREST_LABEL[k]}
          </button>
        ))}
      </div>

      {/* ── The list ─────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <EmptyPanel
          title="Nobody is waiting yet"
          body={
            open
              ? "Applications are open, so the site is sending people straight to the forms rather than collecting names. Close applications and this list starts filling."
              : "When someone leaves their details on an apply panel, they appear here with their name, email and country."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-dash-md border border-[var(--color-border-default)] bg-white">
          <table className="w-full min-w-[820px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border-default)] text-left">
                {["Name", "Email", "Country", "Programme", "Joined", "Status", ""].map((h) => (
                  <th key={h} className="mono px-4 py-3 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--color-border-subtle)] last:border-0 align-top"
                >
                  <td className="px-4 py-3">
                    <span className="text-[var(--color-text-primary)]">{r.full_name}</span>
                    {r.institution && (
                      <span className="mono mt-1 block">{r.institution}</span>
                    )}
                    {r.note && (
                      <span className="mt-1 block text-[12px] text-[var(--color-text-secondary)]">
                        {r.note}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`mailto:${r.email}`}
                      className="text-[var(--color-text-secondary)] underline decoration-[var(--color-border-default)] underline-offset-2 hover:text-[var(--color-text-primary)]"
                    >
                      {r.email}
                    </a>
                    {r.last_error && (
                      <span className="mt-1 block text-[12px] text-[var(--color-feedback-danger-text)]">
                        Last send failed: {r.last_error}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{r.country ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {INTEREST_LABEL[r.interest] ?? r.interest}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {fmtDate(r.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="mono inline-block whitespace-nowrap rounded-pill px-2 py-1"
                      style={{ background: WAITLIST_STATUS[r.status]?.tone }}
                    >
                      {WAITLIST_STATUS[r.status]?.label ?? r.status}
                    </span>
                    {r.unsubscribed_at && (
                      <span className="mono mt-1 block">Unsubscribed</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Status for ${r.full_name}`}
                      value={r.status}
                      disabled={pending}
                      onChange={(e) => run(() => setWaitlistStatus(r.id, e.target.value))}
                      className="rounded-dash-sm border border-[var(--color-border-default)] bg-white px-2 py-1.5 text-[12px]"
                    >
                      {WAITLIST_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {WAITLIST_STATUS[s].label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
