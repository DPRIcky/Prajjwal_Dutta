
  function dressBlimp(root, api){
    // drifting clouds
    const cloudM = std(0xdbe5f7, 1.0, 0.0, {transparent:true, opacity:0.11, depthWrite:false, emissive:lin(0x2a3560)});
    const puff = new THREE.SphereGeometry(1, 18, 12);
    const clouds = new THREE.Group(); root.add(clouds);
    for(let c=0;c<(mobile ? 5 : 9);c++){
      const cg = new THREE.Group(), a = R01(c)*Math.PI*2, r = 6 + R01(c+5)*9;
      cg.position.set(Math.cos(a)*r, 3.4 + R01(c+9)*4, Math.sin(a)*r - 2);
      for(let k=0;k<6;k++){
        const m = new THREE.Mesh(puff, cloudM);
        const sc = 0.6 + R01(c*7+k)*0.9;
        m.position.set((k - 2.5)*0.75, R01(c*3+k)*0.4, (R01(c*11+k)-0.5)*0.8);
        m.scale.set(sc*1.3, sc*0.7, sc); cg.add(m);
      }
      cg.userData.ph = R01(c+30)*6; cg.userData.y0 = cg.position.y;
      clouds.add(cg);
    }
    // stars, twinkling as a field
    const stars = swarm(root, mobile ? 120 : 260, 0xdfe8ff, 0.14, 0.8,
      (a, i) => { const th = R01(i)*Math.PI*2, ph = 0.15 + R01(i+3)*1.2, r = 40 + R01(i+6)*20;
        a[i*3] = Math.cos(th)*Math.cos(ph)*r; a[i*3+1] = Math.sin(ph)*r*0.6 + 6; a[i*3+2] = Math.sin(th)*Math.cos(ph)*r - 20; });
    // ground station with a live uplink to the gondola
    const gs = new THREE.Group(); gs.position.set(-2.6, TOP, 1.9); root.add(gs);
    add(gs, rbox(0.5, 0.12, 0.5, 0.03), MAT.dark, 0, 0.06, 0);
    add(gs, cylY(0.035, 0.05, 1.7, 10), MAT.steel, 0, 0.95, 0);
    const dish = add(gs, new THREE.SphereGeometry(0.32, 24, 12, 0, Math.PI*2, 0, Math.PI/2.6), std(0xd9dee6, 0.35, 0.4, {side:THREE.DoubleSide}), 0, 1.55, 0);
    dish.rotation.x = Math.PI*0.62;
    const bcn = glow(0xe5534b, 2.5);
    add(gs, new THREE.SphereGeometry(0.045, 12, 8), bcn, 0, 1.85, 0, false);
    const upG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const up = new THREE.Line(upG, new THREE.LineDashedMaterial({color:lin(0x4fd8e8), dashSize:0.12, gapSize:0.09, transparent:true, opacity:0.6}));
    up.frustumCulled = false; root.add(up);
    const panel = holo(root, 2.1, 1.4, -2.6, 4.6, -1.2);
    const PHASE = {seek:'CHASING BALLOON', carry:'CARRYING TO GOAL', shoot:'SCORING', respawn:'NEXT BALLOON'};
    return (t) => {
      panel.draw(t, (g, w, h) => {
        holoFrame(g, w, h, 'CATCH AND SCORE');
        holoRow(g, 112, 'state', PHASE[api.st.phase]);
        holoRow(g, 170, 'target goal', api.goals[api.st.goal].shape.toUpperCase());
        holoRow(g, 228, 'balloons scored', String(api.st.scored));
      });
      clouds.children.forEach(cg => { cg.position.y = cg.userData.y0 + Math.sin(t*0.2 + cg.userData.ph)*0.25; });
      clouds.rotation.y = t*0.012;
      stars.m.opacity = 0.65 + Math.sin(t*1.7)*0.15;
      bcn.emissiveIntensity = Math.sin(t*3) > 0.6 ? 3 : 0.2;
      dish.rotation.z = Math.sin(t*0.4)*0.3;
      const ua = upG.attributes.position.array, b = api.bl.position;
      ua[0] = -2.6; ua[1] = TOP + 1.85; ua[2] = 1.9; ua[3] = b.x; ua[4] = b.y - 0.95; ua[5] = b.z;
      upG.attributes.position.needsUpdate = true; up.computeLineDistances();
      up.material.opacity = 0.35 + Math.sin(t*2.2)*0.2;
    };
  }