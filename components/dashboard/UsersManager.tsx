"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { inviteUser, setUserRole, setUserStatus, revokeInvitation } from "@/lib/cms/users";
import { RANK, ROLE_LABEL, type Profile, type Role } from "@/lib/auth/permissions";
import { BTN, Field, inputCls, Notice, EmptyPanel, fmtDate } from "./ui";

/**
 * Users & roles.
 *
 * The role dropdown only ever lists roles below your own. That is not the
 * security boundary — Postgres refuses independently — but an option you are
 * not allowed to pick should not be offered, or every admin discovers the
 * limit by hitting an error.
 *
 * Scope fields appear only for the roles that use them: a campus coordinator
 * needs a chapter, a regional coordinator a region, a director a department.
 * Showing all three to everyone invites people to fill in fields that mean
 * nothing for that role.
 */

type Person = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
  status: string;
  chapter_id: string | null;
  zone_id: string | null;
  region_id: string | null;
  department_id: string | null;
  created_at: string;
};

type Invite = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  created_at: string;
  expires_at: string;
};

type Opt = { id: string; name: string };
type ChapterOpt = { id: string; name: string; country?: string | null; heldBy?: string | null };

const SCOPE_FOR: Record<string, "chapter" | "zone" | "region" | "department" | null> = {
  campus_coordinator: "chapter",
  zonal_coordinator: "zone",
  regional_coordinator: "region",
  department_director: "department",
};

const STATUS_TONE: Record<string, string> = {
  active: "var(--color-feedback-success-surface)",
  invited: "var(--color-feedback-info-surface)",
  suspended: "var(--color-feedback-danger-surface)",
  alumni: "var(--color-neutral-paper-alt)",
};

export function UsersManager({
  me,
  people,
  invites,
  chapters,
  zones,
  regions,
  departments,
}: {
  me: Profile;
  people: Person[];
  invites: Invite[];
  chapters: ChapterOpt[];
  zones: Opt[];
  regions: Opt[];
  departments: Opt[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [inviting, setInviting] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      setMsg({ ok: res.ok, text: res.ok ? res.message ?? "Saved." : res.error ?? "That did not work." });
      if (res.ok) setInviting(false);
      router.refresh();
    });

  /* Only roles strictly below mine. */
  const assignable = useMemo(
    () =>
      (Object.keys(RANK) as Role[])
        .filter((r) => RANK[r] < RANK[me.role])
        .sort((a, b) => RANK[b] - RANK[a]),
    [me.role]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return people;
    return people.filter(
      (p) =>
        p.email?.toLowerCase().includes(needle) ||
        p.full_name?.toLowerCase().includes(needle) ||
        ROLE_LABEL[p.role]?.toLowerCase().includes(needle)
    );
  }, [people, q]);

  return (
    <div className="space-y-6">
      {msg && <Notice tone={msg.ok ? "success" : "danger"}>{msg.text}</Notice>}

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email or role"
          aria-label="Search people"
          className={`${inputCls} max-w-[320px]`}
        />
        <button type="button" onClick={() => setInviting((v) => !v)} className={`${BTN.primary} ml-auto`}>
          {inviting ? "Cancel" : "Invite someone"}
        </button>
      </div>

      {inviting && (
        <form
          action={(fd) => run(() => inviteUser(fd))}
          className="space-y-4 rounded-dash-md border border-[var(--color-border-default)] bg-white p-6"
        >
          <div>
            <h2 className="font-display text-[1.3rem] text-[var(--color-text-display)]">Invite someone</h2>
            <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
              There is no link to click and no password to set. They sign in at the login page with
              this exact address, and the role below is applied automatically the first time.
            </p>
          </div>
          <RoleFields
            assignable={assignable}
            chapters={chapters}
            zones={zones}
            regions={regions}
            departments={departments}
            idPrefix="inv"
            withIdentity
          />
          <button type="submit" disabled={pending} className={BTN.primary}>
            {pending ? "Sending…" : "Send invitation"}
          </button>
        </form>
      )}

      {invites.length > 0 && (
        <section className="rounded-dash-md border border-[var(--color-border-default)] bg-white">
          <p className="mono border-b border-[var(--color-border-subtle)] px-5 py-3">
            Invited, not yet signed in ({invites.length})
          </p>
          <ul>
            {invites.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border-subtle)] px-5 py-3 last:border-0"
              >
                <div className="min-w-[200px] flex-1">
                  <p className="text-[13px] text-[var(--color-text-primary)]">
                    {i.full_name ?? i.email}
                  </p>
                  {i.full_name && <p className="mono mt-0.5">{i.email}</p>}
                </div>
                <span className="mono">{ROLE_LABEL[i.role]}</span>
                <span className="mono">Expires {fmtDate(i.expires_at)}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => revokeInvitation(i.id))}
                  className={BTN.ghost}
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {filtered.length === 0 ? (
        <EmptyPanel
          title={q ? "Nobody matches that" : "No accounts yet"}
          body={
            q
              ? "Try a different name, email or role."
              : "People appear here the first time they sign in. Invite someone to get started."
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => {
            const open = openId === p.id;
            const isMe = p.id === me.id;
            const outranks = RANK[p.role] >= RANK[me.role];
            const locked = isMe || outranks;

            return (
              <li
                key={p.id}
                className="overflow-hidden rounded-dash-md border border-[var(--color-border-default)] bg-white"
              >
                <div className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-[220px] flex-1">
                    <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
                      {p.full_name ?? p.email}
                      {isMe && <span className="mono ml-2">You</span>}
                    </p>
                    <p className="mono mt-0.5">{p.email}</p>
                  </div>

                  <span className="mono">{ROLE_LABEL[p.role]}</span>
                  <span
                    className="mono rounded-pill px-2 py-1"
                    style={{ background: STATUS_TONE[p.status] ?? STATUS_TONE.alumni }}
                  >
                    {p.status}
                  </span>

                  {locked ? (
                    <span className="mono max-w-[22ch] text-right">
                      {isMe ? "You cannot edit yourself" : "At or above your level"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : p.id)}
                      className={BTN.secondary}
                      aria-expanded={open}
                    >
                      {open ? "Close" : "Change"}
                    </button>
                  )}
                </div>

                {open && !locked && (
                  <div className="space-y-5 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-page-alt)] p-5">
                    <form action={(fd) => run(() => setUserRole(p.id, fd))} className="space-y-4">
                      <RoleFields
                        assignable={assignable}
                        chapters={chapters}
                        zones={zones}
                        regions={regions}
                        departments={departments}
                        idPrefix={p.id}
                        current={p}
                      />
                      <button type="submit" disabled={pending} className={BTN.primary}>
                        Save role
                      </button>
                    </form>

                    <div className="flex flex-wrap gap-2 border-t border-[var(--color-border-subtle)] pt-4">
                      {p.status === "active" ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => setUserStatus(p.id, "suspended"))}
                          className={BTN.danger}
                        >
                          Suspend access
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => setUserStatus(p.id, "active"))}
                          className={BTN.secondary}
                        >
                          Reactivate
                        </button>
                      )}
                      {p.status !== "alumni" && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => setUserStatus(p.id, "alumni"))}
                          className={BTN.ghost}
                        >
                          Mark as alumni
                        </button>
                      )}
                      <p className="mono ml-auto max-w-[40ch] text-right">
                        Accounts are never deleted — past work stays credited to a real person.
                      </p>
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

