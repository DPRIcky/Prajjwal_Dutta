// parts:
  /*  SAC BALL ON PLATE: a steel ball rolls on a plate tilted by a two
     joint gimbal (J1 rolls, J2 pitches). The policy is PD-shaped in the
     mean, but every action is sampled from a Gaussian around it, the way
     a soft actor-critic policy acts, so each attempt from a near-identical
     start takes its own route to the centre. The live path is amber;
     earlier attempts stay as faint ghosts; the cloud above the plate is the
     action distribution being sampled.  */
  const STAGE = {
    sky:[0x050a16, 0x0f2140], skyL:[0xc4ad84, 0xe6d6b4], hemi:0xa8c8ff,
    cam:{az:0.45, d:8.6, h:4.6, ly:1.4},
    build(root){
      plinth(root, 2.6);
      const K = 0.52, R = 2.3, PY = TOP + 1.25;   // sim units scaled onto the stage
      // base, column and the two-axis gimbal yoke
      add(root, cylY(0.45, 0.55, 0.16, 40), MAT.dark, 0, TOP + 0.08, 0);
      add(root, cylY(0.09, 0.11, PY - TOP - 0.45, 20), MAT.steel, 0, (PY + TOP - 0.45)/2 + 0.08, 0);
      const fork = grp(root, 0, PY - 0.42, 0);
      add(fork, rbox(1.75, 0.08, 0.12, 0.03), MAT.dark, 0, 0, 0);
      [-1, 1].forEach(s => add(fork, rbox(0.1, 0.42, 0.12, 0.03), MAT.dark, s*0.86, 0.21, 0));
      [-1, 1].forEach(s => { add(fork, cylX(0.11, 0.16, 24), MAT.cap, s*0.98, 0.42, 0); add(fork, cylX(0.06, 0.04, 16), MAT.amberG, s*1.08, 0.42, 0, false); });
      const j1 = grp(root, 0, PY, 0);                        // roll about x
      add(j1, new THREE.TorusGeometry(0.88, 0.04, 12, 64), MAT.alu).rotation.x = Math.PI/2;
      [-1, 1].forEach(s => add(j1, cylX(0.04, 0.2, 12), MAT.steel, s*0.88, 0, 0));
      [-1, 1].forEach(s => { add(j1, cylZ(0.09, 0.14, 24), MAT.cap, 0, 0, s*0.95); });
      const j2 = grp(j1, 0, 0, 0);                           // pitch about z
      const P = R*K;
      add(j2, rbox(P*2, 0.06, P*2, 0.03), std(0xe2e7ee, 0.25, 0.1), 0, 0.08, 0);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([x, z]) => add(j2, rbox(x ? 0.04 : P*2, 0.07, z ? 0.04 : P*2, 0.015), MAT.dark, x*P, 0.14, z*P));
      const bull = add(j2, new THREE.RingGeometry(0.15, 0.17, 48), MAT.amberG, 0, 0.112, 0, false); bull.rotation.x = -Math.PI/2;
      const bull2 = add(j2, new THREE.CircleGeometry(0.03, 20), MAT.amberG, 0, 0.112, 0, false); bull2.rotation.x = -Math.PI/2;
      const BR = 0.1;
      const ball = add(j2, new THREE.SphereGeometry(BR, 32, 24), std(0xd5dbe3, 0.12, 1.0), 0, 0.11 + BR, 0);
      // trails in plate coordinates: live (amber) and ghosts of earlier attempts (cyan)
      const TN = mobile ? 90 : 170, GH = 3;
      const live = swarm(j2, TN, 0xf5a35c, 0.04, 0.9, (a, i) => { a[i*3+1] = -10; });
      const ghosts = []; for(let i=0;i<GH;i++) ghosts.push(swarm(j2, TN, 0x4fd8e8, 0.03, 0.35, (a, k) => { a[k*3+1] = -10; }));
      let head = 0, slot = 0, ep = 1;
      const NS = mobile ? 26 : 44;
      const cloud = swarm(root, NS, 0x4fd8e8, 0.06, 0.6, (a, i) => { a[i*3+1] = -10; });
      const panel = holo(root, 2.0, 1.3, -1.3, 3.5, -1.5);
      let bx = 0.9, by = -0.6, vx = 0, vy = 0, roll = 0, pitch = 0, settle = 0, acc = 0;
      const GP = 0.85, GD = 0.62, SIG = 0.10;
      const randn = () => { let u = 0, v = 0; while(!u) u = Math.random(); while(!v) v = Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(6.2832*v); };
      function reset(){
        // keep the finished path as a ghost, then start again from a near-identical state
        const g = ghosts[slot % GH]; slot++; ep++;
        g.a.set(live.a); g.geo.attributes.position.needsUpdate = true;
        for(let i=0;i<TN;i++) live.a[i*3+1] = -10;
        bx = 0.75 + Math.random()*0.5; by = -0.45 - Math.random()*0.5; vx = vy = 0; settle = 0;
      }
      function update(t, dt){
        dt = Math.min(dt, 0.04);
        const mRoll = GP*by + GD*vy, mPitch = -(GP*bx + GD*vx);
        const aRoll = mRoll + randn()*SIG, aPitch = mPitch + randn()*SIG;
        roll  += (Math.max(-0.42, Math.min(0.42, aRoll )) - roll )*Math.min(1, dt*3);
        pitch += (Math.max(-0.42, Math.min(0.42, aPitch)) - pitch)*Math.min(1, dt*3);
        j1.rotation.x = roll; j2.rotation.z = pitch;
        const g = 9.81*(5/7);
        vx += g*Math.sin(pitch)*dt*0.22; vy += -g*Math.sin(roll)*dt*0.22;
        vx *= 0.995; vy *= 0.995; bx += vx*dt; by += vy*dt;
        const lim = R - 0.24;
        if(bx > lim){ bx = lim; vx *= -0.45; } if(bx < -lim){ bx = -lim; vx *= -0.45; }
        if(by > lim){ by = lim; vy *= -0.45; } if(by < -lim){ by = -lim; vy *= -0.45; }
        ball.position.set(bx*K, 0.11 + BR, by*K);
        ball.rotation.z -= vx*K*dt/BR; ball.rotation.x += vy*K*dt/BR;
        acc += dt;
        if(acc > 0.03){ acc = 0; live.a[head*3] = bx*K; live.a[head*3+1] = 0.12; live.a[head*3+2] = by*K; head = (head + 1) % TN; live.geo.attributes.position.needsUpdate = true; }
        for(let i=0;i<NS;i++){
          cloud.a[i*3] = (mPitch + randn()*SIG)*1.8; cloud.a[i*3+1] = PY + 1.45 + Math.sin(t*1.5 + i)*0.04; cloud.a[i*3+2] = (mRoll + randn()*SIG)*1.8;
        }
        cloud.geo.attributes.position.needsUpdate = true;
        const near = Math.hypot(bx, by) < 0.34 && Math.hypot(vx, vy) < 0.25;
        settle = near ? settle + dt : 0;
        if(settle > 1.6) reset();
        panel.draw(t, (gx, w, h) => {
          holoFrame(gx, w, h, 'SAC POLICY  EPISODE ' + ep);
          holoRow(gx, 112, 'J1 roll', deg(roll), 0.5 + roll/0.84);
          holoRow(gx, 170, 'J2 pitch', deg(pitch), 0.5 + pitch/0.84);
          holoRow(gx, 228, 'distance to centre', Math.hypot(bx, by).toFixed(2), Math.hypot(bx, by)/2.5);
          holoRow(gx, 286, 'action noise', 'GAUSSIAN SAMPLE');
        });
      }
      return {update};
    }
  };
