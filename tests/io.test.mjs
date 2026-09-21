import { test } from "node:test";
import assert from "node:assert/strict";
import { readPages, analyzeDomain } from "../src/archive.mjs";
import {
  plan,
  applyPlan,
  toCSV,
  fields,
  renderNote,
  NOTE_MARKER,
} from "../src/adapters.mjs";
const response = (x) => new Response(JSON.stringify(x), { status: 200 });
const ATTIO_ID = "3f4a2b1c-7d8e-4f90-a1b2-c3d4e5f60718";
const APOLLO_ID = "694095a80f1b6000110fc556";
const APOLLO_FIELD = "60c39ed82bd02f01154c470a";
const sample = {
  domain: "example.com",
  status: "complete",
  asOf: "2026-09-11",
  state: "Fresh Rebuild",
  signals: [],
  latestFinding: null,
  archiveUrl: "https://web.archive.org/web/*/example.com",
  coverage: { homepageMonths: 6, inventoryMonths: 6 },
  reviewPrompt: "Review first",
};
const withFinding = {
  ...sample,
  latestFinding: { label: "Major Rebuild Signal", start: "2026-04", end: "2026-06" },
};
test("CDX resumes with same filters and does not duplicate headers", async () => {
  const urls = [];
  const r = await readPages(
    { url: "example.com", filter: "statuscode:200" },
    {
      fetcher: async (u) => {
        urls.push(new URL(u));
        return response(
          urls.length === 1
            ? [["timestamp"], ["20260101120000"], [], ["abc"]]
            : [["timestamp"], ["20260201120000"]],
        );
      },
    },
  );
  assert.equal(r.complete, true);
  assert.equal(r.payload.length, 3);
  assert.equal(urls[1].searchParams.get("resumeKey"), "abc");
  assert.equal(urls[1].searchParams.get("filter"), "statuscode:200");
});
test("truncation, HTTP failure and malformed JSON report partial coverage", async () => {
  for (const fetcher of [
    async () => new Response("no", { status: 403 }),
    async () => response([["timestamp"], ["20260101120000"], [], ["again"]]),
    async () => new Response("bad"),
  ]) {
    const r = await readPages({}, { fetcher, maxPages: 1 });
    assert.equal(r.complete, false);
    assert.ok(r.error);
  }
});
test("archive reads retry connection resets and 5xx, then give up with the cause", async () => {
  let calls = 0;
  const flaky = async () => {
    calls++;
    if (calls === 1) throw new TypeError("fetch failed", { cause: { code: "ECONNRESET" } });
    if (calls === 2) return new Response("busy", { status: 503 });
    return response([["timestamp"], ["20260101120000"]]);
  };
  const ok = await readPages({}, { fetcher: flaky, maxPages: 1, backoffMs: 1 });
  assert.equal(ok.complete, true);
  assert.equal(calls, 3);
  const dead = await readPages(
    {},
    {
      fetcher: async () => {
        throw new TypeError("fetch failed", { cause: { code: "ECONNRESET" } });
      },
      maxPages: 1,
      backoffMs: 1,
    },
  );
  assert.equal(dead.complete, false);
  assert.match(dead.error, /3 attempts/);
  assert.match(dead.error, /ECONNRESET/);
  assert.match(
    (await readPages({}, { fetcher: async () => new Response("no", { status: 503 }), maxPages: 1, backoffMs: 1 })).error,
    /503 after 3 attempts/,
  );
});
test("analyzeDomain uses the configured page size, reports progress and labels query errors", async () => {
  const urls = [],
    progress = [];
  const r = await analyzeDomain("Example.com", {
    asOf: "2026-09-11",
    pageSize: 250,
    backoffMs: 1,
    fetcher: async (u) => {
      urls.push(new URL(u));
      return urls.length === 1
        ? response([["timestamp", "digest", "length"]])
        : new Response("down", { status: 502 });
    },
    onProgress: (x) => progress.push(x),
  });
  assert.equal(urls[0].searchParams.get("limit"), "250");
  assert.equal(urls[0].searchParams.get("url"), "example.com/");
  assert.equal(r.status, "partial");
  assert.match(r.errors[0], /^inventory query: Wayback HTTP 502/);
  assert.deepEqual(progress[0], { query: "homepage", page: 1, rows: 0, complete: true });
});
test("Attio plan updates fields and creates one markdown note, Apollo has no note", async () => {
  const p = plan(sample, {
    target: "attio",
    recordId: ATTIO_ID,
    fieldMap: { website_activity_state: "website_activity_state" },
  });
  const calls = [];
  await applyPlan(p, {
    token: "test",
    fetcher: async (url, o) => {
      calls.push({ url, ...o });
      return response(
        url.includes("/notes?")
          ? { data: [] }
          : { data: { id: { note_id: "note-1" } } },
      );
    },
  });
  assert.equal(new URL(calls[0].url).searchParams.get("limit"), "50");
  assert.equal(new URL(calls[0].url).searchParams.get("parent_record_id"), ATTIO_ID);
  assert.equal(calls[1].method, "PUT");
  assert.equal(calls[1].url, `https://api.attio.com/v2/objects/companies/records/${ATTIO_ID}`);
  assert.deepEqual(
    JSON.parse(calls[1].body).data.values.website_activity_state,
    ["Fresh Rebuild"],
  );
  const created = JSON.parse(calls[2].body).data;
  assert.equal(created.parent_object, "companies");
  assert.equal(created.parent_record_id, ATTIO_ID);
  assert.equal(created.format, "markdown");
  assert.match(created.content, /⧗ Wayback Machine ⧗/);
  const a = plan(sample, {
    target: "apollo",
    recordId: APOLLO_ID,
    fieldMap: { website_activity_state: APOLLO_FIELD },
  });
  assert.deepEqual(a.body, {
    typed_custom_fields: { [APOLLO_FIELD]: "Fresh Rebuild" },
  });
  assert.equal(a.url, `https://api.apollo.io/api/v1/accounts/${APOLLO_ID}`);
  assert.ok(!("note" in a));
  const ac = [];
  await applyPlan(a, {
    token: "test",
    fetcher: async (u, o) => {
      ac.push(o);
      return response({ account: {} });
    },
  });
  assert.equal(ac.length, 1);
  assert.equal(ac[0].headers["x-api-key"], "test");
  assert.ok(!ac[0].headers.Authorization);
});
test("Attio omits empty values and requires UUID record ids and slug-like attributes", () => {
  const p = plan(sample, {
    target: "attio",
    recordId: ATTIO_ID,
    fieldMap: { website_activity_state: "website_activity_state", last_signal: "last_signal" },
  });
  assert.deepEqual(p.body.data.values, { website_activity_state: ["Fresh Rebuild"] });
  assert.deepEqual(p.omitted, ["last_signal"]);
  const full = plan(withFinding, {
    target: "attio",
    recordId: ATTIO_ID,
    fieldMap: { last_signal: "last_signal", signal_start: "signal_start" },
  });
  assert.deepEqual(full.body.data.values, {
    last_signal: "Major Rebuild Signal",
    signal_start: "2026-04",
  });
  assert.throws(
    () => plan(sample, { target: "attio", recordId: ATTIO_ID, fieldMap: { last_signal: "last_signal" } }),
    /Every mapped field is empty/,
  );
  assert.throws(
    () => plan(sample, { target: "attio", recordId: "record-1", fieldMap: { website_activity_state: "state" } }),
    /UUID/,
  );
  assert.throws(
    () => plan(sample, { target: "attio", recordId: ATTIO_ID, fieldMap: { website_activity_state: "Website State" } }),
    /api_slug/,
  );
});
test("Apollo accepts ids copied from the fields endpoint and rejects placeholders", () => {
  const p = plan(sample, {
    target: "apollo",
    recordId: APOLLO_ID,
    fieldMap: { website_activity_state: `account.${APOLLO_FIELD}` },
  });
  assert.deepEqual(Object.keys(p.body.typed_custom_fields), [APOLLO_FIELD]);
  assert.throws(
    () =>
      plan(sample, {
        target: "apollo",
        recordId: APOLLO_ID,
        fieldMap: { website_activity_state: "replace_with_website_activity_state_field_id" },
      }),
    /placeholder from the example file/,
  );
  assert.throws(
    () => plan(sample, { target: "apollo", recordId: "acct", fieldMap: { website_activity_state: APOLLO_FIELD } }),
    /24-character/,
  );
  assert.throws(
    () => plan(sample, { target: "hubspot", recordId: APOLLO_ID, fieldMap: {} }),
    /--target attio or --target apollo/,
  );
});
test("Attio reuses managed note; does not silently overwrite unrelated notes", async () => {
  const p = plan(sample, {
    target: "attio",
    recordId: ATTIO_ID,
    fieldMap: { website_activity_state: "state" },
  });
  const calls = [];
  const r = await applyPlan(p, {
    token: "test",
    fetcher: async (u, o) => {
      calls.push({ u, o });
      return response(
        u.includes("/notes?")
          ? {
              data: [
                {
                  title: p.note.title,
                  content_markdown: p.note.content,
                  id: { note_id: "note-1" },
                },
              ],
            }
          : { data: {} },
      );
    },
  });
  assert.equal(calls.length, 2);
  assert.equal(r.unchanged, true);
  await assert.rejects(
    applyPlan(p, {
      token: "test",
      fetcher: async () =>
        response({
          data: [
            {
              title: p.note.title,
              content_plaintext: "Human note",
              content_markdown: "Human note",
              id: { note_id: "x" },
            },
          ],
        }),
    }),
    /not written by this tool/,
  );
});
test("Attio ownership survives markdown re-rendering and note pages of 50", async () => {
  const p = plan(sample, {
    target: "attio",
    recordId: ATTIO_ID,
    fieldMap: { website_activity_state: "state" },
  });
  const pages = [];
  const calls = [];
  const rendered = {
    title: p.note.title,
    content_plaintext: `${NOTE_MARKER}.\nWebsite history: example.com\nolder`,
    content_markdown: `_${NOTE_MARKER}._\n\n# Website history: example.com\n\nolder`,
    id: { note_id: "note-9" },
  };
  const r = await applyPlan(p, {
    token: "test",
    fetcher: async (u, o) => {
      calls.push({ u, o });
      if (u.includes("/notes?")) {
        const offset = Number(new URL(u).searchParams.get("offset"));
        pages.push(offset);
        return response({
          data:
            offset === 0
              ? Array.from({ length: 50 }, (_, i) => ({
                  title: `Other ${i}`,
                  id: { note_id: `o${i}` },
                }))
              : [rendered],
        });
      }
      return response({ data: {} });
    },
  });
  assert.deepEqual(pages, [0, 50]);
  assert.equal(r.created, false);
  const patch = calls.find((c) => c.o.method === "PATCH" && c.u.includes("/notes/"));
  assert.equal(patch.u, "https://api.attio.com/v2/notes/note-9");
  assert.deepEqual(Object.keys(JSON.parse(patch.o.body).data), ["title", "format", "content"]);
});
test("partial analysis cannot overwrite a CRM state; invalid maps fail closed", () => {
  assert.throws(
    () =>
      plan(
        { ...sample, status: "partial" },
        {
          target: "apollo",
          recordId: APOLLO_ID,
          fieldMap: { website_activity_state: APOLLO_FIELD },
        },
      ),
    /partial; rerun analyze/,
  );
  assert.throws(
    () =>
      plan(sample, {
        target: "apollo",
        recordId: APOLLO_ID,
        fieldMap: { unknown: APOLLO_FIELD },
      }),
    /Unknown field "unknown"/,
  );
  assert.throws(
    () => plan({ hello: 1 }, { target: "apollo", recordId: APOLLO_ID, fieldMap: {} }),
    /not an analysis.json/,
  );
  assert.ok(!Object.hasOwn(fields(sample), "note"));
  assert.ok(!toCSV([sample]).includes("content_markdown"));
  assert.match(toCSV([{ ...sample, domain: "=formula" }]), /'=formula/);
  assert.match(renderNote({ ...sample, coverage: undefined }), /Homepage coverage: 0 months/);
});
test("changed managed note uses PATCH and note failure reports partial write", async () => {
  const p = plan(sample, {
    target: "attio",
    recordId: ATTIO_ID,
    fieldMap: { website_activity_state: "state" },
  });
  const calls = [];
  const listed = {
    data: [
      {
        title: p.note.title,
        content_markdown: `*${NOTE_MARKER}.*\nOlder report`,
        id: { note_id: "note-1" },
      },
    ],
  };
  await applyPlan(p, {
    token: "test",
    fetcher: async (u, o) => {
      calls.push({ u, o });
      return response(u.includes("/notes?") ? listed : { data: {} });
    },
  });
  assert.equal(calls[2].u, "https://api.attio.com/v2/notes/note-1");
  assert.equal(calls[2].o.method, "PATCH");
  await assert.rejects(
    applyPlan(p, {
      token: "test",
      fetcher: async (u, o) =>
        u.endsWith("/notes/note-1")
          ? new Response("failed", { status: 503 })
          : response(u.includes("/notes?") ? listed : { data: {} }),
    }),
    /fields were updated/,
  );
});
test("HTTP errors include status, body excerpt and a hint", async () => {
  const p = plan(sample, {
    target: "apollo",
    recordId: APOLLO_ID,
    fieldMap: { website_activity_state: APOLLO_FIELD },
  });
  await assert.rejects(
    applyPlan(p, {
      token: "bad",
      fetcher: async () =>
        new Response('{"error":"Invalid API key"}', { status: 401 }),
    }),
    /HTTP 401 \{"error":"Invalid API key"\}\. Check the API token/,
  );
  await assert.rejects(
    applyPlan(p, {
      token: "x",
      fetcher: async () => {
        throw new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } });
      },
    }),
    /connection failed \(ENOTFOUND\)/,
  );
  await assert.rejects(applyPlan(p, {}), /Set APOLLO_API_KEY/);
});

