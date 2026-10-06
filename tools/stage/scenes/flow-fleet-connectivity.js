// parts: dressFleet
  /*  FLOW-DRIVEN FLEET UNDER ICE: the page's own simulation, rendered
     solid. Twenty underwater robots drift in a gyre-plus-shear current
     with diffusion; every 1.6 s the delta-BFS tree is rebuilt from the
     smallest ID (each robot takes the in-range neighbour one hop closer
     to the root, ties to the smaller ID) and kept only if it spans the
     fleet. The range barrier acts on kept tree edges only; a collision
     barrier keeps hulls apart. Periodically a goal appears and the fleet
     moves to it under a nominal CLF input, still holding the tree.  */
  const STAGE = {
    sky:[0x020a12, 0x0b3a4c], skyL:[0x3f6f6c, 0x93ac98], hemi:0x9fe8f5,
    cam:{az:0.15, d:12.5, h:3.6, ly:2.0, fit:1.15},
    build(root){
      dressFleetFX = dressFleet(root);
      // seabed rocks
      const rockM = std(0x17242f, 0.95, 0.05);
      for(let i=0;i<18;i++){
        const a = i*2.39, r = 1.5 + (i*1.7)%5.2;
        const m = add(root, new THREE.DodecahedronGeometry(0.2 + ((i*37)%10)/16, 0), rockM, Math.cos(a)*r, 0.06, Math.sin(a)*r);
        m.scale.y = 0.5; m.rotation.set(i, i*0.7, 0);
      }
      const S = 0.6, sim = grp(root, 0, 2.7, 0); sim.scale.setScalar(S);
      function flow(x, y, z, t){
        const r = Math.hypot(x, z) + 0.001, w = 0.10*Math.exp(-r*r/160);
        return [-z*w*1.3 + 0.10*Math.sin(0.08*t) + 0.035*y, 0.02*Math.sin(0.35*x + 0.2*t), x*w*1.3 + 0.06*Math.cos(0.06*t)];
      }
      const N = mobile ? 12 : 20, RMAX = 3.0, DMIN = 0.9, UMAX = 1.4, GAMMA = 1.6, SIGMA = 0.16, BOUND = 9;
      // a small ROV: open frame, buoyancy foam, electronics tube, vectored thrusters
      const frameG = rbox(0.62, 0.34, 0.86, 0.05), foamG = rbox(0.56, 0.12, 0.66, 0.05), tubeG = cylZ(0.11, 0.6, 24), capG = cylZ(0.115, 0.03, 24);
      const ductG = new THREE.TorusGeometry(0.075, 0.025, 8, 20);
      const foamRoot = std(0xf5a35c, 0.45, 0.1), foamM = std(0x3f87c6, 0.5, 0.15), frameM = std(0x1c2433, 0.5, 0.5);
      const bots = [];
      for(let i=0;i<N;i++){
        const g = grp(sim, 0, 0, 0);
        add(g, frameG, frameM);
        add(g, foamG, i === 0 ? foamRoot : foamM, 0, 0.23, 0);
        add(g, tubeG, MAT.glass, 0, -0.02, 0.05);
        add(g, capG, i === 0 ? MAT.amberG : MAT.cyanG, 0, -0.02, 0.36, false);
        [-1, 1].forEach(s => { const d = add(g, ductG, MAT.dark, s*0.36, 0, -0.32); d.rotation.y = Math.PI/2 + s*0.4; });
        [-1, 1].forEach(s => { const d = add(g, ductG, MAT.dark, s*0.36, 0.1, 0.1); d.rotation.x = Math.PI/2; });
        g.scale.setScalar(1.15);
        bots.push({id:i, g, ph:R01(i)*6.28, yaw:0, x:0, y:0, z:0, vx:0, vy:0, vz:0, ux:0, uy:0, uz:0});
      }
      bots.forEach((b, i) => {
        const a = i/N*Math.PI*2, rr = 1.2 + (i%3)*0.8;
        b.x = -2 + Math.cos(a)*rr + (R01(i+40) - 0.5)*0.4; b.y = (R01(i+80) - 0.5)*1.2; b.z = -1 + Math.sin(a)*rr + (R01(i+120) - 0.5)*0.4;
      });
      const goalM = std(0xf5a35c, 0.3, 0.2, {transparent:true, opacity:0, depthWrite:false, emissive:lin(0xf5a35c), emissiveIntensity:0.5});
      const goal = add(sim, rbox(1.6, 1.6, 1.6, 0.1), goalM, 0, 0, 0, false);
      const goalE = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.6, 1.6, 1.6)), new THREE.LineBasicMaterial({color:lin(0xf5a35c), transparent:true, opacity:0}));
      sim.add(goalE);
      const disk = lines(sim, N*N/2, 0x3f87c6, 0.3), treeL = lines(sim, N, 0xe8544f, 0.95);
      let tree = [], lastGood = [];
      function epoch(){
        const d = Array(N).fill(Infinity), nb = bots.map(() => []);
        for(let i=0;i<N;i++) for(let j=i+1;j<N;j++){
          const A = bots[i], B = bots[j];
          if(Math.hypot(A.x - B.x, A.y - B.y, A.z - B.z) <= RMAX){ nb[i].push(j); nb[j].push(i); }
        }
        d[0] = 0; const q = [0];
        while(q.length){ const u = q.shift(); for(const v of nb[u]) if(d[v] === Infinity){ d[v] = d[u] + 1; q.push(v); } }
        const kept = [];
        for(let i=1;i<N;i++){
          if(d[i] === Infinity) continue;
          let p = -1; for(const j of nb[i]) if(d[j] === d[i] - 1 && (p < 0 || j < p)) p = j;
          if(p >= 0) kept.push([i, p]);
        }
        if(kept.length === N - 1){ tree = kept; lastGood = kept; } else tree = lastGood;   // fallback: keep the last valid tree
      }
      const gauss = () => { let u = 0, v = 0; while(!u) u = Math.random(); while(!v) v = Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(6.2832*v); };
      let phase = 'spread', phaseT = 0, epochT = 0, gx = 0, gy = 0, gz = 0;
      function control(dt, t){
        for(const b of bots){
          let ux = 0, uy = 0, uz = 0;
          if(phase === 'goal'){
            const dx = gx - b.x, dy = gy - b.y, dz = gz - b.z, dd = Math.hypot(dx, dy, dz) || 1, s = Math.min(UMAX*0.8, dd*0.6);
            ux = dx/dd*s; uy = dy/dd*s; uz = dz/dd*s;
          }
          const r = Math.hypot(b.x, b.z);
          if(r > BOUND){ ux -= b.x/r*(r - BOUND)*0.8; uz -= b.z/r*(r - BOUND)*0.8; }
          if(Math.abs(b.y) > 2.4) uy -= Math.sign(b.y)*(Math.abs(b.y) - 2.4);
          b.ux = ux; b.uy = uy; b.uz = uz;
        }
        for(const [i, j] of tree){
          const A = bots[i], B = bots[j], dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z, dd = Math.hypot(dx, dy, dz) || 1e-6, h = RMAX*RMAX - dd*dd;
          if(h < RMAX*RMAX*0.45){ const k = (RMAX*RMAX*0.45 - h)*0.22/dd; A.ux += dx*k; A.uy += dy*k; A.uz += dz*k; B.ux -= dx*k; B.uy -= dy*k; B.uz -= dz*k; }
        }
        for(let i=0;i<N;i++) for(let j=i+1;j<N;j++){
          const A = bots[i], B = bots[j], dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z, dd = Math.hypot(dx, dy, dz) || 1e-6;
          if(dd < DMIN*1.5){ const k = (DMIN*1.5 - dd)*2.4/dd; A.ux -= dx*k; A.uy -= dy*k; A.uz -= dz*k; B.ux += dx*k; B.uy += dy*k; B.uz += dz*k; }
        }
        const sq = Math.sqrt(dt);
        for(const b of bots){
          const m = Math.hypot(b.ux, b.uy, b.uz); if(m > UMAX){ b.ux *= UMAX/m; b.uy *= UMAX/m; b.uz *= UMAX/m; }
          b.vx += (b.ux - GAMMA*b.vx)*dt; b.vy += (b.uy - GAMMA*b.vy)*dt; b.vz += (b.uz - GAMMA*b.vz)*dt;
          const f = flow(b.x, b.y, b.z, t);
          b.x += (f[0] + b.vx)*dt + SIGMA*sq*gauss(); b.y += (f[1] + b.vy)*dt + SIGMA*0.4*sq*gauss(); b.z += (f[2] + b.vz)*dt + SIGMA*sq*gauss();
        }
      }
      epoch();
      const panel = holo(root, 2.1, 1.4, -2.4, 4.4, -2.4);
      const P = {spread:'DRIFT IN CURRENT', goal:'TO GOAL, TREE HELD', hold:'AT GOAL'};
      const va = new THREE.Vector3(), vb = new THREE.Vector3();
      function update(t, dt){
        dressFleetFX(t, dt);
        phaseT += dt; epochT += dt;
        if(epochT > 1.6){ epoch(); epochT = 0; }
        if(phase === 'spread' && phaseT > 14){
          phase = 'goal'; phaseT = 0;
          let cx = 0, cz = 0; bots.forEach(b => { cx += b.x; cz += b.z; }); cx /= N; cz /= N;
          const a = Math.random()*6.28; gx = cx + Math.cos(a)*4; gz = cz + Math.sin(a)*4; gy = -0.5;
          const r = Math.hypot(gx, gz); if(r > BOUND - 2){ gx *= (BOUND - 2)/r; gz *= (BOUND - 2)/r; }
        } else if(phase === 'goal'){
          const arrived = bots.filter(b => Math.hypot(b.x - gx, b.y - gy, b.z - gz) < 3.2).length >= N*0.8;
          if((arrived && phaseT > 6) || phaseT > 26){ phase = 'hold'; phaseT = 0; }
        } else if(phase === 'hold' && phaseT > 3){ phase = 'spread'; phaseT = 0; }
        control(Math.min(dt, 0.04), t);
        const gop = phase === 'goal' || phase === 'hold' ? 1 : 0;
        goalM.opacity += (gop*0.12 - goalM.opacity)*damp(0.05, dt);
        goalE.material.opacity += (gop*0.85 - goalE.material.opacity)*damp(0.05, dt);
        goal.position.set(gx, gy, gz); goal.rotation.y = t*0.2; goalE.position.copy(goal.position); goalE.rotation.y = goal.rotation.y;
        bots.forEach(b => {
          b.g.position.set(b.x, b.y + Math.sin(t*1.7 + b.ph)*0.03, b.z);
          if(Math.hypot(b.vx, b.vz) > 0.03) b.yaw = angLerp(b.yaw, Math.atan2(b.vx, b.vz), Math.min(1, dt*3));
          b.g.rotation.y = b.yaw;
        });
        disk.reset();
        for(let i=0;i<N;i++) for(let j=i+1;j<N;j++){
          const A = bots[i], B = bots[j];
          if(Math.hypot(A.x - B.x, A.y - B.y, A.z - B.z) <= RMAX) disk.seg(va.set(A.x, A.y, A.z), vb.set(B.x, B.y, B.z));
        }
        disk.done();
        treeL.reset();
        for(const [i, j] of tree){ const A = bots[i], B = bots[j]; treeL.seg(va.set(A.x, A.y, A.z), vb.set(B.x, B.y, B.z)); }
        treeL.done();
        panel.draw(t, (g, w, h) => {
          holoFrame(g, w, h, 'DELTA BFS  ROOT 0');
          holoRow(g, 112, 'phase', P[phase]);
          holoRow(g, 170, 'robots in tree', (tree.length + 1) + ' / ' + N, (tree.length + 1)/N);
          holoRow(g, 228, 'barrier on', 'TREE EDGES ONLY');
        });
      }
      return {update};
    }
  };
  let dressFleetFX = null;
