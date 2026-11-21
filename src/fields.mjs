// Portable field values, note text and CSV. No CRM access.
export const FIELD_KEYS = [
  "website_activity_state",
  "last_signal",
  "signal_start",
  "signal_end",
  "analyzed_at",
  "archive_url",
  "coverage",
  "review_prompt",
];
import { renderNote, NOTE_MARKER } from "./note.mjs";
export { renderNote, NOTE_MARKER };
export function fields(r) {
  return {
    website_activity_state: r.state,
    last_signal: r.latestFinding?.label ?? "",
    signal_start: r.latestFinding?.start ?? "",
    signal_end: r.latestFinding?.end ?? "",
    analyzed_at: r.asOf,
    archive_url: r.archiveUrl,
    coverage: r.status,
    review_prompt: r.reviewPrompt,
  };
}
export function noteTitle(r) {
  return `Website History · ${r.domain}`;
}
export function toCSV(records) {
  const data = records.map((r) => ({ domain: r.domain, ...fields(r) })),
    keys = ["domain", ...FIELD_KEYS];
  const quote = (x) => {
    let s = String(x ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return (
    [keys, ...data.map((r) => keys.map((k) => r[k]))]
      .map((row) => row.map(quote).join(","))
      .join("\r\n") + "\r\n"
  );
}
