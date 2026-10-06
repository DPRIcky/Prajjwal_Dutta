// parts: arm6
  /*  FANUC LR MATE, J against L: the arm laps a rectangle taught on a jig
     whose user frame is rotated by the real taught R = -87.5 deg. On the
     joint-interpolated lap the axes move independently and the tool bows
     off the edge (amber trail); on the linear lap it holds the edge (cyan).
     The base triad and User Frame 1 triad are drawn, and the holo pendant
     prints the program line being run and the taught frame.  */
  const STAGE = {
    sky:[0x070806, 0x221b0d], skyL:[0xc9ab7c, 0xe8d5b0], hemi:0xffdca8,
    cam:{az:0.55, d:10.4, h:4.3, ly:1.35},
    build(root){
      plinth(root, 3.3);
      const armG = grp(root, -1.0, TOP, -0.35);
      const arm = makeArm6(armG, {style:'fanuc', tool:'pointer', L1:1.5, L2:1.35});
      // controller cabinet behind the arm
      const cab = grp(root, -2.3, TOP, -1.6); cab.rotation.y = 0.5;
      add(cab, rbox(0.8, 1.15, 0.55, 0.04), std(0x2b2f36, 0.55, 0.3), 0, 0.575, 0);
      add(cab, rbox(0.5, 0.3, 0.02, 0.01), MAT.glass, 0, 0.85, 0.28);
      const cabLed = glow(0x3fd17a, 1.6); add(cab, cylZ(0.03, 0.02, 12), cabLed, -0.25, 1.02, 0.28, false);
      add(cab, cylZ(0.05, 0.03, 16), MAT.redG, 0.25, 1.02, 0.28, false);

      // the jig on its table, rotated by the user frame's R
      const R = -87.5*Math.PI/180;
      const table = grp(root, 0.75, TOP, 0.45);
      add(table, rbox(1.7, 0.08, 1.4, 0.03), MAT.dark, 0, 0.62, 0);
      [[-0.75, -0.6], [0.75, -0.6], [-0.75, 0.6], [0.75, 0.6]].forEach(([x, z]) => add(table, new THREE.BoxGeometry(0.07, 0.6, 0.07), MAT.steel, x, 0.3, z));
      const jig = grp(table, 0, 0.68, 0); jig.rotation.y = R;
      add(jig, rbox(1.25, 0.05, 0.9, 0.02), std(0x9aa3b0, 0.3, 0.85), 0, 0, 0);
      [[-0.55, -0.37], [0.55, -0.37], [-0.55, 0.37], [0.55, 0.37]].forEach(([x, z]) => add(jig, cylY(0.025, 0.025, 0.05, 12), MAT.dark, x, 0.04, z));
      const RW = 0.82, RH = 0.5, SY = 0.032;
      const corners = [[-RW/2, -RH/2], [RW/2, -RH/2], [RW/2, RH/2], [-RW/2, RH/2]].map(([x, z]) => new THREE.Vector3(x, SY, z));
      corners.forEach((c, i) => { const r = rod(jig, 0.008, MAT.amber, false); r.userData.set(c, corners[(i+1)%4]); });
      corners.forEach(c => add(jig, cylY(0.03, 0.03, 0.01, 16), MAT.amberG, c.x, SY, c.z, false));
      // triads: base frame at the robot, User Frame 1 on the jig
      function triad(parent, len, r){
        const T = grp(parent, 0, 0, 0);
        [[0xe5534b, new THREE.Vector3(1, 0, 0)], [0x3fd17a, new THREE.Vector3(0, 1, 0)], [0x4f8fe8, new THREE.Vector3(0, 0, -1)]].forEach(([c, d]) => {
          const m = glow(c, 1.3);
          const a = rod(T, r, m, false); a.userData.set(new THREE.Vector3(), d.clone().multiplyScalar(len));
          const tip = add(T, new THREE.ConeGeometry(r*2.6, r*7, 12), m, d.x*len, d.y*len, d.z*len, false);
          tip.quaternion.setFromUnitVectors(UP, d);
          GLOWS.push({m, k:1.3});
        });
        return T;
      }
      triad(armG, 0.7, 0.012).position.set(0.55, 0.02, 0.55);
      triad(jig, 0.38, 0.008).position.set(corners[0].x, SY + 0.005, corners[0].z);

      const NT = mobile ? 80 : 160;
      const trail = swarm(root, NT, 0xf5a35c, 0.05, 0.9, (a, i) => { a[i*3+1] = -10; });
      const trailC = swarm(root, NT, 0x4fd8e8, 0.05, 0.9, (a, i) => { a[i*3+1] = -10; });
      let head = 0, acc = 0, lastLap = -1;
      const panel = holo(root, 2.2, 1.5, -0.5, 3.75, -2.1);

      const local = new THREE.Vector3(), wp = new THREE.Vector3(), tipW = new THREE.Vector3();
      const LAP = 9;
      function update(t, dt){
        const n = Math.floor(t/LAP), linear = n % 2 === 1;
        const u = (t - n*LAP)/LAP*4, i = Math.floor(u), f = smoothstep(u - i);
        const a = corners[i%4], b = corners[(i+1)%4];
        local.lerpVectors(a, b, f);
        if(!linear){
          // J: each axis interpolates on its own, so the tool bows off the straight edge
          local.y += Math.sin(f*Math.PI)*0.16;
          const nx = -(b.z - a.z), nz = b.x - a.x, nl = Math.hypot(nx, nz) || 1;
          local.x += nx/nl*Math.sin(f*Math.PI)*0.12; local.z += nz/nl*Math.sin(f*Math.PI)*0.12;
        }
        wp.copy(local); jig.localToWorld(wp); armG.worldToLocal(wp);
        arm.solve(wp.x, wp.y + 0.02, wp.z, 0);
        arm.j5.rotation.x = Math.sin(t*0.6)*0.25;
        if(n !== lastLap){
          // a fresh lap wipes its own trail, so the two passes can be compared side by side
          lastLap = n; head = 0;
          const T = linear ? trailC : trail;
          for(let k=0;k<NT;k++) T.a[k*3+1] = -10;
          T.geo.attributes.position.needsUpdate = true;
        }
        acc += dt;
        if(acc > 0.04){
          acc = 0;
          root.updateMatrixWorld(true);
          arm.tip.getWorldPosition(tipW); root.worldToLocal(tipW);
          const T = linear ? trailC : trail;
          T.a[head*3] = tipW.x; T.a[head*3+1] = tipW.y; T.a[head*3+2] = tipW.z;
          head = (head + 1) % NT; T.geo.attributes.position.needsUpdate = true;
        }
        cabLed.emissiveIntensity = Math.sin(t*3) > 0 ? 1.8 : 0.3;
        const line = linear ? 'L P[' + (5 + (i+1)%4) + '] 100mm/sec FINE' : 'J P[' + (1 + (i+1)%4) + '] 100% FINE';
        panel.draw(t, (g, w, h) => {
          holoFrame(g, w, h, 'PROG1  ' + (linear ? 'LINEAR PASS' : 'JOINT PASS'));
          holoRow(g, 108, 'line', '');
          g.fillStyle = HC().amb; g.textAlign = 'right'; g.fillText(line, 486, 108); g.textAlign = 'left';
          holoRow(g, 160, 'UF1 XYZ', '401.4  144.1  -76.9');
          holoRow(g, 212, 'UF1 WPR', '9.4  1.7  -87.5');
          holoRow(g, 264, 'edge', (i + 1) + ' / 4', (u)/4);
        });
      }
      return {update};
    }
  };
