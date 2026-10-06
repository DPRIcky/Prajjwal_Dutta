
  function dressRover(root, api){
    // warehouse racking around the yard
    const box = std(0xa9825a, 0.85, 0.0), upr = std(0x2c62a6, 0.45, 0.5), beam = std(0xe08a3c, 0.45, 0.4);
    [[-4.7, -1.4, 1.2], [-1.4, -4.9, 0.1], [2.6, -4.6, -0.5], [5.0, -1.2, -1.3]].forEach(([x, z, ry], k) => {
      const rk = new THREE.Group(); rk.position.set(x, 0, z); rk.rotation.y = ry; root.add(rk);
      [[-1.1, -0.35], [1.1, -0.35], [-1.1, 0.35], [1.1, 0.35]].forEach(([ux, uz]) => add(rk, new THREE.BoxGeometry(0.07, 2.4, 0.07), upr, ux, 1.2, uz));
      [0.55, 1.25, 1.95].forEach((y, l) => {
        [-0.35, 0.35].forEach(bz => add(rk, new THREE.BoxGeometry(2.27, 0.08, 0.05), beam, 0, y, bz));
        add(rk, new THREE.BoxGeometry(2.2, 0.03, 0.7), MAT.steel, 0, y + 0.03, 0);
        for(let b=0;b<3;b++){
          if(R01(k*9 + l*3 + b) < 0.25) continue;
          const sx = 0.45 + R01(b + l + k)*0.25, sy = 0.3 + R01(b*2 + l + k)*0.25;
          add(rk, new THREE.BoxGeometry(sx, sy, 0.5), box, -0.7 + b*0.7, y + 0.05 + sy/2, 0);
        }
      });
    });
    // a pallet waiting to be put away
    const pal = new THREE.Group(); pal.position.set(3.7, 0, 1.9); pal.rotation.y = 0.4; root.add(pal);
    add(pal, new THREE.BoxGeometry(1.0, 0.12, 0.8), std(0x6e5638, 0.9, 0), 0, 0.06, 0);
    [[-0.22, -0.18], [0.22, -0.18], [0, 0.2]].forEach(([x, z]) => add(pal, new THREE.BoxGeometry(0.42, 0.34, 0.36), box, x, 0.29, z));
    add(pal, new THREE.BoxGeometry(0.4, 0.3, 0.34), box, 0, 0.61, -0.1);
    // skylight shafts with dust turning in them
    const shafts = [[-1.8, -1.6], [1.6, 0.8], [0.2, -3.6]].map(([x, z]) => shaft(root, x, z, 0.7, 1.3, 9, 0xbfd6ff, 0.06));
    const dust = swarm(root, mobile ? 90 : 220, 0xe8f0ff, 0.05, 0.6,
      (a, i) => { a[i*3] = (R01(i)-0.5)*8; a[i*3+1] = R01(i+2)*5; a[i*3+2] = (R01(i+4)-0.5)*8; },
      (a, i, t, dt) => { a[i*3] += Math.sin(t*0.3 + i)*dt*0.08; a[i*3+1] += Math.cos(t*0.25 + i*0.7)*dt*0.05; a[i*3+2] += Math.sin(t*0.2 + i*1.3)*dt*0.06; });
    // LiDAR returns: a spark wherever the scan fan actually crosses a post
    const posts = [[2.5, 0.6], [-1.3, 2.35], [-2.2, -1.6]];
    const sparks = posts.map(() => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex, color:lin(0xff6a55), transparent:true, opacity:0,
        blending:THREE.AdditiveBlending, depthWrite:false}));
      sp.scale.setScalar(0.35); root.add(sp); return sp;
    });
    const lp = new THREE.Vector3(), q = new THREE.Quaternion(), rq = new THREE.Quaternion(), fwd = new THREE.Vector3(), tmp = new THREE.Vector3();
    return (t, dt) => {
      dust.update(t, dt);
      shafts.forEach((sh, i) => { sh.material.opacity = sh.userData.op*(0.75 + 0.25*Math.sin(t*0.5 + i*2)); });
      root.updateWorldMatrix(true, true);
      api.lidar.getWorldPosition(lp); root.worldToLocal(lp);
      api.lidar.getWorldQuaternion(q);
      root.getWorldQuaternion(rq).invert();
      fwd.set(1, 0, 0).applyQuaternion(q).applyQuaternion(rq); fwd.y = 0; fwd.normalize();
      posts.forEach(([x, z], i) => {
        tmp.set(x - lp.x, 0, z - lp.z);
        const d = tmp.length(); tmp.normalize();
        const hit = d < 3.4 && tmp.dot(fwd) > Math.cos(0.18);
        const sp = sparks[i];
        sp.material.opacity = hit ? 1 : sp.material.opacity*Math.pow(0.02, dt);
        if(hit) sp.position.set(x - tmp.x*0.08, lp.y, z - tmp.z*0.08);
      });
    };
  }