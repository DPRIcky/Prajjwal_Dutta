  /*  MECANUM ROVER (ROSMASTER X3 class): chassis, deck, LiDAR puck and a
     camera, on four wheels with real 45 degree rollers. drive() takes the
     body-frame velocity and spins each wheel by mecanum inverse kinematics.  */
  function makeMecanum(parent, o){
    o = Object.assign({k:1.45, fan:2.4}, o||{});
    const g = grp(parent, 0, TOP, 0);
    const car = grp(g, 0, 0, 0); car.scale.setScalar(o.k);
    const WR = 0.15, WY = 0.15;
    add(car, rbox(0.86, 0.06, 0.5, 0.02), MAT.carbon, 0, WY + 0.04, 0);
    add(car, rbox(0.7, 0.12, 0.34, 0.03), MAT.dark, 0, WY + 0.13, 0);
    add(car, rbox(0.3, 0.08, 0.2, 0.02), MAT.amber, -0.12, WY + 0.23, 0);
    [[0.3, 0.18], [0.3, -0.18], [-0.3, 0.18], [-0.3, -0.18]].forEach(([x, z]) => add(car, cylY(0.012, 0.012, 0.16, 8), MAT.alu, x, WY + 0.27, z));
    add(car, rbox(0.8, 0.025, 0.46, 0.012), std(0x1b2a44, 0.3, 0.4, {transparent:true, opacity:0.85}), 0, WY + 0.36, 0);
    add(car, rbox(0.18, 0.012, 0.14, 0.004), MAT.cap, 0.12, WY + 0.38, 0);
    add(car, cylY(0.085, 0.09, 0.06, 32), MAT.dark, -0.12, WY + 0.4, 0);
    const lidar = grp(car, -0.12, WY + 0.46, 0);
    add(lidar, cylY(0.075, 0.075, 0.06, 32), MAT.carbon);
    add(lidar, cylY(0.077, 0.077, 0.012, 32), MAT.cyanG, 0, 0.005, 0, false);
    add(lidar, rbox(0.03, 0.03, 0.05, 0.008), MAT.glass, 0.065, 0.005, 0);
    add(car, rbox(0.06, 0.06, 0.24, 0.015), MAT.carbon, 0.37, WY + 0.4, 0);
    [-0.06, 0.06].forEach(z => add(car, cylX(0.018, 0.012, 16), MAT.glass, 0.4, WY + 0.4, z));
    add(car, new THREE.SphereGeometry(0.012, 8, 6), MAT.cyanG, 0.4, WY + 0.4, 0, false);
    let fan = null;
    if(o.fan){
      fan = new THREE.Mesh(new THREE.CircleGeometry(o.fan, 24, -0.18, 0.36),
        new THREE.MeshBasicMaterial({color:lin(0x4fd8e8), transparent:true, opacity:0.08, depthWrite:false, side:THREE.DoubleSide}));
      fan.rotation.x = -Math.PI/2; lidar.add(fan);
    }
    const roller = cylY(0.026, 0.026, 0.11, 10), Y = new THREE.Vector3(0, 1, 0);
    const wheels = [[0.3, 0.31, 1], [0.3, -0.31, -1], [-0.3, 0.31, -1], [-0.3, -0.31, 1]].map(([x, z, hand]) => {
      const w = grp(car, x, WY, z);
      add(w, cylZ(0.07, 0.1, 20), MAT.alu);
      [-0.045, 0.045].forEach(off => add(w, cylZ(WR - 0.02, 0.012, 28), MAT.dark, 0, 0, off));
      for(let k=0;k<10;k++){
        const a = k/10*Math.PI*2;
        const m = add(w, roller, MAT.rubber, Math.cos(a)*(WR - 0.028), Math.sin(a)*(WR - 0.028), 0);
        m.quaternion.setFromUnitVectors(Y, new THREE.Vector3(-Math.sin(a), Math.cos(a), hand).normalize());
      }
      return w;
    });
    // body-frame velocity (bx forward, bz left) plus yaw rate wz, through mecanum IK
    function drive(bx, bz, wz, dt){
      wheels.forEach((w, i) => {
        const sgn = (i === 0 || i === 3) ? 1 : -1, side = (i % 2 === 0) ? 1 : -1;
        w.rotation.z -= (bx + sgn*bz - side*wz*0.6) / (WR*o.k) * dt;
      });
    }
    return {g, car, lidar, fan, drive, wheels};
  }
