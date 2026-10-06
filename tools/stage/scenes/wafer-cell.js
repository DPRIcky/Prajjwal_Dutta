// parts: arm6
  /*  THE WAFER CELL: the SCARA takes a wafer from the cassette on its
     elbow branch A and sets it in the cradle at the head of the conveyor;
     the belt carries it under the inspection camera (which flashes as it
     passes); at the far end the cobot lifts it onto the deposit platform,
     and the cradle runs back for the next one. The PLC sits behind the
     cell and its trigger lines pulse each time it actually asks a machine
     for something, the handshake the page's simulator works through.  */
  const STAGE = {
    sky:[0x090705, 0x2a1b0f], skyL:[0xc9ab7c, 0xe8d5b0], hemi:0xffcf9a,
    cam:{az:0.5, d:12.6, h:6.4, ly:0.7, fit:1.06},
    build(root){
      plinth(root, 4.7);
      // wafer: die grid on a silicon disc
      const waferTex = canvasTex(256, 256, (g, w) => {
        const gr = g.createLinearGradient(0, 0, w, w);
        gr.addColorStop(0, '#6f7fa8'); gr.addColorStop(0.45, '#b9a6d6'); gr.addColorStop(0.7, '#7fc3d4'); gr.addColorStop(1, '#5b6a92');
        g.fillStyle = gr; g.fillRect(0, 0, w, w);
        g.strokeStyle = 'rgba(20,28,48,0.55)'; g.lineWidth = 1.2;
        for(let i=8;i<w;i+=16){ g.beginPath(); g.moveTo(i, 0); g.lineTo(i, w); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
        g.fillStyle = '#c9ced8'; g.beginPath(); g.arc(w/2, w/2, w/2, 0, Math.PI*2); g.arc(w/2, w/2, w/2 - 10, 0, Math.PI*2, true); g.fill();
      });
      const waferMats = [std(0x9aa3b4, 0.3, 0.9), new THREE.MeshStandardMaterial({map:waferTex, roughness:0.22, metalness:0.75}), std(0x8a93a3, 0.4, 0.8)];
      const WRAD = 0.26, waferG = new THREE.CylinderGeometry(WRAD, WRAD, 0.012, 48);
      const mkWafer = () => add(root, waferG, waferMats);

      /* SCARA */
      const SX = -2.75, SZ = 0.35, L1 = 1.05, L2 = 1.05, PAD = 0.32;
      add(root, cylY(0.36, 0.4, 0.1, 40), MAT.dark, SX, TOP + 0.05, SZ);
      add(root, cylY(0.28, 0.3, 0.95, 40), MAT.shell, SX, TOP + 0.55, SZ);
      add(root, cylY(0.29, 0.29, 0.04, 40), MAT.cap, SX, TOP + 1.02, SZ);
      const j1 = grp(root, SX, TOP + 1.05, SZ);
      add(j1, cylY(0.25, 0.25, 0.2, 40), MAT.shell, 0, 0.1, 0);
      add(j1, new THREE.BoxGeometry(L1, 0.18, 0.38), MAT.shell, L1/2, 0.09, 0);
      add(j1, rbox(L1*0.6, 0.01, 0.04, 0.004), MAT.amberG, L1*0.5, 0.185, 0, false);
      const j2 = grp(j1, L1, 0.18, 0);
      add(j2, cylY(0.19, 0.19, 0.16, 40), MAT.shell, 0, 0.08, 0);
      add(j2, new THREE.BoxGeometry(L2, 0.15, 0.3), MAT.shell, L2/2, 0.075, 0);
      add(j2, cylY(0.16, 0.16, 0.15, 32), MAT.shell, L2, 0.075, 0);
      add(j2, cylY(0.1, 0.1, 0.26, 24), MAT.dark, L2, 0.28, 0);
      const quill = grp(j2, L2, 0, 0);
      add(quill, cylY(0.035, 0.035, 1.2, 14), MAT.steel);
      const j4 = grp(quill, 0, -0.6, 0);
      add(j4, cylY(0.06, 0.06, 0.07, 20), MAT.dark, 0, 0.035, 0);
      add(j4, rbox(0.56, 0.02, 0.11, 0.008), MAT.dark, 0.27, 0, 0);
      const Q0 = TOP + 1.05 + 0.18 - 0.6;
      let q1 = 0, q2 = 0, q4 = 0;
      function scara(x, z, heading, Y){
        const u = x - SX, v = -(z - SZ);
        let D = (u*u + v*v - L1*L1 - L2*L2)/(2*L1*L2); D = Math.max(-1, Math.min(1, D));
        q2 = Math.acos(D);                                   // branch A: elbow on the positive side
        q1 = Math.atan2(v, u) - Math.atan2(L2*Math.sin(q2), L1 + L2*Math.cos(q2));
        q4 = heading - q1 - q2;
        j1.rotation.y = q1; j2.rotation.y = q2; j4.rotation.y = q4; quill.position.y = Y - Q0;
      }
      /* cassette, open face toward the SCARA */
      const CAS = {x:-3.05, z:-1.45}, cdx = CAS.x - SX, cdz = CAS.z - SZ, cl = Math.hypot(cdx, cdz);
      const cdir = {x:cdx/cl, z:cdz/cl}, hC = Math.atan2(-cdir.z, cdir.x);
      const NS = 5, slotY = k => TOP + 1.2 - k*0.1;
      const cas = grp(root, CAS.x, 0, CAS.z); cas.rotation.y = hC;
      const wall = std(0x2c3e5a, 0.3, 0.2, {transparent:true, opacity:0.6});
      add(cas, new THREE.BoxGeometry(0.03, 0.56, 0.64), wall, 0.32, TOP + 0.98, 0, false);
      add(cas, new THREE.BoxGeometry(0.64, 0.56, 0.03), wall, 0,  TOP + 0.98, 0.32, false);
      add(cas, new THREE.BoxGeometry(0.64, 0.56, 0.03), wall, 0,  TOP + 0.98, -0.32, false);
      add(cas, rbox(0.68, 0.035, 0.68, 0.012), MAT.dark, 0, TOP + 1.27, 0);
      add(cas, rbox(0.68, 0.035, 0.68, 0.012), MAT.dark, 0, TOP + 0.69, 0);
      add(cas, cylY(0.05, 0.08, 0.68, 16), MAT.steel, 0, TOP + 0.34, 0);
      for(let k=0;k<NS;k++) [-1, 1].forEach(s => add(cas, new THREE.BoxGeometry(0.56, 0.01, 0.04), MAT.alu, 0.02, slotY(k) - 0.012, s*0.29));
      const casW = [];
      for(let k=0;k<NS;k++){ const w = mkWafer(); root.remove(w); cas.add(w); w.position.set(0, slotY(k), 0); casW.push(w); }

      /* conveyor along x, with a cradle that shuttles */
      const BZ = -0.25, BY = TOP + 0.62, X0 = -1.6, X1 = 1.85;
      const beltTex = canvasTex(256, 32, (g, w, h) => { g.fillStyle = '#14181f'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b323e'; for(let x=0;x<w;x+=16) g.fillRect(x, 0, 5, h); });
      beltTex.wrapS = beltTex.wrapT = THREE.RepeatWrapping; beltTex.repeat.set(12, 1);
      add(root, new THREE.BoxGeometry(X1 - X0 + 0.6, 0.04, 0.6), new THREE.MeshStandardMaterial({map:beltTex, roughness:0.85, metalness:0.1}), (X0 + X1)/2, BY - 0.02, BZ);
      [-1, 1].forEach(s => add(root, rbox(X1 - X0 + 0.7, 0.12, 0.05, 0.015), MAT.alu, (X0 + X1)/2, BY - 0.03, BZ + s*0.33));
      [X0 - 0.2, (X0 + X1)/2, X1 + 0.2].forEach(x => [-1, 1].forEach(s => add(root, new THREE.BoxGeometry(0.05, BY - TOP - 0.08, 0.05), MAT.steel, x, (BY + TOP - 0.08)/2, BZ + s*0.3)));
      const cradle = grp(root, X0, BY, BZ);
      add(cradle, rbox(0.62, 0.08, 0.62, 0.03), MAT.amber, 0, 0.04, 0);
      [0, 1, 2].forEach(i => { const a = i/3*Math.PI*2; add(cradle, cylY(0.025, 0.025, 0.05, 10), MAT.dark, Math.cos(a)*0.2, 0.1, Math.sin(a)*0.2); });
      const CY = BY + 0.135;
      // inspection camera gantry
      const GX = 0.1;
      [-1, 1].forEach(s => add(root, new THREE.BoxGeometry(0.06, 1.5, 0.06), MAT.steel, GX, TOP + 0.75, BZ + s*0.45));
      add(root, rbox(0.12, 0.08, 1.0, 0.02), MAT.dark, GX, TOP + 1.5, BZ);
      add(root, rbox(0.2, 0.18, 0.2, 0.03), MAT.carbon, GX, TOP + 1.38, BZ);
      const flashM = glow(0x4fd8e8, 0.5); add(root, cylY(0.05, 0.05, 0.02, 20), flashM, GX, TOP + 1.28, BZ, false);
      const beam = add(root, new THREE.ConeGeometry(0.42, 0.62, 32, 1, true), new THREE.MeshBasicMaterial({color:lin(0x4fd8e8), transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}), GX, TOP + 0.97, BZ, false);
      PARTS.push({m:beam.material, c:beam.material.color.clone()});

      /* cobot and deposit platform */
      const COB = {x:2.75, z:0.9}, DEP = {x:3.55, z:-0.55}, DY = TOP + 0.48;
      add(root, cylY(0.3, 0.34, 0.25, 32), MAT.dark, COB.x, TOP + 0.125, COB.z);
      const cobG = grp(root, COB.x, TOP + 0.25, COB.z);
      const cobot = makeArm6(cobG, {style:'ur', tool:'suction', k:0.62, L1:1.05, L2:0.95});
      add(root, rbox(0.8, 0.06, 0.8, 0.02), MAT.dark, DEP.x, DY - 0.03, DEP.z);
      add(root, cylY(0.07, 0.09, DY - TOP - 0.06, 16), MAT.steel, DEP.x, (DY + TOP)/2 - 0.03, DEP.z);
      const depRing = add(root, new THREE.RingGeometry(0.3, 0.33, 48), MAT.cyanG, DEP.x, DY + 0.002, DEP.z, false); depRing.rotation.x = -Math.PI/2;

      /* PLC behind the cell, trigger lines to each machine */
      const PLC = new THREE.Vector3(0.2, TOP, -2.6);
      const plc = grp(root, PLC.x, TOP, PLC.z);
      add(plc, rbox(1.1, 0.7, 0.3, 0.03), std(0x2b2f36, 0.55, 0.3), 0, 0.55, 0);
      add(plc, rbox(0.04, 1.0, 0.04, 0.01), MAT.steel, -0.5, 0.5, 0.12);
      add(plc, rbox(0.04, 1.0, 0.04, 0.01), MAT.steel, 0.5, 0.5, 0.12);
      const plcLed = [0, 1, 2].map(i => { const m = glow([0x4fd8e8, 0x3fd17a, 0xf5a35c][i], 0.2); add(plc, rbox(0.1, 0.04, 0.02, 0.008), m, -0.25 + i*0.25, 0.75, 0.16, false); return m; });
      const outP = new THREE.Vector3(PLC.x, TOP + 0.6, PLC.z + 0.16);
      const ends = [new THREE.Vector3(SX, TOP + 0.6, SZ), new THREE.Vector3((X0 + X1)/2, BY - 0.1, BZ + 0.3), new THREE.Vector3(COB.x, TOP + 0.2, COB.z)];
      const trig = ends.map(() => lines(root, 1, 0xf5a35c, 0));
      trig.forEach((L, i) => { L.seg(outP, ends[i]); L.done(); });
      const pulse = [0, 0, 0];
      const panel = holo(root, 2.1, 1.4, -2.2, 3.6, -2.4);

      const held = mkWafer(), onCradle = mkWafer(), placed = mkWafer(), cobHeld = mkWafer();
      const T = 12, PH = [[0.8, 'SCARA APPROACH'], [1.6, 'SCARA PICK'], [3.4, 'SCARA PLACE'], [4.2, 'SCARA RETURN'], [7.2, 'CONVEY AND INSPECT'], [8.2, 'COBOT PICK'], [10, 'COBOT PLACE'], [99, 'CRADLE RETURN']];
      const app = d => ({x:CAS.x - cdir.x*d, z:CAS.z - cdir.z*d});
      const IN = app(0), OUT = app(0.7), CRAD = {x:X0, z:BZ}, hD = 0;          // drop: fork along +x into the cradle
      const wristFor = (c, h) => ({x:c.x - Math.cos(h)*PAD, z:c.z + Math.sin(h)*PAD});
      const lerpP = (a, b, k) => ({x:a.x + (b.x - a.x)*k, z:a.z + (b.z - a.z)*k});
      const loc = new THREE.Vector3(), tipW = new THREE.Vector3();
      let lastN = -1, phase = '';
      function update(t, dt){
        const n = Math.floor(t/T), u = t - n*T, k = n % NS, S = slotY(k);
        phase = PH.find(p => u < p[0])[1];
        if(n !== lastN){ lastN = n; pulse[0] = 1; }
        // SCARA
        let C, H = hC, Y, carry = false;
        const home = {x:SX + 0.9, z:SZ - 0.6};
        if(u < 0.8){ const e = ss(u, 0, 0.8); C = lerpP(home, OUT, e); H = angLerp(hD, hC, e); Y = S - 0.03; }
        else if(u < 1.2){ C = lerpP(OUT, IN, ss(u, 0.8, 1.2)); Y = S - 0.03; }
        else if(u < 1.4){ C = IN; Y = S - 0.03 + 0.06*ss(u, 1.2, 1.4); carry = true; }
        else if(u < 1.8){ C = lerpP(IN, OUT, ss(u, 1.4, 1.8)); Y = S + 0.03; carry = true; }
        else if(u < 3.0){ const e = ss(u, 1.8, 3.0); C = lerpP(OUT, CRAD, e); H = angLerp(hC, hD, e); Y = S + 0.03 + (CY + 0.15 - S - 0.03)*e + Math.sin(Math.PI*e)*0.15; carry = true; }
        else if(u < 3.4){ C = CRAD; H = hD; Y = CY + 0.15 - 0.15*ss(u, 3.0, 3.4); carry = u < 3.3; }
        else { const e = ss(u, 3.4, 4.2); C = lerpP(CRAD, home, e); H = hD; Y = CY + 0.25*e; }
        if(u >= 3.4 && u < 3.5) pulse[1] = 1;
        const W = wristFor(C, H);
        scara(W.x, W.z, H, Y - 0.012);
        held.visible = carry;
        if(carry){ held.position.set(C.x, Y + 0.008, C.z); held.rotation.y = H; }
        for(let s=0;s<NS;s++) casW[s].visible = s > k || (s === k && u < 1.2);
        // conveyor cradle
        let cx = X0, onC = u >= 3.3 && u < 7.6;
        if(u >= 4.2 && u < 7.2) cx = X0 + (X1 - X0)*ss(u, 4.2, 7.2);
        else if(u >= 7.2 && u < 9.6) cx = X1;
        else if(u >= 9.6) cx = X1 + (X0 - X1)*ss(u, 9.6, 11.6);
        cradle.position.x = cx;
        onCradle.visible = onC; onCradle.position.set(cx, CY, BZ);
        beltTex.offset.x = -cx*1.2;
        const lit = onC ? Math.max(0, 1 - Math.abs(cx - GX)/0.35) : 0;
        flashM.emissiveIntensity = 0.5 + lit*4; beam.material.opacity = lit*0.14;
        // cobot: pick from the cradle at the far end, place on the deposit platform
        if(u >= 7.2 && u < 7.3) pulse[2] = 1;
        const cHome = new THREE.Vector3(COB.x - 0.5, TOP + 1.25, COB.z - 0.6);
        const pA = new THREE.Vector3(X1, CY + 0.012, BZ), pB = new THREE.Vector3(DEP.x, DY + 0.012, DEP.z), tgt = new THREE.Vector3();
        let cc = false;
        const up = v => v.clone().setY(v.y + 0.45);
        if(u < 7.2 || u >= 11) tgt.copy(cHome);
        else if(u < 7.6) tgt.lerpVectors(cHome, up(pA), ss(u, 7.2, 7.6));
        else if(u < 7.9) tgt.lerpVectors(up(pA), pA, ss(u, 7.6, 7.9));
        else if(u < 8.2){ tgt.lerpVectors(pA, up(pA), ss(u, 7.9, 8.2)); cc = true; }
        else if(u < 9.4){ const e = ss(u, 8.2, 9.4); tgt.lerpVectors(up(pA), up(pB), e); tgt.y += Math.sin(Math.PI*e)*0.2; cc = true; }
        else if(u < 9.8){ tgt.lerpVectors(up(pB), pB, ss(u, 9.4, 9.8)); cc = u < 9.75; }
        else tgt.lerpVectors(pB, cHome, ss(u, 9.8, 11));
        if(u >= 7.6 && u < 7.9) onCradle.visible = true;
        if(cc) onCradle.visible = false;
        loc.copy(tgt).sub(cobG.position);
        cobot.solve(loc.x, loc.y, loc.z, 0);
        cobHeld.visible = cc;
        if(cc){ root.updateMatrixWorld(true); cobot.tip.getWorldPosition(tipW); root.worldToLocal(tipW); cobHeld.position.set(tipW.x, tipW.y - 0.01, tipW.z); }
        placed.visible = u >= 9.75 || n > 0;
        placed.position.set(DEP.x, DY + 0.008, DEP.z);
        // PLC handshakes
        trig.forEach((L, i) => { pulse[i] = Math.max(0, pulse[i] - dt*1.4); L.m.opacity = pulse[i]*0.95; plcLed[i].emissiveIntensity = 0.2 + pulse[i]*2.5; });
        panel.draw(t, (g, w, h) => {
          holoFrame(g, w, h, 'WAFER CELL  PLC RUN');
          holoRow(g, 112, 'phase', phase);
          holoRow(g, 170, 'SCARA branch', 'A  J2 ' + deg(q2));
          holoRow(g, 228, 'cassette slot', (k + 1) + ' / ' + NS, (k + 1)/NS);
          holoRow(g, 286, 'cycle', u.toFixed(1) + ' / ' + T + ' s', u/T);
        });
      }
      return {update};
    }
  };
