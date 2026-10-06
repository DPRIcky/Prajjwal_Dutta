// parts: diffbot
  /*  ROS 2 AUTONOMY, the three projects in one run: the robot drives a
     pruned waypoint path through the cave Turn-Go-Turn (planning); the
     painted cylinders light up and get a fitted ring while they sit inside
     its sensor cone (perception); and a belief cloud trails the true pose,
     breathing out while it drives and tightening when it is corrected
     (localization).  */
  const STAGE = {
    sky:[0x050912, 0x10203a], skyL:[0xbfa883, 0xe1d0ae], hemi:0xa8c8ff,
    cam:{az:0.35, d:11.5, h:7.0, ly:0.4, fit:1.05},
    build(root){
      plinth(root, 4.9);
      add(root, rbox(6.6, 0.02, 6.6, 0.03), std(0x262a31, 0.9, 0.05), 0, TOP + 0.01, 0);
      [[-1.6, -1.2, 1.4, 0.5], [1.4, -0.4, 0.5, 1.6], [-0.4, 1.4, 1.8, 0.45], [2.4, 2.2, 0.9, 0.5], [-2.5, 1.0, 0.45, 1.0]].forEach(([x, z, w, d], n) => caveRock(root, x, z, w, d, 0.3 + R01(n)*0.15, n));
      const COLS = [0xe8544f, 0x63d97a, 0x4f9de8];
      const CY = [[-2.2, -2.4], [2.5, -1.8], [0.6, 2.6]].map(([x, z], i) => {
        add(root, cylY(0.16, 0.16, 0.6, 32), std(COLS[i], 0.55, 0.05), x, TOP + 0.3, z);
        const m = glow(COLS[i], 2); m.transparent = true; m.opacity = 0;
        const r = add(root, new THREE.TorusGeometry(0.22, 0.014, 8, 40), m, x, TOP + 0.62, z, false); r.rotation.x = Math.PI/2;
        return {x, z, m, on:0};
      });
      const WP = [[-2.6, -2.6], [0.2, -2.6], [0.4, -0.6], [2.6, 0.6], [1.0, 2.6], [-1.8, 2.6], [-2.8, -0.2]].map(([x, z]) => new THREE.Vector3(x, TOP + 0.04, z));
      WP.forEach((p, i) => { const q = WP[(i+1) % WP.length]; rod(root, 0.016, MAT.cyanG, false).userData.set(p, q); add(root, new THREE.SphereGeometry(0.045, 12, 8), MAT.amberG, p.x, p.y + 0.02, p.z, false); });
      const bot = makeDiffbot(root, {k:0.7});
      const coneM = new THREE.MeshBasicMaterial({color:lin(0x4fd8e8), transparent:true, opacity:0.08, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending});
      const cone = new THREE.Mesh(new THREE.CircleGeometry(1.9, 24, -0.45, 0.9), coneM); cone.rotation.x = -Math.PI/2; cone.position.y = 0.06; bot.g.add(cone);
      PARTS.push({m:coneM, c:coneM.color.clone()});
      const NP = mobile ? 70 : 140, seed = []; for(let i=0;i<NP;i++) seed.push({a:R01(i)*6.28, r:Math.sqrt(R01(i + 50)), p:R01(i + 90)*6.28});
      const belief = swarm(root, NP, 0xf5a35c, 0.06, 0.85, (a, i) => { a[i*3+1] = -10; });
      const panel = holo(root, 2.1, 1.4, -2.4, 3.8, -2.4);
      const pos = WP[0].clone(), est = WP[0].clone();
      let leg = 0, yaw = 0, sub = 'TURN', spread = 0.1, seen = 0;
      function update(t, dt){
        dt = Math.min(dt, 0.05);
        const tg = WP[(leg + 1) % WP.length], want = Math.atan2(-(tg.z - pos.z), tg.x - pos.x), d = Math.hypot(tg.x - pos.x, tg.z - pos.z);
        if(sub === 'TURN'){ const e = angLerp(0, want - yaw, 1), st = Math.sign(e)*Math.min(Math.abs(e), 1.8*dt); yaw += st; if(Math.abs(e) < 0.01){ yaw = want; sub = 'GO'; } }
        else { const st = Math.min(d, 0.6*dt); pos.x += Math.cos(yaw)*st; pos.z -= Math.sin(yaw)*st; if(d < 0.005){ leg = (leg + 1) % WP.length; sub = 'TURN'; } }
        bot.place(pos.x, pos.z, yaw); bot.lidar.rotation.y = t*6;
        // perception: a cylinder inside the cone lights up
        seen = 0;
        CY.forEach(c => {
          const dx = c.x - pos.x, dz = c.z - pos.z, r = Math.hypot(dx, dz), ang = Math.abs(angLerp(0, Math.atan2(-dz, dx) - yaw, 1));
          const inCone = r < 1.9 && ang < 0.45;
          if(inCone) seen++;
          c.on += ((inCone ? 1 : 0) - c.on)*damp(0.1, dt); c.m.opacity = c.on;
        });
        // localization: the belief breathes out while driving, snaps in on a periodic correction
        const corr = (t % 4) > 3.4;
        spread += ((corr ? 0.08 : (sub === 'GO' ? 0.45 : 0.25)) - spread)*damp(corr ? 0.15 : 0.01, dt);
        est.lerp(pos, corr ? damp(0.2, dt) : damp(0.03, dt));
        for(let i=0;i<NP;i++){ const s = seed[i], r = s.r*spread + 0.02*Math.sin(t*1.6 + s.p); belief.a[i*3] = est.x + Math.cos(s.a + t*0.2)*r; belief.a[i*3+1] = TOP + 0.04; belief.a[i*3+2] = est.z + Math.sin(s.a + t*0.2)*r; }
        belief.geo.attributes.position.needsUpdate = true;
        panel.draw(t, (g, w, h) => {
          holoFrame(g, w, h, 'ROS 2 AUTONOMY STACK');
          holoRow(g, 112, 'perception', seen ? 'CYLINDER IN VIEW' : 'SCANNING');
          holoRow(g, 170, 'localization', corr ? 'CORRECTED' : 'PREDICTING', 1 - spread/0.45);
          holoRow(g, 228, 'planning', 'WAYPOINT ' + ((leg + 1) % WP.length + 1) + ' / ' + WP.length);
          holoRow(g, 286, 'drive', 'TURN GO TURN  ' + sub);
        });
      }
      return {update};
    }
  };
