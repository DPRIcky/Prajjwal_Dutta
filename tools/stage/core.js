  /*  SOLID STAGE, the project-page version of the home page's robot
     stages: one lit plinth with a solid, articulated machine working on
     it, built from three.js primitives (no model files, so the page
     still runs from file://). Generated into each page by
     tools/solid_stage.py from tools/stage/; edit the sources there and
     re-run the script rather than editing a page's copy.  */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = innerWidth < 700;
  const canvas = document.getElementById(CANVAS_ID);
  if(!canvas || !window.THREE) return;
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.82;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(mobile ? 46 : 36, innerWidth/innerHeight, 0.1, 420);

  const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const smoothstep = x => x*x*(3-2*x);
  const ss = (u, a, b) => smoothstep(clamp01((u-a)/(b-a)));
  /* frame-rate independent damping: the same visual easing at 30 or 144 fps */
  const damp = (k, dt) => 1 - Math.pow(1-k, dt*60);
  const angLerp = (a, b, k) => {
    let d = (b - a) % (Math.PI*2);
    if(d >  Math.PI) d -= Math.PI*2;
    if(d < -Math.PI) d += Math.PI*2;
    return a + d*k;
  };
  const R01 = i => { const x = Math.sin(i*127.1 + 311.7)*43758.5453; return x - Math.floor(x); };   // stable hash

  /*  MATERIALS: three r128 treats hex as linear, so every authored
     colour is converted from sRGB first or the palette washes out.  */
  const lin  = h => new THREE.Color(h).convertSRGBToLinear();
  const std  = (c, r, m, o) => new THREE.MeshStandardMaterial(Object.assign({color:lin(c), roughness:r, metalness:m}, o||{}));
  const glow = (c, k) => new THREE.MeshStandardMaterial({color:0x000000, emissive:lin(c), emissiveIntensity:k||1.6, roughness:0.4});
  const MAT = {
    shell:  std(0xe2e7ee, 0.34, 0.05),
    alu:    std(0xb2bcc9, 0.28, 0.9),
    steel:  std(0x76818f, 0.32, 0.85),
    dark:   std(0x1c2433, 0.5, 0.55),
    carbon: std(0x12161e, 0.42, 0.35),
    rubber: std(0x0b0d12, 0.9, 0.0),
    cap:    std(0x3f87c6, 0.36, 0.3),
    amber:  std(0xf5a35c, 0.42, 0.12),
    red:    std(0xc94a3a, 0.5, 0.2),
    green:  std(0x4cc35d, 0.4, 0.1),
    glass:  std(0x0a1a24, 0.08, 0.9),
    cyanG:  glow(0x4fd8e8, 2.4),
    amberG: glow(0xf5a35c, 2.0),
    redG:   glow(0xe5534b, 2.2),
    greenG: glow(0x3fd17a, 2.0),
    plinth: std(0x0c1424, 0.42, 0.8),
    plTop:  std(0x0d1522, 0.78, 0.35)
  };

  /*  GEOMETRY HELPERS  */
  function add(parent, geo, mat, x, y, z, shadow){
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x||0, y||0, z||0);
    if(shadow !== false && renderer.shadowMap.enabled){ m.castShadow = true; m.receiveShadow = true; }
    parent.add(m);
    return m;
  }
  const grp = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x||0, y||0, z||0); parent.add(g); return g; };
  const cylY = (r1, r2, h, s) => new THREE.CylinderGeometry(r1, r2, h, s||32);
  function cylX(r, len, s){ const g = new THREE.CylinderGeometry(r, r, len, s||28); g.rotateZ(Math.PI/2); return g; }
  function cylZ(r, len, s){ const g = new THREE.CylinderGeometry(r, r, len, s||28); g.rotateX(Math.PI/2); return g; }
  /* rounded box: a rounded-rect outline, extruded with a bevel of half the radius */
  function rbox(w, h, d, r){
    r = Math.min(r, w/2, h/2, d/2) * 0.98;
    const b = r*0.5, sw = w-2*b, sh = h-2*b, cr = Math.max(r-b, 0.0005);
    const x0 = -sw/2, y0 = -sh/2, s = new THREE.Shape();
    s.moveTo(x0+cr, y0); s.lineTo(x0+sw-cr, y0); s.quadraticCurveTo(x0+sw, y0, x0+sw, y0+cr);
    s.lineTo(x0+sw, y0+sh-cr); s.quadraticCurveTo(x0+sw, y0+sh, x0+sw-cr, y0+sh);
    s.lineTo(x0+cr, y0+sh); s.quadraticCurveTo(x0, y0+sh, x0, y0+sh-cr);
    s.lineTo(x0, y0+cr); s.quadraticCurveTo(x0, y0, x0+cr, y0);
    const g = new THREE.ExtrudeGeometry(s, {depth:Math.max(d-2*b, 0.0005), bevelEnabled:true,
      bevelThickness:b, bevelSize:b, bevelSegments:3, curveSegments:5, steps:1});
    g.center();
    return g;
  }
  function canvasTex(w, h, draw){
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }
  /* a solid rod between two points: a unit cylinder along y, stretched and aimed */
  const UP = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
  function rod(parent, r, mat, shadow){
    const m = add(parent, cylY(r, r, 1, 10), mat, 0, 0, 0, shadow);
    m.userData.set = (a, b) => {
      _d.subVectors(b, a); const L = _d.length();
      m.visible = L > 1e-4;
      if(!m.visible) return;
      m.position.copy(a).addScaledVector(_d, 0.5);
      m.scale.set(1, L, 1);
      m.quaternion.setFromUnitVectors(UP, _d.multiplyScalar(1/L));
    };
    return m;
  }

  /*  ENVIRONMENT: a small studio rendered once into a PMREM so the
     metals have something to reflect: a white softbox overhead and a
     cyan and an amber strip, the site's two accents.  */
  (function(){
    const pm = new THREE.PMREMGenerator(renderer);
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(24, 12, 24),
      new THREE.MeshBasicMaterial({color:lin(0x0c1628), side:THREE.BackSide})));
    const panel = (w, h, col, k, x, y, z, rx, ry) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({color:lin(col).multiplyScalar(k), side:THREE.DoubleSide}));
      m.position.set(x, y, z); m.rotation.set(rx||0, ry||0, 0); env.add(m);
    };
    panel(10, 6, 0xffffff, 3.0, 0, 5.9, 0, Math.PI/2, 0);
    panel(1.4, 8, 0x4fd8e8, 4.0, -11.9, 1, -2, 0, Math.PI/2);
    panel(1.4, 8, 0xf5a35c, 3.0, 11.9, 1, 3, 0, -Math.PI/2);
    panel(14, 2.2, 0x9fbfe6, 1.4, 0, 2, -11.9, 0, 0);
    scene.environment = pm.fromScene(env, 0.035).texture;
    pm.dispose();
  })();

  /*  SKY DOME + FOG share one horizon colour so the floor melts into
     the sky. In r128 fog is mixed in after tone mapping, so both live
     in display space: raw hex, no linear conversion, no tone map.  */
  const skyU = {top:{value:new THREE.Color()}, hor:{value:new THREE.Color()}};
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    uniforms:skyU, side:THREE.BackSide, depthWrite:false, fog:false,
    vertexShader:'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'uniform vec3 top; uniform vec3 hor; varying vec3 vP; void main(){ gl_FragColor = vec4(mix(hor, top, smoothstep(0.0, 0.5, vP.y)), 1.0); }'
  }));
  sky.frustumCulled = false; sky.renderOrder = -1;
  scene.add(sky);
  scene.fog = new THREE.Fog(0x000000, 16, 60);

  const ground = add(scene, new THREE.PlaneGeometry(900, 900), std(0x060a13, 0.92, 0.2), 0, 0, 0);
  ground.rotation.x = -Math.PI/2; ground.castShadow = false;
  const grid = new THREE.GridHelper(400, 200, 0x1c3a66, 0x13243e);
  grid.material.transparent = true; grid.material.opacity = 0.22; grid.material.depthWrite = false;
  grid.position.y = 0.003; scene.add(grid);
  const gridL = new THREE.GridHelper(400, 200, 0x9c8458, 0xc1aa80);
  gridL.material.transparent = true; gridL.material.opacity = 0.35; gridL.material.depthWrite = false;
  gridL.position.y = 0.003; gridL.visible = false; scene.add(gridL);

  const hemi = new THREE.HemisphereLight(0xffffff, lin(0x05080f), 0.38);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.castShadow = renderer.shadowMap.enabled;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1; key.shadow.camera.far = 40;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(lin(0x4fd8e8), 1.6);
  scene.add(rim, rim.target);
  const fill = new THREE.DirectionalLight(lin(0xf5a35c), 0.55);
  scene.add(fill, fill.target);

  const GLOWS = [];   // emissive materials that power up on load
  /* the plinth every machine stands on; its rings are the "power" lights */
  function plinth(root, R){
    add(root, cylY(R, R+0.14, 0.3, 80), MAT.plinth, 0, 0.15, 0);
    add(root, cylY(R-0.1, R-0.1, 0.02, 80), MAT.plTop, 0, 0.305, 0);
    const ringM = glow(0x4fd8e8, 2.2);
    const ring = add(root, new THREE.TorusGeometry(R+0.005, 0.024, 8, 160), ringM, 0, 0.3, 0, false);
    ring.rotation.x = Math.PI/2;
    const innerM = glow(0xf5a35c, 0.7);
    const inner = add(root, new THREE.RingGeometry(R*0.64, R*0.64+0.018, 120), innerM, 0, 0.318, 0, false);
    inner.rotation.x = -Math.PI/2;
    GLOWS.push({m:ringM, k:2.2}, {m:innerM, k:0.7});
  }
  const TOP = 0.315;   // plinth deck height

  /*  FX TOOLKIT: a soft glow sprite so particles read as light, particle
     swarms with a per-point step, light shafts that fade toward the
     floor, and holographic readout panels that print live state.  */
  const PARTS = [], HOLOS = [], SHAFTS = [];   // re-tinted when the page theme flips
  let LIGHT = document.documentElement.getAttribute('data-theme') === 'light';
  const HC = () => LIGHT
    ? {bg:'rgba(248,239,220,0.8)', edge:'rgba(10,106,116,0.85)', title:'#974607', rule:'rgba(10,106,116,0.4)', label:'#2e2416', val:'#0a6a74', track:'rgba(10,106,116,0.16)', bar:'rgba(10,106,116,0.85)', amb:'#974607'}
    : {bg:'rgba(79,216,232,0.1)', edge:'rgba(79,216,232,0.8)', title:'#f5a35c', rule:'rgba(79,216,232,0.45)', label:'rgba(235,242,250,0.95)', val:'#4fd8e8', track:'rgba(79,216,232,0.18)', bar:'rgba(79,216,232,0.85)', amb:'#f5a35c'};
  const dotTex = canvasTex(64, 64, g => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.5)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  });
  function swarm(root, n, col, size, op, init, step){
    const a = new Float32Array(n*3);
    for(let i=0;i<n;i++) init(a, i);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(a, 3));
    const m = new THREE.PointsMaterial({color:lin(col), size, map:dotTex, transparent:true, opacity:op,
      depthWrite:false, blending:THREE.AdditiveBlending});
    const pts = new THREE.Points(geo, m); pts.frustumCulled = false; root.add(pts);
    PARTS.push({m, c:m.color.clone()});
    return {m, a, geo, update(t, dt){ if(!step) return; for(let i=0;i<n;i++) step(a, i, t, dt); geo.attributes.position.needsUpdate = true; }};
  }
  /* a sprite that glows: additive in the dark theme, ink in the light one */
  function spark(root, col, size){
    const m = new THREE.SpriteMaterial({map:dotTex, color:lin(col), transparent:true, opacity:1, blending:THREE.AdditiveBlending, depthWrite:false});
    const sp = new THREE.Sprite(m); sp.scale.setScalar(size); root.add(sp);
    PARTS.push({m, c:m.color.clone()});
    return sp;
  }
  const shaftTex = canvasTex(4, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#000000');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  function shaft(root, x, z, rTop, rBot, h, col, op){
    const m = new THREE.MeshBasicMaterial({color:lin(col), map:shaftTex, transparent:true, opacity:op,
      blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide});
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 32, 1, true), m);
    sh.position.set(x, h/2, z); root.add(sh);
    sh.userData.op = sh.userData.op0 = op;
    SHAFTS.push(sh);
    return sh;
  }
  /* a line set the scene rewrites every frame (beams, links, rays) */
  function lines(root, maxSeg, col, op, dashed){
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxSeg*6), 3));
    const m = new THREE.LineBasicMaterial({color:lin(col), transparent:true, opacity:op, depthWrite:false});
    const l = new THREE.LineSegments(geo, m); l.frustumCulled = false; root.add(l);
    PARTS.push({m, c:m.color.clone()});
    let n = 0;
    const arr = geo.attributes.position.array;
    return {l, m,
      reset(){ n = 0; },
      seg(a, b){ if(n >= maxSeg) return; const o = n*6; arr[o]=a.x; arr[o+1]=a.y; arr[o+2]=a.z; arr[o+3]=b.x; arr[o+4]=b.y; arr[o+5]=b.z; n++; },
      done(){ geo.setDrawRange(0, n*2); geo.attributes.position.needsUpdate = true; }};
  }
  function holo(root, w, h, x, y, z){
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512*h/w);
    const g = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map:tex, transparent:true,
      blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide, toneMapped:false}));
    mesh.position.set(x, y, z); root.add(mesh);
    let last = -1;
    HOLOS.push({m:mesh.material, mesh, reset:() => { last = -1; }});
    const wp = new THREE.Vector3();
    return {mesh, draw(t, fn){
      mesh.lookAt(camera.position);
      mesh.position.y = y + Math.sin(t*0.8)*0.04;
      if(last >= 0 && t - last < 0.15) return;
      last = t; g.clearRect(0, 0, c.width, c.height); fn(g, c.width, c.height); tex.needsUpdate = true;
    }};
  }
  function holoFrame(g, w, h, title){
    const P = HC();
    g.fillStyle = P.bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = P.edge; g.lineWidth = 3;
    const k = 26;
    [[4,4,1,1],[w-4,4,-1,1],[4,h-4,1,-1],[w-4,h-4,-1,-1]].forEach(([x, y, sx, sy]) => {
      g.beginPath(); g.moveTo(x + sx*k, y); g.lineTo(x, y); g.lineTo(x, y + sy*k); g.stroke();
    });
    g.font = '500 28px "IBM Plex Mono", monospace'; g.fillStyle = P.title; g.fillText(title, 26, 48);
    g.fillStyle = P.rule; g.fillRect(26, 62, w - 52, 2);
    g.font = '400 26px "IBM Plex Mono", monospace';
  }
  function holoRow(g, y, label, val, frac){
    const P = HC();
    g.fillStyle = P.label; g.fillText(label, 26, y);
    g.fillStyle = P.val; g.textAlign = 'right'; g.fillText(val, 486, y); g.textAlign = 'left';
    if(frac !== undefined){
      g.fillStyle = P.track; g.fillRect(26, y + 10, 460, 5);
      g.fillStyle = P.bar; g.fillRect(26, y + 10, 460*Math.max(0, Math.min(1, frac)), 5);
    }
  }
  const deg = r => ((r*180/Math.PI) >= 0 ? '+' : '') + (r*180/Math.PI).toFixed(1) + '°';
  const sgn = (v, d) => (v >= 0 ? '+' : '') + v.toFixed(d === undefined ? 2 : d);
