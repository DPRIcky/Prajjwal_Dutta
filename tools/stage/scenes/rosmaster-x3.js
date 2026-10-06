// parts: mecanum
  /*  ROSMASTER X3 IN THE WAREHOUSE: rack blocks on a grid, the aisles
     between them the only free space. The rover runs the A* route, a
     serpentine down the cross aisles turning on the end aisles, holds at
     the red stop marker and crawls through the amber caution zone. Its
     LiDAR scan is really ray-cast against the rack footprints, and the
     AMCL particle cloud tightens while it dwells and spreads when it runs.  */
  const STAGE = {
    sky:[0x050912, 0x10203a], skyL:[0xbfa883, 0xe1d0ae], hemi:0xa8c8ff,
    cam:{az:0.45, d:12.5, h:7.2, ly:0.4, fit:1.08},
    build(root){
      plinth(root, 4.6);
      const BW = 2.0, BD = 0.8, BH = 1.35, AISLE = 1.15, nCols = 2, nRows = 2;
      const PX = BW + AISLE, PZ = BD + AISLE;
      const bx = i => (i - (nCols - 1)/2)*PX, bz = j => (j - (nRows - 1)/2)*PZ;
      const ax = k => bx(0) - PX/2 + k*PX, az = k => bz(0) - PZ/2 + k*PZ;
      // racks: blue uprights, orange beams, steel decks, cartons
      const box = std(0xa9825a, 0.85, 0.0), upr = std(0x2c62a6, 0.45, 0.5), beam = std(0xe08a3c, 0.45, 0.4);
      const obstacles = [];
      for(let i=0;i<nCols;i++) for(let j=0;j<nRows;j++){
        const cx = bx(i), cz = bz(j);
        obstacles.push({x0:cx - BW/2, x1:cx + BW/2, z0:cz - BD/2, z1:cz + BD/2});
        const rk = grp(root, cx, TOP, cz);
        [-BW/2, -BW/6, BW/6, BW/2].forEach(ux => [-BD/2, BD/2].forEach(uz => add(rk, new THREE.BoxGeometry(0.05, BH, 0.05), upr, ux, BH/2, uz)));
        [0.38, 0.85, 1.3].forEach((y, l) => {
          [-BD/2, BD/2].forEach(z => add(rk, new THREE.BoxGeometry(BW, 0.05, 0.035), beam, 0, y, z));
          add(rk, new THREE.BoxGeometry(BW - 0.04, 0.02, BD - 0.04), MAT.steel, 0, y + 0.02, 0);
          if(l < 2) for(let b=0;b<5;b++){
            if(R01(i*31 + j*7 + l*5 + b) < 0.3) continue;
            const sx = 0.22 + R01(b + l + i)*0.12, sy = 0.18 + R01(b*2 + l + j)*0.16;
            add(rk, new THREE.BoxGeometry(sx, sy, 0.5), box, -BW/2 + 0.22 + b*0.39, y + 0.03 + sy/2, 0);
          }
        });
      }
      // the A* route on the aisle centrelines
      const XL = ax(0), XR = ax(nCols), WP = [];
      for(let k=0;k<=nRows;k++){
        const z = az(k);
        if(k % 2 === 0) WP.push(new THREE.Vector3(XL, 0, z), new THREE.Vector3(XR, 0, z));
        else WP.push(new THREE.Vector3(XR, 0, z), new THREE.Vector3(XL, 0, z));
      }
      if(Math.abs(WP[WP.length-1].x - WP[0].x) > 0.01) WP.push(new THREE.Vector3(WP[WP.length-1].x, 0, WP[0].z));
      const LEGS = WP.length, nextWP = i => WP[(i+1) % LEGS];
      const Y = TOP + 0.012;
      for(let i=0;i<LEGS;i++){
        const a = WP[i], b = nextWP(i), n = Math.round(a.distanceTo(b)/0.32);
        for(let s=0;s<n;s+=2){ const r = rod(root, 0.012, MAT.cyanG, false); r.userData.set(a.clone().lerp(b, s/n).setY(Y), a.clone().lerp(b, (s + 1)/n).setY(Y)); }
      }
      const beacons = WP.map(p => add(root, new THREE.SphereGeometry(0.06, 16, 12), glow(0x4fd8e8, 1.4), p.x, Y + 0.06, p.z, false));
      // marker posts: red octagon (stop) and amber triangle (caution)
      function sign(x, z, col, sides, rot, r){
        const g = grp(root, x, TOP, z);
        add(g, cylY(0.025, 0.025, 1.1, 10), MAT.steel, 0, 0.55, 0);
        add(g, cylY(0.12, 0.14, 0.04, 16), MAT.dark, 0, 0.02, 0);
        const head = grp(g, 0, 1.25, 0);
        const sh = new THREE.Shape();
        for(let i=0;i<sides;i++){ const a = rot + i/sides*Math.PI*2; i ? sh.lineTo(Math.cos(a)*r, Math.sin(a)*r) : sh.moveTo(Math.cos(a)*r, Math.sin(a)*r); }
        const faceG = new THREE.ExtrudeGeometry(sh, {depth:0.03, bevelEnabled:true, bevelThickness:0.008, bevelSize:0.008, bevelSegments:2}); faceG.center();
        const m = glow(col, 0.6); m.color = lin(col).multiplyScalar(0.6);
        add(head, faceG, m);
        const rim = add(head, new THREE.RingGeometry(r*0.68, r*0.74, sides, 1, rot), MAT.shell, 0, 0, 0.026, false);
        return {g, head, m, x, z};
      }
      const stop = sign(bx(0)*0.35, az(0) - 0.42, 0xe5534b, 8, Math.PI/8, 0.26);
      const warn = sign(bx(nCols - 1)*0.35, az(1) + 0.42, 0xf5a35c, 3, Math.PI/2, 0.3);
      const STOP_PT = new THREE.Vector3(stop.x, 0, az(0)), WARN_PT = new THREE.Vector3(warn.x, 0, az(1));

      const rv = makeMecanum(root, {k:0.7, fan:0});
      // LiDAR: rays cast against the rack footprints in the deck plane
      const RAYS = mobile ? 48 : 96, MAXR = 5;
      const rays = lines(root, RAYS, 0x4fd8e8, 0.2);
      const hits = swarm(root, RAYS, 0xff6a55, 0.07, 0.95, (a, i) => { a[i*3+1] = -10; });
      function rayHit(ox, oz, dx, dz){
        let best = MAXR;
        for(const b of obstacles){
          let tmin = 0, tmax = best;
          if(Math.abs(dx) < 1e-6){ if(ox < b.x0 || ox > b.x1) continue; }
          else { let t1 = (b.x0 - ox)/dx, t2 = (b.x1 - ox)/dx; if(t1 > t2){ const s = t1; t1 = t2; t2 = s; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); }
          if(Math.abs(dz) < 1e-6){ if(oz < b.z0 || oz > b.z1) continue; }
          else { let t1 = (b.z0 - oz)/dz, t2 = (b.z1 - oz)/dz; if(t1 > t2){ const s = t1; t1 = t2; t2 = s; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); }
          if(tmax >= tmin && tmin > 0 && tmin < best) best = tmin;
        }
        return best;
      }
      // AMCL particles
      const NP = mobile ? 70 : 160, seed = [];
      for(let i=0;i<NP;i++) seed.push({a:R01(i)*Math.PI*2, r:R01(i+300), p:R01(i+600)*6.28});
      const cloud = swarm(root, NP, 0xf5a35c, 0.06, 0.8, (a, i) => { a[i*3+1] = -10; });
      const shafts = [[-1.6, -1.0], [1.5, 0.9]].map(([x, z]) => shaft(root, x, z, 0.5, 1.0, 7, 0xbfd6ff, 0.05));
      const panel = holo(root, 2.0, 1.3, -2.6, 3.4, -2.2);

      const legLen = WP.map((p, i) => p.distanceTo(nextWP(i)));
      let leg = 0, legT = 0, heading = 0, holdT = 0, mode = 'CRUISE', spread = 0.5;
      const CRUISE = 0.95, pos = WP[0].clone(), tmp = new THREE.Vector3(), o = new THREE.Vector3(), e = new THREE.Vector3();
      function update(t, dt){
        const atStop = pos.distanceTo(STOP_PT) < 0.12, inWarn = pos.distanceTo(WARN_PT) < 0.8;
        let speed = CRUISE; mode = 'CRUISE';
        if(atStop && holdT < 2.2){ holdT += dt; speed = 0; mode = 'HOLD AT STOP'; }
        else if(inWarn){ speed = CRUISE*0.3; mode = 'CAUTION ZONE'; }
        if(!atStop) holdT = 0;
        legT += speed*dt/legLen[leg];
        if(legT >= 1){ legT -= 1; leg = (leg + 1) % LEGS; }
        const a = WP[leg], b = nextWP(leg);
        pos.copy(a).lerp(b, legT);
        tmp.subVectors(b, a);
        // mecanum: the body keeps one heading through the turns and strafes the cross legs
        rv.g.position.set(pos.x, TOP, pos.z); rv.g.rotation.y = heading;
        const c = Math.cos(heading), s = Math.sin(heading), vx = tmp.x/(legLen[leg] || 1)*speed, vz = tmp.z/(legLen[leg] || 1)*speed;
        rv.drive(c*vx - s*vz, s*vx + c*vz, 0, dt);
        rv.lidar.rotation.y = t*6;
        rays.reset();
        o.set(pos.x, TOP + 0.33, pos.z);
        const spin = t*0.9;
        for(let i=0;i<RAYS;i++){
          const ang = i/RAYS*Math.PI*2 + spin, dx = Math.cos(ang), dz = Math.sin(ang), r = rayHit(pos.x, pos.z, dx, dz);
          e.set(pos.x + dx*r, o.y, pos.z + dz*r); rays.seg(o, e);
          hits.a[i*3] = e.x; hits.a[i*3+1] = r < MAXR ? e.y : -10; hits.a[i*3+2] = e.z;
        }
        rays.done(); hits.geo.attributes.position.needsUpdate = true;
        spread += ((speed < 0.05 ? 0.12 : 0.42) - spread)*damp(0.05, dt);
        for(let i=0;i<NP;i++){
          const sd = seed[i], r = sd.r*spread + 0.02*Math.sin(t*1.6 + sd.p);
          cloud.a[i*3] = pos.x + Math.cos(sd.a + t*0.25)*r; cloud.a[i*3+1] = TOP + 0.03; cloud.a[i*3+2] = pos.z + Math.sin(sd.a + t*0.25)*r;
        }
        cloud.geo.attributes.position.needsUpdate = true;
        [stop, warn].forEach(sg => { sg.head.rotation.y = Math.atan2(camera.position.x - sg.x, camera.position.z - sg.z); });
        stop.m.emissiveIntensity = atStop ? 1.2 + Math.sin(t*8)*0.8 : 0.5;
        warn.m.emissiveIntensity = inWarn ? 1.2 + Math.sin(t*6)*0.8 : 0.5;
        beacons.forEach((m, i) => { m.material.emissiveIntensity = i === (leg + 1) % LEGS ? 2 + Math.sin(t*5) : 0.6; });
        panel.draw(t, (g, w, h) => {
          holoFrame(g, w, h, 'NAV2  A* ROUTE');
          holoRow(g, 112, 'waypoint', ((leg + 1) % LEGS + 1) + ' / ' + LEGS, (leg + legT)/LEGS);
          holoRow(g, 170, 'speed policy', mode);
          holoRow(g, 228, 'AMCL spread', spread.toFixed(2), spread/0.45);
        });
      }
      return {update};
    }
  };
