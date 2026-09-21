import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { makeServer } from "../src/server.mjs";
import { summarizeHistory } from "../src/history.mjs";
test("history measures actual recorded intervals and engagement boundary", () => {
  const r = summarizeHistory({
    asOf: "2026-03-01",
    companies: [
      {
        name: "Demo",
        domain: "demo.example",
        engagedOn: "2026-02-01",
        stages: [
          { since: "2026-01-01", state: "Gone Quiet" },
          { since: "2026-02-01", state: "Fresh Rebuild" },
        ],
      },
    ],
  });
  assert.deepEqual(
    r[0].segments.map((s) => s.days),
    [31, 28],
  );
  assert.equal(r[0].stageAtEngagement, "Fresh Rebuild");
  assert.throws(() =>
    summarizeHistory({
      asOf: "2026-03-01",
      companies: [
        {
          name: "D",
          domain: "d.example",
          stages: [{ since: "2026-03-02", state: "Quiet" }],
        },
      ],
    }),
  );
});
test("Clay HTTP route enforces auth, validates domains and returns columns without note", async () => {
  const server = makeServer({
    token: "test-token-123456789",
    analyzer: async (domain) => ({
      domain,
      state: "Fresh Rebuild",
      status: "complete",
      asOf: "2026-09-11",
      signals: [],
      archiveUrl: "https://web.archive.org",
      reviewPrompt: "Check site",
    }),
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal(
      (await fetch(base + "/v1/analyze", { method: "POST" })).status,
      401,
    );
    const opts = {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token-123456789",
        "Content-Type": "application/json",
      },
    };
    assert.equal(
      (
        await fetch(base + "/v1/analyze", {
          ...opts,
          body: '{"domain":"127.0.0.1"}',
        })
      ).status,
      400,
    );
    const res = await fetch(base + "/v1/analyze", {
      ...opts,
      body: '{"domain":"example.com"}',
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.website_activity_state, "Fresh Rebuild");
    assert.ok(!("note" in body));
  } finally {
    server.close();
    await once(server, "close");
  }
});
test("Clay HTTP route explains analyzer failures and incomplete coverage", async () => {
  let mode = "throw";
  const logged = [];
  const server = makeServer({
    token: "test-token-123456789",
    log: (m) => logged.push(m),
    analyzer: async (domain) => {
      if (mode === "throw") throw new Error("Wayback HTTP 503 after 3 attempts");
      return {
        domain,
        status: "partial",
        errors: ["inventory query: Archive page budget reached"],
      };
    },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const opts = {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token-123456789",
      "Content-Type": "application/json",
    },
    body: '{"domain":"example.com"}',
  };
  try {
    let res = await fetch(base + "/v1/analyze?source=clay", opts);
    assert.equal(res.status, 502);
    assert.match((await res.json()).detail, /503 after 3 attempts/);
    assert.equal(logged.length, 1);
    mode = "partial";
    res = await fetch(base + "/v1/analyze", opts);
    assert.equal(res.status, 503);
    assert.deepEqual((await res.json()).errors, [
      "inventory query: Archive page budget reached",
    ]);
    assert.equal((await fetch(base + "/health?x=1")).status, 200);
  } finally {
    server.close();
    await once(server, "close");
  }
});
