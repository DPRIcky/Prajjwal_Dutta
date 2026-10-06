  /*  QUADROTOR model + flight: banks into its acceleration, so any path
     it is handed reads as flown rather than slid.  */
  function makeQuad(parent, o){
    o = Object.assign({k:1.25, shell:MAT.shell, frame:MAT.carbon}, o||{});
    const d = new THREE.Group(); parent.add(d);
    const body = new THREE.Group(); d.add(body);
    body.scale.setScalar(o.k);
    add(body, rbox(0.62, 0.15, 0.42, 0.06), o.frame);
    add(body, rbox(0.46, 0.1, 0.32, 0.05), o.shell, -0.02, 0.1, 0);
    add(body, rbox(0.03, 0.02, 0.22, 0.008), MAT.cyanG, 0.31, 0.02, 0, false);
    add(body, rbox(0.24, 0.07, 0.2, 0.02), MAT.amber, -0.1, -0.1, 0);       // battery
    const gimbal = add(body, new THREE.SphereGeometry(0.075, 24, 16), MAT.dark, 0.26, -0.1, 0);
    add(body, cylX(0.035, 0.04, 20), MAT.glass, 0.33, -0.1, 0);
    const props = [];
    const blur = new THREE.MeshBasicMaterial({color:0xcfe6ff, transparent:true, opacity:0.07, depthWrite:false, side:THREE.DoubleSide});
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([sx, sz], i) => {
      const L = 0.8, mx = sx*L*0.7071, mz = sz*L*0.7071;
      const a = add(body, cylX(0.03, L, 12), o.frame, mx/2, 0, mz/2);
      a.rotation.y = -Math.atan2(sz, sx);
      add(body, cylY(0.07, 0.08, 0.11, 28), MAT.alu, mx, 0.05, mz);
      add(body, cylY(0.025, 0.025, 0.05, 12), MAT.steel, mx, 0.125, mz);
      add(body, new THREE.SphereGeometry(0.025, 12, 8), sx > 0 ? MAT.cyanG : MAT.amberG, mx, -0.02, mz, false);
      add(body, cylY(0.012, 0.012, 0.2, 8), o.frame, mx*0.82, -0.1, mz*0.82);
      const p = new THREE.Group(); p.position.set(mx, 0.155, mz); body.add(p);
      const bl = add(p, rbox(0.6, 0.012, 0.055, 0.005), MAT.dark); bl.rotation.x = 0.12;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.31, 40), blur);
      disc.rotation.x = -Math.PI/2; p.add(disc);
      p.userData.dir = (i === 0 || i === 3) ? 1 : -1;
      props.push(p);
    });
    return {d, body, props, gimbal, px:0, pz:0, vx:0, vz:0, ax:0, az:0, init:false};
  }
  /* Velocity and acceleration are finite differences, which turn any
     unevenness in frame time into noise; both are low-passed, and the
     tilt itself is eased, so the body banks smoothly instead of twitching. */
  function flyQuad(q, x, y, z, yaw, dt, spin){
    if(!q.init || dt <= 0){ q.px = x; q.pz = z; q.init = true; }
    const h = Math.max(dt, 1/240);
    const kf = damp(0.08, h);
    const rvx = (x - q.px)/h, rvz = (z - q.pz)/h;
    const nvx = q.vx + (rvx - q.vx)*kf, nvz = q.vz + (rvz - q.vz)*kf;
    q.ax += ((nvx - q.vx)/h - q.ax)*kf;
    q.az += ((nvz - q.vz)/h - q.az)*kf;
    const ax = q.ax, az = q.az;
    q.px = x; q.pz = z; q.vx = nvx; q.vz = nvz;
    q.d.position.set(x, y, z);
    q.d.rotation.y = yaw;
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    const fx = c*(ax*0.12 + nvx*0.08) - sn*(az*0.12 + nvz*0.08), fz = sn*(ax*0.12 + nvx*0.08) + c*(az*0.12 + nvz*0.08);
    const kt = damp(0.06, h);
    q.body.rotation.z += (-Math.max(-0.3, Math.min(0.3, fx)) - q.body.rotation.z)*kt;
    q.body.rotation.x += ( Math.max(-0.3, Math.min(0.3, fz)) - q.body.rotation.x)*kt;
    const sp = spin === undefined ? 0.9 : spin;
    q.props.forEach(p => { p.rotation.y += p.userData.dir * sp; });
    q.gimbal.rotation.y = -yaw*0.5;
  }
