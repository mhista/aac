/**
 * Enquiry constants.
 *
 * Separate from the action file because a "use server" module may only export
 * async functions. Both the public form and the dashboard read from here, so
 * a topic added once appears in both.
 */

export const TOPICS = ["general", "support", "partnership", "media"] as const;
export type Topic = (typeof TOPICS)[number];

export const TOPIC_LABEL: Record<Topic, string> = {
  general: "General enquiry",
  support: "Patient & survivor support",
  partnership: "Partnership",
  media: "Media & press",
};

export const TOPIC_HINT: Record<Topic, string> = {
  general: "Questions about our work, chapters, volunteering or anything else.",
  support: "If you or someone you love is facing cancer and needs help finding support.",
  partnership: "Hospitals, pharmacies, universities, research bodies, companies and funders.",
  media: "Interviews, press enquiries, and requests for our logo or materials.",
};

export const ENQUIRY_STATUSES = ["new", "read", "actioned", "spam"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const STATUS_LABEL: Record<string, string> = {
  new: "New",
  read: "Read",
  actioned: "Answered",
  spam: "Spam",
};

export interface Enquiry {
  id: string;
  form_type: string;
  payload: {
    name?: string;
    email?: string;
    topic?: string;
    subject?: string;
    message?: string;
    country?: string;
    organisation?: string;
    page?: string;
  };
  status: string;
  created_at: string;
}
