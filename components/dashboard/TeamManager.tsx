"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createTeamMember,
  saveTeamMember,
  setTeamPublished,
  deleteTeamMember,
} from "@/lib/cms/team";
import { BTN, Field, inputCls, Notice, EmptyPanel } from "./ui";
import { useToast } from "./Toast";
import { MediaUploader } from "./MediaUploader";
import { ConfirmDelete } from "./ConfirmDelete";

/**
 * Team manager.
 *
 * One expandable row per person. The photograph is chosen from what is already
 * in /public/team and previewed immediately on selection, because the whole
 * point of this screen is matching a face to a name — you have to see the face
 * while you read the name, not save and then check the public page.
 */

type Member = {
  id: string;
  full_name: string;
  role_title: string | null;
  bio: string | null;
  linkedin: string | null;
  tier: string | null;
  position: number;
  is_published: boolean;
  photo: { url: string; alt: string } | null;
};

const NATIONAL_TIERS: [string, string][] = [
  ["board", "Board"],
  ["director", "Director"],
  ["regional", "Regional coordinator"],
  ["zonal", "Zonal coordinator"],
  ["campus", "Campus coordinator"],
];

/* A campus committee has its own shape. Offering a chapter's secretary the
   choice of "Board" would be inviting a mistake. */
const CAMPUS_TIERS: [string, string][] = [
  ["executive", "Chapter executive"],
  ["campus", "Campus coordinator"],
];

