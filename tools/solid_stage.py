"""Inline the solid-stage 3D background into project pages.

    python tools/solid_stage.py              # every page that has a scene in tools/stage/scenes/
    python tools/solid_stage.py ur5 fanuc-roboguide

For each projects/<name>.html with a tools/stage/scenes/<name>.js:
  * the old wireframe light-theme render shim is removed (the solid stage
    themes itself; the shim would re-ink its PBR materials)
  * on the first run, the old wireframe scene code is cut out of the page's
    last script (from the comment block above `getElementById('<canvas>')`
    to the end of that IIFE), keeping the reveal/video code before it
  * a <script id="solid-stage"> block is written (or rewritten) before
    </body>: core.js + the parts the scene asks for + the scene + rig.js,
    all inside one IIFE, so the page stays self-contained
  * the scrim CSS is (re)written and the .stage-scrim element added once

A scene file declares its parts on its first line:   // parts: arm6 quad
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
KIT = ROOT / 'tools' / 'stage'

CSS = """<style id="solid-stage-css">
  /* solid stage: the machine is a watermark behind the text column, under a scrim */
  .stage-scrim{position:fixed;inset:0;z-index:1;pointer-events:none;background:rgba(var(--ink-rgb),0.62);}
</style>
"""


def build_block(name, canvas_id):
    scene = (KIT / 'scenes' / f'{name}.js').read_text(encoding='utf-8')
    first = scene.splitlines()[0]
    parts = first.split(':', 1)[1].split() if first.startswith('// parts:') else []
    chunks = [(KIT / 'core.js').read_text(encoding='utf-8')]
    for p in parts:
        chunks.append((KIT / 'parts' / f'{p}.js').read_text(encoding='utf-8'))
    chunks.append(scene)
    chunks.append((KIT / 'rig.js').read_text(encoding='utf-8'))
    body = '\n'.join(c.rstrip() + '\n' for c in chunks)
    return ('<script id="solid-stage">\n(function(){\n'
            f"  const CANVAS_ID = '{canvas_id}';\n" + body + '})();\n</script>\n')


SHIM = re.compile(r'<script>\s*/\* light theme for the wireframe background.*?</script>\n', re.S)


def cut_old_scene(html, canvas_id):
    m = re.search(r"(const|var|let)\s+canvas\s*=\s*document\.getElementById\(['\"]" + re.escape(canvas_id) + r"['\"]\)", html)
    if not m:
        raise SystemExit(f'no canvas lookup for {canvas_id}')
    start = m.start()
    # pull in the comment block (and blank lines) directly above
    before = html[:start]
    lines = before.split('\n')
    lines.pop()  # the canvas line itself
    i = len(lines)
    while i > 0:
        s = lines[i-1].strip()
        if s == '' or s.startswith('//'):
            i -= 1
        elif s.endswith('*/'):
            j = i - 1
            while j > 0 and '/*' not in lines[j]:
                j -= 1
            i = j
        else:
            break
    start = len('\n'.join(lines[:i])) + 1
    end_script = html.index('</script>', m.end())
    tail = html[:end_script].rstrip()
    if not tail.endswith('})();'):
        raise SystemExit(f'scene script for {canvas_id} does not end in an IIFE')
    end = tail.rfind('})();')
    removed = html[start:end]
    return html[:start] + html[end:], removed


def process(name):
    page = ROOT / 'projects' / f'{name}.html'
    html = page.read_text(encoding='utf-8')
    cid = re.search(r'<canvas id="([^"]+)"', html).group(1)
    html = SHIM.sub('', html)
    if 'id="solid-stage"' in html:
        html = re.sub(r'<script id="solid-stage">.*?</script>\n', '', html, flags=re.S)
    elif f"getElementById('{cid}')" in html or f'getElementById("{cid}")' in html:
        html, removed = cut_old_scene(html, cid)
        dump = KIT / 'removed' / f'{name}.js'
        dump.parent.mkdir(exist_ok=True)
        dump.write_text(removed, encoding='utf-8')
        print(f'  cut {removed.count(chr(10))} lines of old scene code (saved to {dump.relative_to(ROOT)})')
    html = re.sub(r'<style id="solid-stage-css">.*?</style>\n', '', html, flags=re.S)
    html = html.replace('</head>', CSS + '</head>', 1)
    if 'class="stage-scrim"' not in html:
        html = re.sub(r'(<canvas id="' + re.escape(cid) + r'"[^>]*>(?:</canvas>)?)', r'\1\n<div class="stage-scrim"></div>', html, count=1)
    html = html.replace('</body>', build_block(name, cid) + '</body>', 1)
    page.write_text(html, encoding='utf-8', newline='\n')
    print(f'{name}: ok ({cid})')


if __name__ == '__main__':
    names = sys.argv[1:] or sorted(p.stem for p in (KIT / 'scenes').glob('*.js'))
    for n in names:
        process(n)
