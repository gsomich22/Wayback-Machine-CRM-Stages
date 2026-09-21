import { isIP } from "node:net";
import { stageRules } from "./stage-rules.mjs";
export const VERSION = "0.3.0";
export const STATES = [
  "Fresh Rebuild",
  "Stale After Rebuild",
  "Actively Iterating",
  "Expanding",
  "Streamlining",
  "Long Quiet Stretch",
  "Gone Quiet",
  "No Strong Signal",
  "Insufficient History",
  "Unknown",
];
export function normalizeDomain(value) {
  if (typeof value !== "string" || value.length > 253 || /\s/.test(value))
    throw new Error("Provide one public company domain");
  const u = new URL(value.includes("://") ? value : `https://${value}`);
  const host = u.hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.$/, "");
  if (
    !["http:", "https:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    u.port ||
    isIP(host) ||
    !host.includes(".") ||
    !host
      .split(".")
      .every((s) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(s))
  )
    throw new Error(
      "Provide one public company domain without credentials or port",
    );
  return host;
}
const med = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length
    ? (s[Math.floor((s.length - 1) / 2)] + s[Math.ceil((s.length - 1) / 2)]) / 2
    : 0;
};
export const monthIndex = (s) =>
  Number(s.slice(0, 4)) * 12 + Number(s.slice(5, 7)) - 1;
const delta = (v, b) => (b > 0 ? (v / b - 1) * 100 : 0);
const contiguous = (a) =>
  a.every(
    (m, i) => !i || monthIndex(m.month) - monthIndex(a[i - 1].month) === 1,
  );
