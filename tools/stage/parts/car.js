  /*  CAR: a small sedan, nose along local +x. place() sets its pose on
     the deck, spins the wheels by the distance covered and steers the
     front pair toward the yaw rate.  */
  function makeCar(parent, o){
    o = Object.assign({body:0xf5a35c, k:1}, o||{});
    const g = grp(parent, 0, 0, 0);
    const c = grp(g, 0, 0, 0); c.scale.setScalar(o.k);
    const paint = std(o.body, 0.32, 0.35);
    const WR = 0.075, WY = WR;
    add(c, rbox(0.72, 0.13, 0.32, 0.05), paint, 0, WY + 0.07, 0);
    add(c, rbox(0.36, 0.11, 0.27, 0.05), MAT.glass, -0.04, WY + 0.17, 0);
    add(c, rbox(0.3, 0.012, 0.25, 0.005), paint, -0.04, WY + 0.226, 0);
    add(c, rbox(0.74, 0.04, 0.3, 0.015), MAT.carbon, 0, WY + 0.01, 0);
    [-0.1, 0.1].forEach(z => {
      add(c, rbox(0.012, 0.03, 0.06, 0.006), MAT.cyanG, 0.36, WY + 0.08, z, false);
      add(c, rbox(0.012, 0.025, 0.07, 0.006), MAT.redG, -0.36, WY + 0.09, z, false);
    });
    const wheels = [[0.23, 1], [0.23, -1], [-0.23, 1], [-0.23, -1]].map(([x, s]) => {
      const steer = grp(c, x, WY, s*0.16);
      const w = grp(steer, 0, 0, 0);
      add(w, cylZ(WR, 0.06, 24), MAT.rubber);
      add(w, cylZ(WR*0.6, 0.064, 16), MAT.alu);
      add(w, rbox(WR*1.1, 0.012, 0.066, 0.004), MAT.steel);
      return {steer, w, front:x > 0};
    });
    let lastYaw = null, roll = 0;
    function place(x, z, yaw, dt, speed){
      g.position.set(x, TOP, z);
      g.rotation.y = yaw;
      const dist = speed*dt;
      const yr = lastYaw === null || dt <= 0 ? 0 : angLerp(0, yaw - lastYaw, 1)/dt;
      lastYaw = yaw;
      roll += (Math.max(-0.08, Math.min(0.08, -yr*0.05)) - roll)*damp(0.1, dt);
      c.rotation.x = roll;
      wheels.forEach(w => {
        w.w.rotation.z -= dist/(WR*o.k);
        if(w.front) w.steer.rotation.y = Math.max(-0.5, Math.min(0.5, yr*0.5));
      });
    }
    return {g, place};
  }
