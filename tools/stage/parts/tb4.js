  /*  TURTLEBOT 4: Create 3 base, four standoffs, the RPLIDAR, the top
     plate with the OAK-D camera bar and the status screen. Nose is +x.  */
  function makeTB4(parent, o){
    o = Object.assign({k:1.7}, o||{});
    const bot = grp(parent, 0, TOP, 0);
    const b = grp(bot, 0, 0, 0); b.scale.setScalar(o.k);
    const baseM = std(0x3b414b, 0.55, 0.25);
    add(b, cylY(0.5, 0.5, 0.15, 64), baseM, 0, 0.1, 0);
    add(b, new THREE.CylinderGeometry(0.508, 0.508, 0.09, 64, 1, false, -Math.PI*0.5, Math.PI), std(0x262b33, 0.6, 0.2), 0, 0.085, 0);
    const ringL = add(b, new THREE.TorusGeometry(0.12, 0.01, 8, 48), MAT.cyanG, 0, 0.176, 0, false);
    ringL.rotation.x = Math.PI/2;
    [[0.24, 0.24], [0.24, -0.24], [-0.24, 0.24], [-0.24, -0.24]].forEach(([x, z]) => add(b, cylY(0.014, 0.014, 0.5, 8), MAT.alu, x, 0.43, z));
    add(b, cylY(0.07, 0.07, 0.05, 28), MAT.dark, -0.05, 0.2, 0);
    const lidar = grp(b, -0.05, 0.25, 0);
    add(lidar, cylY(0.065, 0.065, 0.05, 28), MAT.carbon);
    add(lidar, rbox(0.025, 0.02, 0.04, 0.006), MAT.glass, 0.055, 0, 0);
    add(b, cylY(0.43, 0.43, 0.025, 64), std(0x15181e, 0.5, 0.3), 0, 0.69, 0);
    add(b, rbox(0.08, 0.06, 0.24, 0.015), MAT.carbon, 0.33, 0.74, 0);
    [-0.07, 0, 0.07].forEach(z => add(b, cylX(0.014, 0.01, 14), MAT.glass, 0.375, 0.745, z));
    const scr = add(b, rbox(0.16, 0.015, 0.11, 0.006), MAT.cyanG, 0.12, 0.71, 0, false);
    scr.rotation.z = 0.25;
    add(b, rbox(0.12, 0.012, 0.08, 0.005), MAT.cap, -0.18, 0.71, 0.12);
    const camPt = new THREE.Object3D(); camPt.position.set(0.38, 0.745, 0); b.add(camPt);
    return {bot, lidar, ring:ringL, camPt, R:0.5*o.k};
  }
