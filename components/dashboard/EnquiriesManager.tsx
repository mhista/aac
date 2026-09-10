"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { setEnquiryStatus, deleteEnquiry } from "@/lib/cms/enquiries";
import {
  TOPICS,
  TOPIC_LABEL,
  ENQUIRY_STATUSES,
  STATUS_LABEL,
  type Enquiry,
} from "@/lib/forms/shared";
import { BTN, inputCls, Notice, EmptyPanel, fmtDateTime } from "./ui";
import { useToast } from "./Toast";
import { ConfirmDelete } from "./ConfirmDelete";

/**
 * Enquiry inbox.
 *
 * Reading an enquiry marks it read, once, automatically. Asking someone to
 * press "mark as read" after reading is asking them to do bookkeeping for the
 * software; the software already knows.
 *
 * "Reply" opens the person's own mail client with the address, subject and a
 * quoted message ready. AAC replies from their real inbox, so the sender gets
 * a normal email from a human they can reply to — not a no-reply from a system
 * they have never heard of.
 */

const TONE: Record<string, string> = {
  new: "var(--color-feedback-info-surface)",
  read: "var(--color-neutral-paper-alt)",
  actioned: "var(--color-feedback-success-surface)",
  spam: "var(--color-feedback-danger-surface)",
};

