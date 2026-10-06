// parts: tb4
  /*  SMARTFOLLOWER AND TRACKER: an ArUco board on a rolling stand wanders
     the floor and passes behind a pillar; the TurtleBot 4 holds a follow
     distance behind it. While the camera can see the board the frustum
     locks on and the particle filter cloud hugs it; behind the pillar
     the view is lost, the cloud swells, and the Kalman estimate (the
     ring) carries on from the motion model until the board reappears.  */
  const STAGE = {
    sky:[0x04070f, 0x0c1830], skyL:[0xc6b08a, 0xe8d9b9], hemi:0xa8c8ff,
    cam:{az:0.35, d:10.5, h:5.4, ly:0.7},
    build(root){
      plinth(root, 3.4);
      // the ArUco board on a rolling stand (the person stand-in)
      const tgt = grp(root, 0, TOP, 0);
      add(tgt, cylY(0.22, 0.24, 0.06, 24), MAT.dark, 0, 0.05, 0);
      [0, 1, 2].forEach(i => { const a = i/3*Math.PI*2; add(tgt, new THREE.SphereGeometry(0.035, 10, 8), MAT.rubber, Math.cos(a)*0.17, 0.03, Math.sin(a)*0.17); });
      add(tgt, cylY(0.022, 0.022, 1.15, 10), MAT.steel, 0, 0.62, 0);
      const aruco = canvasTex(140, 140, (g, w) => {
        g.fillStyle = '#fff'; g.fillRect(0, 0, w, w);
        g.fillStyle = '#000'; g.fillRect(10, 10, 120, 120);
        const bits = [1,0,1,1,0, 0,1,0,0,1, 1,1,0,1,0, 0,0,1,1,1, 1,0,0,1,0];
        g.fillStyle = '#fff';
        bits.forEach((b, i) => { if(b) g.fillRect(30 + (i%5)*16, 30 + Math.floor(i/5)*16, 16, 16); });
      });
      const boardY = 1.3, B = 0.5;
      const board = grp(tgt, 0, boardY, 0);
      add(board, rbox(B + 0.04, B + 0.04, 0.03, 0.01), MAT.dark, 0, 0, -0.01);
      add(board, new THREE.PlaneGeometry(B, B), new THREE.MeshStandardMaterial({map:aruco, roughness:0.6, metalness:0}), 0, 0, 0.007, false);
      add(board, rbox(B, B, 0.012, 0.004), MAT.shell, 0, 0, -0.035);
      // occluding pillar
      const PIL = {x:0.4, z:-0.7, r:0.32};
      add(root, cylY(PIL.r, PIL.r, 2.4, 40), std(0x3a4252, 0.6, 0.2), PIL.x, TOP + 1.2, PIL.z);
      add(root, cylY(PIL.r + 0.04, PIL.r + 0.06, 0.08, 40), MAT.dark, PIL.x, TOP + 0.04, PIL.z);
      add(root, new THREE.TorusGeometry(PIL.r + 0.005, 0.012, 6, 60), MAT.amberG, PIL.x, TOP + 1.6, PIL.z, false).rotation.x = Math.PI/2;

      const tb = makeTB4(root, {k:1.25});
      // LiDAR ring, KF estimate ring, PF cloud, frustum
      const sweep = add(root, new THREE.RingGeometry(0.9, 0.93, 80), new THREE.MeshBasicMaterial({color:lin(0x4fd8e8), transparent:true, opacity:0.4,
        blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}), 0, TOP + 0.02, 0, false);
      sweep.rotation.x = -Math.PI/2; PARTS.push({m:sweep.material, c:sweep.material.color.clone()});
      const kf = add(root, new THREE.TorusGeometry(0.3, 0.018, 8, 48), MAT.cyanG, 0, TOP + 0.03, 0, false); kf.rotation.x = Math.PI/2;
      const NP = mobile ? 70 : 150, seed = [];
      for(let i=0;i<NP;i++) seed.push({a:R01(i)*6.28, r:Math.sqrt(R01(i+77)), h:R01(i+150), p:R01(i+222)*6.28});
      const pf = swarm(root, NP, 0xf5a35c, 0.06, 0.85, (a, i) => { a[i*3+1] = -10; });
      const fr = lines(root, 8, 0x4fd8e8, 0.4);
      const panel = holo(root, 2.0, 1.3, -1.9, 3.5, -1.8);

      const tp = new THREE.Vector3(), bp = new THREE.Vector3(), est = new THREE.Vector3(), estV = new THREE.Vector3(), lastT = new THREE.Vector3();
      const camW = new THREE.Vector3(), c = new THREE.Vector3(), corners = [[-1,-1],[1,-1],[1,1],[-1,1]];
      let botYaw = 0, swell = 0, seen = true, first = true;
      tb.bot.position.set(-1.8, TOP, 1.4);
      function segDist(ax, az, bx, bz, px, pz){
        const vx = bx - ax, vz = bz - az, L = vx*vx + vz*vz || 1;
        const k = Math.max(0, Math.min(1, ((px - ax)*vx + (pz - az)*vz)/L));
        return Math.hypot(ax + vx*k - px, az + vz*k - pz);
      }
      function update(t, dt){
        // the target wanders a lissajous that carries it behind the pillar
        tp.set(Math.sin(t*0.23)*1.9 + 0.3, 0, Math.sin(t*0.37 + 1)*1.3 - 0.6);
        if(first){ lastT.copy(tp); est.copy(tp); first = false; }
        const vx = (tp.x - lastT.x)/Math.max(dt, 1e-3), vz = (tp.z - lastT.z)/Math.max(dt, 1e-3);
        lastT.copy(tp);
        tgt.position.set(tp.x, TOP, tp.z);
        // follower: hold a follow distance, nose on the target
        const b = tb.bot.position, dx = tp.x - b.x, dz = tp.z - b.z, d = Math.hypot(dx, dz);
        const want = Math.atan2(-dz, dx);
        botYaw = angLerp(botYaw, want, damp(0.06, dt));
        const go = Math.max(0, d - 1.35)*0.9;
        b.x += Math.cos(botYaw)*go*dt; b.z -= Math.sin(botYaw)*go*dt;
        tb.bot.rotation.y = botYaw;
        tgt.rotation.y = Math.atan2(b.x - tp.x, b.z - tp.z);
        tb.lidar.rotation.y = t*6;
        // can the camera see the board?
        root.updateMatrixWorld(true);
        tb.camPt.getWorldPosition(camW); root.worldToLocal(camW);
        seen = segDist(camW.x, camW.z, tp.x, tp.z, PIL.x, PIL.z) > PIL.r + 0.08;
        swell += ((seen ? 0 : 1) - swell)*damp(0.05, dt);
        // Kalman estimate: measurement updates while seen, prediction only while occluded
        if(seen){ est.lerp(tp, damp(0.2, dt)); estV.set(vx, 0, vz); }
        else { est.addScaledVector(estV, dt); estV.multiplyScalar(Math.pow(0.6, dt)); }
        kf.position.set(est.x, TOP + 0.03, est.z); kf.scale.setScalar(1 + swell*0.8);
        const rr = 0.18 + swell*0.75;
        for(let i=0;i<NP;i++){
          const s = seed[i], r = s.r*rr + 0.02*Math.sin(t*2 + s.p);
          pf.a[i*3] = est.x + Math.cos(s.a + t*0.3)*r; pf.a[i*3+1] = TOP + 0.05 + s.h*(boardY + 0.3)*(0.3 + 0.7*(1 - swell)); pf.a[i*3+2] = est.z + Math.sin(s.a + t*0.3)*r;
        }
        pf.geo.attributes.position.needsUpdate = true;
        sweep.position.set(b.x, TOP + 0.02, b.z);
        const ph = (t*0.6) % 1; sweep.scale.setScalar(0.5 + ph*2.6); sweep.material.opacity = (1 - ph)*0.45;
        fr.reset();
        if(seen){
          board.updateMatrixWorld(true);
          corners.forEach(([sx, sy]) => { c.set(sx*B/2, sy*B/2, 0); board.localToWorld(c); root.worldToLocal(c); fr.seg(camW, c); });
        }
        fr.done();
        panel.draw(t, (g, w, h) => {
          holoFrame(g, w, h, 'SMARTFOLLOWER  TRACK');
          holoRow(g, 112, 'ArUco marker', seen ? 'DETECTED' : 'OCCLUDED');
          holoRow(g, 170, 'estimator', seen ? 'KF UPDATE' : 'PREDICT ONLY');
          holoRow(g, 228, 'PF spread', rr.toFixed(2), swell);
          holoRow(g, 286, 'range to target', d.toFixed(2), d/3);
        });
      }
      return {update};
    }
  };