test('Attio multi-select replaces the current stage and keeps optional fields as text', async () => {
 const p=plan(withFinding,{target:'attio',recordId:ATTIO_ID,fieldMap:{website_activity_state:'custom_state',last_signal:'last_signal'}});
 assert.equal(p.method,'PUT');
 assert.deepEqual(p.body.data.values.custom_state,['Fresh Rebuild']);
 assert.equal(typeof p.body.data.values.last_signal,'string');
 let selected=['Gone Quiet'];
 await applyPlan(p,{token:'test',fetcher:async(url,o)=>{
  if(url.includes('/records/')){
   const next=JSON.parse(o.body).data.values.custom_state;
   selected=o.method==='PUT'?next:[...selected,...next];
  }
  return response({data:[]});
 }});
 assert.deepEqual(selected,['Fresh Rebuild']);
});
test('Apollo multi-select maps stage names to option IDs and rejects missing options',()=>{
 const option='0123456789abcdef01234567';
 const fieldMap={website_activity_state:{id:APOLLO_FIELD,type:'multiselect',options:{'Fresh Rebuild':option}}};
 const p=plan(sample,{target:'apollo',recordId:APOLLO_ID,fieldMap});
 assert.deepEqual(p.body.typed_custom_fields[APOLLO_FIELD],[option]);
 assert.throws(()=>plan({...sample,state:'Gone Quiet'},{target:'apollo',recordId:APOLLO_ID,fieldMap}),/option/);
});
