"""Verify a prepared runtime and write a private upload checksum manifest."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import runpy
from html.parser import HTMLParser

class PageReferences(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []
        self.stylesheets = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for field in ('src', 'href'):
            if attrs.get(field, '').startswith('./'):
                self.references.append(attrs[field])
        if tag == 'link' and attrs.get('rel') == 'stylesheet':
            self.stylesheets.append(attrs.get('href'))

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--snapshot", required=True)
parser.add_argument("--manifest", required=True)
args = parser.parse_args()
snapshot = (ROOT / args.snapshot).resolve()
output = (ROOT / args.manifest).resolve()
if ROOT not in snapshot.parents or ROOT not in output.parents:
    raise SystemExit("Use paths inside the workspace")
build = json.loads((snapshot / "build-manifest.json").read_text())
build_id = build["buildId"]
builder = runpy.run_path(str(ROOT / "tools/2026-07-17-build-production.py"))
html = (snapshot / "index.html").read_text()
assert f"./session-logging.js?v={build_id}" in html
assert f"./css/menu-shell.css?v={build_id}" in html
assert f"./main.js?v={build_id}" in html
assert "__DIG_GAME_PRODUCTION__ = true" in html
assert "jkd_e2e" in html
page = PageReferences()
page.feed(html)
source_page = PageReferences()
source_page.feed((ROOT / 'index.html').read_text())
assert page.stylesheets == [ref.split('?', 1)[0] + '?v=' + build_id for ref in source_page.stylesheets], 'Stylesheet tags malformed'
for reference in page.references:
    target = (snapshot / reference.split("?", 1)[0]).resolve()
    assert snapshot in target.parents and target.is_file(), reference
modules = builder["module_graph"](snapshot / "main.js")
for module in modules:
    assert snapshot in module.parents
    relative = module.relative_to(snapshot)
    expected = builder["production_module_source"](ROOT / relative, build_id)
    assert module.read_text(encoding="utf-8") == expected, f"Module bytes differ: {relative}"
    for match in builder["MODULE_RE"].finditer(module.read_text(encoding="utf-8")):
        specifier = match.group(1) or match.group(2)
        if specifier.startswith("."):
            assert f"?v={build_id}" in specifier, f"Unversioned module: {relative}"
assert len(modules) == build["moduleCount"]
def digest(path):
    result = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()
entries = []
module_set = set(modules)
for path in sorted(snapshot.rglob("*")):
    if not path.is_file():
        continue
    relative = path.relative_to(snapshot)
    assert not any(part in {".git", "_ssh-git", "tmp", "output"} for part in relative.parts), relative
    assert path.name not in {".env", ".config-backup.php", "config.php", "auth.json"}, relative
    sha = digest(path)
    source = ROOT / relative
    if path not in module_set and path.name not in {"index.html", "build-manifest.json"} and path.suffix not in {".gz", ".br"}:
        assert source.is_file(), f"Unexpected runtime file: {relative}"
        assert digest(source) == sha, f"Asset/support bytes differ: {relative}"
    entries.append({"path": relative.as_posix(), "bytes": path.stat().st_size, "sha256": sha})
manifest = {"schema": 1, "target": "https://www.nextgen.run/diggame-beta-1/", "buildId": build_id,
    "snapshot": str(snapshot), "files": entries, "fileCount": len(entries),
    "bytes": sum(entry["bytes"] for entry in entries), "moduleCount": len(modules),
    "sourceAndPackageBytesVerified": True, "sshPerformed": False, "uploaded": False}
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(json.dumps({key: value for key, value in manifest.items() if key != "files"}, indent=2))
