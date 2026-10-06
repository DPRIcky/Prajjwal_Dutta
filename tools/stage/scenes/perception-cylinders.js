// parts: diffbot
  /*  CYLINDER PERCEPTION PIPELINE: a robot's depth camera looks at three
     painted cylinders standing among clutter. Over it the point cloud goes
     through the pipeline in its real order: raw, ROI box filter (clutter
     outside the box is dropped), voxel grid (thinned), RANSAC plane removal
     (the floor goes), Euclidean clusters, then the cylinder fits, each
     labelled by colour, with its fitted axis drawn.  */
  const STAGE = {
    sky:[0x050a16, 0x0f2140], skyL:[0xc4ad84, 0xe6d6b4], hemi:0xa8c8ff,
    cam:{az:0.45, d:9.6, h:4.4, ly:0.9},
    build(root){
      plinth(root, 3.4);
      const K = 0.55, CYL = [{x:-1.9, z:-0.4, r:0.42, h:1.5}, {x:0.35, z:0.6, r:0.38, h:1.3}, {x:2.2, z:-0.7, r:0.45, h:1.6}];
      const COLS = [0xe8544f, 0x63d97a, 0x4f9de8];
      const cyls = CYL.map((c, i) => {
        const m = add(root, cylY(c.r*K, c.r*K, c.h*K, 48), std(COLS[i], 0.55, 0.05), c.x*K, TOP + c.h*K/2, c.z*K);
        return m;
      });
      // clutter outside the region of interest
      [[-2.6, 1.3, 0.35], [2.7, 1.1, 0.3], [-2.4, -1.7, 0.28], [2.5, -1.9, 0.4]].forEach(([x, z, s], i) => {
        const m = add(root, rbox(s, s*(0.8 + R01(i)*0.6), s, 0.04), std(0x6e5638, 0.85, 0), x, TOP + s*0.5, z); m.rotation.y = i;
      });
      const bot = makeDiffbot(root, {k:0.75});
      bot.place(0.2, 2.05, Math.PI/2);
      // the point cloud, in the robot-free scene frame (sim units scaled by K)
      const pos = [], kind = [];
      const NF = mobile ? 900 : 1800, NC = mobile ? 170 : 320, NX = mobile ? 200 : 380;
      for(let i=0;i<NF;i++){ pos.push((Math.random() - 0.5)*9, (Math.random() - 0.5)*0.04, (Math.random() - 0.5)*5.5); kind.push(1); }
      CYL.forEach((c, ci) => { for(let i=0;i<NC;i++){ const a = Math.random()*Math.PI*2, y = Math.random()*c.h, rr = c.r*(1.02 + (Math.random() - 0.5)*0.05); pos.push(c.x + Math.cos(a)*rr, y, c.z + Math.sin(a)*rr); kind.push(2 + ci); } });
      for(let i=0;i<NX;i++){ const sd = Math.random() < 0.5 ? -1 : 1; pos.push(sd*(4.6 + Math.random()*1.2), Math.random()*1.4, (Math.random() - 0.5)*7); kind.push(0); }
      const N = kind.length, pa = new Float32Array(N*3), ca = new Float32Array(N*3);
      for(let i=0;i<N;i++){ pa[i*3] = pos[i*3]*K; pa[i*3+1] = TOP + 0.02 + pos[i*3+1]*K; pa[i*3+2] = pos[i*3+2]*K; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pa, 3)); geo.setAttribute('color', new THREE.BufferAttribute(ca, 3));
      const ptsM = new THREE.PointsMaterial({size:0.1, map:dotTex, vertexColors:true, transparent:true, opacity:0.95, depthWrite:false, blending:THREE.AdditiveBlending});
      const cloud = new THREE.Points(geo, ptsM); cloud.frustumCulled = false; root.add(cloud);
      PARTS.push({m:ptsM, c:ptsM.color.clone()});
      const voxelKeep = new Uint8Array(N); for(let i=0;i<N;i++) voxelKeep[i] = i % 3 !== 0 ? 1 : 0;
      const roiM = new THREE.LineBasicMaterial({color:lin(0xf5a35c), transparent:true, opacity:0});
      const roi = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(9.2*K, 2.2*K, 5.8*K)), roiM);
      roi.position.y = TOP + 1.1*K; root.add(roi); PARTS.push({m:roiM, c:roiM.color.clone()});
      const fits = CYL.map((c, i) => {
        const m = glow(COLS[i], 1.6); m.transparent = true;
        const rings = [0.02, 0.5, 0.98].map(f => { const r = add(root, new THREE.TorusGeometry(c.r*K*1.08, 0.012, 6, 48), m, c.x*K, TOP + c.h*K*f, c.z*K, false); r.rotation.x = Math.PI/2; return r; });
        const ax = rod(root, 0.01, m, false); ax.userData.set(new THREE.Vector3(c.x*K, TOP, c.z*K), new THREE.Vector3(c.x*K, TOP + c.h*K*1.25, c.z*K));
        return {m, parts:rings.concat([ax])};
      });
      const camCone = lines(root, 4, 0x4fd8e8, 0.25);
      const STAGES = [['RAW CLOUD', 2.4], ['ROI BOX FILTER', 2.4], ['VOXEL GRID', 2.0], ['RANSAC PLANE OUT', 2.4], ['EUCLIDEAN CLUSTERS', 2.2], ['CYLINDER FITS', 3.6]];
      const TOTAL = STAGES.reduce((s, x) => s + x[1], 0);
      const cRaw = lin(0x6f9fd8), cFloor = lin(0x35608f), cClus = lin(0x4fd8e8), cyc = COLS.map(lin), tmp = new THREE.Color();
      let last = -1, stageName = '';
      const panel = holo(root, 2.1, 1.4, -1.6, 3.6, -1.9);
      function paint(st, k){
        let shown = 0;
        for(let i=0;i<N;i++){
          const kd = kind[i]; let vis = 1;
          if(st >= 1 && kd === 0) vis = 0;
          if(st >= 2 && !voxelKeep[i]) vis = 0;
          if(st >= 3 && kd === 1) vis = 0;
          if(vis) shown++;
          if(!vis) tmp.setRGB(0, 0, 0);
          else if(st <= 2) tmp.copy(kd === 1 ? cFloor : cRaw);
          else if(st === 3) tmp.copy(cRaw);
          else if(st === 4) tmp.copy(cClus);
          else tmp.copy(kd >= 2 ? cyc[kd - 2] : cRaw);
          ca[i*3] = tmp.r; ca[i*3+1] = tmp.g; ca[i*3+2] = tmp.b;
          if(!vis) pa[i*3+1] = -10; else pa[i*3+1] = TOP + 0.02 + pos[i*3+1]*K;
        }
        geo.attributes.color.needsUpdate = true; geo.attributes.position.needsUpdate = true;
        return shown;
      }
      let shown = N;
      const camW = new THREE.Vector3(), cc = new THREE.Vector3();
      function update(t, dt){
        let ct = t % TOTAL, si = 0;
        while(si < STAGES.length - 1 && ct > STAGES[si][1]){ ct -= STAGES[si][1]; si++; }
        const k = ct/STAGES[si][1];
        if(si !== last){ last = si; shown = paint(si, k); stageName = STAGES[si][0]; }
        roiM.opacity = si === 1 ? 0.8*Math.min(1, k*3) : (si === 0 ? 0 : 0.15);
        const fo = si === 5 ? Math.min(1, k*2.5) : 0;
        fits.forEach(f => { f.m.opacity = fo; f.parts.forEach(p => p.visible = fo > 0.01); });
        root.updateMatrixWorld(true);
        bot.camPt.getWorldPosition(camW); root.worldToLocal(camW);
        camCone.reset();
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => camCone.seg(camW, cc.set(a*2.3, TOP + (b > 0 ? 1.0 : 0.02), -1.2)));
        camCone.done();
        bot.lidar.rotation.y = t*6;
        panel.draw(t, (g, w, h) => {
          holoFrame(g, w, h, 'POINT CLOUD PIPELINE');
          holoRow(g, 112, 'stage', (si + 1) + '  ' + stageName);
          holoRow(g, 170, 'points kept', shown + ' / ' + N, shown/N);
          holoRow(g, 228, 'cylinders found', si === 5 ? '3' : '0');
        });
      }
      return {update};
    }
  };
