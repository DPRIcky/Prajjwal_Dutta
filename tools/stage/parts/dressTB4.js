
  function dressTB4(root, api){
    // signal ripples spreading from the robot
    const rings = [0, 1, 2].map(i => {
      const m = add(root, new THREE.RingGeometry(0.97, 1, 72), new THREE.MeshBasicMaterial({color:lin(0x4fd8e8), transparent:true, opacity:0,
        blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}), 0, TOP + 0.01, 0, false);
      m.rotation.x = -Math.PI/2; m.userData.ph = i/3; return m;
    });
    // fireflies
    const ff = swarm(root, mobile ? 30 : 70, 0xffc773, 0.09, 0.85,
      (a, i) => { a[i*3] = (R01(i)-0.5)*7; a[i*3+1] = 0.5 + R01(i+1)*2.4; a[i*3+2] = (R01(i+2)-0.5)*7; },
      (a, i, t, dt) => { a[i*3] += Math.sin(t*0.7 + i*1.9)*dt*0.25; a[i*3+1] += Math.cos(t*0.9 + i)*dt*0.12; a[i*3+2] += Math.cos(t*0.6 + i*2.3)*dt*0.25; });
    // potted plants
    const leafM = std(0x3f8f5a, 0.6, 0.05), potM = std(0x2a2f38, 0.6, 0.2);
    [[2.25, -1.1, 1.0], [-2.35, 0.5, 0.8], [-1.6, -1.9, 0.6]].forEach(([x, z, sc], k) => {
      const pg = new THREE.Group(); pg.position.set(x, TOP, z); pg.scale.setScalar(sc); root.add(pg);
      add(pg, cylY(0.2, 0.15, 0.36, 24), potM, 0, 0.18, 0);
      for(let l=0;l<9;l++){
        const lf = add(pg, new THREE.SphereGeometry(0.16, 14, 8), leafM, 0, 0.5 + R01(k*9+l)*0.35, 0);
        const a = l/9*Math.PI*2;
        lf.position.x = Math.cos(a)*0.16; lf.position.z = Math.sin(a)*0.16; lf.scale.set(0.45, 1.3, 0.25); lf.rotation.set(Math.sin(a)*0.5, -a, Math.cos(a)*0.5);
      }
    });
    return (t, dt) => {
      ff.update(t, dt);
      const b = api.bot.position;
      rings.forEach(r => {
        const ph = (t*0.35 + r.userData.ph) % 1;
        r.position.set(b.x, TOP + 0.01, b.z); r.scale.setScalar(0.4 + ph*2.6);
        r.material.opacity = (1 - ph)*0.45;
      });
      ff.m.opacity = 0.6 + Math.sin(t*2.3)*0.25;
    };
  }