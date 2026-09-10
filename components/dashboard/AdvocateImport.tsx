"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importAdvocatesCsv, type ImportReport } from "@/lib/cms/advocates";
import { COUNTRIES } from "@/lib/advocates/form";
import { BTN, Field, inputCls, Notice } from "./ui";
import { useToast } from "./Toast";

/**
 * Bringing the Google Forms responses across.
 *
 * The 800-odd people who joined AAC before this site existed are sitting in
 * two Google Sheets. There is no way to read them out of Drive directly — that
 * would need Google credentials this site does not have and should not want —
 * so the route is the one Google itself provides: download the responses as a
 * spreadsheet, upload it here.
 *
 * IT ALWAYS PREVIEWS FIRST, and that is the part that matters. A CSV import
 * that guesses a column wrong writes hundreds of rows of nonsense, and
 * unpicking it afterwards is far harder than checking beforehand. So the first
 * pass reads the whole file, matches the columns, counts what would happen,
 * and changes nothing — then shows you which columns it recognised, which it
 * ignored, and how many people are new. Only then is there a button that
 * writes.
 *
 * Running it twice is safe. People are matched on email address, so a second
 * import of the same sheet updates the same rows rather than creating a
 * parallel set of duplicates.
 */
export function AdvocateImport() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [fileName, setFileName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const run = (commit: boolean) => {
    const el = formRef.current;
    if (!el) return;
    const fd = new FormData(el);
    if (commit) fd.set("commit", "yes");

    start(async () => {
      const res = await importAdvocatesCsv(fd);
      setReport(res);

      if (res.error) toast({ tone: "danger", text: res.error });
      else if (commit) {
        toast({
          tone: "success",
          title: "Import finished",
          text: `${res.imported} new, ${res.updated} updated${res.skipped ? `, ${res.skipped} skipped` : ""}.`,
        });
        router.refresh();
      } else {
        toast({
          tone: "info",
          title: "Nothing saved yet",
          text: `Checked ${res.total} rows. Review below, then import.`,
        });
      }
    });
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={BTN.secondary}>
        Import from Google Forms
      </button>
    );
  }

  const done = report && !report.preview && report.ok && !report.error;

  return (
    <div className="rounded-dash-md border border-[var(--color-border-default)] bg-white p-5 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
            Import from Google Forms
          </p>
          <p className="mt-1 max-w-[68ch] text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            In Google Sheets, open the responses for one country, then{" "}
            <strong className="font-medium text-[var(--color-text-primary)]">
              File → Download → Comma-separated values (.csv)
            </strong>
            . Upload that file here. Nothing is saved until you have seen what it found — and
            running the same file twice updates the same people rather than duplicating them.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setOpen(false); setReport(null); }}
          className={BTN.secondary}
        >
          Close
        </button>
      </div>

      <form ref={formRef} className="flex flex-wrap items-end gap-4">
        <Field
          label="Which country's responses"
          htmlFor="imp-country"
          hint="The sheet does not say, so it is set here."
        >
          <select id="imp-country" name="country" className={inputCls} defaultValue="Nigeria">
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="The spreadsheet" htmlFor="imp-file">
          <input
            id="imp-file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => { setFileName(e.target.files?.[0]?.name ?? ""); setReport(null); }}
            className="block w-full max-w-[320px] text-[13px] file:mr-3 file:cursor-pointer file:rounded-pill file:border-0 file:bg-[var(--color-violet-100)] file:px-4 file:py-2 file:text-[13px] file:font-medium file:text-[var(--color-violet-700)]"
          />
        </Field>

        <input type="hidden" name="source" value="google_form" />

        <button
          type="button"
          disabled={pending || !fileName}
          onClick={() => run(false)}
          className={BTN.primary}
        >
          {pending && !report ? "Reading…" : "Check the file"}
        </button>
      </form>

      {report && (
        <div className="mt-5 space-y-4 border-t border-[var(--color-border-subtle)] pt-5">
          {report.error && <Notice tone="danger">{report.error}</Notice>}

          {report.ok && (
            <>
              <div className="flex flex-wrap gap-2">
                <Stat n={report.total} label="rows in the file" />
                <Stat n={report.imported} label={done ? "added" : "would be new"} tone="success" />
                <Stat n={report.updated} label={done ? "updated" : "already here"} />
                {report.skipped > 0 && <Stat n={report.skipped} label="skipped" tone="warning" />}
              </div>

              <details className="rounded-dash-sm border border-[var(--color-border-subtle)] p-3">
                <summary className="cursor-pointer text-[13px] font-medium text-[var(--color-text-primary)]">
                  {report.matchedColumns.length} columns recognised
                  {report.unmatchedColumns.length > 0 &&
                    `, ${report.unmatchedColumns.length} ignored`}
                </summary>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mono mb-1.5">Recognised</p>
                    <ul className="space-y-0.5">
                      {report.matchedColumns.map((c) => (
                        <li key={c} className="text-[12px] text-[var(--color-text-secondary)]">✓ {c}</li>
                      ))}
                    </ul>
                  </div>
                  {report.unmatchedColumns.length > 0 && (
                    <div>
                      <p className="mono mb-1.5">Ignored</p>
                      <ul className="space-y-0.5">
                        {report.unmatchedColumns.map((c) => (
                          <li key={c} className="text-[12px] text-[var(--color-text-secondary)]">· {c}</li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                        Ignored columns are left in the spreadsheet, not lost. If one of these
                        matters, say which and it can be added.
                      </p>
                    </div>
                  )}
                </div>
              </details>

              {report.problems.length > 0 && (
                <Notice tone="warning" title={`${report.skipped} row${report.skipped === 1 ? "" : "s"} needed attention`}>
                  <ul className="mt-1 space-y-0.5">
                    {report.problems.map((p, i) => (
                      <li key={i} className="text-[12px]">{p}</li>
                    ))}
                  </ul>
                </Notice>
              )}

              {report.preview ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(true)}
                    className={BTN.primary}
                  >
                    {pending ? "Importing…" : `Import ${report.imported + report.updated} people`}
                  </button>
                  <p className="mono">Nothing has been saved yet.</p>
                </div>
              ) : (
                <Notice tone="success" title="Done">
                  They are in the list below. Anyone whose campus was not matched has no chapter
                  yet — filter by “No chapter” to work through them.
                </Notice>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone?: "success" | "warning" }) {
  const bg =
    tone === "success" ? "var(--color-feedback-success-surface)"
    : tone === "warning" ? "var(--color-feedback-warning-surface)"
    : "var(--color-surface-page-alt)";
  return (
    <span className="rounded-dash-sm px-3 py-2 text-[13px]" style={{ background: bg }}>
      <strong className="font-semibold">{n.toLocaleString()}</strong>{" "}
      <span className="text-[var(--color-text-secondary)]">{label}</span>
    </span>
  );
}
