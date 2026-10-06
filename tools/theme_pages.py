import io, re, sys, pathlib
root = pathlib.Path(sys.argv[1])
index = io.open(root / 'index.html', encoding='utf-8').read()

# light tokens come from index.html so the two can never drift
m = re.search(r':root\[data-theme="light"\]\{(.*?)\n  \}', index, re.S)
LIGHT_TOKENS = m.group(1).rstrip()

HEAD = '''<meta charset="UTF-8">
<script>
/* theme before first paint: dark by default; a visitor's saved choice wins */
(function(){var t=null;try{t=localStorage.getItem('theme');}catch(e){}
document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');})();
</script>
'''
DARK = """    --ink-rgb:6,10,20; --shadow-rgb:3,7,16; --card-rgb:14,24,48; --card2-rgb:10,18,38;
    --cyan-rgb:79,216,232; --amber-rgb:245,163,92; --line-rgb:140,170,220;
    color-scheme:dark;
"""
LIGHT_CSS = """
  /*  light theme (warm lamplight), the same tokens as the home page  */
  :root[data-theme="light"]{""" + LIGHT_TOKENS + """
  }
  /* the interactive labs are instrument panels: they keep the dark set */
  :root[data-theme="light"] .lab{
    --abyss:#060a14; --deep:#0a1226; --panel:#0e1830; --line:rgba(140,170,220,0.14);
    --cyan:#4fd8e8; --amber:#f5a35c; --text:#dfe8f4; --muted:#8a9ab5;
    """ + DARK.strip().replace('color-scheme:dark;', '') + """
    color:var(--text);color-scheme:dark;background:linear-gradient(160deg,#0e1830,#0a1226);border-color:rgba(140,170,220,0.22);}
  :root[data-theme="light"] nav{background:rgba(var(--ink-rgb),0.92);border-bottom:1px solid var(--line);}
  :root[data-theme="light"] .vignette{background:radial-gradient(ellipse at 50% 40%,transparent 42%,rgba(96,62,18,0.22) 100%);}

  /*  theme toggle  */
  .nav-right{display:flex;align-items:center;gap:1.4rem;}
  .theme-btn{display:inline-flex;align-items:center;justify-content:center;width:2.1rem;height:2.1rem;flex:none;
    border-radius:999px;border:1px solid var(--line);background:rgba(var(--ink-rgb),0.45);color:var(--muted);
    cursor:pointer;transition:color .25s,border-color .25s,transform .35s;}
  .theme-btn:hover,.theme-btn:focus-visible{color:var(--cyan);border-color:rgba(var(--cyan-rgb),0.5);transform:rotate(-14deg);}
  .theme-btn:focus-visible{outline:2px solid var(--cyan);outline-offset:3px;}
  .theme-btn svg{width:1rem;height:1rem;}
  .theme-btn .moon{display:none;}
  :root[data-theme="light"] .theme-btn .sun{display:none;}
  :root[data-theme="light"] .theme-btn .moon{display:block;}
  @media (prefers-reduced-motion:reduce){ .theme-btn{transition:none;} .theme-btn:hover{transform:none;} }
"""
BTN = '''<button class="theme-btn" id="themeBtn" type="button" aria-label="Switch to light theme">
      <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>
      <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7Z"/></svg>
    </button>'''
