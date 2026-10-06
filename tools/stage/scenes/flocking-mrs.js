// parts:
  /*  50-AGENT FLOCKING: three teams of small underwater vehicles, each
     sensing only through a 90 degree forward cone out to a finite range.
     Repulsion acts on everyone close by; cohesion and heading alignment
     come only from teammates inside the cone (a cyan link per sensed
     pair). With nothing in view an agent sweeps its heading to reacquire.
     Once the teams have condensed into flocks, they are dealt out again.  */
  const STAGE = {
    sky:[0x020a12, 0x0b3a4c], skyL:[0x3f6f6c, 0x93ac98], hemi:0x9fe8f5,
    cam:{az:0.25, d:12.5, h:4.2, ly:2.2, fit:1.12},
    build(root){
      // seabed: rocks, a survey beacon
      const rockM = std(0x17242f, 0.95, 0.05);
      for(let i=0;i<22;i++){
        const a = i*2.39, r = 1.2 + (i*1.7)%6;
        const m = add(root, new THREE.DodecahedronGeometry(0.2 + ((i*37)%10)/14, 0), rockM, Math.cos(a)*r, 0.06, Math.sin(a)*r);
        m.scale.y = 0.5; m.rotation.set(i, i*0.7, 0);
      }
      add(root, cylY(0.35, 0.45, 0.18, 32), MAT.dark, 0, 0.09, 0);
      add(root, cylY(0.04, 0.04, 1.0, 12), MAT.steel, 0, 0.6, 0);
      const bcnM = glow(0x4fd8e8, 3); add(root, new THREE.SphereGeometry(0.09, 20, 14), bcnM, 0, 1.15, 0, false);
      const K = 0.3, sim = grp(root, 0, 2.6, 0); sim.scale.setScalar(K);
      const N = mobile ? 26 : 50, TEAMS = 3, FOV = Math.PI/2, RANGE = 7.0;
      const COLS = [0x63d97a, 0xe8544f, 0x4f9de8];
      // hull: a lathed torpedo, nose along +z
      const pts = [new THREE.Vector2(0.001, -0.75)];
      for(let i=0;i<=24;i++){
        const u = i/24, y = -0.75 + u*1.5;
        let r = 0.16;
        if(u < 0.2) r = 0.16*(0.35 + 0.65*Math.sqrt(u/0.2));
        else if(u > 0.85){ const k = (u - 0.85)/0.15; r = 0.16*Math.sqrt(Math.max(0, 1 - k*k)); }
        pts.push(new THREE.Vector2(Math.max(r, 0.001), y));
      }
      const hullG = new THREE.LatheGeometry(pts, 24); hullG.rotateX(Math.PI/2);
      const capG = cylZ(0.163, 0.08, 24), finG = rbox(0.014, 0.17, 0.22, 0.006), finH = rbox(0.17, 0.014, 0.22, 0.006);
      const capMs = COLS.map(c => std(c, 0.4, 0.1)), glows = COLS.map(c => glow(c, 1.6));
      const agents = [];
      for(let i=0;i<N;i++){
        const team = i % TEAMS, g = grp(sim, 0, 0, 0);
        const b = grp(g, 0, 0, 0); b.scale.setScalar(1.7);
        add(b, hullG, MAT.shell); add(b, capG, capMs[team], 0, 0, 0.38);
        add(b, finG, MAT.dark, 0, 0.18, -0.6); add(b, finG, MAT.dark, 0, -0.18, -0.6);
        add(b, finH, MAT.dark, 0.18, 0, -0.6); add(b, finH, MAT.dark, -0.18, 0, -0.6);
        add(b, new THREE.SphereGeometry(0.035, 10, 8), glows[team], 0, 0.15, 0.1, false);
        agents.push({g, team, x:(Math.random() - 0.5)*26, y:(Math.random() - 0.5)*9, z:(Math.random() - 0.5)*20, vx:0, vy:0, vz:0, yaw:Math.random()*6.28});
      }
      const links = lines(sim, N*4, 0x4fd8e8, 0.3);
      const snow = swarm(root, mobile ? 300 : 650, 0x9ff0ff, 0.05, 0.5,
        (a, i) => { a[i*3] = (R01(i) - 0.5)*14; a[i*3+1] = R01(i+9)*6; a[i*3+2] = (R01(i+17) - 0.5)*14; },
        (a, i, t, dt) => { a[i*3+1] -= dt*0.05; a[i*3] += Math.sin(t*0.3 + i)*dt*0.04; if(a[i*3+1] < 0.1) a[i*3+1] = 6; });
      const shafts = [[-2.5, -2.0], [2.2, -3.2], [3.6, 1.2]].map(([x, z], i) => shaft(root, x, z, 0.5, 1.6, 7, 0x9ff3ff, 0.07 + i*0.01));
      const panel = holo(root, 2.1, 1.4, -2.6, 4.6, -2.4);
      const K_ATTR = 0.55, K_REP = 2.6, K_ALIGN = 0.9, SEP = 1.5, VMAX = 3.2;
      let settle = 0, sensed = 0, spreadNow = 0;
      function scatter(){ agents.forEach(a => { a.x = (Math.random() - 0.5)*26; a.y = (Math.random() - 0.5)*9; a.z = (Math.random() - 0.5)*20; a.vx = a.vy = a.vz = 0; }); settle = 0; }
      const va = new THREE.Vector3(), vb = new THREE.Vector3();
      function update(t, dt){
        dt = Math.min(dt, 0.04);
        let spread = 0; sensed = 0;
        links.reset();
        for(let i=0;i<N;i++){
          const a = agents[i], fx = Math.sin(a.yaw), fz = Math.cos(a.yaw);
          let cx = 0, cy = 0, cz = 0, ax = 0, az = 0, seen = 0, rx = 0, ry = 0, rz = 0;
          for(let j=0;j<N;j++){
            if(i === j) continue;
            const b = agents[j], dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz);
            if(d < 1e-4) continue;
            if(d < SEP){ rx -= dx/d*(SEP - d); ry -= dy/d*(SEP - d); rz -= dz/d*(SEP - d); }
            if(b.team !== a.team || d > RANGE) continue;
            const dot = (dx*fx + dz*fz)/Math.hypot(dx, dz || 1e-6);
            if(dot < Math.cos(FOV/2)) continue;
            cx += dx; cy += dy; cz += dz; ax += Math.sin(b.yaw); az += Math.cos(b.yaw); seen++;
            if(j > i){ links.seg(va.set(a.x, a.y, a.z), vb.set(b.x, b.y, b.z)); sensed++; }
          }
          let dvx = rx*K_REP, dvy = ry*K_REP, dvz = rz*K_REP;
          if(seen > 0){
            dvx += cx/seen*K_ATTR; dvy += cy/seen*K_ATTR; dvz += cz/seen*K_ATTR;
            a.yaw = angLerp(a.yaw, Math.atan2(ax/seen, az/seen), Math.min(1, dt*K_ALIGN));
          } else a.yaw += dt*0.8;
          a.vx = (a.vx + dvx*dt)*0.97; a.vy = (a.vy + dvy*dt)*0.97; a.vz = (a.vz + dvz*dt)*0.97;
          const sp = Math.hypot(a.vx, a.vy, a.vz);
          if(sp > VMAX){ a.vx *= VMAX/sp; a.vy *= VMAX/sp; a.vz *= VMAX/sp; }
          a.x += a.vx*dt; a.y += a.vy*dt; a.z += a.vz*dt;
          a.g.position.set(a.x, a.y, a.z);
          a.g.rotation.y = sp > 0.05 ? Math.atan2(a.vx, a.vz) : a.yaw;
          a.g.rotation.x = sp > 0.05 ? -Math.asin(Math.max(-1, Math.min(1, a.vy/Math.max(sp, 1e-3))))*0.6 : 0;
          spread += Math.hypot(a.x, a.y, a.z);
        }
        links.done();
        spread /= N; spreadNow = spread;
        settle = spread < 5.0 ? settle + dt : 0;
        if(settle > 3.5) scatter();
        snow.update(t, dt);
        shafts.forEach((sh, i) => { sh.material.opacity = sh.userData.op*(0.7 + 0.3*Math.sin(t*0.6 + i*1.7)); });
        bcnM.emissiveIntensity = 3*(0.55 + 0.45*Math.max(0, Math.sin(t*2.4)));
        panel.draw(t, (g, w, h) => {
          holoFrame(g, w, h, 'FLOCKING  ' + N + ' AGENTS');
          holoRow(g, 112, 'sensing cone', '90°  RANGE 7');
          holoRow(g, 170, 'pairs in view', String(sensed));
          holoRow(g, 228, 'mean spread', spreadNow.toFixed(1), 1 - Math.min(1, spreadNow/12));
        });
      }
      return {update};
    }
  };
