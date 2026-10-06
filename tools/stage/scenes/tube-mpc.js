// parts: car
  /*  TUBE MPC: a car laps a closed road with S-bends while a glass tube
     follows the nominal path around it. Disturbances push the car off
     the centre line, but the ancillary feedback keeps it inside the
     tube: the amber trail is where it actually went.  */
  const STAGE = {
    sky:[0x050a16, 0x0f2140], skyL:[0xc4ad84, 0xe6d6b4], hemi:0xa8c8ff,
    cam:{az:0.35, d:12.5, h:5.6, ly:0.6, fit:1.1},
    build(root){
      plinth(root, 4.4);
      const N = 240, Y = TOP + 0.012;
      const P = s => { const r = 3.05 + 0.42*Math.sin(3*s); return new THREE.Vector3(Math.cos(s)*r, 0, Math.sin(s)*r*0.78); };
      const pts = []; for(let i=0;i<N;i++) pts.push(P(i/N*Math.PI*2));
      const curve = new THREE.CatmullRomCurve3(pts, true);
      // road: an asphalt ribbon with kerbs and a dashed centre line (the nominal path)
      const RW = 0.62, rp = [], ri = [], kp = [];
      for(let i=0;i<=N;i++){
        const u = i/N, p = curve.getPointAt(u % 1), tg = curve.getTangentAt(u % 1);
        const nx = -tg.z, nz = tg.x;
        rp.push(p.x + nx*RW, Y, p.z + nz*RW, p.x - nx*RW, Y, p.z - nz*RW);
        if(i < N) ri.push(i*2, i*2+1, i*2+2, i*2+1, i*2+3, i*2+2);
      }
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setIndex(ri); rg.computeVertexNormals();
      const road = new THREE.Mesh(rg, std(0x1a1f29, 0.85, 0.1, {side:THREE.DoubleSide})); road.receiveShadow = renderer.shadowMap.enabled; root.add(road);
      const edge = (off, mat, r) => {
        const e = []; for(let i=0;i<N;i++){ const u = i/N, p = curve.getPointAt(u), tg = curve.getTangentAt(u); e.push(new THREE.Vector3(p.x - tg.z*off, Y + 0.02, p.z + tg.x*off)); }
        add(root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(e, true), N, r, 6, true), mat, 0, 0, 0, false);
      };
      edge(RW, MAT.shell, 0.025); edge(-RW, MAT.shell, 0.025);
      const dash = [];
      for(let i=0;i<60;i++){ if(i % 2) continue; const a = curve.getPointAt(i/60), b = curve.getPointAt((i + 0.7)/60);
        const m = rod(root, 0.012, MAT.cyanG, false); m.userData.set(a.clone().setY(Y + 0.01), b.clone().setY(Y + 0.01)); dash.push(m); }
      // the tube: the robust invariant set around the nominal path
      const TR = 0.4, TY = TOP + 0.24;
      const tubeCurve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x, TY, p.z)), true);
      const tubeM = new THREE.MeshStandardMaterial({color:lin(0x4fd8e8), roughness:0.08, metalness:0.1, transparent:true, opacity:0.13,
        depthWrite:false, side:THREE.DoubleSide, emissive:lin(0x0b3a44), emissiveIntensity:0.6});
      add(root, new THREE.TubeGeometry(tubeCurve, 320, TR, 28, true), tubeM, 0, 0, 0, false);
      const hoopM = glow(0x4fd8e8, 1.2);
      for(let i=0;i<36;i++){
        const u = i/36, p = tubeCurve.getPointAt(u), tg = tubeCurve.getTangentAt(u);
        const h = add(root, new THREE.TorusGeometry(TR, 0.008, 6, 40), hoopM, p.x, p.y, p.z, false);
        h.lookAt(p.x + tg.x, p.y + tg.y, p.z + tg.z);
      }
      GLOWS.push({m:hoopM, k:1.2});

      const car = makeCar(root, {body:0xf5a35c});
      // trail of where the car really went
      const NT = mobile ? 70 : 140;
      const trail = swarm(root, NT, 0xf5a35c, 0.07, 0.85, (a, i) => { a[i*3+1] = -10; });
      let head = 0, acc = 0;
      // live state readout
      const panel = holo(root, 2.1, 1.4, -0.4, 3.6, -2.6);
      let devNow = 0, devMax = 0;
      const p = new THREE.Vector3(), tg = new THREE.Vector3(), q = new THREE.Vector3();
      function update(t, dt){
        const u = (t*0.035) % 1;
        curve.getPointAt(u, p); curve.getTangentAt(u, tg);
        // bounded disturbance: the feedback law holds the error inside the tube
        const dev = Math.sin(t*1.7)*0.17 + Math.sin(t*0.6 + 1)*0.08 + Math.sin(t*3.1)*0.03;
        devNow = dev; devMax = Math.max(devMax*Math.pow(0.97, dt*60), Math.abs(dev));
        const nx = -tg.z, nz = tg.x;
        q.set(p.x + nx*dev, TOP, p.z + nz*dev);
        const dd = Math.cos(t*1.7)*1.7*0.17 + Math.cos(t*0.6 + 1)*0.6*0.08;
        car.place(q.x, q.z, Math.atan2(-tg.z, tg.x) - Math.atan(dd*0.9), dt, 0.035*curve.getLength());
        acc += dt;
        if(acc > 0.05){
          acc = 0;
          trail.a[head*3] = q.x; trail.a[head*3+1] = TOP + 0.05; trail.a[head*3+2] = q.z;
          head = (head + 1) % NT; trail.geo.attributes.position.needsUpdate = true;
        }
        tubeM.opacity = 0.12 + Math.sin(t*0.8)*0.02;
        panel.draw(t, (g, w, h) => {
          holoFrame(g, w, h, 'TUBE MPC  TRACKING');
          holoRow(g, 112, 'lateral error', sgn(devNow), 0.5 + devNow/(2*TR));
          holoRow(g, 170, 'peak, last few s', Math.abs(devMax).toFixed(2), devMax/TR);
          holoRow(g, 228, 'tube radius', TR.toFixed(2));
          holoRow(g, 286, 'state', Math.abs(devNow) < TR ? 'INSIDE TUBE' : 'OUTSIDE');
        });
      }
      return {update};
    }
  };