export function EnquiriesManager({
  enquiries,
  unread,
  unreadSupport,
  filter,
  canDelete,
}: {
  enquiries: Enquiry[];
  unread: number;
  unreadSupport: number;
  filter: { topic: string; status: string };
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const toast = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast({ tone: "danger", text: res.error ?? "That did not work." });
      else if (res.message) toast({ tone: "success", text: res.message });
      router.refresh();
    });

  const openEnquiry = (e: Enquiry) => {
    setOpenId(openId === e.id ? null : e.id);
    /* Reading is the act. No separate button. */
    if (openId !== e.id && e.status === "new") {
      start(async () => {
        await setEnquiryStatus(e.id, "read");
        router.refresh();
      });
    }
  };

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return enquiries;
    return enquiries.filter((e) =>
      [e.payload?.name, e.payload?.email, e.payload?.subject, e.payload?.message, e.payload?.organisation]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
    );
  }, [enquiries, q]);

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams();
    const next = { ...filter, [key]: value };
    if (next.topic !== "all") p.set("topic", next.topic);
    if (next.status !== "all") p.set("status", next.status);
    router.push(`/dashboard/enquiries${p.toString() ? `?${p}` : ""}`);
  };

  return (
    <div className="space-y-5">

      {unreadSupport > 0 && (
        <Notice
          tone="warning"
          title={`${unreadSupport} unread support ${unreadSupport === 1 ? "message" : "messages"}`}
        >
          Somebody has written about a cancer diagnosis — theirs or someone close to them. These
          come first.{" "}
          <button type="button" onClick={() => setParam("topic", "support")} className="underline underline-offset-2">
            Open them
          </button>
          .
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setParam("topic", "all")}
          className={`mono rounded-pill px-3 py-1.5 transition-colors ${
            filter.topic === "all"
              ? "bg-[var(--color-action-primary)] text-white"
              : "border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-page-alt)]"
          }`}
        >
          All{unread > 0 ? ` · ${unread} new` : ""}
        </button>
        {TOPICS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setParam("topic", t)}
            className={`mono rounded-pill px-3 py-1.5 transition-colors ${
              filter.topic === t
                ? "bg-[var(--color-action-primary)] text-white"
                : "border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-page-alt)]"
            }`}
          >
            {TOPIC_LABEL[t]}
          </button>
        ))}

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email or message"
          aria-label="Search enquiries"
          className={`${inputCls} ml-auto max-w-[300px]`}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyPanel
          title={q || filter.topic !== "all" ? "Nothing matches" : "No messages yet"}
          body={
            q || filter.topic !== "all"
              ? "Try a different search, or clear the filters."
              : "When somebody writes through the contact form, their message appears here — and is emailed to the right address at the same time."
          }
        />
      ) : (
        <ul className="space-y-2">
          {shown.map((e) => {
            const open = openId === e.id;
            const topic = e.form_type.replace("contact:", "");
            const p = e.payload ?? {};
            const isSupport = topic === "support";

            const mailto =
              `mailto:${p.email ?? ""}` +
              `?subject=${encodeURIComponent(`Re: ${p.subject ?? "your message to All Against Cancer"}`)}` +
              `&body=${encodeURIComponent(
                `\n\n---\nOn ${new Date(e.created_at).toLocaleDateString("en-GB")} you wrote:\n\n${p.message ?? ""}`
              )}`;

            return (
              <li
                key={e.id}
                className="overflow-hidden rounded-dash-md border bg-white"
                style={{
                  borderColor:
                    isSupport && e.status === "new"
                      ? "var(--color-feedback-warning-base)"
                      : "var(--color-border-default)",
                }}
              >
                <button
                  type="button"
                  onClick={() => openEnquiry(e)}
                  aria-expanded={open}
                  className="flex w-full flex-wrap items-center gap-3 p-4 text-left"
                >
                  <span className="min-w-[200px] flex-1">
                    <span
                      className={`block text-[14px] text-[var(--color-text-primary)] ${
                        e.status === "new" ? "font-semibold" : ""
                      }`}
                    >
                      {p.name ?? "Unknown sender"}
                      {p.organisation ? ` · ${p.organisation}` : ""}
                    </span>
                    <span className="mono mt-0.5 block truncate">
                      {p.subject ?? (p.message ?? "").slice(0, 80)}
                    </span>
                  </span>

                  <span className="mono">{TOPIC_LABEL[topic as never] ?? topic}</span>
                  <span
                    className="mono rounded-pill px-2 py-1"
                    style={{ background: TONE[e.status] }}
                  >
                    {STATUS_LABEL[e.status] ?? e.status}
                  </span>
                  <span className="mono">{fmtDateTime(e.created_at)}</span>
                </button>

                {open && (
                  <div className="border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-page-alt)] p-5">
                    <dl className="mb-4 grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-[auto_1fr]">
                      <dt className="mono">From</dt>
                      <dd className="text-[var(--color-text-primary)]">
                        {p.name} ·{" "}
                        <a href={`mailto:${p.email}`} className="underline underline-offset-2">
                          {p.email}
                        </a>
                      </dd>
                      {p.country && (
                        <>
                          <dt className="mono">Country</dt>
                          <dd className="text-[var(--color-text-secondary)]">{p.country}</dd>
                        </>
                      )}
                      {p.page && (
                        <>
                          <dt className="mono">Sent from</dt>
                          <dd className="truncate text-[var(--color-text-secondary)]">{p.page}</dd>
                        </>
                      )}
                    </dl>

                    <p className="measure whitespace-pre-wrap rounded-dash-sm border border-[var(--color-border-default)] bg-white p-4 text-[13px] leading-relaxed text-[var(--color-text-primary)]">
                      {p.message}
                    </p>

                    {isSupport && (
                      <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                        Support enquiry. We do not diagnose, interpret results or advise on
                        treatment — point them to a qualified professional and to the support we can
                        actually give.
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <a href={mailto} className={BTN.primary}>Reply by email</a>

                      <select
                        aria-label="Status"
                        value={e.status}
                        disabled={pending}
                        onChange={(ev) => run(() => setEnquiryStatus(e.id, ev.target.value))}
                        className="rounded-dash-sm border border-[var(--color-border-default)] bg-white px-3 py-2 text-[13px]"
                      >
                        {ENQUIRY_STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                        ))}
                      </select>

                      {canDelete && (
                        <div className="ml-auto">
                          <ConfirmDelete
                            compact
                            icon
                            what={`the message from ${p.name ?? "this sender"}`}
                            consequence="What somebody wrote is a record — marking it spam hides it without destroying it."
                            action={() => deleteEnquiry(e.id)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
