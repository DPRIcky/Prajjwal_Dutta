
  /*  FLAPPING-WING ROBOT, from the foldable bat-wing project: one
     servo between the wings drives both through a meshed gear pair, on the
     same sinusoidal gait as that page (1.15 Hz, 0.62 rad). Each wing is a
     humerus, a folding elbow and three finger spars with a laminated
     membrane webbed between them; the span folds in on the upstroke and
     opens on the downstroke. Here it flies a banked loop around the stage,
     below the quadrotor's altitude, its body bobbing against each stroke. */
  function buildBatRig(parent){
    const g = new THREE.Group(); parent.add(g);
    const r = new THREE.Group(); r.scale.setScalar(0.24); g.add(r);
    add(r, rbox(0.5, 0.16, 1.5, 0.06), MAT.carbon);
    add(r, rbox(0.36, 0.34, 0.5, 0.04), MAT.cap, 0, 0.24, 0.12);
    function gearGeo(rad, teeth){
      const sh = new THREE.Shape(), n = teeth*4;
      for(let i=0;i<=n;i++){
        const a = i/n*Math.PI*2, rr = rad*((i % 4) < 2 ? 1 : 0.84);
        if(i === 0) sh.moveTo(Math.cos(a)*rr, Math.sin(a)*rr); else sh.lineTo(Math.cos(a)*rr, Math.sin(a)*rr);
      }
      const hole = new THREE.Path(); hole.absarc(0, 0, rad*0.18, 0, Math.PI*2, true); sh.holes.push(hole);
      const geo = new THREE.ExtrudeGeometry(sh, {depth:0.06, bevelEnabled:false}); geo.translate(0, 0, -0.03);
      return geo;
    }
    const gA = add(r, gearGeo(0.4, 12), MAT.amber, -0.38, 0.12, 0.42);
    const gB = add(r, gearGeo(0.4, 12), MAT.amber,  0.38, 0.12, 0.42);
    gB.rotation.z = Math.PI/12;                       // offset half a tooth so they mesh

    const SPARS = [{len:2.5, spread:0.30}, {len:2.9, spread:0.02}, {len:2.4, spread:-0.34}];
    const memM = new THREE.MeshStandardMaterial({color:lin(0xf5a35c), roughness:0.55, metalness:0.05,
      transparent:true, opacity:0.62, side:THREE.DoubleSide, depthWrite:false});
    const wings = [-1, 1].map(side => {
      const shoulder = new THREE.Group(); shoulder.position.set(side*0.3, 0.08, 0.1); r.add(shoulder);
      add(shoulder, cylX(0.055, 1.5, 10), MAT.carbon, side*0.75, 0, 0);
      add(shoulder, new THREE.SphereGeometry(0.09, 14, 10), MAT.steel);
      const elbow = new THREE.Group(); elbow.position.x = side*1.5; shoulder.add(elbow);
      add(elbow, new THREE.SphereGeometry(0.075, 14, 10), MAT.steel);
      const tips = SPARS.map(sp => {
        const spar = new THREE.Group(); spar.rotation.y = sp.spread*side; elbow.add(spar);
        add(spar, cylX(0.032, sp.len, 8), MAT.carbon, side*sp.len/2, 0, 0);
        const tip = new THREE.Object3D(); tip.position.x = side*sp.len; spar.add(tip);
        return tip;
      });
      const rear = new THREE.Object3D(); rear.position.set(side*0.25, 0.05, -0.7); r.add(rear);
      const pos = new Float32Array(4*3*3);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mem = new THREE.Mesh(geo, memM); mem.frustumCulled = false; r.add(mem);
      return {side, shoulder, elbow, tips, rear, pos, geo};
    });
    const P = [0,1,2,3,4,5].map(() => new THREE.Vector3());
    function update(t){
      const ph = t*1.15*Math.PI*2, flap = Math.sin(ph)*0.62, fold = (0.5 - 0.5*Math.cos(ph))*0.5;
      wings.forEach(w => {
        w.shoulder.rotation.z = flap*-w.side;
        w.elbow.rotation.z = fold*-w.side;
        w.elbow.rotation.y = fold*0.35*w.side;
      });
      gA.rotation.z = ph*0.5; gB.rotation.z = -ph*0.5 + Math.PI/12;
      // loop flight: nose (+z) along the tangent, banked into the turn
      const a = t*0.26, R = 1.9;
      g.position.set(Math.cos(a)*R, TOP + 1.45 + Math.sin(a*2)*0.12 + Math.sin(ph)*0.04, Math.sin(a)*R);
      g.rotation.set(0, -a, -0.28);
      r.updateWorldMatrix(true, true);
      wings.forEach(w => {
        // shoulder, elbow, rear spar tip, middle, front, body trailing corner, in rig space
        [w.shoulder, w.elbow, w.tips[0], w.tips[1], w.tips[2], w.rear].forEach((o, i) => r.worldToLocal(o.getWorldPosition(P[i])));
        const tri = [[1,4,3],[1,3,2],[0,1,2],[0,2,5]];
        let n = 0;
        tri.forEach(tr => tr.forEach(k => { w.pos[n++] = P[k].x; w.pos[n++] = P[k].y; w.pos[n++] = P[k].z; }));
        w.geo.attributes.position.needsUpdate = true;
        w.geo.computeVertexNormals();
      });
    }
    return {g, update};
  }