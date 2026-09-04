/**
 * Waitlist constants and types.
 *
 * These live apart from the action files because a module marked "use server"
 * may only export async functions — every constant in one becomes a build
 * error. Both the client components and the server actions import from here.
 */

export const INTERESTS = ["advocate", "fellowship", "chapter", "volunteer", "other"] as const;
export type Interest = (typeof INTERESTS)[number];

export const INTEREST_LABEL: Record<string, string> = {
  advocate: "Cancer Advocate",
  fellowship: "Leadership Fellowship",
  chapter: "University chapter",
  volunteer: "Volunteer",
  other: "Other",
};

/** The sentence the person ticks. Stored verbatim on every row. */
export const CONSENT_TEXT =
  "I would like All Against Cancer Initiative to email me when applications open. " +
  "I understand I can unsubscribe from any of those emails.";

/**
 * How many emails one press of Send may dispatch.
 *
 * A serverless request has a wall-clock limit and the provider is paced at two
 * a second, so a large list has to be sent across several presses. Capping it
 * makes the send resumable rather than half-failed.
 */
export const BATCH_SIZE = 40;

export const WAITLIST_STATUSES = ["new", "notified", "applied", "declined", "spam"] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

export interface WaitlistRow {
  id: string;
  interest: string;
  full_name: string;
  email: string;
  country: string | null;
  institution: string | null;
  note: string | null;
  status: string;
  notified_at: string | null;
  notify_count: number;
  unsubscribed_at: string | null;
  unsubscribe_token: string;
  last_error: string | null;
  created_at: string;
}