function rows(data, fields, asOf, name) {
  if (!Array.isArray(data))
    throw new Error(`${name} must be a CDX array (header row, then rows)`);
  if (!data.length) return [];
  const header = data[0];
  if (!Array.isArray(header) || fields.some((f) => !header.includes(f)))
    throw new Error(
      `${name} header must contain ${fields.join(", ")}; got ${JSON.stringify(header)}`,
    );
  return data.slice(1).map((row, i) => {
    if (!Array.isArray(row) || row.length !== header.length)
      throw new Error(
        `${name} row ${i + 1} has ${Array.isArray(row) ? row.length : "no"} columns; expected ${header.length}`,
      );
    const r = Object.fromEntries(header.map((k, i) => [k, row[i]]));
    const t = String(r.timestamp);
    if (!/^\d{14}$/.test(t))
      throw new Error(
        `${name} row ${i + 1}: timestamp ${JSON.stringify(r.timestamp)} is not a 14-digit CDX timestamp`,
      );
    const d = `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
    const parsed = new Date(
      `${d}T${t.slice(8, 10)}:${t.slice(10, 12)}:${t.slice(12, 14)}Z`,
    );
    if (!Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== d)
      throw new Error(`${name} row ${i + 1}: ${t} is not a real date`);
    if (d > asOf)
      throw new Error(
        `${name} row ${i + 1}: capture ${d} is after the analysis date ${asOf}; pass --as-of ${d} or later`,
      );
    return { ...r, month: d.slice(0, 7), day: d };
  });
}
function group(rows, fn) {
  const groups = new Map();
  for (const r of rows) {
    if (!groups.has(r.month)) groups.set(r.month, []);
    groups.get(r.month).push(r);
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, g]) => ({ month, ...fn(g) }));
}
function mergeSignals(signals) {
  const out = [];
  for (const s of signals.sort((a, b) => a.start.localeCompare(b.start))) {
    const prev = out.find((x) => x.type === s.type && x.end >= s.start);
    if (prev) {
      prev.end = prev.end > s.end ? prev.end : s.end;
      if (s.strength === "strong") prev.strength = "strong";
    } else out.push({ ...s });
  }
  return out.sort(
    (a, b) => b.end.localeCompare(a.end) || b.start.localeCompare(a.start),
  );
}
export function classify(signals, asOfMonth, overrides = {}) {
  const rules = stageRules(overrides);
  if (!signals.length) return "No Strong Signal";
  const s = [...signals].sort(
    (a, b) =>
      b.end.localeCompare(a.end) || b.start?.localeCompare(a.start) || 0,
  )[0];
  const age = monthIndex(asOfMonth) - monthIndex(s.end);
  if (s.type === "rebuild")
    return age <= rules.freshRebuildMaxAgeMonths
      ? "Fresh Rebuild"
      : age <= rules.staleRebuildMaxAgeMonths
        ? "Stale After Rebuild"
        : "Gone Quiet";
  if (age >= rules.otherSignalExpiryMonths) return "Gone Quiet";
  return (
    {
      iteration: "Actively Iterating",
      expansion: "Expanding",
      streamlining: "Streamlining",
      quiet: "Long Quiet Stretch",
    }[s.type] ?? "Unknown"
  );
}
export function analyze({
  domain,
  homepage = [],
  inventory = [],
  asOf = new Date().toISOString().slice(0, 10),
  coverage = { homepage: true, inventory: true },
  rules = {},
}) {
  domain = normalizeDomain(domain);
  if (
    typeof asOf !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(asOf) ||
    !Number.isFinite(Date.parse(asOf)) ||
    new Date(asOf).toISOString().slice(0, 10) !== asOf
  )
    throw new Error("asOf must be a real YYYY-MM-DD date");
  if (coverage === null || typeof coverage !== "object")
    throw new Error("coverage must be an object with homepage and inventory");
  const complete = {
    homepage: coverage.homepage === true,
    inventory: coverage.inventory === true,
  };
  const home = group(
    rows(homepage, ["timestamp", "digest", "length"], asOf, "homepage").filter(
      (r) => Number(r.length) > 0,
    ),
    (g) => ({
      captureDays: new Set(g.map((r) => r.day)).size,
      medianLength: med(g.map((r) => Number(r.length))),
      digests: new Set(g.map((r) => r.digest).filter((d) => d && d !== "-"))
        .size,
    }),
  );
  // Production note's activity score: digest transitions plus response-size movement.
  const homeRows = rows(homepage, ["timestamp", "digest", "length"], asOf, "homepage").filter(r => Number(r.length) > 0);
  const grouped = new Map();
  for (const row of homeRows.sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)))) {
    if (!grouped.has(row.month)) grouped.set(row.month, []);
    grouped.get(row.month).push(row);
  }
  let previousDigest = null, previousMonth = null;
  for (const month of home) {
    const captures = grouped.get(month.month);
    let transitions = 0;
    for (let i=1;i<captures.length;i++) if(captures[i].digest!==captures[i-1].digest) transitions++;
    if(previousDigest!==null && captures[0].digest!==previousDigest) transitions++;
    const rate=transitions / Math.max(1,captures.length-1+(previousDigest===null ? 0 : 1));
    const shift=previousMonth && monthIndex(month.month)-monthIndex(previousMonth.month)<=2 ? Math.abs(delta(month.medianLength,previousMonth.medianLength)) : 0;
    month.activity=Math.max(1,Math.min(5,Math.round(1+Math.min(1,rate)*2+Math.min(1,shift/35)*2)));
    const yearCount=home.filter(m=>m.month.slice(0,4)===month.month.slice(0,4)).length;
    month.chartCoverage=month.captureDays>=2 || yearCount>=9 ? 'good' : 'thin';
    previousDigest=captures.at(-1).digest; previousMonth=month;
  }
  const inv = group(
    rows(
      inventory,
      ["timestamp", "original", "statuscode", "length"],
      asOf,
      "inventory",
    ).filter((r) => {
      try {
        const u = new URL(r.original);
        return (
          ["http:", "https:"].includes(u.protocol) &&
          (u.hostname === domain || u.hostname.endsWith("." + domain))
        );
      } catch {
        return false;
      }
    }),
    (g) => {
      const latest = new Map();
      for (const r of [...g].sort((a, b) =>
        String(a.timestamp).localeCompare(String(b.timestamp)),
      )) {
        const u = new URL(r.original);
        u.hash = "";
        latest.set(
          u.hostname.replace(/^www\./, "") +
            u.pathname.replace(/\/$/, "") +
            u.search,
          r.statuscode,
        );
      }
      return {
        liveUrls: [...latest.values()].filter((s) => String(s) === "200")
          .length,
        removedUrls: [...latest.values()].filter((s) =>
          ["404", "410"].includes(String(s)),
        ).length,
      };
    },
  );
  const signals = [];
  const add = (type, label, window, strength, reason) =>
    signals.push({
      type,
      label,
      start: window[0].month,
      end: window.at(-1).month,
      strength,
      reason,
    });
  if (complete.homepage) {
    for (let i = 3; i + 2 < home.length; i++) {
      const prior = home.slice(i - 3, i),
        after = home.slice(i, i + 3);
      if (!contiguous([...prior, ...after])) continue;
      const base = med(prior.map((x) => x.medianLength)),
        current = after[0],
        shift = Math.abs(delta(current.medianLength, base));
      const stable = after
        .slice(1)
        .every(
          (x) =>
            Math.abs(delta(x.medianLength, current.medianLength)) <= 15 &&
            Math.abs(delta(x.medianLength, base)) >= 20,
        );
      if (shift >= 25 && current.digests >= 3 && stable)
        add(
          "rebuild",
          "Major Rebuild Signal",
          after,
          shift >= 40 && current.digests >= 4 ? "strong" : "moderate",
          "A change in archived response length persisted for two later months; inspect the snapshots to confirm a redesign.",
        );
    }
    for (let i = 0; i + 2 < home.length; i++) {
      const w = home.slice(i, i + 6);
      if (!contiguous(w)) continue;
      const changes = w
        .slice(1)
        .map((x, j) => delta(x.medianLength, w[j].medianLength));
      const movement = changes.reduce((s, x) => s + Math.abs(x), 0),
        net = Math.abs(delta(w.at(-1).medianLength, w[0].medianLength));
      const signs = changes.filter((x) => Math.abs(x) >= 3).map(Math.sign);
      if (
        w.filter((x) => x.digests >= 3).length >= 3 &&
        movement >= 45 &&
        net < 20 &&
        signs.some((s, j) => j && s !== signs[j - 1]) &&
        !signals.some(
          (s) =>
            s.type === "rebuild" &&
            s.start <= w.at(-1).month &&
            s.end >= w[0].month,
        )
      )
        add(
          "iteration",
          "Heavy Iteration",
          w,
          movement >= 80 ? "strong" : "moderate",
          "Repeated archived changes and reversals without a sustained size shift.",
        );
    }
    for (let i = 0; i + 11 < home.length; i++) {
      const w = home.slice(i, i + 12);
      if (
        contiguous(w) &&
        w.reduce((s, x) => s + x.captureDays, 0) >= 18 &&
        med(w.map((x) => x.digests)) <= 1.5 &&
        Math.abs(
          delta(
            med(w.slice(-3).map((x) => x.medianLength)),
            med(w.slice(0, 3).map((x) => x.medianLength)),
          ),
        ) < 20
      )
        add(
          "quiet",
          "Long Quiet Stretch",
          w,
          "moderate",
          "A well-covered twelve-month stretch of relatively stable archived responses.",
        );
    }
  }
  if (complete.inventory)
    for (let i = 0; i + 5 < inv.length; i++) {
      const w = inv.slice(i, i + 6);
      if (!contiguous(w)) continue;
      const base = med(w.slice(0, 3).map((x) => x.liveUrls)),
        end = med(w.slice(3).map((x) => x.liveUrls)),
        diff = end - base,
        change = delta(end, base),
        removed = w.slice(3).reduce((s, x) => s + x.removedUrls, 0);
      if (base > 0 && diff >= 25 && change >= 35)
        add(
          "expansion",
          "Sustained Site Expansion",
          w,
          diff >= 50 || change >= 60 ? "strong" : "moderate",
          "More distinct live URLs appear in the archive; crawl coverage may also explain this increase.",
        );
      if (
        base > 0 &&
        diff <= -25 &&
        change <= -35 &&
        removed >= Math.max(25, base * 0.25)
      )
        add(
          "streamlining",
          "Possible Streamlining",
          w,
          removed >= 50 ? "strong" : "moderate",
          "Fewer live URLs and more archived removal responses; confirm on the current website.",
        );
    }
  const findings = mergeSignals(signals);
  const status =
    complete.homepage && complete.inventory
      ? "complete"
      : complete.homepage || complete.inventory
        ? "partial"
        : "unavailable";
  const appliedRules = stageRules(rules);
  let state = classify(findings, asOf.slice(0, 7), appliedRules);
  if (status === "unavailable") state = "Unknown";
  else if (!findings.length && home.length < 6) state = "Insufficient History";
  return {
    schemaVersion: 1,
    engineVersion: VERSION,
    stageRules: appliedRules,
    domain,
    asOf,
    status,
    state,
    archiveUrl: `https://web.archive.org/web/*/${domain}`,
    coverage: {
      ...complete,
      homepageMonths: home.length,
      inventoryMonths: inv.length,
    },
    latestFinding: findings[0] ?? null,
    signals: findings,
    homepageMonthly: home,
    inventoryMonthly: inv,
    reviewPrompt:
      "Compare the dated archive snapshots with the current website before choosing outreach language.",
  };
}
