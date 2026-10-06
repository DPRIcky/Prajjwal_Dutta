  /*  DIFF-DRIVE ROBOT: a generic two-wheeled base with a caster, a LiDAR
     and a depth camera. Nose is +x. place() sets the pose and turns each
     wheel by its own arc length, so pivots spin the wheels in opposition.  */
  function makeDiffbot(parent, o){
    o = Object.assign({k:1, body:0xe2e7ee}, o||{});
    const g = grp(parent, 0, TOP, 0);
    const b = grp(g, 0, 0, 0); b.scale.setScalar(o.k);
    const WR = 0.09, TW = 0.36;
    add(b, rbox(0.5, 0.12, 0.36, 0.05), std(o.body, 0.35, 0.1), 0, WR + 0.04, 0);
    add(b, rbox(0.46, 0.02, 0.32, 0.01), MAT.carbon, 0, WR + 0.11, 0);
    add(b, rbox(0.12, 0.012, 0.2, 0.005), MAT.cyanG, -0.12, WR + 0.105, 0, false);
    add(b, new THREE.SphereGeometry(0.035, 12, 8), MAT.steel, -0.2, 0.035, 0);
    const lidar = grp(b, 0.04, WR + 0.16, 0);
    add(lidar, cylY(0.06, 0.06, 0.06, 24), MAT.carbon);
    add(lidar, cylY(0.062, 0.062, 0.01, 24), MAT.cyanG, 0, 0.005, 0, false);
    add(b, rbox(0.05, 0.05, 0.18, 0.012), MAT.carbon, 0.24, WR + 0.12, 0);
    [-0.05, 0.05].forEach(z => add(b, cylX(0.014, 0.01, 12), MAT.glass, 0.27, WR + 0.12, z));
    const camPt = new THREE.Object3D(); camPt.position.set(0.27, WR + 0.12, 0); b.add(camPt);
    const wheels = [-1, 1].map(s => {
      const w = grp(b, 0, WR, s*TW/2);
      add(w, cylZ(WR, 0.04, 24), MAT.rubber); add(w, cylZ(WR*0.55, 0.044, 16), MAT.alu);
      add(w, rbox(WR*1.1, 0.01, 0.046, 0.004), MAT.steel);
      return w;
    });
    let lx = null, lz = 0, lyaw = 0;
    function place(x, z, yaw){
      g.position.set(x, TOP, z); g.rotation.y = yaw;
      if(lx !== null){
        const fwd = (x - lx)*Math.cos(yaw) - (z - lz)*Math.sin(yaw), dyaw = angLerp(0, yaw - lyaw, 1);
        wheels.forEach((w, i) => { const s = i ? 1 : -1; w.rotation.z -= (fwd - s*dyaw*TW/2*o.k)/(WR*o.k); });
      }
      lx = x; lz = z; lyaw = yaw;
    }
    return {g, lidar, camPt, place};
  }
  /*  CAVE: the 16 x 16 m world of the RAS 598 projects, scaled onto the
     deck. Obstacle cells become rock walls with rubble at their feet.  */
  function caveRock(parent, x, z, w, d, h, seed){
    const rockM = std(0x3a3f47, 0.92, 0.05);
    const m = add(parent, rbox(w, h, d, Math.min(w, d)*0.25), rockM, x, TOP + h/2, z);
    for(let i=0;i<Math.max(2, Math.round((w + d)*3));i++){
      const r = 0.05 + R01(seed*13 + i)*0.08, a = R01(seed*7 + i*3);
      const px = x + (a < 0.5 ? (R01(i + seed) - 0.5)*w : (a < 0.75 ? -1 : 1)*(w/2 + r*0.6));
      const pz = z + (a >= 0.5 ? (R01(i*2 + seed) - 0.5)*d : (a < 0.25 ? -1 : 1)*(d/2 + r*0.6));
      const rb = add(parent, new THREE.DodecahedronGeometry(r, 0), rockM, px, TOP + r*0.5, pz); rb.rotation.set(i, i*0.7, seed);
    }
    return m;
  }
