// parts: buildBlimp dressBlimp
  /*  AEROFUSION BLIMP, catch and score: the Defend the Republic game this
     team flew. The blimp chases a free balloon until the net under its
     gondola scoops it up, carries it to the next goal (circle, triangle,
     square) and puts it through the frame. While it hunts, the gondola
     camera's view is drawn: a frustum out to a quadrant reticle locked on
     the balloon, the same quadrant feed the vision pipeline steered by.  */
  const STAGE = {
    sky:[0x070a1c, 0x1e2452], skyL:[0x9a8a86, 0xe3c99c], hemi:0xc0b8ff,
    cam:{az:0.3, d:12.0, h:3.6, ly:2.6, fit:1.12},
    build(root){
      const api = buildBlimp(root);
      const fx = dressBlimp(root, api);
      // gondola camera to reticle: four frustum edges, four corner brackets, a quadrant cross
      const fr = lines(root, 16, 0x4fd8e8, 0.35);
      const camW = new THREE.Vector3(), ball = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), dir = new THREE.Vector3();
      const C = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], a = new THREE.Vector3(), b = new THREE.Vector3();
      const camPt = new THREE.Object3D(); camPt.position.set(0.37, -1.02, 0); api.bl.add(camPt);
      let vis = 0;
      function update(t, dt){
        api.update(t, dt); fx(t, dt);
        const seek = api.st.phase === 'seek';
        vis += ((seek ? 1 : 0) - vis)*damp(0.1, dt);
        fr.reset();
        if(vis > 0.02){
          root.updateMatrixWorld(true);
          camPt.getWorldPosition(camW); root.worldToLocal(camW);
          ball.copy(api.ball.position);
          dir.subVectors(ball, camW).normalize();
          right.crossVectors(dir, UP).normalize(); up.crossVectors(right, dir);
          const r = 0.48, br = 0.16;
          [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], i) => C[i].copy(ball).addScaledVector(right, sx*r).addScaledVector(up, sy*r));
          C.forEach((c, i) => {
            fr.seg(camW, c);
            // corner bracket: two short arms pointing back along the square's edges
            const sx = i === 0 || i === 3 ? 1 : -1, sy = i < 2 ? 1 : -1;
            a.copy(c).addScaledVector(right, sx*br); fr.seg(c, a);
            b.copy(c).addScaledVector(up, sy*br); fr.seg(c, b);
          });
          // the quadrant cross the controller reads its error from
          a.copy(ball).addScaledVector(right, -r*0.5); b.copy(ball).addScaledVector(right, r*0.5); fr.seg(a, b);
          a.copy(ball).addScaledVector(up, -r*0.5); b.copy(ball).addScaledVector(up, r*0.5); fr.seg(a, b);
        }
        fr.done();
        fr.m.opacity = 0.55*vis;
      }
      return {update, focus:api.focus};
    }
  };
