// parts:
  /*  CNC TOOL MAGAZINE on the Micro820: a carousel platter with eight
     stations and a fixed proximity sensor at each. The platter runs the
     page's own computeDir (transcribed from FB_DeterminRotation) over a
     sequence of requests: it turns the shorter way to the target, picks
     the tool up, then runs back to the base station the other way. Each
     sensor LED fires as the magnet passes; the base station is amber.  */
  const STAGE = {
    sky:[0x070806, 0x221b0d], skyL:[0xc9ab7c, 0xe8d5b0], hemi:0xffdca8,
    cam:{az:0.4, d:9.6, h:5.0, ly:0.9},
    build(root){
      plinth(root, 3.1);
      const WR = 1.9, HY = TOP + 0.5;
      // frame and drive
      add(root, cylY(0.5, 0.62, 0.36, 40), MAT.dark, 0, TOP + 0.18, 0);
      add(root, cylY(0.18, 0.18, 0.3, 24), MAT.steel, 0, TOP + 0.45, 0);
      const ring = add(root, new THREE.TorusGeometry(WR + 0.35, 0.04, 10, 96), MAT.steel, 0, HY - 0.12, 0); ring.rotation.x = Math.PI/2;
      const stA = p => -Math.PI/2 + (p - 1)*Math.PI/4;   // station 1 at -z, forward = clockwise from above
      const posts = [];
      for(let s=1;s<=8;s++){
        const a = stA(s), g = grp(root, Math.cos(a)*(WR + 0.35), 0, Math.sin(a)*(WR + 0.35));
        add(g, cylY(0.03, 0.03, HY - 0.12 - TOP, 10), MAT.steel, 0, (HY - 0.12 + TOP)/2, 0);
        const body = add(g, cylY(0.05, 0.05, 0.22, 16), MAT.dark, 0, HY + 0.02, 0);
        const ledM = glow(0x4fd8e8, 0.3);
        add(g, new THREE.SphereGeometry(0.035, 12, 8), ledM, 0, HY + 0.16, 0, false);
        posts.push({n:s, ledM, flash:0});
      }
      // platter with eight tool pockets, a magnet under station marker
      const plat = grp(root, 0, HY, 0);
      add(plat, cylY(WR + 0.12, WR + 0.12, 0.08, 64), std(0x9aa3b0, 0.3, 0.85), 0, 0, 0);
      add(plat, cylY(0.35, 0.35, 0.12, 32), MAT.cap, 0, 0.06, 0);
      const holderG = new THREE.ConeGeometry(0.12, 0.26, 24), shankG = cylY(0.05, 0.05, 0.22, 16), flangeG = cylY(0.14, 0.14, 0.05, 24);
      const tools = [];
      for(let k=0;k<8;k++){
        const a = k*Math.PI/4, x = Math.cos(a)*WR*0.82, z = Math.sin(a)*WR*0.82;
        add(plat, cylY(0.16, 0.16, 0.03, 24), MAT.dark, x, 0.05, z);
        const tg = grp(plat, x, 0.06, z);
        add(tg, flangeG, MAT.dark, 0, 0.03, 0);
        const c = add(tg, holderG, MAT.alu, 0, 0.18, 0); c.rotation.x = Math.PI;
        add(tg, shankG, k % 2 ? MAT.amber : MAT.steel, 0, 0.42, 0);
        tools.push(tg);
      }
      const magM = glow(0xf5a35c, 2);
      add(plat, rbox(0.14, 0.06, 0.1, 0.02), magM, WR + 0.06, 0.02, 0, false);
      // base station marker and the Micro820 with its I/O LEDs
      const baseRing = add(root, new THREE.TorusGeometry(0.26, 0.025, 8, 40), MAT.amberG, 0, TOP + 0.02, 0, false); baseRing.rotation.x = Math.PI/2;
      const plc = grp(root, -1.9, TOP, -1.7); plc.rotation.y = 0.7;
      add(plc, rbox(0.9, 0.55, 0.12, 0.02), std(0x2b2f36, 0.55, 0.3), 0, 0.6, 0);
      add(plc, rbox(0.04, 0.9, 0.04, 0.01), MAT.steel, -0.5, 0.45, 0);
      add(plc, rbox(0.04, 0.9, 0.04, 0.01), MAT.steel, 0.5, 0.45, 0);
      const io = [];
      for(let i=0;i<8;i++){ const m = glow(i < 4 ? 0x3fd17a : 0xf5a35c, 0.2); add(plc, rbox(0.04, 0.03, 0.02, 0.006), m, -0.32 + i*0.09, 0.78, 0.07, false); io.push(m); }
      const panel = holo(root, 2.1, 1.4, -0.7, 3.5, -2.0);
      // the run, with the controller's own decision
      const dirOf = (b, tt) => typeof computeDir === 'function' ? computeDir(b, tt) : 1;
      const SEQ = [4, 7, 2, 6];
      let sIdx = 0, baseSt = 1, targetSt = SEQ[0], legDir = dirOf(baseSt, targetSt), carrying = false, station = baseSt, frac = 0, dwell = 0;
      const DWELL = 0.55, SPD = 0.72;
      function atStation(p){
        if(!carrying && p === targetSt){ carrying = true; dwell = DWELL; return; }
        if(carrying && p === baseSt){ carrying = false; dwell = DWELL; sIdx = (sIdx + 1) % SEQ.length; targetSt = SEQ[sIdx]; legDir = dirOf(baseSt, targetSt); }
      }
      function update(t, dt){
        dt = Math.min(dt, 0.05);
        if(dwell > 0) dwell -= dt;
        else {
          const dir = carrying ? -legDir : legDir;
          frac += dir*SPD*dt;
          while(frac >= 1){ frac -= 1; station = (station % 8) + 1; posts[station - 1].flash = 1; atStation(station); }
          while(frac < 0){ frac += 1; station = ((station - 2) % 8 + 8) % 8 + 1; posts[station - 1].flash = 1; atStation(station); }
        }
        plat.rotation.y = -stA(station + frac);
        // the pocket that holds the requested tool rides lifted while it is being carried home
        tools.forEach((tg, k) => { tg.position.y = 0.06 + (carrying && k === 0 ? 0.12 : 0); });
        posts.forEach(p => {
          p.flash = Math.max(0, p.flash - dt*2.2);
          const isB = p.n === baseSt, isT = p.n === targetSt;
          p.ledM.emissive.copy(lin(isB ? 0xf5a35c : 0x4fd8e8));
          p.ledM.emissiveIntensity = 0.25 + p.flash*3 + (isT ? 0.8 + 0.6*Math.sin(t*6) : 0) + (isB ? 0.6 : 0);
        });
        const ba = stA(baseSt);
        baseRing.position.set(Math.cos(ba)*(WR + 0.35), TOP + 0.02, Math.sin(ba)*(WR + 0.35));
        io.forEach((m, i) => { m.emissiveIntensity = (i < 4 ? posts[(station + i) % 8].flash > 0.3 : (i === 4 && dwell <= 0) || (i === 5 && carrying)) ? 2.2 : 0.15; });
        const dir = carrying ? -legDir : legDir;
        panel.draw(t, (g, w, h) => {
          holoFrame(g, w, h, 'FB DETERMINROTATION');
          holoRow(g, 112, 'base, target', baseSt + ', ' + targetSt);
          holoRow(g, 170, 'direction', dwell > 0 ? 'DWELL' : dir === 1 ? 'FORWARD' : 'REVERSE');
          holoRow(g, 228, 'station', String(station), (station - 1)/7);
          holoRow(g, 286, 'tool', carrying ? 'CARRYING TO BASE' : 'FETCHING');
        });
      }
      return {update};
    }
  };
