import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import { analyzeDomain, DEFAULTS } from "./archive.mjs";
import { signalObject } from "./output.mjs";
import { fields } from "./adapters.mjs";
import { normalizeDomain } from "./analyze.mjs";
export function makeServer({
  token,
  analyzer = analyzeDomain,
  maxConcurrent = 2,
  log = (m) => console.error(m),
} = {}) {
  if (typeof token !== "string" || token.length < 16)
    throw new Error("Set SIGNALS_API_TOKEN to at least 16 characters");
  let active = 0;
  return createServer(async (req, res) => {
    const send = (s, x) => {
      res.writeHead(s, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(x));
    };
    const route = (req.url ?? "").split("?")[0];
    if (route === "/health" && req.method === "GET")
      return send(200, { status: "ok" });
    const got = Buffer.from(req.headers.authorization ?? ""),
      expected = Buffer.from("Bearer " + token);
    if (got.length !== expected.length || !timingSafeEqual(got, expected))
      return send(401, { error: "Unauthorized" });
    if (!["/v1/analyze", "/v1/signal"].includes(route) || req.method !== "POST")
      return send(404, { error: "Use POST /v1/analyze or /v1/signal" });
    if (active >= maxConcurrent)
      return send(429, {
        error: "Busy; retry after the current request completes",
      });
    active++;
    try {
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 4096)
          return send(413, { error: "Request too large" });
      }
      let input;
      try {
        input = JSON.parse(raw);
        normalizeDomain(input?.domain);
      } catch {
        return send(400, {
          error: 'Body must be JSON like {"domain": "example.com"}',
        });
      }
      let r;
      try {
        r = await analyzer(input.domain);
      } catch (e) {
        log(`analyze ${input.domain}: ${e.message}`);
        return send(502, {
          error: "Archive analysis failed; retry later",
          detail: e.message,
        });
      }
      if (r.status !== "complete")
        return send(503, {
          error: "Archive coverage incomplete; retry later",
          domain: r.domain,
          coverage: r.status,
          errors: r.errors ?? [],
        });
      // Clay output deliberately has no note: flat columns plus dated findings.
      send(200, route === "/v1/signal" ? signalObject(r) : { domain: r.domain, ...fields(r), findings: r.signals });
    } catch (e) {
      log(`request failed: ${e.message}`);
      send(400, { error: "Invalid request" });
    } finally {
      active--;
    }
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const env = (name, fallback) => {
    const n = Number(process.env[name]);
    return process.env[name] && Number.isFinite(n) ? n : fallback;
  };
  const options = {
    maxPages: env("SIGNALS_MAX_PAGES", DEFAULTS.maxPages),
    pageSize: env("SIGNALS_PAGE_SIZE", DEFAULTS.pageSize),
    timeoutMs: env("SIGNALS_TIMEOUT_SECONDS", DEFAULTS.timeoutMs / 1000) * 1000,
  };
  const server = makeServer({
    token: process.env.SIGNALS_API_TOKEN,
    maxConcurrent: env("SIGNALS_MAX_CONCURRENT", 2),
    analyzer: (domain) => analyzeDomain(domain, options),
  });
  const port = Number(process.env.PORT ?? 8787),
    host = process.env.HOST ?? "127.0.0.1";
  server.listen(port, host, () =>
    console.log(
      `Website History Signals server ready on http://${host}:${port} (archive budget ${options.timeoutMs / 1000}s, ${options.maxPages} pages of ${options.pageSize} rows)`,
    ),
  );
}