THREE_TAG = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
TOGGLE = '''<script>
/* theme toggle: dark by default, the visitor's choice is saved site-wide */
(function(){
  const root = document.documentElement, btn = document.getElementById('themeBtn');
  if(!btn) return;
  function set(t, save){
    root.setAttribute('data-theme', t);
    btn.setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    if(save){ try{ localStorage.setItem('theme', t); }catch(e){} }
    window.dispatchEvent(new CustomEvent('themechange', {detail:t}));
  }
  set(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark', false);
  btn.addEventListener('click', () => set(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light', true));
})();
</script>
'''
SHIM = '''
<script>
/* light theme for the wireframe background, without touching the scene code:
   render() is wrapped so every material the scene draws is re-inked, same hue
   darkened to ink depth, glow switched to normal blending, fog turned cream.
   Colours the scene changes itself (live highlights) are caught each frame.
   Textured materials (canvas displays) are left alone. */
(function(){
  if(!window.THREE) return;
  const render = THREE.WebGLRenderer.prototype.render;
  const seen = new WeakSet(), mats = [], scenes = [];
  const FOG_L = new THREE.Color(0xe6d8bc), hsl = {h:0, s:0, l:0};
  let light = document.documentElement.getAttribute('data-theme') === 'light', tick = 0;
  function ink(m){
    const u = m.userData;
    m.color.copy(u.tc0);
    if(light){
      m.color.getHSL(hsl); m.color.setHSL(hsl.h, Math.min(1, hsl.s*1.1), Math.min(hsl.l, 0.3));
      if(u.tb0 === THREE.AdditiveBlending){ m.blending = THREE.NormalBlending; m.needsUpdate = true; }
    } else {
      if(m.blending !== u.tb0){ m.blending = u.tb0; m.needsUpdate = true; }
      if(u.to0 !== undefined) m.opacity = u.to0;
    }
    u.tset = m.color.clone();
  }
  function scan(scene){
    scene.traverse(o => {
      const list = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      list.forEach(m => {
        if(seen.has(m) || !m.color || m.map) return;
        if(!m.transparent){ m.transparent = true; m.needsUpdate = true; }
        seen.add(m); m.userData.tc0 = m.color.clone(); m.userData.tb0 = m.blending; m.userData.to0 = m.opacity; mats.push(m); ink(m);
      });
    });
  }
  function fog(scene){
    if(!scene.fog) return;
    if(!scene.userData.tf0) scene.userData.tf0 = scene.fog.color.clone();
    scene.fog.color.copy(light ? FOG_L : scene.userData.tf0);
  }
  THREE.WebGLRenderer.prototype.render = function(scene, cam){
    if(scene && scene.isScene){
      if(scenes.indexOf(scene) < 0){ scenes.push(scene); fog(scene); scan(scene); }
      else if(++tick % 90 === 0) scan(scene);
      if(light) for(let i=0;i<mats.length;i++){
        const m = mats[i];
        if(!m.color.equals(m.userData.tset)){ m.userData.tc0.copy(m.color); ink(m); }
      }
    }
    return render.call(this, scene, cam);
  };
  window.addEventListener('themechange', e => { light = e.detail === 'light'; mats.forEach(ink); scenes.forEach(fog); });
})();
</script>'''

def convert_css(css):
    out = []
    for line in css.split('\n'):
        line = re.sub(r'rgba\(\s*(?:6,\s*10,\s*20|5,\s*8,\s*16|4,\s*7,\s*14),', 'rgba(var(--ink-rgb),', line)
        line = re.sub(r'rgba\(\s*3,\s*7,\s*16,', 'rgba(var(--shadow-rgb),', line)
        line = re.sub(r'rgba\(\s*14,\s*24,\s*48,', 'rgba(var(--card-rgb),', line)
        line = re.sub(r'rgba\(\s*10,\s*18,\s*38,', 'rgba(var(--card2-rgb),', line)
        line = re.sub(r'rgba\(\s*79,\s*216,\s*232,', 'rgba(var(--cyan-rgb),', line)
        line = re.sub(r'rgba\(\s*245,\s*163,\s*92,', 'rgba(var(--amber-rgb),', line)
        if '--line:' not in line:
            line = re.sub(r'rgba\(\s*140,\s*170,\s*220,', 'rgba(var(--line-rgb),', line)
        out.append(line)
    return '\n'.join(out)

for f in sorted((root / 'projects').glob('*.html')):
    s = io.open(f, encoding='utf-8').read()
    if 'id="themeBtn"' in s:
        print(f.name, 'already themed'); continue
    s = s.replace('<meta charset="UTF-8">\n', HEAD, 1)
    a = s.index('<style>'); b = s.index('</style>')
    css = convert_css(s[a:b])
    i = css.index('  :root{'); j = css.index('\n  }', i)
    css = css[:j] + '\n' + DARK.rstrip('\n') + css[j:]
    css = css + LIGHT_CSS
    s = s[:a] + css + s[b:]
    mb = re.search(r'  <a class="back" href="[^"]*">.*?</a>', s)
    s = s.replace(mb.group(0), '  <div class="nav-right">\n  ' + mb.group(0) + '\n    ' + BTN + '\n  </div>', 1)
    s = s.replace(THREE_TAG, TOGGLE + THREE_TAG + SHIM, 1)
    io.open(f, 'w', encoding='utf-8', newline='').write(s)
    print(f.name, 'ok')
