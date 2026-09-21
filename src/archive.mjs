import { analyze, normalizeDomain } from "./analyze.mjs";
import { setTimeout as sleep } from "node:timers/promises";
const BASE = "https://web.archive.org/cdx/search/cdx";
export const DEFAULTS = {
  maxPages: 15,
  pageSize: 15000,
  timeoutMs: 360_000,
  requestTimeoutMs: 60_000,
};
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const ATTEMPTS = 3;
const aborted = (e, signal) =>
  signal?.aborted ||
  e?.name === "TimeoutError" ||
  e?.name === "AbortError" ||
  e?.code === "ABORT_ERR";
// Node's fetch reports network failures as a bare "fetch failed"; the useful part is in `cause`.
const describe = (e) => {
  const c = e?.cause;
  const detail = c?.code ?? c?.message;
  return detail && detail !== e.message ? `${e.message} (${detail})` : e.message;
};
function perRequestSignal(signal, ms) {
  const t = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, t]) : t;
}
export async function readPages(
  params,
  {
    fetcher = fetch,
    maxPages = DEFAULTS.maxPages,
    signal,
    requestTimeoutMs = DEFAULTS.requestTimeoutMs,
    onPage,
    backoffMs = 1000,
  } = {},
) {
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 50)
    throw new Error("maxPages must be a whole number from 1 to 50");
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1)
    throw new Error("requestTimeoutMs must be a positive integer");
  let payload = [],
    resume;
  const seen = new Set();
  for (let page = 0; page < maxPages; page++) {
    const p = new URLSearchParams(params);
    p.set("showResumeKey", "true");
    if (resume) p.set("resumeKey", resume);
    let data;
    try {
      let response, failure;
      for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
        failure = undefined;
        try {
          response = await fetcher(`${BASE}?${p}`, {
            headers: { Accept: "application/json" },
            signal: perRequestSignal(signal, requestTimeoutMs),
          });
        } catch (e) {
          if (signal?.aborted) throw e;
          failure = e;
          response = undefined;
        }
        if (response && !RETRYABLE.has(response.status)) break;
        if (attempt === ATTEMPTS) break;
        const retryAfter = Number(response?.headers?.get("retry-after"));
        const wait =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter, 5)
            : attempt;
        await sleep(wait * backoffMs, undefined, { signal });
      }
      if (!response)
        throw new Error(
          `Archive connection failed after ${ATTEMPTS} attempts: ${describe(failure)}`,
        );
      if (!response.ok)
        throw new Error(
          `Wayback HTTP ${response.status}${RETRYABLE.has(response.status) ? ` after ${ATTEMPTS} attempts` : ""}`,
        );
      const raw = await response.text();
      if (raw.length > 12_000_000)
        throw new Error("Archive page exceeds size limit");
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          `Archive returned non-JSON content: ${raw.slice(0, 80).replace(/\s+/g, " ")}`,
        );
      }
      if (!Array.isArray(data)) throw new Error("Invalid archive JSON");
      if (!data.length) {
        onPage?.({ page: page + 1, rows: 0, complete: true });
        return { payload, complete: true };
      }
      if (!Array.isArray(data[0]) || !data[0].includes("timestamp"))
        throw new Error("Missing archive header");
      if (
        payload.length &&
        JSON.stringify(payload[0]) !== JSON.stringify(data[0])
      )
        throw new Error("Archive headers changed during pagination");
      if (!payload.length) payload.push(data[0]);
      const more =
        data.length >= 3 &&
        Array.isArray(data.at(-2)) &&
        data.at(-2).length === 0 &&
        Array.isArray(data.at(-1)) &&
        data.at(-1).length === 1 &&
        typeof data.at(-1)[0] === "string";
      const rows = data.slice(1, more ? -2 : undefined);
      payload.push(...rows);
      onPage?.({ page: page + 1, rows: rows.length, complete: !more });
      if (!more) return { payload, complete: true };
      resume = data.at(-1)[0];
      if (seen.has(resume)) throw new Error("Repeated archive resume key");
      seen.add(resume);
    } catch (e) {
      return {
        payload,
        complete: false,
        error: aborted(e, signal)
          ? `Archive request timed out after ${payload.length ? payload.length - 1 : 0} rows`
          : describe(e),
      };
    }
  }
  return {
    payload,
    complete: false,
    error: `Archive page budget reached after ${maxPages} pages (${payload.length - 1} rows); raise --max-pages`,
  };
}
export async function analyzeDomain(
  domain,
  {
    asOf = new Date().toISOString().slice(0, 10),
    fetcher = fetch,
    maxPages = DEFAULTS.maxPages,
    pageSize = DEFAULTS.pageSize,
    timeoutMs = DEFAULTS.timeoutMs,
    requestTimeoutMs = DEFAULTS.requestTimeoutMs,
    onProgress,
    backoffMs,
  } = {},
) {
  domain = normalizeDomain(domain);
  const end = new Date(asOf);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(asOf) ||
    !Number.isFinite(+end) ||
    end.toISOString().slice(0, 10) !== asOf
  )
    throw new Error("asOf must be a real YYYY-MM-DD date");
  if (!Number.isInteger(pageSize) || pageSize < 100 || pageSize > 15000)
    throw new Error("pageSize must be a whole number from 100 to 15000");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000)
    throw new Error("timeoutMs must be at least 1000");
  const fromHome = new Date(end);
  fromHome.setUTCFullYear(fromHome.getUTCFullYear() - 5);
  const fromInv = new Date(end);
  fromInv.setUTCFullYear(fromInv.getUTCFullYear() - 2);
  const date = (d) => d.toISOString().slice(0, 10).replaceAll("-", "");
  const common = { output: "json", to: date(end), limit: String(pageSize) };
  const h = new URLSearchParams({
    ...common,
    url: domain + "/",
    matchType: "exact",
    fl: "timestamp,digest,length",
    from: date(fromHome),
    collapse: "timestamp:8",
  });
  h.append("filter", "statuscode:200");
  h.append("filter", "mimetype:text/html");
  const i = new URLSearchParams({
    ...common,
    url: domain,
    matchType: "domain",
    fl: "timestamp,original,statuscode,length",
    from: date(fromInv),
  });
  i.append("filter", "mimetype:text/html");
  i.append("filter", "statuscode:(200|404|410)");
  const signal = AbortSignal.timeout(timeoutMs);
  const opts = (query) => ({
    fetcher,
    maxPages,
    signal,
    requestTimeoutMs: Math.min(requestTimeoutMs, timeoutMs),
    backoffMs,
    onPage: onProgress && ((x) => onProgress({ query, ...x })),
  });
  // Sequential requests reduce load on the public archive and share one time budget.
  const home = await readPages(h, opts("homepage"));
  const inventory = await readPages(i, opts("inventory"));
  const result = analyze({
    domain,
    asOf,
    homepage: home.payload,
    inventory: inventory.payload,
    coverage: { homepage: home.complete, inventory: inventory.complete },
  });
  return {
    ...result,
    errors: [
      home.error && `homepage query: ${home.error}`,
      inventory.error && `inventory query: ${inventory.error}`,
    ].filter(Boolean),
  };
}
