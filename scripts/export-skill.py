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
    for folder, pattern in [("src", "*.mjs"), ("config", "*.json"),
                            ("examples", "*"), ("docs", "*.md"),
                            ("agent", "*.md"), ("tests", "*.mjs"), ("verification", "*.md"),
                            ("workflows/n8n", "*.json")]:
        engine.extend(p for p in (ROOT / folder).glob(pattern) if p.is_file())
    engine += [ROOT / name for name in ["README.md", "QUICKSTART.md", "LICENSE", "package.json", ".env.example", "scripts/build-workflows.mjs"]]
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