/* ── Shared role + scope fields ───────────────────────────────────── */
function RoleFields({
  assignable,
  chapters,
  zones,
  regions,
  departments,
  idPrefix,
  current,
  withIdentity = false,
}: {
  assignable: Role[];
  chapters: ChapterOpt[];
  zones: Opt[];
  regions: Opt[];
  departments: Opt[];
  idPrefix: string;
  current?: Person;
  withIdentity?: boolean;
}) {
  const [role, setRole] = useState<Role>(current?.role ?? assignable[assignable.length - 1] ?? "advocate");
  const scope = SCOPE_FOR[role] ?? null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {withIdentity && (
        <>
          <Field label="Email address" htmlFor={`${idPrefix}-email`} required>
            <input id={`${idPrefix}-email`} name="email" type="email" required className={inputCls} />
          </Field>
          <Field label="Their name" htmlFor={`${idPrefix}-name`} hint="Optional — used in the email.">
            <input id={`${idPrefix}-name`} name="full_name" className={inputCls} />
          </Field>
        </>
      )}

      <Field label="Role" htmlFor={`${idPrefix}-role`} hint="Only roles below your own are listed.">
        <select
          id={`${idPrefix}-role`}
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className={inputCls}
        >
          {assignable.map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
      </Field>

      {scope === "chapter" && (
        <Field
          label="Chapter"
          htmlFor={`${idPrefix}-ch`}
          hint={
            chapters.length === 0
              ? "No chapters yet — add one under Chapters first."
              : "One campus coordinator per chapter. Chapters already covered are shown but cannot be picked."
          }
        >
          <select
            id={`${idPrefix}-ch`}
            name="chapter_id"
            defaultValue={current?.chapter_id ?? ""}
            className={inputCls}
          >
            <option value="">Choose a chapter</option>
            {/* Free ones first: the whole point is picking an unassigned
                chapter without hunting through the taken ones. */}
            {chapters
              .filter((c) => !c.heldBy || c.id === current?.chapter_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.country ? ` — ${c.country}` : ""}
                  {c.id === current?.chapter_id ? " (current)" : ""}
                </option>
              ))}
            {chapters.some((c) => c.heldBy && c.id !== current?.chapter_id) && (
              <optgroup label="Already covered">
                {chapters
                  .filter((c) => c.heldBy && c.id !== current?.chapter_id)
                  .map((c) => (
                    <option key={c.id} value={c.id} disabled>
                      {c.name} — {c.heldBy}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </Field>
      )}
      {scope === "zone" && (
        <Field
          label="Zone"
          htmlFor={`${idPrefix}-zn`}
          hint={
            zones.length === 0
              ? "No zones yet — add them under Chapters."
              : "The zone they cover. One zonal coordinator per zone."
          }
        >
          <select id={`${idPrefix}-zn`} name="zone_id" defaultValue={current?.zone_id ?? ""} className={inputCls}>
            <option value="">Choose a zone</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </Field>
      )}
      {scope === "region" && (
        <Field label="Region" htmlFor={`${idPrefix}-rg`} hint="Which region they cover.">
          <select id={`${idPrefix}-rg`} name="region_id" defaultValue={current?.region_id ?? ""} className={inputCls}>
            <option value="">Not set yet</option>
            {regions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      {scope === "department" && (
        <Field label="Department" htmlFor={`${idPrefix}-dp`} hint="Which department they direct.">
          <select id={`${idPrefix}-dp`} name="department_id" defaultValue={current?.department_id ?? ""} className={inputCls}>
            <option value="">Not set yet</option>
            {departments.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
    </div>
  );
}
