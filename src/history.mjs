const date = (s) => {
  if (
    typeof s !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(Date.parse(s)) ||
    new Date(s).toISOString().slice(0, 10) !== s
  )
    throw new Error("Invalid history date");
  return Date.parse(s);
};
export function summarizeHistory({ asOf, companies }) {
  const end = date(asOf);
  if (!Array.isArray(companies)) throw new Error("companies must be an array");
  return companies.map((c) => {
    if (!c.name || !c.domain || !Array.isArray(c.stages) || !c.stages.length)
      throw new Error("Each company needs a name, domain and stages");
    const events = [...c.stages].sort((a, b) => date(a.since) - date(b.since));
    const segments = events.map((e, i) => {
      const start = date(e.since),
        stop = i + 1 < events.length ? date(events[i + 1].since) : end;
      if (start >= stop || stop > end || !e.state)
        throw new Error(
          "Stage events must have distinct dates on or before asOf",
        );
      return {
        state: e.state,
        since: e.since,
        until: new Date(stop).toISOString().slice(0, 10),
        days: (stop - start) / 86400000,
      };
    });
    const engaged = c.engagedOn ? date(c.engagedOn) : null;
    if (engaged !== null && engaged > end)
      throw new Error("Engagement date is after the report");
    const at =
      engaged === null
        ? null
        : segments.find(
            (s) =>
              date(s.since) <= engaged &&
              (engaged < date(s.until) ||
                (engaged === end && s === segments.at(-1))),
          );
    return {
      name: c.name,
      domain: c.domain,
      segments,
      engagedOn: c.engagedOn ?? null,
      stageAtEngagement: at?.state ?? null,
    };
  });
}