export function TeamManager({
  members,
  photos,
  missingPhotos,
  canEdit,
  canDelete,
  chapterId = null,
  addLabel = "Add a person",
  emptyBody = "Board members, directors and coordinators added here appear on the About page once published.",
  readOnlyNote,
}: {
  members: Member[];
  photos: string[];
  missingPhotos: number;
  canEdit: boolean;
  canDelete: boolean;
  /** Set when this list is one chapter's executives rather than AAC's own. */
  chapterId?: string | null;
  addLabel?: string;
  emptyBody?: string;
  readOnlyNote?: string;
}) {
  const TIERS = chapterId ? CAMPUS_TIERS : NATIONAL_TIERS;
  const router = useRouter();
  const [pending, start] = useTransition();
  const toast = useToast();
  const [openId, setOpenId] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string; id?: string }>) =>
    start(async () => {
      const res = await fn();
      toast({ tone: res.ok ? "success" : "danger", text: res.ok ? res.message ?? "Saved." : res.error ?? "That did not work." });
      /* A newly created person opens straight into their form — the next
         thing you want to do is always type their name. */
      if (res.ok && res.id) setOpenId(res.id);
      router.refresh();
    });

  return (
    <div className="space-y-6">

      {missingPhotos > 0 && (
        <Notice
          tone="info"
          title={`${missingPhotos} ${missingPhotos === 1 ? "person has" : "people have"} no photograph yet`}
        >
          They still appear on the About page, as a monogram rather than an empty space. Open
          someone below to upload a portrait or pick one already uploaded — the preview updates as
          you choose, so you can check the face before saving.
        </Notice>
      )}

      {canEdit ? (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => createTeamMember(chapterId))}
            className={BTN.primary}
          >
            {addLabel}
          </button>
        </div>
      ) : (
        <Notice tone="info" title="You can see this list but not change it">
          {readOnlyNote ??
            "The board and directors are edited by department directors and admins. This is the organisation’s public face, so it is not a per-chapter setting."}
        </Notice>
      )}

      {members.length === 0 ? (
        <EmptyPanel title="Nobody added yet" body={emptyBody} />
      ) : (
        <ul className="space-y-3">
          {members.map((m) => {
            const open = openId === m.id;
            return (
              <li
                key={m.id}
                className="overflow-hidden rounded-dash-md border border-[var(--color-border-default)] bg-white"
              >
                <div className="flex flex-wrap items-center gap-4 p-4">
                  <Thumb url={m.photo?.url} name={m.full_name} />
                  <div className="min-w-[200px] flex-1">
                    <p className="text-[14px] font-medium text-[var(--color-text-primary)]">{m.full_name}</p>
                    <p className="mono mt-0.5">{m.role_title ?? "No role yet"}</p>
                  </div>

                  <span
                    className="mono rounded-pill px-2 py-1"
                    style={{
                      background: m.is_published
                        ? "var(--color-feedback-success-surface)"
                        : "var(--color-neutral-paper-alt)",
                    }}
                  >
                    {m.is_published ? "Live" : "Hidden"}
                  </span>
                  {!m.photo?.url && <span className="mono">No photo</span>}

                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : m.id)}
                    className={BTN.secondary}
                    aria-expanded={open}
                  >
                    {open ? "Close" : canEdit ? "Edit" : "View"}
                  </button>
                  {canDelete && (
                    <ConfirmDelete
                      compact
                      icon
                      what={m.full_name}
                      consequence={m.is_published ? "They are live on the About page and will disappear from it." : undefined}
                      action={() => deleteTeamMember(m.id)}
                    />
                  )}
                </div>

                {open && canEdit && (
                  <form
                    className="space-y-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-page-alt)] p-5"
                    action={(fd) => run(() => saveTeamMember(m.id, fd))}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Full name" htmlFor={`n-${m.id}`} required>
                        <input id={`n-${m.id}`} name="full_name" defaultValue={m.full_name} className={inputCls} />
                      </Field>
                      <Field
                        label="Role"
                        hint="How it reads on the site, e.g. “Board Member · Pharmacist”."
                        htmlFor={`r-${m.id}`}
                      >
                        <input id={`r-${m.id}`} name="role_title" defaultValue={m.role_title ?? ""} className={inputCls} />
                      </Field>
                      <Field label="Tier" htmlFor={`t-${m.id}`} hint="Directors appear on their department page.">
                        <select id={`t-${m.id}`} name="tier" defaultValue={m.tier ?? "board"} className={inputCls}>
                          {TIERS.map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Order" htmlFor={`p-${m.id}`} hint="Lower numbers come first.">
                        <input id={`p-${m.id}`} name="position" type="number" defaultValue={m.position} className={inputCls} />
                      </Field>
                    </div>

                    <PhotoPicker member={m} photos={photos} />

                    <Field label="Short bio" hint="Optional. Shown on department pages." htmlFor={`b-${m.id}`}>
                      <textarea id={`b-${m.id}`} name="bio" rows={3} defaultValue={m.bio ?? ""} className={inputCls} />
                    </Field>

                    <Field label="LinkedIn" htmlFor={`l-${m.id}`}>
                      <input id={`l-${m.id}`} name="linkedin" defaultValue={m.linkedin ?? ""} className={inputCls} placeholder="https://www.linkedin.com/in/…" />
                    </Field>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button type="submit" disabled={pending} className={BTN.primary}>Save</button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => setTeamPublished(m.id, !m.is_published))}
                        className={BTN.secondary}
                      >
                        {m.is_published ? "Hide from site" : "Publish to site"}
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            if (confirm(`Remove ${m.full_name} permanently?`)) {
                              run(() => deleteTeamMember(m.id));
                            }
                          }}
                          className={`${BTN.danger} ml-auto`}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ── Photo picker ──────────────────────────────────────────────────
   Preview and dropdown are bound together so the face changes as you scroll
   the list. That is the whole job of this screen. */
function PhotoPicker({ member, photos }: { member: Member; photos: string[] }) {
  const [url, setUrl] = useState(member.photo?.url ?? "");

  return (
    <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
      <Thumb url={url} name={member.full_name} big />
      <div className="space-y-4">
        <Field
          label="Photograph"
          htmlFor={`ph-${member.id}`}
          hint="Pick one already uploaded, or upload a new portrait below."
        >
          <select
            id={`ph-${member.id}`}
            name="photo_url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={inputCls}
          >
            <option value="">No photograph</option>
            {photos.map((p) => (
              <option key={p} value={p}>{p.replace("/team/", "")}</option>
            ))}
            {/* A freshly uploaded portrait is not in the folder listing the
                server rendered, so it needs its own option or the select would
                silently fall back to "No photograph". */}
            {url && !photos.includes(url) && <option value={url}>Just uploaded</option>}
          </select>
        </Field>

        <MediaUploader
          folder="/team"
          accept="image/*"
          label="Upload a portrait"
          hint="A head-and-shoulders photograph. It is cropped to a tall portrait, so leave a little room above the head."
          onUploaded={(r) => setUrl(r.url)}
        />
        <Field
          label="Alt text"
          hint="Describes the picture for someone using a screen reader. Their name and role is usually right."
          htmlFor={`a-${member.id}`}
        >
          <input
            id={`a-${member.id}`}
            name="photo_alt"
            defaultValue={member.photo?.alt ?? ""}
            placeholder={member.full_name}
            className={inputCls}
          />
        </Field>
      </div>
    </div>
  );
}

function Thumb({ url, name, big = false }: { url?: string | null; name: string; big?: boolean }) {
  const size = big ? "w-[120px]" : "w-[52px]";
  const initials = name
    .replace(/^(Rev\.|Fr\.|Dr\.|Prof\.)\s*/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={`${size} shrink-0 overflow-hidden rounded-dash-sm bg-[var(--color-violet-100)]`}
      style={{ aspectRatio: "4/5" }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[var(--color-violet-700)] opacity-70">
          {initials}
        </span>
      )}
    </div>
  );
}
