// parts: arm6
  /*  UR5 CUBE TRACE: the arm walks its stylus through the eight
     vertices of a virtual cube in the report's visit order (the top
     face loop, then the bottom face), a moveJ to the first corner and
     a moveL along every edge, each traced edge left glowing amber.
     Beside it, the flashlight parts tray from the torque assembly.  */
  const STAGE = {
    sky:[0x050a16, 0x0f2140], skyL:[0xc4ad84, 0xe6d6b4], hemi:0xa8c8ff,
    cam:{az:0.5, d:10.2, h:3.9, ly:1.45},
    build(root){
      plinth(root, 3.2);
      const armG = grp(root, -0.85, TOP, -0.55);
      const arm = makeArm6(armG, {style:'ur', tool:'stylus'});
      // the virtual cube, as glass with lit edges
      const S = 0.42, CC = new THREE.Vector3(0.75, TOP + 1.25, 0.6);
      const glass = add(root, new THREE.BoxGeometry(S*2, S*2, S*2), new THREE.MeshStandardMaterial({color:lin(0x4fd8e8),
        roughness:0.1, metalness:0.2, transparent:true, opacity:0.07, depthWrite:false}), CC.x, CC.y, CC.z, false);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(S*2, S*2, S*2)),
        new THREE.LineBasicMaterial({color:lin(0x4fd8e8), transparent:true, opacity:0.35}));
      edges.position.copy(CC); root.add(edges);
      const HI = CC.y + S, LO = CC.y - S, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
      const V = [
        V3(CC.x-S, HI, CC.z+S), V3(CC.x-S, HI, CC.z-S), V3(CC.x+S, HI, CC.z-S), V3(CC.x+S, HI, CC.z+S),
        V3(CC.x-S, HI, CC.z+S), V3(CC.x+S, LO, CC.z+S), V3(CC.x-S, LO, CC.z+S), V3(CC.x-S, LO, CC.z-S), V3(CC.x+S, LO, CC.z-S)
      ];
      const LEGS = V.length - 1;
      const beacons = [0, 1, 2, 3, 5, 6, 7, 8].map(i => add(root, new THREE.SphereGeometry(0.035, 14, 10), MAT.cyanG, V[i].x, V[i].y, V[i].z, false));
      const traced = [];
      for(let i=0;i<LEGS;i++) traced.push(rod(root, 0.018, MAT.amberG, false));
      // flashlight assembly tray: bodies, heads and caps waiting in pockets
      const tray = grp(root, -1.0, TOP, 1.85); tray.rotation.y = 0.35;
      add(tray, rbox(1.4, 0.08, 0.6, 0.03), MAT.dark, 0, 0.04, 0);
      for(let i=0;i<3;i++){
        const x = -0.45 + i*0.45;
        const b = add(tray, cylX(0.07, 0.36, 24), MAT.amber, x, 0.15, -0.12); b.rotation.y = Math.PI/2;
        const hd = add(tray, cylY(0.1, 0.075, 0.12, 24), MAT.alu, x, 0.14, 0.15);
        add(tray, cylY(0.06, 0.06, 0.012, 20), MAT.glass, x, 0.205, 0.15);
      }
      // stack light: green while powered, amber flashing while the arm moves
      const st = grp(root, 1.9, TOP, -1.75);
      add(st, cylY(0.09, 0.11, 0.08, 20), MAT.dark, 0, 0.04, 0);
      add(st, cylY(0.025, 0.025, 0.7, 10), MAT.steel, 0, 0.42, 0);
      const lamps = [0x3fd17a, 0xf5a35c, 0xe5534b].map((c, i) => { const m = glow(c, 0.25); add(st, cylY(0.075, 0.075, 0.13, 20), m, 0, 0.84 + i*0.14, 0, false); return m; });
      add(st, cylY(0.07, 0.075, 0.03, 20), MAT.dark, 0, 1.27, 0);
      const motes = swarm(root, mobile ? 50 : 120, 0xffd2a0, 0.06, 0.5,
        (a, i) => { a[i*3] = (R01(i)-0.5)*7; a[i*3+1] = R01(i+50)*4.5; a[i*3+2] = (R01(i+99)-0.5)*7; },
        (a, i, t, dt) => { a[i*3+1] += dt*0.12; a[i*3] += Math.sin(t*0.5 + i)*dt*0.05; if(a[i*3+1] > 4.6) a[i*3+1] = 0.3; });
      const panel = holo(root, 2.1, 1.4, -1.2, 3.9, -1.9);

      const APPROACH = 1.2, LEG_T = 1.1, DWELL = 0.25, ADMIRE = 2.8, CYCLE = APPROACH + LEGS*(LEG_T + DWELL) + ADMIRE;
      const home = V3(-0.1, TOP + 2.1, -0.2), wt = new THREE.Vector3(), tip = new THREE.Vector3(), cur = new THREE.Vector3();
      const local = new THREE.Vector3();
      let state = {leg:0, move:'moveJ'};
      function update(t, dt){
        const ct = t % CYCLE;
        let leg = 0, k = 0, done = -1;
        if(ct < APPROACH){ wt.lerpVectors(home, V[0], ss(ct, 0, APPROACH)); state.move = 'moveJ'; state.leg = 0; }
        else if(ct < APPROACH + LEGS*(LEG_T + DWELL)){
          const lt = ct - APPROACH;
          leg = Math.min(Math.floor(lt/(LEG_T + DWELL)), LEGS - 1);
          const p = lt - leg*(LEG_T + DWELL);
          k = p < LEG_T ? smoothstep(p/LEG_T) : 1;
          wt.lerpVectors(V[leg], V[leg+1], k); done = leg; state.move = 'moveL'; state.leg = leg + 1;
        } else {
          const at = ct - (APPROACH + LEGS*(LEG_T + DWELL));
          wt.lerpVectors(V[LEGS], home, ss(at, 0, 1.2)); done = LEGS; k = 1; leg = LEGS - 1; state.move = 'moveJ'; state.leg = LEGS;
        }
        for(let i=0;i<LEGS;i++){
          const f = i < leg ? 1 : (i === leg && done >= 0 ? k : 0);
          cur.lerpVectors(V[i], V[i+1], f);
          traced[i].userData.set(V[i], cur);
        }
        local.copy(wt).sub(armG.position);
        arm.solve(local.x, local.y, local.z, 0);
        const moving = ct < APPROACH + LEGS*(LEG_T + DWELL) + 1.2;
        lamps[0].emissiveIntensity = 1.8;
        lamps[1].emissiveIntensity = moving && Math.sin(t*9) > 0 ? 2.4 : 0.15;
        lamps[2].emissiveIntensity = 0.12;
        beacons.forEach((b, i) => { b.scale.setScalar(1 + 0.25*Math.sin(t*2 + i)); });
        edges.material.opacity = 0.3 + 0.08*Math.sin(t*1.3);
        motes.update(t, dt);
        const J = arm.joints;
        panel.draw(t, (g, w, h) => {
          holoFrame(g, w, h, 'CUBE TRACE  ' + state.move);
          holoRow(g, 112, 'edge', state.leg + ' / ' + LEGS, state.leg/LEGS);
          holoRow(g, 170, 'J1  base', deg(J[0].rotation.y));
          holoRow(g, 228, 'J2  shoulder', deg(J[1].rotation.z));
          holoRow(g, 286, 'J3  elbow', deg(J[2].rotation.z));
        });
      }
      return {update};
    }
  };
