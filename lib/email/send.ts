/**
 * Transactional email.
 *
 * A thin wrapper over Resend's HTTP API — no SDK, because one fetch is the
 * whole surface and a dependency here would be all cost and no benefit.
 *
 * Two rules this file exists to enforce:
 *
 *  1. If no provider is configured, `isEmailConfigured()` is false and nothing
 *     pretends to have sent. The dashboard reads that and offers a CSV export
 *     instead of a Send button, so nobody believes 400 emails went out when
 *     they did not.
 *  2. Batch mail is sent one message per person, never a shared BCC. A BCC
 *     blast means every recipient shares one unsubscribe link and one footer;
 *     per-person sending is what makes an honest unsubscribe possible.
 */

const API = "https://api.resend.com/emails";

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export interface Email {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export type SendResult = { ok: true; id?: string } | { ok: false; error: string };

export async function sendEmail(mail: Email): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { ok: false, error: "No email provider is configured." };

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        ...(mail.html ? { html: mail.html } : {}),
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `${res.status} ${detail.slice(0, 200)}` };
    }

    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: json.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

/**
 * Send the same message to many people, personalised per recipient.
 *
 * Resend's default rate limit is 2 requests/second, so this paces itself
 * rather than firing everything at once and collecting 429s. `onResult` lets
 * the caller record each outcome as it happens, so a failure halfway through
 * does not lose the record of what already went out.
 */
export async function sendBatch<T>(
  recipients: T[],
  build: (r: T) => Email,
  onResult: (r: T, result: SendResult) => Promise<void> | void,
  { perSecond = 2 }: { perSecond?: number } = {}
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  const gap = Math.ceil(1000 / perSecond);

  for (const r of recipients) {
    const result = await sendEmail(build(r));
    if (result.ok) sent++;
    else failed++;
    await onResult(r, result);
    await new Promise((res) => setTimeout(res, gap));
  }

  return { sent, failed };
}
