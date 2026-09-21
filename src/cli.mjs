#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { signalObject } from "./output.mjs";
import { analyze } from "./analyze.mjs";
import { analyzeDomain, DEFAULTS } from "./archive.mjs";
import { plan, applyPlan, fields, renderNote, toCSV } from "./adapters.mjs";
import { summarizeHistory } from "./history.mjs";
async function read(p, what) {
  let raw;
  try {
    raw = await fs.readFile(p, "utf8");
  } catch (e) {
    throw new Error(
      `Cannot read ${what} file ${p}${e.code === "ENOENT" ? " (no such file)" : ` (${e.code ?? e.message})`}`,
    );
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`${what} file ${p} is not valid JSON: ${e.message}`);
  }
}
function integer(v, name, min, max) {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max)
    throw new Error(`--${name} must be a whole number from ${min} to ${max}`);
  return n;
}
const help = `Website History Signals (Node 22+)
  analyze --domain example.com --out analysis
  analyze --fixture examples/archive.json --out demo-output
  sync --target attio|apollo --input analysis/analysis.json --record-id ID --map field-map.json [--apply]
  history --input examples/stage-history.json --out report
Defaults: sync is a dry run; no CRM requests without --apply. analyze reads only the public archive.
Optional analyze flags: --as-of YYYY-MM-DD, --max-pages 1..50 (default ${DEFAULTS.maxPages}),
  --page-size 100..15000 rows per archive request (default ${DEFAULTS.pageSize}),
  --timeout seconds for the whole archive read (default ${DEFAULTS.timeoutMs / 1000}),
  --request-timeout seconds per archive request (default ${DEFAULTS.requestTimeoutMs / 1000}), --quiet.
Clay: SIGNALS_API_TOKEN=<long-random-token> npm start
Behind an HTTP proxy, use Node 22.21+ or 24+ with NODE_USE_ENV_PROXY=1 so fetch honours HTTPS_PROXY.
`;
try {
  const { values: v, positionals: p } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: "boolean" },
      domain: { type: "string" },
      fixture: { type: "string" },
      out: { type: "string" },
      input: { type: "string" },
      target: { type: "string" },
      "record-id": { type: "string" },
      map: { type: "string" },
      apply: { type: "boolean" },
      "as-of": { type: "string" },
      "max-pages": { type: "string" },
      "page-size": { type: "string" },
      timeout: { type: "string" },
      "request-timeout": { type: "string" },
      quiet: { type: "boolean" },
    },
  });
  if (v.help || !p.length) {
    console.log(help);
    process.exit(0);
  }
  if (p.length !== 1)
    throw new Error("Choose one command: analyze, sync or history");
  if (p[0] === "analyze") {
    if (Boolean(v.fixture) === Boolean(v.domain))
      throw new Error("Choose either --domain example.com or --fixture file.json");
    const asOf = v["as-of"] ? { asOf: v["as-of"] } : {};
    let r;
    if (v.fixture) r = analyze({ ...(await read(v.fixture, "fixture")), ...asOf });
    else {
      const started = Date.now(),
        seconds = integer(v.timeout, "timeout", 1, 3600);
      r = await analyzeDomain(v.domain, {
        ...asOf,
        maxPages: integer(v["max-pages"], "max-pages", 1, 50),
        pageSize: integer(v["page-size"], "page-size", 100, 15000),
        timeoutMs: seconds && seconds * 1000,
        requestTimeoutMs: v["request-timeout"] === undefined ? undefined : integer(v["request-timeout"], "request-timeout", 1, 3600) * 1000,
        onProgress: v.quiet
          ? undefined
          : ({ query, page, rows, complete }) =>
              console.error(
                `${query} query: page ${page}, ${rows} rows${complete ? ", done" : ""} (${Math.round((Date.now() - started) / 1000)}s)`,
              ),
      });
    }
    const dir = v.out ?? "analysis";
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "analysis.json"),
      JSON.stringify(r, null, 2) + "\n",
    );
    await fs.writeFile(path.join(dir, "signal.json"), JSON.stringify(signalObject(r), null, 2) + "\n");
    await fs.writeFile(path.join(dir, "attio-note.md"), renderNote(r) + "\n");
    await fs.writeFile(path.join(dir, "fields.csv"), toCSV([r]));
    await fs.writeFile(
      path.join(dir, "clay-row.json"),
      JSON.stringify(
        { domain: r.domain, ...fields(r), findings: r.signals },
        null,
        2,
      ) + "\n",
    );
    console.log(`${r.domain}: ${r.state} (${r.status}); outputs in ${dir}`);
    if (r.status !== "complete") {
      for (const e of r.errors ?? []) console.error(`  ${e}`);
      console.error(
        "  Coverage is incomplete, so sync will refuse this result. The public archive is often slow or flaky; try again, or raise --max-pages / --timeout.",
      );
      process.exitCode = 2;
    }
  } else if (p[0] === "sync") {
    if (!v.input || !v.map)
      throw new Error(
        "Provide --input analysis/analysis.json and --map field-map.json",
      );
    const r = await read(v.input, "analysis"),
      mapped = await read(v.map, "field map");
    const op = plan(r, {
      target: v.target,
      recordId: v["record-id"],
      fieldMap: mapped,
    });
    if (!v.apply) {
      console.log(JSON.stringify({ dryRun: true, ...op }, null, 2));
      console.error("Dry run only. Add --apply to send this request.");
    } else {
      const result = await applyPlan(op, {
        token:
          op.target === "attio"
            ? process.env.ATTIO_API_TOKEN
            : process.env.APOLLO_API_KEY,
      });
      console.log(
        JSON.stringify({
          target: op.target,
          recordId: op.recordId,
          applied: true,
          fieldsWritten: Object.keys(
            op.body.data?.values ?? op.body.typed_custom_fields,
          ),
          ...(op.target === "attio"
            ? {
                note: result.unchanged
                  ? "unchanged"
                  : result.created
                    ? "created"
                    : "updated",
              }
            : {}),
        }),
      );
    }
  } else if (p[0] === "history") {
    if (!v.input) throw new Error("Provide --input stage-history.json");
    const source = await read(v.input, "history"),
      r = summarizeHistory(source),
      dir = v.out ?? "report";
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "stage-duration.json"),
      JSON.stringify({ asOf: source.asOf, companies: r }, null, 2) + "\n",
    );
    console.log(`Stage durations and engagement context in ${dir}`);
  } else throw new Error(`Unknown command "${p[0]}"; use --help`);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
