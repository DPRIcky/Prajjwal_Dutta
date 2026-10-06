// parts: arm6
  /*  MYCOBOT TIC-TAC-TOE: a desktop cobot with a suction tool plays O
     against a human X on a 3x3 board, watched by an eye-to-hand camera
     on a mast. Human moves pop in; on its own turns the arm picks a
     block from the staging tray, carries it in an arc and sets it down
     in the chosen cell. The scripted game ends in a draw, then resets.  */
  const STAGE = {
    sky:[0x050a16, 0x0f2140], skyL:[0xc4ad84, 0xe6d6b4], hemi:0xa8c8ff,
    cam:{az:0.45, d:9.2, h:4.6, ly:1.0},
    build(root){
      plinth(root, 3.0);
      const armG = grp(root, -1.35, TOP, -0.15);
      const arm = makeArm6(armG, {style:'cobot', tool:'suction', k:0.72, L1:1.25, L2:1.15});
      // the board: a raised plate with grooved cell lines
      const CELL = 0.44, BX = 0.35, BZ = 0.05, BY = TOP + 0.05;
      add(root, rbox(CELL*3 + 0.14, 0.05, CELL*3 + 0.14, 0.02), std(0xd9dee6, 0.5, 0.05), BX, TOP + 0.025, BZ);
      for(let i=1;i<3;i++){
        const s = -CELL*1.5 + i*CELL;
        add(root, new THREE.BoxGeometry(CELL*3, 0.006, 0.018), MAT.dark, BX, BY + 0.003, BZ + s, false);
        add(root, new THREE.BoxGeometry(0.018, 0.006, CELL*3), MAT.dark, BX + s, BY + 0.003, BZ, false);
      }
      const cellPos = i => new THREE.Vector3(BX + ((i%3) - 1)*CELL, BY, BZ + (Math.floor(i/3) - 1)*CELL);
      // staging tray with the robot's blocks
      const ST = new THREE.Vector3(-0.85, TOP, 1.25);
      add(root, rbox(0.62, 0.05, 0.62, 0.02), MAT.dark, ST.x, TOP + 0.025, ST.z);
      const CUBE = 0.24;
      const cubeG = rbox(CUBE, CUBE, CUBE, 0.03);
      const oMat = std(0x4fd8e8, 0.35, 0.1), xMat = MAT.amber;
      const staged = add(root, cubeG, oMat, ST.x, TOP + 0.05 + CUBE/2, ST.z);
      const carried = add(root, cubeG, oMat); carried.visible = false;
      // eye-to-hand camera on a mast over the board
      const mast = grp(root, BX + 1.25, TOP, BZ - 1.05);
      add(mast, cylY(0.04, 0.04, 2.6, 12), MAT.steel, 0, 1.3, 0);
      add(mast, cylY(0.16, 0.2, 0.06, 20), MAT.dark, 0, 0.03, 0);
      rod(root, 0.025, MAT.steel).userData.set(new THREE.Vector3(BX + 1.25, TOP + 2.6, BZ - 1.05), new THREE.Vector3(BX, TOP + 2.6, BZ));
      const cam = grp(root, BX, TOP + 2.6, BZ);
      add(cam, rbox(0.26, 0.14, 0.18, 0.03), MAT.carbon, 0, 0, 0);
      add(cam, cylY(0.05, 0.05, 0.06, 20), MAT.glass, 0, -0.09, 0);
      const camLed = glow(0xe5534b, 2); add(cam, new THREE.SphereGeometry(0.018, 10, 8), camLed, 0.09, -0.06, 0.07, false);
      const fr = lines(root, 8, 0x4fd8e8, 0.2);
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b], i, A) => {
        const c = new THREE.Vector3(BX + a*CELL*1.6, BY, BZ + b*CELL*1.6), d = new THREE.Vector3(BX + A[(i+1)%4][0]*CELL*1.6, BY, BZ + A[(i+1)%4][1]*CELL*1.6);
        fr.seg(new THREE.Vector3(BX, TOP + 2.5, BZ), c); fr.seg(c, d);
      });
      fr.done();

      // pieces: the robot's O is a cyan block with a ring, the human's X an amber block with crossed bars
      const ringG = new THREE.TorusGeometry(0.08, 0.018, 10, 32), barG = rbox(0.2, 0.025, 0.04, 0.01);
      const pieces = [];
      function piece(type){
        const g = grp(root, 0, 0, 0);
        add(g, cubeG, type === 'O' ? oMat : xMat, 0, CUBE/2, 0);
        const sym = grp(g, 0, CUBE + 0.012, 0);
        if(type === 'O'){ const r = add(sym, ringG, MAT.cyanG, 0, 0, 0, false); r.rotation.x = Math.PI/2; }
        else [1, -1].forEach(s => { const b = add(sym, barG, MAT.amberG, 0, 0, 0, false); b.rotation.y = s*Math.PI/4; });
        g.visible = false;
        return {g, sym};
      }
      for(let i=0;i<9;i++) pieces.push({X:piece('X'), O:piece('O')});
      const script = [{type:'X', cell:0}, {type:'O', cell:4}, {type:'X', cell:8}, {type:'O', cell:2},
        {type:'X', cell:6}, {type:'O', cell:3}, {type:'X', cell:5}, {type:'O', cell:1}, {type:'X', cell:7}];
      const MOVE_T = 4.2, RESET_T = 3.0, CYCLE = script.length*MOVE_T + RESET_T;
      const panel = holo(root, 2.0, 1.3, -0.9, 3.6, -1.9);

      const home = new THREE.Vector3(-0.55, TOP + 1.25, 0.1), tgt = new THREE.Vector3(), sm = home.clone(), loc = new THREE.Vector3(), tipW = new THREE.Vector3();
      const HOVER = 0.75, GRIP = CUBE + 0.02;
      const hi = new THREE.Vector3(), lo = new THREE.Vector3(), chi = new THREE.Vector3(), clo = new THREE.Vector3();
      let status = 'HUMAN TO PLAY';
      function update(t, dt){
        const ct = t % CYCLE;
        const idx = Math.min(Math.floor(ct/MOVE_T), script.length - 1), mt = ct - idx*MOVE_T;
        let carrying = false, stagedVis = true;
        // board state is a pure function of the clock, so a reduced-motion still is consistent too
        for(let i=0;i<script.length;i++){
          const mv = script[i], P = pieces[mv.cell][mv.type], other = pieces[mv.cell][mv.type === 'O' ? 'X' : 'O'];
          other.g.visible = false;
          const at = i*MOVE_T + (mv.type === 'X' ? 1.6 : 3.72);
          const on = ct < script.length*MOVE_T + RESET_T*0.8 && ct >= at;
          P.g.visible = on;
          if(on){ P.g.position.copy(cellPos(mv.cell)); const k = clamp01((ct - at)/0.35); (mv.type === 'X' ? P.g : P.sym).scale.setScalar(Math.max(0.01, smoothstep(k))); }
        }
        if(ct < script.length*MOVE_T){
          const mv = script[idx];
          if(mv.type === 'X'){
            tgt.set(home.x + Math.sin(t*0.6)*0.12, home.y + Math.sin(t*0.9)*0.06, home.z + Math.cos(t*0.5)*0.12);
            status = 'HUMAN PLAYS X';
          } else {
            const cp = cellPos(mv.cell);
            hi.set(ST.x, TOP + 0.05 + HOVER, ST.z); lo.set(ST.x, TOP + 0.05 + GRIP, ST.z);
            chi.set(cp.x, cp.y + HOVER, cp.z); clo.set(cp.x, cp.y + GRIP, cp.z);
            if(mt < 0.9)      tgt.lerpVectors(home, hi, ss(mt, 0, 0.9));
            else if(mt < 1.4) tgt.lerpVectors(hi, lo, ss(mt, 0.9, 1.4));
            else if(mt < 1.7) tgt.copy(lo);
            else if(mt < 2.2) tgt.lerpVectors(lo, hi, ss(mt, 1.7, 2.2));
            else if(mt < 3.1){ const k = ss(mt, 2.2, 3.1); tgt.lerpVectors(hi, chi, k); tgt.y += Math.sin(k*Math.PI)*0.2; }
            else if(mt < 3.6) tgt.lerpVectors(chi, clo, ss(mt, 3.1, 3.6));
            else if(mt < 3.9) tgt.copy(clo);
            else              tgt.lerpVectors(clo, chi, ss(mt, 3.9, 4.2));
            stagedVis = mt < 1.55;
            carrying = mt >= 1.55 && mt < 3.72;
            status = 'ROBOT PLAYS O  CELL ' + (mv.cell + 1);
          }
        } else { tgt.copy(home); status = 'DRAW  RESETTING'; }
        sm.lerp(tgt, damp(0.25, dt));
        loc.copy(sm).sub(armG.position);
        arm.solve(loc.x, loc.y, loc.z, 0);
        staged.visible = stagedVis;
        carried.visible = carrying;
        if(carrying){ root.updateMatrixWorld(true); arm.tip.getWorldPosition(tipW); root.worldToLocal(tipW); carried.position.set(tipW.x, tipW.y - CUBE/2, tipW.z); }
        camLed.emissiveIntensity = Math.sin(t*4) > 0.2 ? 2.2 : 0.3;
        const turn = ct < script.length*MOVE_T ? idx + 1 : 9;
        panel.draw(t, (g, w, h) => {
          holoFrame(g, w, h, 'TIC TAC TOE  VISION');
          holoRow(g, 112, 'move', turn + ' / 9', turn/9);
          holoRow(g, 170, 'state', status);
          holoRow(g, 228, 'board seen by', 'EYE TO HAND CAM');
        });
      }
      return {update};
    }
  };
