"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { ORG } from "@/lib/org";
import { SITE } from "@/lib/seo";
import { TOPICS, TOPIC_LABEL, type Topic } from "./shared";

/**
 * The public contact form.
 *
 * Replaces a page of `mailto:` links. Those look tidy and fail quietly: on a
 * phone with no mail app configured they do nothing at all, on a shared
 * computer they open somebody else's account, and either way AAC keeps no
 * record of who asked what. A form works everywhere and leaves a trail.
 *
 * The mailto addresses stay on the page beside it. Some people would rather
 * write from their own client, and taking that away would be a downgrade.
 *
 * Every enquiry is stored first and emailed second. If the email provider is
 * down or unconfigured, the message is still safe in the database — the
 * reverse ordering would lose messages on a bad day.
 */

type Result = { ok: true } | { ok: false; error: string };

function looksLikeEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254;
}

function clean(form: FormData, key: string, max: number) {
  const v = form.get(key);
  const s = typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
  return s === "" ? null : s.slice(0, max);
}

/**
 * A coarse fingerprint of the sender, for spam triage only.
 *
 * Hashed, never stored raw, and deliberately not reversible to an address —
 * it exists to spot one source flooding the form, not to identify anyone.
 */
async function fingerprint(): Promise<{ ip_hash: string | null; ua: string | null; page: string | null }> {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const ua = h.get("user-agent");
    const page = h.get("referer");
    if (!ip) return { ip_hash: null, ua, page };

    const data = new TextEncoder().encode(`${ip}:aac-enquiry`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return { ip_hash: hex.slice(0, 32), ua: ua?.slice(0, 300) ?? null, page };
  } catch {
    return { ip_hash: null, ua: null, page: null };
  }
}

export async function submitEnquiry(form: FormData): Promise<Result> {
  /* Honeypot. Hidden from people, irresistible to bots. Answer as success so
     the bot has nothing to learn from. */
  const trap = form.get("website");
  if (typeof trap === "string" && trap.length > 0) return { ok: true };

  const name = clean(form, "name", 120);
  const emailRaw = clean(form, "email", 254);
  const message = clean(form, "message", 5000);
  const topicRaw = clean(form, "topic", 20) ?? "general";
  const topic = (TOPICS as readonly string[]).includes(topicRaw) ? (topicRaw as Topic) : "general";

  if (!name) return { ok: false, error: "Please tell us your name." };
  if (!emailRaw) return { ok: false, error: "Please give us an email address we can reply to." };
  if (!looksLikeEmail(emailRaw)) {
    return { ok: false, error: "That email address does not look right — please check it." };
  }
  if (!message || message.length < 10) {
    return { ok: false, error: "Please tell us a little more, so we can answer properly." };
  }

  const email = emailRaw.toLowerCase();
  const db = await createClient();
  if (!db) {
    return {
      ok: false,
      error: `We could not send that just now. Please email us directly at ${ORG.email.general}.`,
    };
  }

  const meta = await fingerprint();

  const payload = {
    name,
    email,
    topic,
    subject: clean(form, "subject", 200),
    organisation: clean(form, "organisation", 160),
    country: clean(form, "country", 80),
    message,
    page: meta.page,
  };

  /* Stored first. An enquiry that reached the database but not the inbox can
     be found; one that reached neither is gone. */
  const { error } = await db.from("form_submissions").insert({
    form_type: `contact:${topic}`,
    payload,
    ip_hash: meta.ip_hash,
    user_agent: meta.ua,
  });

  if (error) {
    return {
      ok: false,
      error: `We could not send that just now. Please email us directly at ${ORG.email.general}.`,
    };
  }

  /* Patient support goes to the support address; everything else to general.
     Notification failures are swallowed on purpose — the message is already
     safe, and telling someone their enquiry failed when it did not would be
     worse than a delayed notification. */
  if (isEmailConfigured()) {
    const to = topic === "support" ? ORG.email.support : ORG.email.general;
    await sendEmail({
      to,
      replyTo: email,
      subject: `[${TOPIC_LABEL[topic]}] ${payload.subject ?? `Message from ${name}`}`,
      text:
        `${TOPIC_LABEL[topic]}\n\n` +
        `From: ${name} <${email}>\n` +
        (payload.organisation ? `Organisation: ${payload.organisation}\n` : "") +
        (payload.country ? `Country: ${payload.country}\n` : "") +
        (payload.page ? `Sent from: ${payload.page}\n` : "") +
        `\n${message}\n\n` +
        `---\nReply directly to this email to answer them.\n` +
        `Also in the dashboard: ${SITE}/dashboard/enquiries\n`,
    }).catch(() => undefined);
  }

  return { ok: true };
}
