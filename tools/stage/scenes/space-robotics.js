// parts:
  /*  CART-POLE LQR THROUGH AN EARTHQUAKE: the page's own plant (M = m =
     1 kg, L = 1 m, cart on a +/-2.5 m rail) linearised about upright,
     with the CARE gain for the tuned weights Q = diag(50, 5, 100, 20),
     R = 0.1, applied at the 100 Hz control rate. The earthquake
     generator pushes the cart the whole time: a sum of sines across 0.5 to 4 Hz at 15 N base amplitude with noise on top,
     drawn as the magenta arrow. u = -Kx keeps the pole up.  */
  const STAGE = {
    sky:[0x050a16, 0x0f2140], skyL:[0xc4ad84, 0xe6d6b4], hemi:0xa8c8ff,
    cam:{az:0.05, d:8.8, h:3.0, ly:1.25},
    build(root){
      plinth(root, 3.0);
      // the page's plant, and K = solve_continuous_are(A, B, Q, R) for the tuned weights (solved offline with SciPy)
      const M = 1, m = 1, L = 1, g = 9.81, h = 0.01;
      const A = [[0,1,0,0],[0,0,m*g/M,0],[0,0,0,1],[0,0,(M+m)*g/(M*L),0]];
      const Kg = [-22.3607, -18.8236, -219.8897, -44.2216];
      // rig: rail, end stops, cart, hinge, pole
      const S = 0.85, RAIL = 2.5*S, Y = TOP + 0.55;
      add(root, rbox(RAIL*2 + 0.5, 0.06, 0.34, 0.02), MAT.dark, 0, TOP + 0.03, 0);
      [-1, 1].forEach(s => {
        add(root, rbox(0.12, 0.55, 0.3, 0.03), MAT.dark, s*(RAIL + 0.2), TOP + 0.3, 0);
        add(root, rbox(0.05, 0.22, 0.22, 0.02), MAT.redG, s*(RAIL + 0.12), Y, 0, false);
      });
      [-0.08, 0.08].forEach(z => add(root, cylX(0.022, RAIL*2 + 0.3, 16), MAT.alu, 0, Y, z));
      for(let k=-5;k<=5;k++) add(root, rbox(0.012, 0.012, 0.3, 0.004), k ? MAT.steel : MAT.amberG, k*0.5*S, TOP + 0.065, 0, k ? true : false);
      const cart = grp(root, 0, Y, 0);
      add(cart, rbox(0.42, 0.16, 0.3, 0.04), std(0x3f87c6, 0.36, 0.3));
      add(cart, rbox(0.36, 0.03, 0.26, 0.01), MAT.shell, 0, 0.095, 0);
      [-1, 1].forEach(s => [-0.08, 0.08].forEach(z => add(cart, cylZ(0.035, 0.03, 16), MAT.dark, s*0.14, -0.04, z)));
      const hinge = grp(cart, 0, 0.13, 0.17);
      add(hinge, cylZ(0.04, 0.06, 20), MAT.steel);
      const pole = grp(hinge, 0, 0, 0.02);
      add(pole, cylY(0.022, 0.022, L*S, 16), MAT.alu, 0, L*S/2, 0);
      add(pole, new THREE.SphereGeometry(0.07, 24, 16), MAT.amber, 0, L*S, 0);
      // the earthquake push, drawn as an arrow on the cart
      const qM = glow(0xe14bd2, 1.6);
      const shaftA = add(root, cylX(0.025, 1, 12), qM, 0, Y, 0, false), head = new THREE.ConeGeometry(0.06, 0.16, 16); head.rotateZ(-Math.PI/2);
      const tip = add(root, head, qM, 0, Y, 0, false);
      GLOWS.push({m:qM, k:1.6});
      // trail of the pole tip
      const NT = mobile ? 60 : 120, trail = swarm(root, NT, 0x4fd8e8, 0.04, 0.8, (a, i) => { a[i*3+1] = -10; });
      const panel = holo(root, 2.2, 1.5, -1.0, 3.6, -1.7);
      // earthquake: fixed random components across 0.5 to 4 Hz
      const NC = 8, comp = [];
      for(let k=0;k<NC;k++) comp.push({f:0.5 + 3.5*R01(k + 3), a:0.5 + 0.5*R01(k + 30), p:R01(k + 60)*6.283});
      const asum = comp.reduce((s, c) => s + c.a, 0);
      let x = [0.3, 0, 0.04, 0], u = 0, d = 0, ctl = 0, head2 = 0, acc = 0;
      function update(t, dt){
        dt = Math.min(dt, 0.05);
        const sub = Math.max(1, Math.round(dt/0.001)), hh = dt/sub;
        for(let s=0;s<sub;s++){
          ctl += hh;
          if(ctl >= h){
            ctl -= h;
            u = -(Kg[0]*x[0] + Kg[1]*x[1] + Kg[2]*x[2] + Kg[3]*x[3]);
          }
          const tt = t - dt + s*hh;
          d = 15*comp.reduce((a2, c) => a2 + c.a*Math.sin(6.283*c.f*tt + c.p), 0)/asum + (Math.random() - 0.5)*1.5;
          const F = u + d;
          const dx = [x[1], A[1][2]*x[2] + F/M, x[3], A[3][2]*x[2] - F/(M*L)];
          for(let i=0;i<4;i++) x[i] += dx[i]*hh;
          if(x[0] > 2.5){ x[0] = 2.5; x[1] = Math.min(0, x[1]); } if(x[0] < -2.5){ x[0] = -2.5; x[1] = Math.max(0, x[1]); }
        }
        cart.position.x = x[0]*S;
        pole.rotation.z = -x[2];
        const len = Math.min(1.2, Math.abs(d)/15*0.9) + 0.05, sgnD = Math.sign(d) || 1;
        const start = cart.position.x - sgnD*(0.24 + len);
        shaftA.scale.set(len, 1, 1); shaftA.position.set(start + sgnD*len/2, Y + 0.02, -0.02);
        tip.position.set(start + sgnD*(len + 0.06), Y + 0.02, -0.02); tip.rotation.z = sgnD > 0 ? 0 : Math.PI;
        acc += dt;
        if(acc > 0.03){
          acc = 0;
          trail.a[head2*3] = cart.position.x + Math.sin(x[2])*L*S; trail.a[head2*3+1] = Y + 0.13 + Math.cos(x[2])*L*S; trail.a[head2*3+2] = 0.19;
          head2 = (head2 + 1) % NT; trail.geo.attributes.position.needsUpdate = true;
        }
        panel.draw(t, (gx, w, hgt) => {
          holoFrame(gx, w, hgt, 'LQR  u = -Kx  100 Hz');
          holoRow(gx, 108, 'pole angle', sgn(x[2], 3) + ' rad', 0.5 + x[2]/0.3);
          holoRow(gx, 160, 'cart position', sgn(x[0], 2) + ' m', 0.5 + x[0]/5);
          holoRow(gx, 212, 'control force', sgn(u, 1) + ' N', 0.5 + u/140);
          holoRow(gx, 264, 'earthquake force', sgn(d, 1) + ' N', 0.5 + d/40);
        });
      }
      return {update};
    }
  };
