// parts: diffbot
  /*  ENERGY-AWARE PLANNER in the cave: A* on the 0.5 m planning grid
     (8-connected, Euclidean heuristic, diagonal corner checks, obstacles
     inflated by one cell), its expansion order lit cell by cell; the raw
     path, then Bresenham line-of-sight pruning down to a few waypoints,
     then the robot drives the pruned path Turn-Go-Turn: pivot on the
     spot, drive straight, pivot again. Three missions between corners.  */
  const STAGE = {
    sky:[0x050912, 0x10203a], skyL:[0xbfa883, 0xe1d0ae], hemi:0xa8c8ff,
    cam:{az:0.3, d:12.0, h:8.2, ly:0.2, fit:1.05},
    build(root){
      plinth(root, 4.8);
      const DIM = 32, CW = 0.2, HALF = DIM*CW/2;
      const gx = i => -HALF + CW*(i + 0.5);
      add(root, rbox(DIM*CW + 0.1, 0.02, DIM*CW + 0.1, 0.03), std(0x262a31, 0.9, 0.05), 0, TOP + 0.01, 0);
      const BLOCKS = [[4,5,11,7],[14,3,16,13],[20,6,27,8],[6,12,9,20],[12,17,20,19],[23,13,26,22],[4,24,14,26],[18,24,24,26]];
      const blocked = new Uint8Array(DIM*DIM), IDX = (i, j) => j*DIM + i;
      BLOCKS.forEach(([i0, j0, i1, j1], n) => {
        for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++) blocked[IDX(i, j)] = 1;
        caveRock(root, (gx(i0) + gx(i1))/2, (gx(j0) + gx(j1))/2, (i1 - i0 + 1)*CW, (j1 - j0 + 1)*CW, 0.32 + R01(n)*0.18, n);
      });
      const infl = blocked.slice();
      for(let i=0;i<DIM;i++) for(let j=0;j<DIM;j++){
        if(!blocked[IDX(i, j)]) continue;
        for(let a=-1;a<=1;a++) for(let b=-1;b<=1;b++){ const p = i + a, q = j + b; if(p >= 0 && p < DIM && q >= 0 && q < DIM) infl[IDX(p, q)] = 1; }
      }
      const free = (i, j) => i >= 0 && i < DIM && j >= 0 && j < DIM && !infl[IDX(i, j)];
      function astar(s, g){
        const open = [{i:s[0], j:s[1], f:0}], gS = new Float64Array(DIM*DIM).fill(Infinity), came = new Int32Array(DIM*DIM).fill(-1);
        const order = [], closed = new Uint8Array(DIM*DIM); gS[IDX(s[0], s[1])] = 0;
        const h = (i, j) => Math.hypot(i - g[0], j - g[1]);
        while(open.length){
          open.sort((a, b) => a.f - b.f);
          const cur = open.shift(), ci = cur.i, cj = cur.j, cid = IDX(ci, cj);
          if(closed[cid]) continue;
          closed[cid] = 1; order.push(cid);
          if(ci === g[0] && cj === g[1]){ const path = []; let k = cid; while(k !== -1){ path.push([k % DIM, Math.floor(k/DIM)]); k = came[k]; } return {path:path.reverse(), order}; }
          for(let di=-1;di<=1;di++) for(let dj=-1;dj<=1;dj++){
            if(!di && !dj) continue;
            const ni = ci + di, nj = cj + dj;
            if(!free(ni, nj)) continue;
            if(di && dj && (!free(ci + di, cj) || !free(ci, cj + dj))) continue;
            const ng = gS[cid] + Math.hypot(di, dj);
            if(ng < gS[IDX(ni, nj)]){ gS[IDX(ni, nj)] = ng; came[IDX(ni, nj)] = cid; open.push({i:ni, j:nj, f:ng + h(ni, nj)}); }
          }
        }
        return {path:[], order};
      }
      function los(a, b){
        let x0 = a[0], y0 = a[1]; const x1 = b[0], y1 = b[1], dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        for(;;){ if(!free(x0, y0)) return false; if(x0 === x1 && y0 === y1) return true; const e2 = 2*err; if(e2 > -dy){ err -= dy; x0 += sx; } if(e2 < dx){ err += dx; y0 += sy; } }
      }
      function prune(path){
        if(path.length < 2) return path;
        const out = [path[0]]; let i = 0;
        while(i < path.length - 1){ let far = i + 1; for(let j=i+2;j<path.length;j++){ if(los(path[i], path[j])) far = j; else break; } out.push(path[far]); i = far; }
        return out;
      }
      const MISSIONS = [[[1,1],[30,30]], [[30,1],[2,29]], [[1,16],[29,17]]];
      const ex = swarm(root, DIM*DIM, 0x4fd8e8, 0.07, 0.75, (a, i) => { a[i*3+1] = -10; });
      const rawL = lines(root, 120, 0x63d97a, 0.9);
      const pruneRods = []; for(let i=0;i<16;i++){ const r = rod(root, 0.022, MAT.cyanG, false); r.visible = false; pruneRods.push(r); }
      const wps = []; for(let i=0;i<16;i++){ const m = add(root, new THREE.SphereGeometry(0.05, 14, 10), MAT.amberG, 0, -10, 0, false); wps.push(m); }
      const goal = add(root, new THREE.TorusGeometry(0.14, 0.025, 8, 32), MAT.redG, 0, -10, 0, false); goal.rotation.x = Math.PI/2;
      const bot = makeDiffbot(root, {k:0.62});
      const panel = holo(root, 2.1, 1.4, -2.6, 3.9, -2.6);
      const P = c => new THREE.Vector3(gx(c[0]), TOP + 0.04, gx(c[1]));
      let mi = -1, plan, pruned, phase = 'SEARCH', pt = 0, seg = 0, x = 0, z = 0, yaw = 0, sub = 'TURN';
      function next(){
        mi = (mi + 1) % MISSIONS.length;
        const [s, g] = MISSIONS[mi];
        plan = astar(s, g); pruned = prune(plan.path);
        phase = 'SEARCH'; pt = 0; seg = 0; sub = 'TURN';
        const p0 = P(s); x = p0.x; z = p0.z;
        const p1 = P(pruned[1] || s); yaw = Math.atan2(-(p1.z - z), p1.x - x);
        for(let i=0;i<DIM*DIM;i++) ex.a[i*3+1] = -10;
        ex.geo.attributes.position.needsUpdate = true;
        const gp = P(g); goal.position.set(gp.x, TOP + 0.03, gp.z);
        rawL.reset(); rawL.done();
        pruneRods.forEach(r => r.visible = false); wps.forEach(m => m.position.y = -10);
      }
      next();
      const a = new THREE.Vector3(), b = new THREE.Vector3();
      function update(t, dt){
        dt = Math.min(dt, 0.05); pt += dt;
        if(phase === 'SEARCH'){
          const n = Math.min(plan.order.length, Math.floor(pt/2.6*plan.order.length));
          for(let k=0;k<n;k++){ const c = plan.order[k]; ex.a[c*3] = gx(c % DIM); ex.a[c*3+1] = TOP + 0.03; ex.a[c*3+2] = gx(Math.floor(c/DIM)); }
          ex.geo.attributes.position.needsUpdate = true;
          if(pt > 2.8){ phase = 'RAW PATH'; pt = 0; rawL.reset(); for(let i=0;i<plan.path.length - 1;i++) rawL.seg(P(plan.path[i]), P(plan.path[i+1])); rawL.done(); }
        } else if(phase === 'RAW PATH'){
          if(pt > 1.2){ phase = 'PRUNE'; pt = 0; }
        } else if(phase === 'PRUNE'){
          const n = Math.min(pruned.length - 1, Math.floor(pt/1.4*(pruned.length - 1)) + 1);
          for(let i=0;i<n;i++){ a.copy(P(pruned[i])).setY(TOP + 0.05); b.copy(P(pruned[i+1])).setY(TOP + 0.05); pruneRods[i].visible = true; pruneRods[i].userData.set(a, b); }
          pruned.forEach((c, i) => { if(i <= n){ const p = P(c); wps[i].position.set(p.x, TOP + 0.06, p.z); } });
          rawL.m.opacity = 0.9*(1 - Math.min(1, pt/1.4)) + 0.2;
          if(pt > 1.8){ phase = 'TURN GO TURN'; pt = 0; }
        } else if(phase === 'TURN GO TURN'){
          if(seg >= pruned.length - 1){ if(pt > 1.5) next(); }
          else {
            const tp = P(pruned[seg + 1]), want = Math.atan2(-(tp.z - z), tp.x - x), d = Math.hypot(tp.x - x, tp.z - z);
            if(sub === 'TURN'){ const e = angLerp(0, want - yaw, 1); const st = Math.sign(e)*Math.min(Math.abs(e), 2.2*dt); yaw += st; if(Math.abs(e) < 0.01){ yaw = want; sub = 'GO'; } }
            else { const st = Math.min(d, 0.75*dt); x += Math.cos(yaw)*st; z -= Math.sin(yaw)*st; if(d < 0.005){ seg++; sub = 'TURN'; pt = 0; } }
          }
        }
        bot.place(x, z, yaw);
        bot.lidar.rotation.y = t*6;
        const red = plan.path.length > 1 ? (1 - (pruned.length - 1)/(plan.path.length - 1))*100 : 0;
        panel.draw(t, (g, w, h) => {
          holoFrame(g, w, h, 'A* AND LOS PRUNING');
          holoRow(g, 112, 'phase', phase === 'TURN GO TURN' ? 'DRIVE  ' + sub : phase);
          holoRow(g, 170, 'cells expanded', String(plan.order.length));
          holoRow(g, 228, 'waypoints', (plan.path.length) + ' to ' + pruned.length);
          holoRow(g, 286, 'reduction', red.toFixed(1) + ' %', red/100);
        });
      }
      return {update};
    }
  };
