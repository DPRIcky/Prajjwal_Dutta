  /*  BUILD the page's stage  */
  const root = new THREE.Group(); scene.add(root);
  root.userData.glows = GLOWS;   // the home-page builders register their glows here
  const api = STAGE.build(root) || {};
  const C = Object.assign({az:0.4, d:10.5, h:3.8, ly:1.4, fit:1.2, rise:1.2}, STAGE.cam || {});
  const SH = STAGE.shadow || 7.5;
  key.shadow.camera.left = key.shadow.camera.bottom = -SH;
  key.shadow.camera.right = key.shadow.camera.top = SH;
  key.shadow.camera.far = 30 + SH*2;
  key.position.set(5, 12, 7); rim.position.set(-6, 5, -8); fill.position.set(8, 2.5, -2);
  const fogK = C.d/10.5;
  scene.fog.near = 16*fogK; scene.fog.far = 60*fogK*(STAGE.fogFar || 1);
  if(STAGE.noGround){ ground.visible = false; }
  const skyD = [new THREE.Color(STAGE.sky[0]), new THREE.Color(STAGE.sky[1])];
  const skyLt = [new THREE.Color(STAGE.skyL[0]), new THREE.Color(STAGE.skyL[1])];
  const hemiC = lin(STAGE.hemi || 0xa8c8ff), WARM_SKY = lin(0xffd394);

  /*  CAMERA RIG: the machine is a backdrop, not the subject. It sits
     centred behind the page's text column under a scrim, like a
     watermark, and the camera swings slowly round it as you read (a crane
     orbit driven by scroll progress, a full 360 degrees from the top of
     the page to the bottom). The holo readouts are not shown:
     text behind body copy would only be noise.  */
  HOLOS.forEach(h => { h.mesh.visible = false; });
  const wide = () => camera.aspect > 1.05;
  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  function stageCam(p){
    const w = wide();
    const d = C.d*(w ? 1.15*C.fit : 1.55);
    const az = C.az + p*Math.PI*2;               // one full turn round the machine over the page
    pos.set(Math.sin(az)*d, C.h*(w ? 1 : 1.25) + (0.5 - p)*C.rise, Math.cos(az)*d);
    look.set(0, C.ly + (w ? 0 : 1.1), 0);
  }

  let scrollP = 0;
  function readScroll(){
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    scrollP = clamp01(window.scrollY/max);
  }
  addEventListener('scroll', readScroll, {passive:true});
  readScroll();

  let ptrNX = 0, ptrNY = 0, smNX = 0, smNY = 0;
  addEventListener('pointermove', e => {
    if(e.pointerType && e.pointerType !== 'mouse') return;   // no parallax lurch on touch
    ptrNX = e.clientX/innerWidth - 0.5; ptrNY = e.clientY/innerHeight - 0.5;
  }, {passive:true});
  addEventListener('pointerleave', () => { ptrNX = ptrNY = 0; }, {passive:true});

  /*  THEME: the same stage lit for a light page. Warm lamp skies and
     floor, more fill; additive glow vanishes on a bright sky, so
     particles switch to normal blending with deeper tints and the holo
     panels redraw as dark text on frosted glass.  */
  const groundM = ground.material, darkGround = groundM.color.clone();
  const plD = MAT.plinth.color.clone(), plTD = MAT.plTop.color.clone();
  function applyTheme(light){
    LIGHT = light;
    renderer.toneMappingExposure = light ? 0.78 : 0.82;
    hemi.intensity = light ? 0.75 : 0.38;
    hemi.groundColor.copy(light ? lin(0x8f7550) : lin(0x05080f));
    hemi.color.copy(hemiC); if(light) hemi.color.lerp(WARM_SKY, 0.65);
    key.color.copy(light ? lin(0xffd59a) : new THREE.Color(0xffffff));
    key.intensity = light ? 2.0 : 2.3;
    groundM.color.copy(light ? lin(0xc4ad84) : darkGround);
    MAT.plinth.color.copy(light ? lin(0x8a7552) : plD);
    MAT.plTop.color.copy(light ? lin(0xbfa880) : plTD);
    grid.visible = !light && !STAGE.noGround; gridL.visible = light && !STAGE.noGround;
    const S = light ? skyLt : skyD;
    skyU.top.value.copy(S[0]); skyU.hor.value.copy(S[1]); scene.fog.color.copy(S[1]);
    PARTS.forEach(p => {
      p.m.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      p.m.color.copy(p.c); if(light) p.m.color.multiplyScalar(0.42);
      p.m.needsUpdate = true;
    });
    SHAFTS.forEach(sh => { sh.userData.op = sh.userData.op0*(light ? 0.3 : 1); sh.material.opacity = sh.userData.op; });
    HOLOS.forEach(h => { h.m.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending; h.m.needsUpdate = true; h.reset(); });
    if(api.theme) api.theme(light);
  }
  applyTheme(LIGHT);

  /* power-up on load: glows ramp in and the machine settles to full scale */
  function power(e){
    GLOWS.forEach(g => { g.m.emissiveIntensity = g.k*(0.18 + 0.82*e); });
    root.scale.setScalar(0.9 + 0.1*e);
  }

  function resize(){
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    readScroll();
    if(reduced) still();
  }
  addEventListener('resize', resize, {passive:true});
  renderer.setSize(innerWidth, innerHeight);

  /* Reduced motion: no rAF loop. The stage is composed as a still and
     recomposed only when the layout, scroll or theme changes. */
  function still(){
    stageCam(scrollP); camera.position.copy(pos); camera.lookAt(look);
    sky.position.copy(camera.position);
    power(1);
    if(api.update){ for(let i=0;i<3;i++) api.update(2.0 + i/60, 1/60); }
    renderer.render(scene, camera);
  }
  window.addEventListener('themechange', e => { applyTheme(e.detail === 'light'); if(reduced) still(); });
  if(reduced){
    still();
    let q = false;
    addEventListener('scroll', () => { if(q) return; q = true; requestAnimationFrame(() => { q = false; still(); }); }, {passive:true});
    return;
  }

  const clock = new THREE.Clock();
  let t = 0, intro = 0, frames = 0, probe = 0, tuned = false;
  stageCam(scrollP);
  const curPos = pos.clone(), curLook = look.clone();
  function animate(){
    requestAnimationFrame(animate);
    /* clamped dt: a backgrounded tab resumes where it paused */
    const dt = Math.min(clock.getDelta(), 0.05);
    if(document.hidden) return;
    t += dt;
    /* one-time quality probe: if this machine can't hold 45 fps, drop
       to DPR 1 and soften shadows rather than ship a stuttering page */
    if(!tuned){
      frames++; probe += dt;
      if(probe > 2.5){
        tuned = true;
        if(frames/probe < 45){
          if(renderer.getPixelRatio() > 1){ renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight); }
          key.shadow.mapSize.set(1024, 1024); if(key.shadow.map){ key.shadow.map.dispose(); key.shadow.map = null; }
        }
      }
    }
    stageCam(scrollP);
    const kc = damp(0.05, dt);
    curPos.lerp(pos, kc); curLook.lerp(look, kc);
    const kp = damp(0.07, dt);
    smNX += (ptrNX - smNX)*kp; smNY += (ptrNY - smNY)*kp;
    camera.position.copy(curPos);
    camera.position.x += Math.sin(t*0.13)*0.3;
    camera.position.y += Math.cos(t*0.09)*0.18;
    camera.lookAt(curLook);
    camera.translateX( smNX*1.4);
    camera.translateY(-smNY*0.9);
    camera.lookAt(curLook);
    sky.position.copy(camera.position);
    intro = Math.min(1, intro + dt/1.6);
    power(smoothstep(intro));
    if(api.update) api.update(t, dt);
    renderer.render(scene, camera);
  }
  animate();
