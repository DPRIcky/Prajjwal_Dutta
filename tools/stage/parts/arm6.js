  /*  SIX-AXIS ARM: base yaw, then a three-link planar IK in the arm's
     vertical plane (elbow-up branch), the wrist pitched so the tool
     holds a commanded angle from straight down, and a tool roll.
     Styles: 'ur' (white shell, blue caps), 'fanuc' (yellow castings),
     'cobot' (small white and black desktop arm).
     solve(x, y, z, pitch) takes the tool point in the arm's own frame
     (origin under the base, y up) and returns false when out of reach. */
  function makeArm6(parent, o){
    o = Object.assign({style:'ur', L1:1.6, L2:1.45, k:1, tool:'grip'}, o||{});
    const k = o.k, L1 = o.L1, L2 = o.L2;
    const fan = o.style === 'fanuc', cob = o.style === 'cobot';
    const shell = fan ? std(0xf2bf1d, 0.38, 0.12) : cob ? std(0xeef1f4, 0.3, 0.05) : MAT.shell;
    const cap   = fan ? MAT.dark : cob ? std(0x23272f, 0.45, 0.2) : MAT.cap;
    const link  = fan ? shell : cob ? shell : MAT.alu;
    const base = grp(parent, 0, 0, 0);
    add(base, cylY(0.4*k, 0.44*k, 0.1*k, 48), MAT.dark, 0, 0.05*k, 0);
    add(base, cylY(0.31*k, 0.31*k, 0.16*k, 48), fan ? shell : cap, 0, 0.18*k, 0);
    const j1 = grp(base, 0, 0.26*k, 0);
    if(fan){
      add(j1, rbox(0.62*k, 0.36*k, 0.5*k, 0.08*k), shell, 0.02*k, 0.18*k, 0);
    } else add(j1, cylY(0.25*k, 0.25*k, 0.3*k, 48), shell, 0, 0.15*k, 0);
    const j2 = grp(j1, 0, 0.44*k, 0);
    add(j2, cylZ(0.25*k, 0.5*k, 48), shell);
    add(j2, cylZ(0.256*k, 0.05*k, 48), cap, 0, 0,  0.27*k);
    add(j2, cylZ(0.256*k, 0.05*k, 48), cap, 0, 0, -0.27*k);
    if(fan || cob) add(j2, rbox(L1, 0.3*k, 0.3*k, 0.09*k), link, L1/2, 0, 0);
    else {
      add(j2, cylX(0.13*k, L1, 36), link, L1/2, 0, 0);
      add(j2, cylX(0.16*k, 0.2*k, 36), shell, 0.34*k, 0, 0);
      add(j2, cylX(0.15*k, 0.2*k, 36), shell, L1-0.3*k, 0, 0);
    }
    if(fan) add(j2, rbox(0.5*k, 0.02*k, 0.06*k, 0.008*k), MAT.dark, L1*0.5, 0.155*k, 0);
    const j3 = grp(j2, L1, 0, 0);
    add(j3, cylZ(0.2*k, 0.42*k, 48), shell);
    add(j3, cylZ(0.206*k, 0.05*k, 48), cap, 0, 0, 0.235*k);
    if(fan || cob) add(j3, rbox(L2, 0.22*k, 0.22*k, 0.07*k), link, L2/2, 0, 0);
    else {
      add(j3, cylX(0.1*k, L2, 32), link, L2/2, 0, 0);
      add(j3, cylX(0.125*k, 0.18*k, 32), shell, L2-0.26*k, 0, 0);
    }
    const j4 = grp(j3, L2, 0, 0);
    add(j4, cylZ(0.14*k, 0.3*k, 40), shell);
    add(j4, cylZ(0.146*k, 0.04*k, 40), cap, 0, 0, 0.165*k);
    add(j4, cylX(0.12*k, 0.26*k, 40), shell, 0.17*k, 0, 0);
    add(j4, cylX(0.126*k, 0.04*k, 40), cap, 0.3*k, 0, 0);
    const j5 = grp(j4, 0.32*k, 0, 0);            // tool flange: local +x is the tool axis, rotation.x rolls it
    add(j5, cylX(0.085*k, 0.1*k, 32), MAT.steel, 0.05*k, 0, 0);
    // TOOL is measured from the wrist joint (j4) to the tool point; j5 itself sits 0.32 out
    let TOOL = 0.32*k, fingers = [];
    const tip = new THREE.Object3D(); j5.add(tip);
    if(o.tool === 'grip'){
      add(j5, rbox(0.14*k, 0.2*k, 0.5*k, 0.03*k), MAT.dark, 0.17*k, 0, 0);
      add(j5, rbox(0.02*k, 0.03*k, 0.14*k, 0.008*k), MAT.cyanG, 0.17*k, 0.101*k, 0, false);
      fingers = [-1, 1].map(s => { const f = add(j5, rbox(0.15*k, 0.06*k, 0.035*k, 0.012*k), MAT.steel, 0.32*k, 0, s*0.22*k); f.userData.s = s; return f; });
      TOOL = 0.64*k;
    } else if(o.tool === 'stylus'){
      add(j5, cylX(0.05*k, 0.36*k, 20), MAT.dark, 0.28*k, 0, 0);
      const nib = new THREE.ConeGeometry(0.05*k, 0.16*k, 20); nib.rotateZ(Math.PI/2);
      add(j5, nib, MAT.amber, 0.54*k, 0, 0);
      add(j5, new THREE.SphereGeometry(0.02*k, 10, 8), MAT.amberG, 0.62*k, 0, 0, false);
      TOOL = 0.94*k;
    } else if(o.tool === 'suction'){
      add(j5, cylX(0.04*k, 0.3*k, 16), MAT.steel, 0.25*k, 0, 0);
      add(j5, cylX(0.09*k, 0.05*k, 24), MAT.rubber, 0.42*k, 0, 0);
      TOOL = 0.765*k;
    } else if(o.tool === 'pointer'){
      add(j5, rbox(0.22*k, 0.12*k, 0.12*k, 0.03*k), MAT.dark, 0.18*k, 0, 0);
      const nib = new THREE.ConeGeometry(0.045*k, 0.2*k, 16); nib.rotateZ(-Math.PI/2);
      add(j5, nib, MAT.steel, 0.39*k, 0, 0);
      TOOL = 0.81*k;
    }
    tip.position.x = TOOL - 0.32*k;
    const SHY = 0.26*k + 0.44*k;
    function setGrip(g){ const fz = 0.22*k - (0.22*k - 0.148*k)*g; fingers.forEach(f => { f.position.z = f.userData.s*fz; }); }
    function solve(x, y, z, pitch){
      pitch = pitch || 0;
      const r = Math.hypot(x, z);
      const wr = r - TOOL*Math.sin(pitch), wy = y + TOOL*Math.cos(pitch) - SHY;
      let D = (wr*wr + wy*wy - L1*L1 - L2*L2) / (2*L1*L2);
      const ok = D >= -1 && D <= 1;
      D = Math.max(-1, Math.min(1, D));
      const q3 = -Math.acos(D);                              // elbow up
      const q2 = Math.atan2(wy, wr) - Math.atan2(L2*Math.sin(q3), L1 + L2*Math.cos(q3));
      j1.rotation.y = Math.atan2(-z, x);
      j2.rotation.z = q2;
      j3.rotation.z = q3;
      j4.rotation.z = -Math.PI/2 + pitch - q2 - q3;
      return ok;
    }
    return {base, j1, j2, j3, j4, j5, tip, TOOL, SHY, solve, setGrip, joints:[j1, j2, j3, j4, j5]};
  }
