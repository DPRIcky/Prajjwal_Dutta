
  function dressFleet(root){
    /* UNDER ICE: the fleet works beneath a sea-ice ceiling. The underside
       is displaced so it reads as rafted ice, keels hang from it like
       inverted ridges, brash ice bobs at the interface, and the light
       comes down through leads (open cracks) in the sheet. */
    const ICE_Y = 6.0;
    const iceM = new THREE.MeshStandardMaterial({color:lin(0xcfe9f4), roughness:0.32, metalness:0.0,
      emissive:lin(0x0e3a4a), emissiveIntensity:0.6, transparent:true, opacity:0.92, side:THREE.DoubleSide, flatShading:true});
    const ceilG = new THREE.PlaneGeometry(34, 34, 48, 48);
    const cp = ceilG.attributes.position;
    for(let i=0;i<cp.count;i++){
      const x = cp.getX(i), y = cp.getY(i);
      cp.setZ(i, Math.sin(x*0.55)*0.25 + Math.cos(y*0.7 + x*0.2)*0.22 + (R01(i)-0.5)*0.18);
    }
    ceilG.computeVertexNormals();
    const ceil = new THREE.Mesh(ceilG, iceM); ceil.rotation.x = Math.PI/2; ceil.position.y = ICE_Y; root.add(ceil);
    // keels: jagged inverted ridges hanging from the ice, kept above the fleet's depth band
    const keels = [];
    [[-4.6, -2.4, 1.0], [3.8, -3.6, 1.3], [5.4, 1.6, 0.8], [-1.2, -5.2, 1.1], [-5.6, 2.2, 0.9], [1.4, 4.8, 0.7]].forEach(([x, z, sc], k) => {
      const g = new THREE.IcosahedronGeometry(1, 1), gp = g.attributes.position;
      for(let i=0;i<gp.count;i++){
        // hash the position, not the index: the faces are unwelded, so shared corners must move together
        const f = 0.75 + R01(k*37 + Math.round(gp.getX(i)*97)*7 + Math.round(gp.getY(i)*97)*13 + Math.round(gp.getZ(i)*97)*17)*0.5;
        gp.setXYZ(i, gp.getX(i)*f, gp.getY(i)*f, gp.getZ(i)*f);
      }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, iceM);
      m.scale.set(1.3*sc, 1.6*sc, 1.0*sc); m.position.set(x, ICE_Y + 0.3, z); m.rotation.y = R01(k)*6;
      root.add(m); keels.push(m);
    });
    // brash ice bobbing at the interface
    const brash = [];
    for(let k=0;k<(mobile ? 8 : 16);k++){
      const g = new THREE.DodecahedronGeometry(0.18 + R01(k+3)*0.22, 0);
      const m = new THREE.Mesh(g, iceM);
      const a = R01(k)*Math.PI*2, r = 1.5 + R01(k+9)*6;
      m.position.set(Math.cos(a)*r, ICE_Y - 0.35 - R01(k+5)*0.3, Math.sin(a)*r);
      m.scale.y = 0.5; m.userData = {y0:m.position.y, ph:R01(k+11)*6};
      root.add(m); brash.push(m);
    }
    // the leads: dark-water cracks in the sheet, with the light falling through them
    const leadM = new THREE.MeshBasicMaterial({color:lin(0x9ff3ff), transparent:true, opacity:0.35, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide});
    [[-2.5, -3.0, 0.4], [1.8, -4.2, -0.6], [4.2, -0.6, 1.1], [-4.4, 1.5, 0.2]].forEach(([x, z, ry]) => {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), leadM); l.rotation.set(Math.PI/2, 0, ry); l.position.set(x, ICE_Y - 0.12, z); root.add(l);
    });
    // sunlight shafts from the surface
    const shafts = [[-2.5, -3.0], [1.8, -4.2], [4.2, -0.6], [-4.4, 1.5]].map(([x, z], i) => shaft(root, x, z, 0.45, 1.6, ICE_Y, 0x9ff3ff, 0.09 + i*0.01));
    // bubbles from the beacon and the seabed
    const bub = swarm(root, mobile ? 50 : 110, 0xd8fbff, 0.08, 0.7,
      (a, i) => { a[i*3] = (R01(i)-0.5)*9; a[i*3+1] = R01(i+7)*6; a[i*3+2] = (R01(i+13)-0.5)*9; },
      (a, i, t, dt) => {
        a[i*3+1] += dt*(0.35 + (i%5)*0.08); a[i*3] += Math.sin(t*2 + i)*dt*0.06;
        if(a[i*3+1] > ICE_Y - 0.2){
          const b = i%4 === 0;
          a[i*3]   = b ? (Math.random()-0.5)*0.2 : (Math.random()-0.5)*9;
          a[i*3+1] = b ? 1.35 : 0.1;
          a[i*3+2] = b ? (Math.random()-0.5)*0.2 : (Math.random()-0.5)*9;
        }
      });
    return (t, dt) => {
      brash.forEach(m => { m.position.y = m.userData.y0 + Math.sin(t*0.6 + m.userData.ph)*0.05; m.rotation.y += dt*0.05; });
      shafts.forEach((sh, i) => { sh.material.opacity = sh.userData.op*(0.7 + 0.3*Math.sin(t*0.6 + i*1.7)); });
      bub.update(t, dt);
    };
  }