// parts:
  /*  CLF-CBF-QP FLEET: four clusters of single-integrator vehicles cross a
     workspace with the experiment's five rectangular obstacles to their
     goals. Each step takes the nominal goal-seeking input and corrects it
     with barriers: pairwise safety, connectivity held on a Prim minimum
     spanning tree (not every edge), and obstacle avoidance with a hard
     backstop. Tree edges are drawn by which constraint is closest to
     binding: blue slack, amber near the range limit, red near a collision.  */
  const STAGE = {
    sky:[0x050a16, 0x0f2140], skyL:[0xc4ad84, 0xe6d6b4], hemi:0xa8c8ff,
    cam:{az:0.3, d:12.5, h:8.0, ly:0.2, fit:1.08},
    build(root){
      plinth(root, 4.9);
      const K = 0.42, sim = grp(root, 0, TOP, 0); sim.scale.setScalar(K);
      const OBS = [{x:-2.2, z:-4.4, w:3.4, d:0.7}, {x:3.6, z:-2.0, w:0.7, d:2.6}, {x:-0.4, z:1.2, w:2.8, d:0.7}, {x:4.4, z:3.4, w:3.0, d:0.7}, {x:-4.6, z:2.6, w:0.7, d:2.2}];
      const blockM = std(0x4a5466, 0.75, 0.15), capM = std(0x2c3442, 0.6, 0.3);
      OBS.forEach(o => {
        add(sim, rbox(o.w, 1.1, o.d, 0.08), blockM, o.x, 0.55, o.z);
        add(sim, rbox(o.w + 0.08, 0.08, o.d + 0.08, 0.03), capM, o.x, 1.12, o.z);
        add(sim, rbox(o.w + 0.02, 0.05, o.d + 0.02, 0.02), MAT.amberG, o.x, 0.2, o.z, false);
      });
      const N = mobile ? 22 : 40, Rs = 0.42, Rc = 3.2, Uma = 2.4, CLEAR = 0.62, HARD = 0.34;
      const CLUSTERS = [{x:-6.2, z:-5.6}, {x:-5.4, z:-3.6}, {x:-6.6, z:-2.0}, {x:-4.4, z:-5.0}];
      const GOALS = [{x:5.8, z:5.4}, {x:6.4, z:-4.6}, {x:-1.0, z:6.0}, {x:6.6, z:1.0}];
      const COLS = [0x63d97a, 0xe8544f, 0x4f9de8, 0xd06ee0];
      GOALS.forEach((g, i) => { const r = add(sim, new THREE.TorusGeometry(0.5, 0.05, 8, 40), glow(COLS[i], 1.4), g.x, 0.06, g.z, false); r.rotation.x = Math.PI/2; });
      const frameG = rbox(0.34, 0.2, 0.5, 0.04), foamG = rbox(0.3, 0.08, 0.36, 0.03), tubeG = cylZ(0.075, 0.34, 18), ductG = new THREE.TorusGeometry(0.05, 0.018, 6, 16);
      const foamMs = COLS.map(c => std(c, 0.45, 0.15)), frameM = std(0x1c2433, 0.5, 0.5);
      const bots = [];
      for(let i=0;i<N;i++){
        const c = CLUSTERS[i % 4], g = GOALS[i % 4];
        const m = grp(sim, 0, 0, 0);
        add(m, frameG, frameM, 0, 0, 0); add(m, foamG, foamMs[i % 4], 0, 0.14, 0);
        add(m, tubeG, MAT.glass, 0, -0.02, 0.02); add(m, cylZ(0.078, 0.02, 18), MAT.cyanG, 0, -0.02, 0.2, false);
        [-1, 1].forEach(s => { const d = add(m, ductG, MAT.dark, s*0.2, 0, -0.18); d.rotation.y = Math.PI/2 + s*0.35; });
        m.scale.setScalar(1.6);
        bots.push({x:c.x + (Math.random() - 0.5)*1.6, z:c.z + (Math.random() - 0.5)*1.6, gx:g.x + (Math.random() - 0.5)*1.4, gz:g.z + (Math.random() - 0.5)*1.4, ux:0, uz:0, m, yaw:0, ph:Math.random()*6.28});
      }
      const eOk = lines(sim, N, 0x4f8fe8, 0.75), eTight = lines(sim, N, 0xf5a35c, 0.95), eSafe = lines(sim, N, 0xe8544f, 0.95);
      const inTree = new Uint8Array(N), best = new Float64Array(N), parent = new Int32Array(N);
      function mst(){
        inTree.fill(0); best.fill(Infinity); parent.fill(-1); best[0] = 0;
        let count = 0; const out = [];
        while(count < N){
          let u = -1, bd = Infinity;
          for(let i=0;i<N;i++) if(!inTree[i] && best[i] < bd){ bd = best[i]; u = i; }
          if(u < 0) break;
          inTree[u] = 1; count++;
          if(parent[u] >= 0) out.push([parent[u], u]);
          for(let v=0;v<N;v++){ if(inTree[v]) continue; const d = Math.hypot(bots[u].x - bots[v].x, bots[u].z - bots[v].z); if(d < best[v]){ best[v] = d; parent[v] = u; } }
        }
        return out;
      }
      function resolve(b){
        for(const o of OBS){
          const hx = o.w/2 + HARD, hz = o.d/2 + HARD, dx = b.x - o.x, dz = b.z - o.z, px = hx - Math.abs(dx), pz = hz - Math.abs(dz);
          if(px <= 0 || pz <= 0) continue;
          if(px < pz) b.x = o.x + (Math.sign(dx) || 1)*hx; else b.z = o.z + (Math.sign(dz) || 1)*hz;
        }
      }
      function step(dt, tree){
        for(const b of bots){ const dx = b.gx - b.x, dz = b.gz - b.z, d = Math.hypot(dx, dz) || 1, v = Math.min(Uma, d*1.2); b.ux = dx/d*v; b.uz = dz/d*v; }
        for(let i=0;i<N;i++) for(let j=i+1;j<N;j++){
          const dx = bots[j].x - bots[i].x, dz = bots[j].z - bots[i].z, d = Math.hypot(dx, dz) || 1e-6;
          if(d < Rs*2.2){ const p = (Rs*2.2 - d)*2.6/d; bots[i].ux -= dx*p; bots[i].uz -= dz*p; bots[j].ux += dx*p; bots[j].uz += dz*p; }
        }
        for(const [a, b] of tree){
          const A = bots[a], B = bots[b], dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz) || 1e-6;
          if(d > Rc*0.72){ const p = (d - Rc*0.72)*1.5/d; A.ux += dx*p; A.uz += dz*p; B.ux -= dx*p; B.uz -= dz*p; }
        }
        for(const b of bots){
          for(const o of OBS){
            const hx = o.w/2 + CLEAR, hz = o.d/2 + CLEAR, dx = b.x - o.x, dz = b.z - o.z, px = hx - Math.abs(dx), pz = hz - Math.abs(dz);
            if(px <= 0 || pz <= 0) continue;
            const sx = Math.sign(dx) || 1, sz = Math.sign(dz) || 1;
            if(px < pz){ b.ux += sx*px*5.0; if(sx*b.ux < 0) b.ux = 0; } else { b.uz += sz*pz*5.0; if(sz*b.uz < 0) b.uz = 0; }
          }
          const m = Math.hypot(b.ux, b.uz); if(m > Uma){ b.ux *= Uma/m; b.uz *= Uma/m; }
          b.x += b.ux*dt; b.z += b.uz*dt; resolve(b);
        }
      }
      function scatter(){
        bots.forEach((b, i) => { const c = CLUSTERS[i % 4], g = GOALS[i % 4];
          b.x = c.x + (Math.random() - 0.5)*1.6; b.z = c.z + (Math.random() - 0.5)*1.6; b.gx = g.x + (Math.random() - 0.5)*1.4; b.gz = g.z + (Math.random() - 0.5)*1.4; resolve(b); });
      }
      const panel = holo(root, 2.1, 1.4, -2.8, 4.2, -2.6);
      let settled = 0, binding = {ok:0, tight:0, safe:0};
      const va = new THREE.Vector3(), vb = new THREE.Vector3();
      function update(t, dt){
        dt = Math.min(dt, 0.04);
        const tree = mst();
        step(dt, tree);
        bots.forEach(b => {
          b.m.position.set(b.x, 0.45 + Math.sin(t*2.1 + b.ph)*0.03, b.z);
          const sp = Math.hypot(b.ux, b.uz);
          if(sp > 0.05) b.yaw = angLerp(b.yaw, Math.atan2(b.ux, b.uz), Math.min(1, dt*4));
          b.m.rotation.y = b.yaw; b.m.rotation.x = -Math.min(0.12, sp*0.05);
        });
        eOk.reset(); eTight.reset(); eSafe.reset(); binding = {ok:0, tight:0, safe:0};
        for(const [a, b] of tree){
          const A = bots[a], B = bots[b], d = Math.hypot(B.x - A.x, B.z - A.z);
          const L = d < Rs*2.6 ? (binding.safe++, eSafe) : d > Rc*0.66 ? (binding.tight++, eTight) : (binding.ok++, eOk);
          L.seg(va.set(A.x, 0.45, A.z), vb.set(B.x, 0.45, B.z));
        }
        eOk.done(); eTight.done(); eSafe.done();
        const arrived = bots.filter(b => Math.hypot(b.gx - b.x, b.gz - b.z) < 0.5).length;
        settled = arrived === N ? settled + dt : 0;
        if(settled > 2.4){ scatter(); settled = 0; }
        panel.draw(t, (g, w, h) => {
          holoFrame(g, w, h, 'CLF CBF QP  FLEET');
          holoRow(g, 112, 'at goal', arrived + ' / ' + N, arrived/N);
          holoRow(g, 170, 'tree edges slack', String(binding.ok));
          holoRow(g, 228, 'near range limit', String(binding.tight));
          holoRow(g, 286, 'near safety radius', String(binding.safe));
        });
      }
      return {update};
    }
  };
