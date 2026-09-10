"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  saveOrgDetails, saveContact, saveSocials, saveApplicationForms, saveFlags,
} from "@/lib/cms/settings";
import { BTN, Field, inputCls, Notice } from "./ui";
import { useToast } from "./Toast";
import { Plus, Trash } from "@/components/ui/Icon";

/**
 * Site settings.
 *
 * Split into small forms that save independently rather than one long page
 * with a single Save at the bottom. Someone here to fix one email address
 * should not be made to re-submit the registration number, and a validation
 * failure in one section should not throw away edits in another.
 *
 * Every field shows the coded default as its placeholder, so "empty" reads as
 * "using the default" rather than as "missing".
 */

type Settings = {
  name: string;
  abbr: string;
  tagline: string;
  registration: { body: string; number: string; country: string };
  email: { general: string; support: string };
  social: { name: string; url: string }[];
  applicationForms: { country: string; url: string }[];
  flags: { donations: boolean; newsletter: boolean; chatbot: boolean };
};

export function SettingsManager({
  settings,
  canEdit,
}: {
  settings: Settings;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const toast = useToast();
  const [socials, setSocials] = useState(settings.social);
  const [forms, setForms] = useState(settings.applicationForms);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      toast({ tone: res.ok ? "success" : "danger", text: res.ok ? res.message ?? "Saved." : res.error ?? "That did not work." });
      router.refresh();
    });

  const Section = ({
    title,
    note,
    action,
    children,
  }: {
    title: string;
    note?: string;
    action: (fd: FormData) => void;
    children: React.ReactNode;
  }) => (
    <form
      action={action}
      className="space-y-4 rounded-dash-md border border-[var(--color-border-default)] bg-white p-6"
    >
      <div>
        <h2 className="font-display text-[1.25rem] text-[var(--color-text-display)]">{title}</h2>
        {note && (
          <p className="mt-1.5 max-w-[64ch] text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            {note}
          </p>
        )}
      </div>
      <fieldset disabled={!canEdit} className="space-y-4">
        {children}
        {canEdit && (
          <button type="submit" disabled={pending} className={BTN.primary}>
            Save
          </button>
        )}
      </fieldset>
    </form>
  );

  return (
    <div className="space-y-5">

      {!canEdit && (
        <Notice tone="info" title="You can see these but not change them">
          Site settings affect every page, so they are limited to admins.
        </Notice>
      )}

      <Section
        title="The organisation"
        note="Used in the footer, the page titles and the structured data search engines read."
        action={(fd) => run(() => saveOrgDetails(fd))}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Registered name" htmlFor="s-name" required>
            <input id="s-name" name="name" defaultValue={settings.name} className={inputCls} />
          </Field>
          <Field label="Short name" htmlFor="s-abbr">
            <input id="s-abbr" name="abbr" defaultValue={settings.abbr} className={inputCls} />
          </Field>
        </div>
        <Field label="Tagline" htmlFor="s-tag">
          <input id="s-tag" name="tagline" defaultValue={settings.tagline} className={inputCls} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Registered with" htmlFor="s-rb">
            <input id="s-rb" name="registrationBody" defaultValue={settings.registration.body} className={inputCls} />
          </Field>
          <Field label="Registration number" htmlFor="s-rn">
            <input id="s-rn" name="registrationNumber" defaultValue={settings.registration.number} className={inputCls} />
          </Field>
          <Field label="Country" htmlFor="s-rc">
            <input id="s-rc" name="country" defaultValue={settings.registration.country} className={inputCls} />
          </Field>
        </div>
      </Section>

      <Section
        title="Contact addresses"
        note="Printed on every page. The support address also receives patient and survivor enquiries from the contact form, and is the reply-to on those notifications."
        action={(fd) => run(() => saveContact(fd))}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="General enquiries" htmlFor="s-eg">
            <input id="s-eg" name="general" type="email" defaultValue={settings.email.general} className={inputCls} />
          </Field>
          <Field label="Patient &amp; survivor support" htmlFor="s-es">
            <input id="s-es" name="support" type="email" defaultValue={settings.email.support} className={inputCls} />
          </Field>
        </div>
      </Section>

      <Section
        title="Social accounts"
        note="These appear in the footer and are what search engines read as the organisation's official accounts — so they must be profile addresses, not links to individual posts."
        action={(fd) => run(() => saveSocials(fd))}
      >
        <div className="space-y-2">
          {socials.map((s, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="w-[120px]">
                <label htmlFor={`sn-${i}`} className="mono mb-1.5 block">Platform</label>
                <input id={`sn-${i}`} name="social_name" defaultValue={s.name} className={inputCls} />
              </div>
              <div className="min-w-[220px] flex-1">
                <label htmlFor={`su-${i}`} className="mono mb-1.5 block">Profile address</label>
                <input id={`su-${i}`} name="social_url" defaultValue={s.url} className={inputCls} />
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setSocials(socials.filter((_, j) => j !== i))}
                  aria-label={`Remove ${s.name}`}
                  className="grid h-10 w-10 place-items-center rounded-dash-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-feedback-danger-surface)]"
                >
                  <Trash className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {canEdit && (
            <button
              type="button"
              onClick={() => setSocials([...socials, { name: "", url: "" }])}
              className={BTN.ghost}
            >
              <Plus className="h-4 w-4" /> Add an account
            </button>
          )}
        </div>
      </Section>

      <Section
        title="Application forms"
        note="One per country. Up to five show as buttons on the apply panels; past five the panel becomes a searchable dropdown by itself."
        action={(fd) => run(() => saveApplicationForms(fd))}
      >
        <div className="space-y-2">
          {forms.map((f, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="w-[150px]">
                <label htmlFor={`fc-${i}`} className="mono mb-1.5 block">Country</label>
                <input id={`fc-${i}`} name="form_country" defaultValue={f.country} className={inputCls} />
              </div>
              <div className="min-w-[220px] flex-1">
                <label htmlFor={`fu-${i}`} className="mono mb-1.5 block">Form link</label>
                <input id={`fu-${i}`} name="form_url" defaultValue={f.url} className={inputCls} />
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setForms(forms.filter((_, j) => j !== i))}
                  aria-label={`Remove ${f.country}`}
                  className="grid h-10 w-10 place-items-center rounded-dash-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-feedback-danger-surface)]"
                >
                  <Trash className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {canEdit && (
            <button
              type="button"
              onClick={() => setForms([...forms, { country: "", url: "" }])}
              className={BTN.ghost}
            >
              <Plus className="h-4 w-4" /> Add a country
            </button>
          )}
        </div>
      </Section>

      <Section
        title="Features"
        note="Parts of the site that are built but not switched on. Opening and closing applications is on the Applications screen, beside the waitlist it affects."
        action={(fd) => run(() => saveFlags(fd))}
      >
        {[
          ["donations", "Donations", "Off until a payment provider is configured and verified."],
          ["newsletter", "Newsletter sign-up", "The footer sign-up form."],
          ["chatbot", "Assistant", "The question-answering assistant. Not built yet."],
        ].map(([key, label, note]) => (
          <label key={key} className="flex items-start gap-3">
            <input
              type="checkbox"
              name={key}
              defaultChecked={settings.flags[key as keyof typeof settings.flags]}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-action-primary)]"
            />
            <span>
              <span className="block text-[13px] text-[var(--color-text-primary)]">{label}</span>
              <span className="block text-[12px] text-[var(--color-text-secondary)]">{note}</span>
            </span>
          </label>
        ))}
      </Section>
    </div>
  );
}
