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
export const ATTIO_API = "https://api.attio.com/v2";
export const APOLLO_API = "https://api.apollo.io/api/v1";
// Attio notes are listed in pages of at most 50 (documented maximum).
const ATTIO_NOTE_PAGE = 50;
const ATTIO_NOTE_PAGES = 40;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const APOLLO_ID = /^[0-9a-f]{24}$/i;
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
function mapped(r, map, normalizeId) {
  const f = fields(r);
  if (
    !map ||
    typeof map !== "object" ||
    Array.isArray(map) ||
    !Object.keys(map).length
  )
    throw new Error(
      `Provide a nonempty field mapping; keys are ${FIELD_KEYS.join(", ")}`,
    );
  const out = {};
  for (const [key, raw] of Object.entries(map)) {
    if (!FIELD_KEYS.includes(key))
      throw new Error(
        `Unknown field "${key}" in the map file; valid keys are ${FIELD_KEYS.join(", ")}`,
      );
    if (typeof raw !== "string" || !raw.trim())
      throw new Error(`Map "${key}" to a nonempty destination field id`);
    const id = normalizeId(key, raw.trim());
    if (Object.hasOwn(out, id))
      throw new Error(`Destination field "${id}" is mapped twice`);
    out[id] = f[key];
  }
  return out;
}
const attioSlug = (key, id) => {
  if (!/^[a-z0-9_]+$/.test(id) && !UUID.test(id))
    throw new Error(
      `Attio destination for "${key}" must be an attribute api_slug (lowercase letters, digits, underscores) or attribute UUID; got "${id}"`,
    );
  return id;
};
const apolloFieldId = (key, id) => {
  // GET /api/v1/fields returns ids as "account.<24 hex>"; typed_custom_fields wants the bare id.
  const bare = id.replace(/^account\./, "");
  if (!APOLLO_ID.test(bare))
    throw new Error(
      `Apollo destination for "${key}" must be a 24-character custom field id from GET /api/v1/fields?source=custom (looks like ${id.startsWith("replace_with") ? "a placeholder from the example file" : `"${id}"`})`,
    );
  return bare;
};
export function plan(r, { target, recordId, fieldMap }) {
  if (!["attio", "apollo"].includes(target))
    throw new Error("Provide --target attio or --target apollo");
  if (!r || typeof r !== "object" || !r.domain || !r.state)
    throw new Error(
      "The --input file is not an analysis.json produced by the analyze command",
    );
  if (r.status !== "complete")
    throw new Error(
      `Archive coverage for ${r.domain} is ${r.status ?? "unknown"}; rerun analyze until it is complete before updating CRM fields`,
    );
  if (typeof recordId !== "string" || !recordId.trim())
    throw new Error("Provide --record-id with an existing CRM record id");
  recordId = recordId.trim();
  if (target === "attio" && !UUID.test(recordId))
    throw new Error(
      `Attio record ids are UUIDs (copy it from the company URL in Attio); got "${recordId}"`,
    );
  if (target === "apollo" && !APOLLO_ID.test(recordId))
    throw new Error(
      `Apollo account ids are 24-character hex strings (copy it from the account URL in Apollo); got "${recordId}"`,
    );
  const id = encodeURIComponent(recordId);
  if (target === "attio") {
    const v = mapped(r, fieldMap, attioSlug);
    // Empty values are omitted rather than sent as "", so Attio keeps the prior value for those attributes.
    const values = Object.fromEntries(
      Object.entries(v).filter(([, x]) => x !== "" && x != null),
    );
    if (!Object.keys(values).length)
      throw new Error(
        "Every mapped field is empty for this analysis; map website_activity_state so there is something to write",
      );
    return {
      target,
      recordId,
      method: "PATCH",
      url: `${ATTIO_API}/objects/companies/records/${id}`,
      body: { data: { values } },
      omitted: Object.keys(v).filter((k) => !(k in values)),
      note: { title: noteTitle(r), format: "markdown", content: renderNote(r) },
    };
  }
  return {
    target,
    recordId,
    method: "PATCH",
    url: `${APOLLO_API}/accounts/${id}`,
    body: { typed_custom_fields: mapped(r, fieldMap, apolloFieldId) },
  };
}
async function request(url, method, body, headers, fetcher) {
  let r;
  try {
    r = await fetcher(url, {
      method,
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
  } catch (e) {
    throw new Error(
      `${method} ${new URL(url).pathname}: ${e.name === "TimeoutError" ? "timed out after 30s" : `connection failed (${e.cause?.code ?? e.cause?.message ?? e.message})`}`,
    );
  }
  if (!r.ok) {
    let detail = "";
    try {
      detail = (await r.text()).replace(/\s+/g, " ").trim().slice(0, 300);
    } catch {}
    const hint =
      r.status === 401 || r.status === 403
        ? " Check the API token and its scopes."
        : r.status === 404
          ? " Check the record id."
          : "";
    throw new Error(
      `${method} ${new URL(url).pathname}: HTTP ${r.status}${detail ? ` ${detail}` : ""}.${hint} No automatic retry was attempted.`,
    );
  }
  if (r.status === 204) return {};
  try {
    return await r.json();
  } catch {
    throw new Error(`${method} ${new URL(url).pathname}: non-JSON response`);
  }
}
const noteText = (n) =>
  typeof n?.content_plaintext === "string"
    ? n.content_plaintext
    : typeof n?.content_markdown === "string"
      ? n.content_markdown
      : "";
export async function findManagedNote(recordId, title, headers, fetcher) {
  const matches = [];
  for (let page = 0; page < ATTIO_NOTE_PAGES; page++) {
    const q = new URLSearchParams({
      parent_object: "companies",
      parent_record_id: recordId,
      limit: String(ATTIO_NOTE_PAGE),
      offset: String(page * ATTIO_NOTE_PAGE),
    });
    const r = await request(
      `${ATTIO_API}/notes?${q}`,
      "GET",
      undefined,
      headers,
      fetcher,
    );
    if (!Array.isArray(r.data)) throw new Error("Invalid note listing");
    matches.push(...r.data.filter((n) => n.title === title));
    if (r.data.length < ATTIO_NOTE_PAGE) break;
    if (page === ATTIO_NOTE_PAGES - 1)
      throw new Error("Too many notes to safely locate the managed note");
  }
  if (matches.length > 1)
    throw new Error(
      `Found ${matches.length} notes titled "${title}"; delete the duplicates in Attio first`,
    );
  const existing = matches[0];
  // Attio re-renders markdown, so ownership is checked by the marker text, not by exact prefix.
  if (existing && !noteText(existing).includes(NOTE_MARKER))
    throw new Error(
      `A note titled "${title}" exists but was not written by this tool; rename it before continuing`,
    );
  return existing;
}
export async function applyPlan(p, { token, fetcher = fetch } = {}) {
  if (!token)
    throw new Error(
      `Set ${p.target === "attio" ? "ATTIO_API_TOKEN" : "APOLLO_API_KEY"} in your shell before using --apply`,
    );
  // Plans are generated in memory by the CLI, never loaded from untrusted plan files.
  const prefix =
    p.target === "attio"
      ? `${ATTIO_API}/objects/companies/records/`
      : `${APOLLO_API}/accounts/`;
  if (!p.url.startsWith(prefix) || p.method !== "PATCH")
    throw new Error("Invalid destination");
  const headers =
    p.target === "attio"
      ? { Authorization: `Bearer ${token}` }
      : { "x-api-key": token };
  let existing;
  if (p.target === "attio")
    existing = await findManagedNote(p.recordId, p.note.title, headers, fetcher);
  const record = await request(p.url, p.method, p.body, headers, fetcher);
  if (p.target !== "attio") return { record, notes: "not used" };
  try {
    if (existing?.content_markdown === p.note.content)
      return { record, note: existing, unchanged: true };
    const noteId = existing?.id?.note_id;
    if (existing && typeof noteId !== "string")
      throw new Error("Existing note has no id");
    const note = existing
      ? await request(
          `${ATTIO_API}/notes/${encodeURIComponent(noteId)}`,
          "PATCH",
          { data: p.note },
          headers,
          fetcher,
        )
      : await request(
          `${ATTIO_API}/notes`,
          "POST",
          {
            data: {
              parent_object: "companies",
              parent_record_id: p.recordId,
              ...p.note,
            },
          },
          headers,
          fetcher,
        );
    return { record, note, created: !existing };
  } catch (e) {
    throw new Error(
      `Company fields were updated, but the note was not confirmed: ${e.message} Re-run the same saved analysis; the adapter checks for an existing managed note before creating one. Avoid concurrent writes to the same company.`,
    );
  }
}
