
  /*  5. BLIMP, catch and score (the Defend the Republic game AeroFusion
     flew): a free balloon spawns, the blimp chases it until the net under
     its gondola scoops it up, carries it to the next goal (circle, then
     triangle, then square), lines up square to the frame and puts the
     balloon through it. The nose is the blunt end; the envelope tapers to
     the tail fins, and the two ducted thrusters ride on the envelope's
     flanks. */
  function buildBlimp(root){
    plinth(root, 3.0);
    const L = 3.6, R = 0.78, C = 0.68;
    const pts = [];
    for(let i=0;i<=48;i++){
      const v = i/48, y = -L/2 + v*L;          // v: 0 tail, 1 nose
      const r = v < C ? R*Math.pow(v/C, 0.8) : R*Math.sqrt(Math.max(0, 1 - Math.pow((v - C)/(1 - C), 2)));
      pts.push(new THREE.Vector2(Math.max(r, 0.002), y));
    }
    const envG = new THREE.LatheGeometry(pts, 56); envG.rotateZ(-Math.PI/2);
    const bl = new THREE.Group(); root.add(bl);
    add(bl, envG, std(0xc9d2dc, 0.26, 0.72));
    add(bl, cylX(R*0.99, 0.05, 56), MAT.amber, 0.55, 0, 0);
    const finG = rbox(0.55, 0.42, 0.03, 0.02), finH = rbox(0.55, 0.03, 0.42, 0.02);
    add(bl, finG, MAT.amber, -1.45, 0.3, 0); add(bl, finG, MAT.amber, -1.45, -0.3, 0);
    add(bl, finH, MAT.amber, -1.45, 0, 0.3); add(bl, finH, MAT.amber, -1.45, 0, -0.3);
    // gondola with the camera, slung under the envelope
    [[-0.12, 0.12], [0.22, 0.12], [-0.12, -0.12], [0.22, -0.12]].forEach(([x, z]) => add(bl, cylY(0.008, 0.008, 0.2, 6), MAT.steel, x, -0.82, z));
    add(bl, rbox(0.6, 0.18, 0.3, 0.05), MAT.carbon, 0.05, -0.98, 0);
    add(bl, rbox(0.04, 0.03, 0.16, 0.008), MAT.cyanG, 0.36, -0.94, 0, false);
    add(bl, new THREE.SphereGeometry(0.045, 16, 10), MAT.glass, 0.37, -1.02, 0);
    // side thrusters: a strut off each flank, a duct, a spinning prop
    const blur = new THREE.MeshBasicMaterial({color:0xcfe6ff, transparent:true, opacity:0.1, depthWrite:false, side:THREE.DoubleSide});
    const props = [-1, 1].map(s => {
      const z = s*(R + 0.24);
      add(bl, cylZ(0.022, 0.3, 10), MAT.steel, 0.05, -0.12, s*(R - 0.02));
      const duct = add(bl, new THREE.TorusGeometry(0.17, 0.035, 10, 32), MAT.dark, 0.05, -0.12, z);
      duct.rotation.y = Math.PI/2;
      add(bl, cylX(0.05, 0.14, 16), MAT.alu, 0.05, -0.12, z);
      const p = new THREE.Group(); p.position.set(-0.03, -0.12, z); bl.add(p);
      add(p, rbox(0.012, 0.3, 0.04, 0.004), MAT.dark);
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.16, 28), blur); d.rotation.y = Math.PI/2; p.add(d);
      return p;
    });
    // the catching net: a hoop under the gondola with a bag of netting
    const NET = new THREE.Vector3(0.3, -1.42, 0);
    const hoop = add(bl, new THREE.TorusGeometry(0.42, 0.018, 8, 48), MAT.steel, NET.x, -1.16, 0);
    hoop.rotation.x = Math.PI/2;
    add(bl, cylY(0.01, 0.01, 0.2, 6), MAT.steel, 0.3, -1.06, 0);
    const netPts = [];
    const bag = (u, a) => new THREE.Vector3(NET.x + Math.cos(a)*0.42*Math.sin(u), -1.16 - 0.4*(1 - Math.cos(u)), Math.sin(a)*0.42*Math.sin(u));
    for(let m=0;m<12;m++){ const a = m/12*Math.PI*2; for(let k=0;k<6;k++) netPts.push(bag(Math.PI/2*(1 - k/6), a), bag(Math.PI/2*(1 - (k+1)/6), a)); }
    for(let k=1;k<6;k++){ const u = Math.PI/2*(k/6); for(let m=0;m<24;m++) netPts.push(bag(u, m/24*Math.PI*2), bag(u, (m+1)/24*Math.PI*2)); }
    bl.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(netPts),
      new THREE.LineBasicMaterial({color:lin(0xdfe8f4), transparent:true, opacity:0.55})));

    // goals on posts, in an arc behind the plinth, each facing outward
    const GR = 3.7, GY = 2.5;
    const frameM = () => glow(0x4fd8e8, 0.9);
    function bar(g, x0, y0, x1, y1, m){
      const len = Math.hypot(x1 - x0, y1 - y0), b = add(g, rbox(len + 0.1, 0.1, 0.1, 0.03), m, (x0 + x1)/2, (y0 + y1)/2, 0, false);
      b.rotation.z = Math.atan2(y1 - y0, x1 - x0);
    }
    const goals = [['circle', -2.35], ['triangle', -1.57], ['square', -0.79]].map(([shape, a]) => {
      const n = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const c = new THREE.Vector3(n.x*GR, GY, n.z*GR);
      add(root, cylY(0.05, 0.07, GY - 0.75, 12), MAT.steel, c.x, (GY - 0.75)/2, c.z);
      add(root, cylY(0.22, 0.26, 0.08, 20), MAT.dark, c.x, 0.04, c.z);
      const g = new THREE.Group(); g.position.copy(c); g.rotation.y = Math.atan2(n.x, n.z); root.add(g);
      const m = frameM();
      if(shape === 'circle'){ const tr = add(g, new THREE.TorusGeometry(0.62, 0.05, 12, 64), m, 0, 0, 0, false); }
      else if(shape === 'triangle'){ const r3 = 0.72, P = [0, 1, 2].map(i => [Math.cos(Math.PI/2 + i*2*Math.PI/3)*r3, Math.sin(Math.PI/2 + i*2*Math.PI/3)*r3]);
        for(let i=0;i<3;i++) bar(g, P[i][0], P[i][1], P[(i+1)%3][0], P[(i+1)%3][1], m); }
      else { const h = 0.55; bar(g, -h, -h, h, -h, m); bar(g, h, -h, h, h, m); bar(g, h, h, -h, h, m); bar(g, -h, h, -h, -h, m); }
      root.userData.glows.push({m, k:0.9});
      return {shape, n, c, m, flash:0};
    });

    const ball = add(root, new THREE.SphereGeometry(0.3, 32, 22), std(0x4cc35d, 0.32, 0.05));
    ball.scale.y = 1.1;
    const SPAWN = [[1.3, 2.3, 1.4], [-1.5, 2.6, 0.9], [0.4, 2.1, 2.0], [-0.6, 2.4, -0.4], [1.8, 2.7, 0.2]];
    const st = {phase:'seek', goal:0, scored:0, spawn:0, tp:0};
    const bp = new THREE.Vector3().fromArray(SPAWN[0]);
    const netW = new THREE.Vector3(), tgt = new THREE.Vector3(), tmp = new THREE.Vector3(), shotA = new THREE.Vector3();
    let yaw = 0;
    bl.position.set(-1.6, 3.2, -0.4);
    const netWorld = out => out.set(NET.x*Math.cos(yaw), NET.y, -NET.x*Math.sin(yaw)).add(bl.position);
    function steer(target, wantYaw, dt, vmax){
      tmp.subVectors(target, bl.position);
      const d = tmp.length(), v = Math.min(vmax, d*0.9);
      if(d > 1e-4) bl.position.addScaledVector(tmp, v*dt/d);
      yaw = angLerp(yaw, wantYaw, damp(0.035, dt));
      return d;
    }
    function update(t, dt){
      dt = Math.min(dt, 0.05);
      st.tp += dt;
      const G = goals[st.goal];
      if(st.phase === 'seek'){
        // free balloon drifts; aim the net at it
        ball.position.set(bp.x + Math.sin(t*0.6)*0.15, bp.y + Math.sin(t*0.9)*0.1, bp.z + Math.cos(t*0.5)*0.15);
        tmp.subVectors(ball.position, bl.position);
        const wy = Math.atan2(-tmp.z, tmp.x);
        tgt.set(ball.position.x - NET.x*Math.cos(yaw), ball.position.y - NET.y + 0.05, ball.position.z + NET.x*Math.sin(yaw));
        steer(tgt, wy, dt, 0.9);
        netWorld(netW);
        if(netW.distanceTo(ball.position) < 0.22){ st.phase = 'carry'; st.tp = 0; }
      } else if(st.phase === 'carry'){
        // to the goal's inside face, square to the frame, net level with its centre
        const wy = Math.atan2(-G.n.z, G.n.x);
        tgt.copy(G.c).addScaledVector(G.n, -2.2); tgt.y = G.c.y - NET.y;
        tgt.x -= NET.x*Math.cos(wy); tgt.z += NET.x*Math.sin(wy);
        const d = steer(tgt, wy, dt, 1.0);
        netWorld(ball.position); ball.position.y += 0.02;
        if(d < 0.08 && Math.abs(angLerp(yaw, wy, 1) - yaw) < 0.03){ st.phase = 'shoot'; st.tp = 0; shotA.copy(ball.position); }
      } else if(st.phase === 'shoot'){
        // the balloon goes through the frame and out the far side
        const k = smoothstep(clamp01(st.tp/1.3));
        tmp.copy(G.c).addScaledVector(G.n, 1.4);
        ball.position.copy(shotA).lerp(tmp, k);
        if(k > 0.55 && G.flash === 0){ G.flash = 1; st.scored++; }
        if(st.tp > 1.6){ st.phase = 'respawn'; st.tp = 0; }
      } else {
        // fade out past the goal, back off, and a fresh balloon appears
        const k = clamp01(st.tp/0.9);
        ball.scale.setScalar(1 - k); ball.scale.y *= 1.1;
        tmp.copy(G.c).addScaledVector(G.n, -3.2); tmp.y = 3.0;
        steer(tmp, yaw, dt, 0.6);
        if(k >= 1){
          st.spawn = (st.spawn + 1) % SPAWN.length; bp.fromArray(SPAWN[st.spawn]);
          ball.scale.set(1, 1.1, 1); st.goal = (st.goal + 1) % goals.length;
          st.phase = 'seek'; st.tp = 0;
        }
      }
      goals.forEach(g => { if(g.flash > 0){ g.flash = Math.max(0, g.flash - dt*0.8); } g.m.emissiveIntensity = 0.9 + g.flash*4; });
      bl.rotation.y = yaw;
      bl.rotation.z = Math.sin(t*0.6)*0.025;
      props.forEach((p, i) => { p.rotation.x += (i ? -1 : 1)*0.7; });
    }
    return {update, focus:[0, 3.0, 0], bl, st, goals, ball};
  }