// parts: diffbot
  /*  HISTOGRAM FILTER in the cave: the robot tours the 16 x 16 m cave
     on Turn-Go-Turn legs while the belief is drawn as what it is, a
     histogram: a bar per cell, its height the probability mass there.
     Driving blind, odometry noise stretches the belief along the heading
     and it flattens out; when a fiducial landmark comes into range the
     range ring is drawn around it and the belief collapses back to a
     sharp peak on the robot. The amber ring is the estimate.  */
  const STAGE = {
    sky:[0x050912, 0x10203a], skyL:[0xbfa883, 0xe1d0ae], hemi:0xa8c8ff,
    cam:{az:0.35, d:12.0, h:7.6, ly:0.4, fit:1.05},
    build(root){
      plinth(root, 4.8);
      const K = 0.4, W = (x, z) => new THREE.Vector3(x*K, TOP, z*K);
      add(root, rbox(16*K + 0.1, 0.02, 16*K + 0.1, 0.03), std(0x262a31, 0.9, 0.05), 0, TOP + 0.01, 0);
      // cave walls around the edge, a few interior rocks
      [[0, -8.3, 16.6, 0.5], [0, 8.3, 16.6, 0.5], [-8.3, 0, 0.5, 16], [8.3, 0, 0.5, 16], [-2.5, -1.5, 2.2, 1.0], [2.8, 1.8, 1.0, 2.0]]
        .forEach(([x, z, w, d], n) => caveRock(root, x*K, z*K, w*K, d*K, n < 4 ? 0.22 : 0.3, n));
      const LM = [{x:-5.5, z:3.0}, {x:1.5, z:5.2}, {x:5.8, z:0.4}, {x:3.2, z:-4.6}, {x:-3.0, z:-5.4}];
      const lmGlow = LM.map(l => {
        const p = W(l.x, l.z);
        add(root, cylY(0.05, 0.06, 0.5, 16), std(0xc94a3a, 0.5, 0.2), p.x, TOP + 0.25, p.z);
        const m = glow(0xe5534b, 0.6); add(root, new THREE.SphereGeometry(0.06, 16, 12), m, p.x, TOP + 0.54, p.z, false);
        return m;
      });
      const PATH = [[-7,-7],[-6.2,1.5],[-1.0,4.6],[4.4,3.4],[6.4,-2.2],[0.6,-6.0]].map(([x, z]) => W(x, z));
      PATH.forEach((p, i) => { const q = PATH[(i+1) % PATH.length], n = Math.round(p.distanceTo(q)/0.16);
        for(let s=0;s<n;s+=2){ const r = rod(root, 0.008, std(0x63d97a, 0.5, 0.1), false); r.userData.set(p.clone().lerp(q, s/n).setY(TOP + 0.025), p.clone().lerp(q, (s+1)/n).setY(TOP + 0.025)); } });
      // the histogram: instanced bars over a window of cells around the estimate
      const NB = mobile ? 15 : 21, CELL = 0.6*K, NBARS = NB*NB;
      const barM = std(0x4fd8e8, 0.35, 0.2, {emissive:lin(0x1c8fa0), emissiveIntensity:0.7, transparent:true, opacity:0.85});
      const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL*0.82, 1, CELL*0.82), barM, NBARS);
      bars.frustumCulled = false; root.add(bars);
      const dm = new THREE.Object3D(), cA = lin(0x2a6bb0), cB = lin(0x4fd8e8), cC = lin(0xf5a35c), cc = new THREE.Color();
      for(let i=0;i<NBARS;i++) bars.setColorAt(i, cA);
      const est = add(root, new THREE.TorusGeometry(0.16, 0.018, 8, 40), MAT.amberG, 0, TOP + 0.03, 0, false); est.rotation.x = Math.PI/2;
      const ringM = new THREE.MeshBasicMaterial({color:lin(0xe5534b), transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide});
      const ring = add(root, new THREE.RingGeometry(0.985, 1, 96), ringM, 0, TOP + 0.03, 0, false); ring.rotation.x = -Math.PI/2;
      PARTS.push({m:ringM, c:ringM.color.clone()});
      const bot = makeDiffbot(root, {k:0.6});
      const panel = holo(root, 2.1, 1.4, -2.6, 3.9, -2.6);
      const DRIFT = 5.0, OBSERVE = 2.6, CYCLE = DRIFT + OBSERVE;
      const pos = PATH[0].clone(), estP = PATH[0].clone();
      let leg = 0, yaw = 0, sub = 'TURN', lmIdx = 0, sA = 0.3, sC = 0.2, mode = 'PREDICT';
      function update(t, dt){
        dt = Math.min(dt, 0.05);
        // Turn-Go-Turn around the tour
        const tgt = PATH[(leg + 1) % PATH.length], want = Math.atan2(-(tgt.z - pos.z), tgt.x - pos.x), d = Math.hypot(tgt.x - pos.x, tgt.z - pos.z);
        if(sub === 'TURN'){ const e = angLerp(0, want - yaw, 1), st = Math.sign(e)*Math.min(Math.abs(e), 1.6*dt); yaw += st; if(Math.abs(e) < 0.01){ yaw = want; sub = 'GO'; } }
        else { const st = Math.min(d, 0.45*dt); pos.x += Math.cos(yaw)*st; pos.z -= Math.sin(yaw)*st; if(d < 0.005){ leg = (leg + 1) % PATH.length; sub = 'TURN'; } }
        bot.place(pos.x, pos.z, yaw); bot.lidar.rotation.y = t*6;
        // the cycle: blind drift spreads the belief, an observation collapses it
        const ct = t % CYCLE, observing = ct > DRIFT, k = observing ? (ct - DRIFT)/OBSERVE : 0;
        if(!observing){ sA = 0.12 + (ct/DRIFT)*0.75; sC = 0.1 + (ct/DRIFT)*0.32; mode = 'PREDICT  ODOMETRY'; }
        else { sA = sA + (0.1 - sA)*damp(0.08, dt); sC = sC + (0.08 - sC)*damp(0.08, dt); mode = 'UPDATE  LANDMARK ' + (lmIdx + 1); }
        if(ct < dt){
          let best = 1e9; LM.forEach((l, i) => { const dd = Math.hypot(l.x*K - pos.x, l.z*K - pos.z); if(dd < best){ best = dd; lmIdx = i; } });
        }
        // estimate lags while blind and is pulled onto the truth by the observation
        const lag = observing ? damp(0.12, dt) : damp(0.012, dt);
        estP.lerp(pos, lag);
        const bx = Math.round(estP.x/CELL), bz = Math.round(estP.z/CELL), c = Math.cos(yaw), s = Math.sin(yaw);
        let i = 0, peak = 0;
        for(let a=0;a<NB;a++) for(let b=0;b<NB;b++){
          const x = (bx + a - (NB - 1)/2)*CELL, z = (bz + b - (NB - 1)/2)*CELL;
          const dx = x - estP.x, dz = z - estP.z, al = dx*c - dz*s, cr = dx*s + dz*c;
          const p = Math.exp(-0.5*(al*al/(sA*sA) + cr*cr/(sC*sC)))/(sA*sC);
          const hgt = Math.min(1.3, p*0.02);
          peak = Math.max(peak, hgt);
          // cells with almost no mass, or outside the cave, are not drawn
          const off = hgt < 0.012 || Math.abs(x) > 3.1 || Math.abs(z) > 3.1;
          dm.position.set(x, TOP + 0.02 + Math.max(hgt, 0.001)/2, z);
          dm.scale.set(off ? 0 : 1, off ? 0 : hgt, off ? 0 : 1); dm.updateMatrix();
          bars.setMatrixAt(i, dm.matrix);
          const q = Math.min(1, hgt/0.6);
          cc.copy(cA).lerp(cB, Math.min(1, q*1.6)); if(q > 0.75) cc.lerp(cC, (q - 0.75)*4);
          bars.setColorAt(i, cc);
          i++;
        }
        bars.instanceMatrix.needsUpdate = true; bars.instanceColor.needsUpdate = true;
        est.position.set(estP.x, TOP + 0.03, estP.z);
        const L = LM[lmIdx], lp = W(L.x, L.z), rr = Math.hypot(lp.x - pos.x, lp.z - pos.z);
        ring.position.set(lp.x, TOP + 0.03, lp.z); ring.scale.setScalar(Math.max(rr, 0.05));
        ringM.opacity = observing ? Math.sin(k*Math.PI)*0.85 : 0;
        lmGlow.forEach((m, j) => { m.emissiveIntensity = j === lmIdx && observing ? 2.5 : 0.6; });
        panel.draw(t, (g, w, h) => {
          holoFrame(g, w, h, 'HISTOGRAM FILTER');
          holoRow(g, 112, 'step', mode);
          holoRow(g, 170, 'grid', '80 x 80 x 72');
          holoRow(g, 228, 'spread along heading', (sA/K).toFixed(2) + ' m', sA/0.9);
          holoRow(g, 286, 'drive', 'TURN GO TURN  ' + sub);
        });
      }
      return {update};
    }
  };
