// parts: quad
  /*  MINIDRONE LINE FOLLOWING (simulation): a Parrot Mambo class minidrone
     flies a painted red line course and lands on the circle at its end.
     Its downward camera frame (120 x 160) is projected on the floor, and
     the probe rays are cast from the frame centre outward, each stopping
     where it first meets the line, the Bresenham ray cast the team's
     waypoint code used to find the next stretch of track.  */
  const STAGE = {
    sky:[0x050a16, 0x0f2140], skyL:[0xc4ad84, 0xe6d6b4], hemi:0xa8c8ff,
    cam:{az:0.35, d:11.0, h:6.4, ly:0.6},
    build(root){
      plinth(root, 4.1);
      const K = 0.36, OX = -0.75, OZ = -4.5, Y = TOP + 0.01;
      add(root, rbox(6.0, 0.02, 4.7, 0.05), std(0x3a404c, 0.85, 0.05), 0, TOP + 0.01, 0);
      const PTS = [[0,0],[5.2,1.1],[8.4,4.3],[7.9,8.2],[4.2,10.4],[-0.6,9.9],[-4.4,7.6],[-6.9,3.9],[-5.8,0.2],[-2.6,-1.4]];
      const curve = new THREE.CatmullRomCurve3(PTS.map(p => new THREE.Vector3((p[0] + OX)*K, 0, (p[1] + OZ)*K)), true, 'catmullrom', 0.5);
      // painted line: a flat red ribbon
      const N = 260, W = 0.06, rp = [], ri = [];
      for(let i=0;i<=N;i++){
        const u = (i/N) % 1, p = curve.getPointAt(u), tg = curve.getTangentAt(u);
        rp.push(p.x - tg.z*W, Y + 0.012, p.z + tg.x*W, p.x + tg.z*W, Y + 0.012, p.z - tg.x*W);
        if(i < N) ri.push(i*2, i*2+1, i*2+2, i*2+1, i*2+3, i*2+2);
      }
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setIndex(ri); rg.computeVertexNormals();
      add(root, rg, std(0xd8382c, 0.6, 0.05, {side:THREE.DoubleSide, emissive:lin(0x5a0e08), emissiveIntensity:0.6}), 0, 0, 0, false);
      const L0 = curve.getPointAt(0);
      const land = add(root, new THREE.RingGeometry(0.3, 0.36, 48), std(0xd8382c, 0.6, 0.05, {side:THREE.DoubleSide}), L0.x, Y + 0.014, L0.z, false); land.rotation.x = -Math.PI/2;
      const landG = add(root, new THREE.RingGeometry(0.38, 0.4, 48), MAT.amberG, L0.x, Y + 0.014, L0.z, false); landG.rotation.x = -Math.PI/2;
      // arena: corner posts with a net line
      [[-2.95, -2.3], [2.95, -2.3], [2.95, 2.3], [-2.95, 2.3]].forEach(([x, z]) => add(root, cylY(0.03, 0.03, 2.4, 10), MAT.steel, x, TOP + 1.2, z));
      // the minidrone: small white quad with a downward camera
      const q = makeQuad(root, {k:0.55});
      const camPt = new THREE.Object3D(); camPt.position.set(0, -0.1, 0); q.body.add(camPt);
      // camera footprint (4:3, the 120 x 160 frame), probe rays and their hit marks
      const FW = 1.0, FH = 0.75;
      const foot = lines(root, 8, 0x4fd8e8, 0.6), cone = lines(root, 4, 0x4fd8e8, 0.2);
      const NR = mobile ? 5 : 9;
      const rays = lines(root, NR, 0x4fd8e8, 0.8);
      const hits = swarm(root, NR, 0xf5a35c, 0.1, 1, (a, i) => { a[i*3+1] = -10; });
      const SAMP = []; for(let i=0;i<=240;i++) SAMP.push(curve.getPointAt(i/240));
      const distTo = (x, z) => { let b = 1e9; for(const p of SAMP){ const dx = p.x - x, dz = p.z - z, d = dx*dx + dz*dz; if(d < b) b = d; } return Math.sqrt(b); };
      const panel = holo(root, 2.0, 1.3, -1.6, 3.9, -2.4);
      const dp = new THREE.Vector3(), ah = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      let found = 0, lap = 0;
      function update(t, dt){
        const u = (t*0.022) % 1;
        lap = u;
        curve.getPointAt(u, dp); curve.getPointAt((u + 0.01) % 1, ah);
        const yaw = Math.atan2(-(ah.z - dp.z), ah.x - dp.x);
        // descends into the landing circle as the lap closes, then lifts off again
        const alt = TOP + 0.5 + 0.55*Math.min(ss(u, 0, 0.06), 1 - ss(u, 0.93, 1));
        flyQuad(q, dp.x, alt + Math.sin(t*0.9)*0.03, dp.z, yaw, dt, 1.2);
        const fx = Math.cos(yaw), fz = -Math.sin(yaw);
        const corner = (sx, sz, out) => out.set(dp.x + fx*sx*FH/2 - fz*sz*FW/2, Y + 0.02, dp.z + fz*sx*FH/2 + fx*sz*FW/2);
        foot.reset(); cone.reset();
        root.updateMatrixWorld(true);
        const cw = camPt.getWorldPosition(new THREE.Vector3()); root.worldToLocal(cw);
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz], i, A) => { corner(sx, sz, a); corner(A[(i+1)%4][0], A[(i+1)%4][1], b); foot.seg(a, b); cone.seg(cw, a); });
        foot.done(); cone.done();
        rays.reset(); found = 0;
        for(let i=0;i<NR;i++){
          const ang = yaw + (i/(NR - 1) - 0.5)*Math.PI*1.35, sx = Math.cos(ang), sz = -Math.sin(ang);
          let d = 0.06;
          for(; d < 1.35; d += 0.035) if(distTo(dp.x + sx*d, dp.z + sz*d) < 0.07) break;
          a.set(dp.x, Y + 0.03, dp.z); b.set(dp.x + sx*d, Y + 0.03, dp.z + sz*d); rays.seg(a, b);
          const hit = d < 1.35; if(hit) found++;
          hits.a[i*3] = b.x; hits.a[i*3+1] = hit ? Y + 0.04 : -10; hits.a[i*3+2] = b.z;
        }
        rays.done(); hits.geo.attributes.position.needsUpdate = true;
        landG.material.emissiveIntensity = 1 + Math.sin(t*2)*0.6;
        panel.draw(t, (g, w, h) => {
          holoFrame(g, w, h, 'LINE FOLLOW  SIMULINK');
          holoRow(g, 112, 'camera frame', '120 x 160');
          holoRow(g, 170, 'probe rays on line', found + ' / ' + NR, found/NR);
          holoRow(g, 228, 'course', Math.round(lap*100) + ' %', lap);
          holoRow(g, 286, 'phase', lap > 0.93 || lap < 0.06 ? 'LANDING CIRCLE' : 'FOLLOWING LINE');
        });
      }
      return {update};
    }
  };
