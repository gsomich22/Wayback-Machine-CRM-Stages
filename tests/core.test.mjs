import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, normalizeDomain, classify } from "../src/analyze.mjs";
const home = (months) => [
  ["timestamp", "digest", "length"],
  ...months.flatMap(([ym, length, n = 1]) =>
    Array.from({ length: n }, (_, i) => [
      ym.replace("-", "") + String(i + 1).padStart(2, "0") + "120000",
      `${ym}-${i}`,
      String(length),
    ]),
  ),
];
const input = {
  domain: "https://www.example.com/shop",
  asOf: "2026-09-11",
  inventory: [["timestamp", "original", "statuscode", "length"]],
};
test("persistent size shift produces dated rebuild and fresh state", () => {
  const r = analyze({
    ...input,
    homepage: home([
      ["2026-01", 1000],
      ["2026-02", 1000],
      ["2026-03", 1000],
      ["2026-04", 1500, 4],
      ["2026-05", 1500],
      ["2026-06", 1510],
    ]),
  });
  assert.equal(r.domain, "example.com");
  assert.equal(r.state, "Fresh Rebuild");
  assert.equal(r.signals[0].start, "2026-04");
  assert.equal(r.signals[0].end, "2026-06");
});
test("quick reversions and large archive gaps are not rebuilds", () => {
  for (const arr of [
    [
      ["2026-01", 1000],
      ["2026-02", 1000],
      ["2026-03", 1000],
      ["2026-04", 1500, 4],
      ["2026-05", 1000],
      ["2026-06", 1000],
    ],
    [
      ["2023-01", 1000],
      ["2024-02", 1000],
      ["2025-03", 1000],
      ["2026-04", 1500, 4],
      ["2026-05", 1500],
      ["2026-06", 1500],
    ],
  ])
    assert.ok(
      !analyze({ ...input, homepage: home(arr) }).signals.some(
        (x) => x.type === "rebuild",
      ),
    );
});
test("missing coverage stays unknown; does not become quiet", () => {
  const r = analyze({
    ...input,
    homepage: [],
    coverage: { homepage: false, inventory: false },
  });
  assert.equal(r.state, "Unknown");
  assert.equal(r.status, "unavailable");
  assert.equal(
    analyze({ ...input, homepage: home([["2026-01", 1000]]) }).state,
    "Insufficient History",
  );
});
test("bad schema, future dates and non-domain input are rejected", () => {
  assert.throws(() =>
    analyze({
      ...input,
      homepage: [
        ["date", "foo"],
        ["20260101", "x"],
      ],
    }),
  );
  for (const s of [
    "127.0.0.1",
    "http://localhost",
    "https://user:pass@example.com",
    "example.com:8080",
    "not a domain",
  ])
    assert.throws(() => normalizeDomain(s));
  assert.throws(() =>
    analyze({ ...input, homepage: home([["2027-01", 1000]]) }),
  );
});
test("classification boundaries use month recency", () => {
  const f = { type: "rebuild", end: "2026-03" };
  assert.equal(classify([f], "2026-09"), "Fresh Rebuild");
  assert.equal(classify([f], "2026-10"), "Stale After Rebuild");
  assert.equal(
    classify([{ type: "expansion", end: "2025-09" }], "2026-09"),
    "Gone Quiet",
  );
});
test("inventory excludes lookalike hostname and incomplete data", () => {
  const inv = [["timestamp", "original", "statuscode", "length"]];
  for (let m = 1; m <= 6; m++)
    for (let j = 0; j < (m <= 3 ? 30 : 80); j++)
      inv.push([
        `2026${String(m).padStart(2, "0")}01120000`,
        `https://example.com/p/${j}`,
        "200",
        "100",
      ]);
  const full = analyze({ ...input, homepage: [], inventory: inv });
  assert.ok(full.signals.some((x) => x.type === "expansion"));
  assert.equal(
    analyze({
      ...input,
      homepage: [],
      inventory: inv,
      coverage: { homepage: true, inventory: false },
    }).signals.length,
    0,
  );
  assert.equal(
    analyze({
      ...input,
      homepage: [],
      inventory: inv.map((r, i) =>
        i
          ? [
              r[0],
              r[1].replace("example.com", "example.com.evil.test"),
              ...r.slice(2),
            ]
          : r,
      ),
    }).signals.length,
    0,
  );
});
test("well-covered stable year is quiet but sparse months are insufficient evidence", () => {
  const h = [["timestamp", "digest", "length"]];
  for (let m = 1; m <= 12; m++)
    for (let d = 1; d <= 2; d++)
      h.push([
        `2025${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}120000`,
        "same",
        "1000",
      ]);
  assert.equal(analyze({ ...input, homepage: h }).state, "Long Quiet Stretch");
  assert.ok(
    !analyze({
      ...input,
      homepage: h.filter(
        (r, i) => i === 0 || !String(r[0]).startsWith("202506"),
      ),
    }).signals.some((s) => s.type === "quiet"),
  );
});
test("iteration detects repeated reversals, streamlining needs removal evidence", () => {
  const h = home([
    ["2026-01", 1000, 3],
    ["2026-02", 1300, 3],
    ["2026-03", 1000, 3],
    ["2026-04", 1300, 3],
    ["2026-05", 1000, 3],
    ["2026-06", 1050, 3],
  ]);
  assert.equal(analyze({ ...input, homepage: h }).state, "Actively Iterating");
  const inv = [["timestamp", "original", "statuscode", "length"]];
  for (let m = 1; m <= 6; m++)
    for (let j = 0; j < 100; j++)
      inv.push([
        `2026${String(m).padStart(2, "0")}01120000`,
        `https://example.com/p/${j}`,
        m <= 3 || j < 30 ? "200" : "404",
        "100",
      ]);
  assert.equal(
    analyze({ ...input, homepage: [], inventory: inv }).state,
    "Streamlining",
  );
  assert.ok(
    !analyze({
      ...input,
      homepage: [],
      inventory: inv.filter((r, i) => i === 0 || r[2] === "200"),
    }).signals.some((s) => s.type === "streamlining"),
  );
});
test("input errors name the query, row and fix", () => {
  assert.throws(
    () => analyze({ ...input, homepage: home([["2027-01", 1000]]) }),
    /homepage row 1: capture 2027-01-01 is after the analysis date 2026-09-11; pass --as-of 2027-01-01/,
  );
  assert.throws(
    () => analyze({ ...input, inventory: [["timestamp", "original"], ["x", "y"]] }),
    /inventory header must contain timestamp, original, statuscode, length/,
  );
  assert.throws(
    () => analyze({ ...input, homepage: [["timestamp", "digest", "length"], ["20260101120000", "d"]] }),
    /homepage row 1 has 2 columns; expected 3/,
  );
  assert.throws(() => analyze({ ...input, coverage: null }), /coverage must be an object/);
  assert.throws(() => analyze({ ...input, asOf: 20260911 }), /YYYY-MM-DD/);
});
