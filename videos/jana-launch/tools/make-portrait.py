"""Generate the portrait (9:16) cut from index.html (16:9) as its own sibling project, videos/jana-launch-portrait/.
With --mobile, the portrait cut shows the site as phone screens instead of desktop windows: videos/jana-launch-mobile/.
The composition reads its own canvas size and switches framing, so only the canvas attributes change; the
assets it uses are copied alongside. Re-run after every edit to index.html, then render that folder."""
import pathlib, re, shutil, sys
root = pathlib.Path(__file__).resolve().parent.parent
MOBILE = "--mobile" in sys.argv
out = root.parent / ("jana-launch-mobile" if MOBILE else "jana-launch-portrait")
s = (root / "index.html").read_text(encoding="utf-8")
s = s.replace('<meta name="viewport" content="width=1920, height=1080" />', '<meta name="viewport" content="width=1080, height=1920" />', 1)
s = s.replace("html, body { width: 1920px; height: 1080px;", "html, body { width: 1080px; height: 1920px;", 1)
s, n = re.subn(r'data-width="1920" data-height="1080"', 'data-width="1080" data-height="1920"', s, count=1)
assert n == 1, "root canvas attributes not found"
if MOBILE:
    s, n = re.subn(r'data-screens="desktop"', 'data-screens="phone"', s, count=1)
    assert n == 1, "data-screens not found"
s = s.replace("<title>The Rally — ", f"<title>The Rally ({'mobile' if MOBILE else 'portrait'}) — ", 1)
out.mkdir(exist_ok=True)
note = "<!-- GENERATED from ../jana-launch/index.html by tools/make-portrait.py — edit that file, not this one. -->"
(out / "index.html").write_text(s.replace("<!doctype html>\n", "<!doctype html>\n" + note + "\n", 1), encoding="utf-8", newline="\n")
for f in ("hyperframes.json", "meta.json", "package.json"):
    shutil.copy2(root / f, out / f)
used = sorted(set(re.findall(r'(?:src|url)\(?=?"?(assets/[^")\s]+)', s)))
for rel in used:
    dst = out / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(root / rel, dst)
print(f"wrote {out / 'index.html'} + {len(used)} assets")
