// parts:
  /*  PROCESS TANK under FBD control, open loop: two operator
     potentiometers are swept slowly out of phase. Network 1 MOVEs the fill
     demand straight to the fill valve; network 2 runs FC_Scaling to map
     the bipolar discharge pot onto unipolar valve travel; the level
     integrates the difference between the two flows; networks 3 and 4 run
     FC_Scaling then TO_INT for the two panel displays. No block reads the
     level back, exactly as the report says.  */
  const STAGE = {
    sky:[0x050a16, 0x0f2140], skyL:[0xc4ad84, 0xe6d6b4], hemi:0xa8c8ff,
    cam:{az:0.35, d:9.4, h:3.8, ly:1.6},
    build(root){
      plinth(root, 2.9);
      const R = 0.78, H = 2.1, B = TOP + 0.42;
      // skid, vessel, rims
      add(root, rbox(2.1, 0.08, 2.1, 0.03), MAT.dark, 0, TOP + 0.04, 0);
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z]) => add(root, new THREE.BoxGeometry(0.07, B - TOP, 0.07), MAT.steel, x*R*0.72, (B + TOP)/2, z*R*0.72));
      add(root, cylY(R + 0.02, R + 0.02, 0.06, 64), MAT.alu, 0, B, 0);
      const glassM = new THREE.MeshStandardMaterial({color:lin(0xbfe6ff), roughness:0.05, metalness:0.1, transparent:true, opacity:0.16, depthWrite:false, side:THREE.DoubleSide});
      add(root, new THREE.CylinderGeometry(R, R, H, 64, 1, true), glassM, 0, B + H/2, 0, false);
      [B + 0.03, B + H].forEach(y => { const r = add(root, new THREE.TorusGeometry(R + 0.01, 0.03, 10, 64), MAT.alu, 0, y, 0); r.rotation.x = Math.PI/2; });
      add(root, cylY(R + 0.02, R*0.4, 0.08, 64), MAT.alu, 0, B + H + 0.04, 0);
      const liqM = new THREE.MeshStandardMaterial({color:lin(0x2a9fc0), roughness:0.15, metalness:0.05, transparent:true, opacity:0.55, emissive:lin(0x0b3a4c), emissiveIntensity:0.7});
      const liq = add(root, cylY(R*0.97, R*0.97, 1, 64), liqM, 0, B, 0, false);
      const surf = add(root, new THREE.CircleGeometry(R*0.97, 64), new THREE.MeshStandardMaterial({color:lin(0x7fe3f5), roughness:0.05, metalness:0.2, transparent:true, opacity:0.5, emissive:lin(0x1c6f80), emissiveIntensity:0.6}), 0, B, 0, false);
      surf.rotation.x = -Math.PI/2;
      // sight column and float
      const CX = R + 0.2;
      add(root, cylY(0.035, 0.035, H, 16), new THREE.MeshStandardMaterial({color:lin(0xbfe6ff), roughness:0.05, transparent:true, opacity:0.3}), CX, B + H/2, 0, false);
      for(let i=0;i<=10;i++) add(root, rbox(i % 5 ? 0.08 : 0.16, 0.012, 0.02, 0.004), i % 5 ? MAT.steel : MAT.amber, CX + 0.08, B + H*i/10, 0, false);
      const flt = add(root, new THREE.SphereGeometry(0.05, 16, 12), MAT.amberG, CX, B, 0, false);
      // valves with handwheels, and the pipe runs
      function valve(x, y, z){
        const g = grp(root, x, y, z);
        add(g, cylX(0.11, 0.24, 24), std(0xc94a3a, 0.45, 0.3));
        add(g, cylY(0.02, 0.02, 0.18, 10), MAT.steel, 0, 0.14, 0);
        const hw = add(g, new THREE.TorusGeometry(0.09, 0.015, 8, 24), MAT.dark, 0, 0.24, 0); hw.rotation.x = Math.PI/2;
        return hw;
      }
      const pipeM = MAT.alu;
      const pipe = (a, b) => rod(root, 0.035, pipeM).userData.set(a, b);
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
      const FY = B + H - 0.15;
      pipe(V3(-R - 0.9, FY, 0), V3(-R - 0.2, FY, 0)); pipe(V3(-R - 0.2, FY, 0), V3(-R*0.3, B + H + 0.15, 0));
      pipe(V3(-R - 0.9, FY, 0), V3(-R - 0.9, TOP + 0.1, 0));
      const fillW = valve(-R - 0.55, FY, 0);
      pipe(V3(R*0.5, B - 0.05, 0.25), V3(R*0.5, B - 0.25, 0.25)); pipe(V3(R*0.5, B - 0.25, 0.25), V3(R + 0.95, B - 0.25, 0.25));
      const disW = valve(R + 0.6, B - 0.25, 0.25);
      // flow particles: from the spout to the surface, and out the discharge
      const NIN = mobile ? 30 : 60, NOUT = mobile ? 24 : 48;
      const inflow = swarm(root, NIN, 0x7fe3f5, 0.05, 0.8, (a, i) => { a[i*3+1] = -10; });
      const outflow = swarm(root, NOUT, 0x7fe3f5, 0.05, 0.8, (a, i) => { a[i*3+1] = -10; });
      const phI = new Float32Array(NIN).map((_, i) => R01(i)), phO = new Float32Array(NOUT).map((_, i) => R01(i + 99));
      // operator station: the two potentiometers
      const ops = grp(root, -1.35, TOP, 1.35); ops.rotation.y = 0.6;
      add(ops, rbox(0.5, 0.9, 0.12, 0.02), std(0x2b2f36, 0.55, 0.3), 0, 0.45, 0);
      const knob = y => { const k = add(ops, cylZ(0.07, 0.06, 24), MAT.dark, 0, y, 0.08); add(k, rbox(0.012, 0.06, 0.012, 0.004), MAT.amberG, 0, 0.03, 0.035, false); return k; };
      const pot1 = knob(0.65), pot2 = knob(0.35);
      const d1 = holo(root, 1.6, 0.9, -1.75, 2.9, -0.6), d2 = holo(root, 1.6, 0.9, -1.75, 1.95, -0.6);
      function FC_Scaling(input, iMin, iMax, oMin, oMax){
        const err = input < iMin || input > iMax;
        const v = (input - iMin)/(iMax - iMin)*(oMax - oMin) + oMin;
        return {v:Math.min(Math.max(v, oMin), oMax), err};
      }
      const TO_INT = v => Math.round(v);
      let level = 0.6;
      function update(t, dt){
        dt = Math.min(dt, 0.05);
        const Pot1_Fill = 5 + Math.sin(t*0.21)*5;                 // 0 to 10
        const Pot2_Discharge = Math.sin(t*0.15 + 2.1)*5;          // -5 to +5, centre detent
        const Tank1_FillValve = Pot1_Fill;                         // network 1, MOVE
        const Tank1_DischargeValve = FC_Scaling(Pot2_Discharge, -5, 5, 0, 10).v;   // network 2
        level = Math.min(Math.max(level + (Tank1_FillValve*0.055 - Tank1_DischargeValve*0.052)*dt, 0), 10);
        const Display1_WaterLevel = TO_INT(FC_Scaling(level, 0, 10, 0, 300).v);    // network 3
        const Display2_FlowRate = TO_INT(FC_Scaling(Math.min(Tank1_FillValve, 10), 0, 10, 0, 30).v);   // network 4
        const h = Math.max(level/10*H, 0.02);
        liq.scale.y = h; liq.position.y = B + h/2; surf.position.y = B + h; flt.position.y = B + h;
        surf.rotation.z = t*0.2;
        fillW.rotation.z += dt*Tank1_FillValve*0.5; disW.rotation.z -= dt*Tank1_DischargeValve*0.5;
        pot1.rotation.z = -(Pot1_Fill/10 - 0.5)*4.2; pot2.rotation.z = -(Pot2_Discharge/10)*4.2;
        const inR = Tank1_FillValve/10, outR = Tank1_DischargeValve/10;
        for(let i=0;i<NIN;i++){
          phI[i] = (phI[i] + dt*(0.25 + inR*0.85)) % 1; const k = phI[i];
          inflow.a[i*3] = -R*0.3 + (i%5 - 2)*0.02; inflow.a[i*3+1] = inR > 0.04 ? B + H + 0.1 - k*(H + 0.1 - h) : -10; inflow.a[i*3+2] = (i%3 - 1)*0.02;
        }
        for(let i=0;i<NOUT;i++){
          phO[i] = (phO[i] + dt*(0.2 + outR*0.9)) % 1; const k = phO[i];
          outflow.a[i*3] = R + 0.95 + k*0.1; outflow.a[i*3+1] = outR > 0.04 && level > 0.05 ? B - 0.25 - k*k*(B - 0.25 - TOP) : -10; outflow.a[i*3+2] = 0.25 + (i%3 - 1)*0.02;
        }
        inflow.geo.attributes.position.needsUpdate = true; outflow.geo.attributes.position.needsUpdate = true;
        inflow.m.opacity = 0.2 + inR*0.6; outflow.m.opacity = 0.2 + outR*0.6;
        const big = (g, w, hh, title, val, range) => {
          holoFrame(g, w, hh, title);
          const P = HC();
          g.font = '700 110px "Space Grotesk", sans-serif'; g.fillStyle = P.val; g.fillText(String(val), 26, 200);
          g.font = '400 24px "IBM Plex Mono", monospace'; g.fillStyle = P.amb; g.fillText(range, 26, 250);
        };
        d1.draw(t, (g, w, hh) => big(g, w, hh, 'DISPLAY1_WATERLEVEL', Display1_WaterLevel, '0 TO 300'));
        d2.draw(t, (g, w, hh) => big(g, w, hh, 'DISPLAY2_FLOWRATE', Display2_FlowRate, '0 TO 30'));
      }
      return {update};
    }
  };
