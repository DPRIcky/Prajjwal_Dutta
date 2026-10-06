
  /*  2. AUV FLEET in a gyre, with the connectivity tree drawn live.
     The tree is the page's own delta-BFS rule: the smallest ID is
     root, every vehicle picks the in-range neighbour with the fewest
     hops (ties to the smaller ID) as its parent. Bright edges are
     the tree, faint ones are every other in-range link. */
  function buildFleet(root){
    const rockM = std(0x17242f, 0.95, 0.05);
    for(let i=0;i<16;i++){
      const a = i*2.39, r = 2.2 + (i*1.7)%4.6;
      const m = add(root, new THREE.DodecahedronGeometry(0.22 + ((i*37)%10)/16, 0), rockM, Math.cos(a)*r, 0.06, Math.sin(a)*r);
      m.scale.y = 0.5; m.rotation.set(i, i*0.7, 0);
    }
    // the seabed beacon the fleet circles
    add(root, cylY(0.35, 0.45, 0.18, 32), MAT.dark, 0, 0.09, 0);
    add(root, cylY(0.04, 0.04, 1.1, 12), MAT.steel, 0, 0.7, 0);
    const beacon = add(root, new THREE.SphereGeometry(0.09, 20, 14), glow(0x4fd8e8, 3), 0, 1.3, 0, false);
    root.userData.glows.push({m:beacon.material, k:3});

    const pts = [new THREE.Vector2(0.001, -0.75)];
    for(let i=0;i<=28;i++){
      const u = i/28, y = -0.75 + u*1.5;
      let r = 0.16;
      if(u < 0.2) r = 0.16*(0.35 + 0.65*Math.sqrt(u/0.2));
      else if(u > 0.85){ const k = (u-0.85)/0.15; r = 0.16*Math.sqrt(Math.max(0, 1 - k*k)); }
      pts.push(new THREE.Vector2(Math.max(r, 0.001), y));
    }
    const hullG = new THREE.LatheGeometry(pts, 40); hullG.rotateZ(-Math.PI/2);
    const finV = rbox(0.24, 0.17, 0.014, 0.006), finH = rbox(0.24, 0.014, 0.17, 0.006);
    const NA = mobile ? 6 : 8;
    const auvs = [];
    for(let i=0;i<NA;i++){
      const g = new THREE.Group(); root.add(g);
      add(g, hullG, i === 0 ? MAT.amber : MAT.shell);
      add(g, cylX(0.163, 0.07, 40), i === 0 ? MAT.shell : MAT.amber, 0.38, 0, 0);
      add(g, cylX(0.163, 0.025, 40), MAT.dark, -0.22, 0, 0);
      add(g, finV, MAT.dark, -0.6, 0.2, 0); add(g, finV, MAT.dark, -0.6, -0.2, 0);
      add(g, finH, MAT.dark, -0.6, 0, 0.2); add(g, finH, MAT.dark, -0.6, 0, -0.2);
      const sh = add(g, new THREE.TorusGeometry(0.13, 0.022, 10, 36), MAT.dark, -0.8, 0, 0);
      sh.rotation.y = Math.PI/2;
      const prop = new THREE.Group(); prop.position.x = -0.8; g.add(prop);
      add(prop, rbox(0.012, 0.22, 0.05, 0.004), MAT.steel);
      add(prop, rbox(0.012, 0.05, 0.22, 0.004), MAT.steel);
      add(g, rbox(0.32, 0.02, 0.04, 0.008), MAT.cyanG, 0.05, 0.158, 0, false);
      const a = i/NA*Math.PI*2;
      g.position.set(Math.cos(a)*3.2, 1.5 + (i%3)*0.55, Math.sin(a)*3.2);
      auvs.push({g, prop, v:new THREE.Vector3(), ph:i*1.37});
    }

    const MAXL = NA*NA;
    const mkLines = (col, op) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXL*6), 3));
      const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({color:lin(col), transparent:true, opacity:op, depthWrite:false}));
      l.frustumCulled = false; root.add(l); return l;
    };
    const treeL = mkLines(0x4fd8e8, 0.95), linkL = mkLines(0x4fd8e8, 0.16);
    const RC = 3.4, RC2 = RC*RC;

    // suspended particles drifting with the same current
    const NP = mobile ? 350 : 800;
    const pp = new Float32Array(NP*3);
    const respawn = i => {
      const a = Math.random()*Math.PI*2, r = 0.6 + Math.random()*6.2;
      pp[i*3] = Math.cos(a)*r; pp[i*3+1] = 0.2 + Math.random()*4.6; pp[i*3+2] = Math.sin(a)*r;
    };
    for(let i=0;i<NP;i++) respawn(i);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const pts3 = new THREE.Points(pg, new THREE.PointsMaterial({color:lin(0x9ff0ff), size:0.07, map:dotTex, transparent:true, opacity:0.6, depthWrite:false, blending:THREE.AdditiveBlending}));
    pts3.frustumCulled = false; root.add(pts3);
    PARTS.push({m:pts3.material, c:pts3.material.color.clone()});

    function current(x, z, t, out){
      const r = Math.hypot(x, z) + 1e-4, tang = 0.5 + 0.15*Math.sin(t*0.3 + r);
      out.x = -z/r*tang + 0.18*Math.sin(0.55*z + t*0.6);
      out.z =  x/r*tang + 0.18*Math.cos(0.5*x + t*0.5);
      return r;
    }
    const cur = {x:0, z:0}, tgt = new THREE.Vector3();
    const hop = new Int32Array(NA), par = new Int32Array(NA), queue = new Int32Array(NA);

    function update(t, dt){
      for(let i=0;i<NA;i++){
        const a = auvs[i], p = a.g.position;
        const r = current(p.x, p.z, t, cur);
        const ring = (3.2 + Math.sin(t*0.37 + a.ph)*0.9 - r)*0.4;
        tgt.set(cur.x + p.x/r*ring, (2.0 + Math.sin(t*0.33 + a.ph)*0.7 - p.y)*0.45, cur.z + p.z/r*ring);
        for(let j=0;j<NA;j++){
          if(j === i) continue;
          const q = auvs[j].g.position, dx = p.x-q.x, dy = p.y-q.y, dz = p.z-q.z, d2 = dx*dx+dy*dy+dz*dz;
          if(d2 < 1.2 && d2 > 1e-4){ const k = (1.2 - d2)*0.9; tgt.x += dx*k; tgt.y += dy*k; tgt.z += dz*k; }
        }
        a.v.lerp(tgt, damp(0.03, dt));
        p.addScaledVector(a.v, dt);
        const sp = a.v.length() + 1e-5;
        a.g.rotation.set(0, Math.atan2(-a.v.z, a.v.x), Math.asin(Math.max(-0.5, Math.min(0.5, a.v.y/sp))));
        a.prop.rotation.x += dt*16;
      }
      // delta-BFS tree from the smallest ID
      hop.fill(-1); par.fill(-1); hop[0] = 0;
      let qh = 0, qt = 0; queue[qt++] = 0;
      while(qh < qt){
        const i = queue[qh++], pi = auvs[i].g.position;
        for(let j=0;j<NA;j++){
          if(hop[j] >= 0) continue;
          if(pi.distanceToSquared(auvs[j].g.position) < RC2){ hop[j] = hop[i] + 1; par[j] = i; queue[qt++] = j; }
        }
      }
      const ta = treeL.geometry.attributes.position.array, la = linkL.geometry.attributes.position.array;
      let nt = 0, nl = 0;
      for(let i=0;i<NA;i++){
        const pi = auvs[i].g.position;
        for(let j=i+1;j<NA;j++){
          const pj = auvs[j].g.position;
          if(pi.distanceToSquared(pj) >= RC2) continue;
          const isTree = par[j] === i || par[i] === j;
          const arr = isTree ? ta : la, o = (isTree ? nt++ : nl++)*6;
          arr[o] = pi.x; arr[o+1] = pi.y; arr[o+2] = pi.z; arr[o+3] = pj.x; arr[o+4] = pj.y; arr[o+5] = pj.z;
        }
      }
      treeL.geometry.setDrawRange(0, nt*2); treeL.geometry.attributes.position.needsUpdate = true;
      linkL.geometry.setDrawRange(0, nl*2); linkL.geometry.attributes.position.needsUpdate = true;

      for(let i=0;i<NP;i++){
        const x = pp[i*3], z = pp[i*3+2];
        const r = current(x, z, t, cur);
        pp[i*3] += cur.x*dt*1.3; pp[i*3+2] += cur.z*dt*1.3; pp[i*3+1] += Math.sin(t + i)*dt*0.04;
        if(r > 7.2 || r < 0.4) respawn(i);
      }
      pg.attributes.position.needsUpdate = true;
      beacon.material.emissiveIntensity = beacon.userData.k0 * (0.55 + 0.45*Math.max(0, Math.sin(t*2.4)));
    }
    beacon.userData.k0 = 3;
    return {update, focus:[0, 2.0, 0]};
  }