// parts: buildBatRig
  /*  FOLDABLE BAT WING on the bench: one central servo drives both wings
     through a counter-rotating gear pair, on the project's sinusoidal
     gait (1.15 Hz, 0.62 rad). Each wing is a humerus, a folding elbow and
     three finger spars with a laminated membrane; the span folds in on the
     upstroke and opens on the downstroke. It is clamped to a test stand,
     the way the prototype was tested, with its wingtip path traced.  */
  const STAGE = {
    sky:[0x0a0705, 0x2a1b0f], skyL:[0xc9ab7c, 0xe8d5b0], hemi:0xffcf9a,
    cam:{az:0.15, d:9.0, h:5.4, ly:1.6},
    build(root){
      plinth(root, 2.8);
      const H = 1.75;
      // test stand: weighted foot, column, clamp
      add(root, rbox(0.9, 0.08, 0.7, 0.03), MAT.dark, 0, TOP + 0.04, 0);
      add(root, cylY(0.05, 0.06, H - TOP - 0.2, 16), MAT.steel, 0, (H + TOP - 0.2)/2, 0);
      add(root, rbox(0.22, 0.12, 0.3, 0.03), MAT.dark, 0, H - 0.17, 0);
      add(root, cylX(0.02, 0.5, 10), MAT.alu, 0, H - 0.17, 0.12);
      // bench supply with a live readout cable
      const psu = grp(root, 1.35, TOP, -1.15); psu.rotation.y = -0.5;
      add(psu, rbox(0.6, 0.32, 0.42, 0.04), std(0x2b2f36, 0.55, 0.3), 0, 0.16, 0);
      add(psu, rbox(0.3, 0.12, 0.02, 0.01), MAT.glass, -0.08, 0.2, 0.21);
      const led = glow(0x3fd17a, 1.8); add(psu, cylZ(0.022, 0.02, 12), led, 0.18, 0.2, 0.21, false);

      const bat = buildBatRig(root);
      bat.g.scale.setScalar(2.9);
      // wingtip trail: where the outer spar tips actually go
      const NT = mobile ? 70 : 140;
      const trails = [0, 1].map(() => swarm(root, NT, 0xf5a35c, 0.05, 0.85, (a, i) => { a[i*3+1] = -10; }));
      let head = 0, acc = 0;
      const tipW = new THREE.Vector3();
      const tips = [];
      bat.g.traverse(o => { if(o.type === 'Object3D' && o.parent && o.parent.type === 'Group' && Math.abs(o.position.x) > 2.85) tips.push(o); });
      const panel = holo(root, 2.0, 1.3, -1.7, 3.3, -1.3);
      function update(t, dt){
        bat.update(t);
        // clamp it to the stand: the rig's own loop flight is overridden
        const ph = t*1.15*Math.PI*2;
        bat.g.position.set(0, H + 0.04 + Math.sin(ph)*0.01, 0);
        bat.g.rotation.set(0, -0.6, 0);
        acc += dt;
        if(acc > 0.025 && tips.length){
          acc = 0;
          root.updateMatrixWorld(true);
          tips.forEach((tp, k) => {
            if(k > 1) return;
            tp.getWorldPosition(tipW); root.worldToLocal(tipW);
            trails[k].a[head*3] = tipW.x; trails[k].a[head*3+1] = tipW.y; trails[k].a[head*3+2] = tipW.z;
            trails[k].geo.attributes.position.needsUpdate = true;
          });
          head = (head + 1) % NT;
        }
        const flap = Math.sin(ph)*0.62, fold = (0.5 - 0.5*Math.cos(ph))*0.5;
        led.emissiveIntensity = 1.4 + Math.sin(ph)*0.6;
        panel.draw(t, (g, w, h) => {
          holoFrame(g, w, h, 'FLAPPING GAIT  BENCH');
          holoRow(g, 112, 'frequency', '1.15 Hz');
          holoRow(g, 170, 'stroke angle', sgn(flap) + ' rad', 0.5 + flap/1.24);
          holoRow(g, 228, 'stroke', Math.cos(ph) > 0 ? 'DOWNSTROKE' : 'UPSTROKE');
          holoRow(g, 286, 'span fold', Math.round(fold/0.5*100) + ' %', fold/0.5);
        });
      }
      return {update};
    }
  };
