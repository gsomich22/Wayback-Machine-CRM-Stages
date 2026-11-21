#!/usr/bin/env python3
"""Export a self-contained skill from an explicit source allowlist."""
from pathlib import Path
import zipfile
import re
import posixpath

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skills" / "website-history"
DEST = ROOT / "downloads" / "website-history-skill.zip"

def export():
    files = [(p, Path("website-history") / p.relative_to(SKILL))
             for p in sorted(SKILL.rglob("*")) if p.is_file()]
    engine = []
    # Free skill: analysis, report and CSV export only. CRM writers, n8n workflows
    # and CRM-specific guides ship with the paid kits (see kits/).
    kit_only = {"adapters.mjs", "io.test.mjs", "workflows.test.mjs",
                "attio.md", "apollo.md", "clay.md", "n8n.md", "release.md",
                "apollo-fields.json", "apollo-stage-only.json", "apollo-stage-options.json",
                "attio-fields.json", "attio-stage-only.json", "attio-note-preview.html",
                "report-customers.html", "report-leads.html", "report-customers.csv", "report-leads.csv"}
    for folder, pattern in [("src", "*.mjs"), ("config", "*.json"),
                            ("examples", "*"), ("docs", "*.md"), ("tests", "*.mjs")]:
        engine.extend(p for p in (ROOT / folder).glob(pattern) if p.is_file() and p.name not in kit_only)
    engine += [ROOT / name for name in ["LICENSE", "package.json"]]
    files += [(p, Path("website-history/scripts/engine") / p.relative_to(ROOT)) for p in engine]
    targets = {source.resolve(): target for source, target in files}
    # A bundled guide links to the installed instructions instead of a recursive download.
    targets[DEST.resolve()] = Path("website-history/SKILL.md")
    DEST.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(DEST, "w", zipfile.ZIP_DEFLATED) as z:
        for source, target in sorted(files, key=lambda pair: str(pair[1])):
            info = zipfile.ZipInfo(str(target), date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            data = source.read_bytes()
            if source.suffix == ".md":
                def rewrite(match):
                    href = match.group(2)
                    if href.startswith(("https:", "http:", "mailto:", "#")):
                        return match.group(0)
                    path, _, anchor = href.partition("#")
                    mapped = targets.get((source.parent / path).resolve())
                    if mapped is None:
                        return match.group(0)
                    relative = posixpath.relpath(str(mapped), str(target.parent))
                    return match.group(1) + relative + ("#" + anchor if anchor else "") + ")"
                data = re.sub(r"(\[[^\]]*\]\()([^)]+)\)", rewrite, data.decode()).encode()
            z.writestr(info, data)
    print(DEST)

if __name__ == "__main__":
    export()
