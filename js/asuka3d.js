/* ============================================================================
   ASUKA KAZAMA — procedural voxel hero (Three.js r128, global build)
   ----------------------------------------------------------------------------
   A pixel-art-styled 3D Asuka Kazama (Tekken) built entirely out of boxes:
   black hair + sakura pins, white bow top, black haori, red obi, thigh script.
   Rendered at low resolution and upscaled for an authentic arcade look.
   ========================================================================== */
(function () {
  "use strict";

  var canvas = document.getElementById("asuka");
  if (!canvas || !window.THREE) return;

  var THREE = window.THREE;
  var state = {
    renderer: null, scene: null, camera: null, root: null,
    parts: {}, sparks: [], dust: [], dragging: false,
    lastX: 0, yaw: -0.4, yawTarget: -0.4, tilt: 0, tiltTarget: 0,
    attack: 0, poseIndex: 0, poseT: 0, visible: true, clock: null,
    shake: 0, parry: 0, camY: 9.5, onScreen: null, focus: null, scale: 0.82
  };

  /* --------------------------- small helpers ---------------------------- */
  function mat(color, emissive) {
    return new THREE.MeshLambertMaterial({
      color: color,
      emissive: emissive || 0x000000,
      emissiveIntensity: emissive ? 0.35 : 0
    });
  }
  function box(w, h, d, color, emissive) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, emissive));
    return m;
  }
  function pivot(x, y, z) {
    var g = new THREE.Group();
    g.position.set(x, y, z);
    return g;
  }

  /* ------------------------------ the model ----------------------------- */
  var C = {
    skin: 0xf3cda9, skinDark: 0xe0b48d,
    hair: 0x151119, hairHi: 0x2b2233,
    white: 0xf5f3f0, trim: 0xe9e7f2,
    robe: 0x141119, obi: 0xc9243f, sandal: 0xa51d2c,
    sakura: 0xff9ec4, eye: 0x1b1b28, ink: 0x3a2f2a
  };

  function buildAsuka() {
    var g = new THREE.Group();
    var p = {};

    /* ---- legs + sandals ---- */
    [-1.5, 1.5].forEach(function (x, i) {
      var leg = box(2.1, 5.6, 2.1, C.skin);
      leg.position.set(x, 3.4, 0);
      g.add(leg);
      var foot = box(2.5, 1.1, 3.2, C.sandal);
      foot.position.set(x, 0.55, 0.35);
      g.add(foot);
      if (i === 0) { /* Kazama thigh script */
        var tat = box(1.1, 2.6, 0.25, C.ink);
        tat.position.set(x - 0.3, 4.6, 1.1);
        g.add(tat);
      }
    });

    /* ---- hips + red obi ---- */
    var hips = box(4.6, 2.4, 2.9, C.skin);
    hips.position.set(0, 7.3, 0);
    g.add(hips);

    var obi = pivot(0, 8.4, 0);
    obi.add(box(5.2, 2.6, 3.3, C.obi));
    var knot = box(1.6, 1.6, 1.2, C.obi);
    knot.position.set(0, -0.2, 2);
    obi.add(knot);
    var sash = box(1.2, 3.6, 0.5, C.obi);
    sash.position.set(1.1, -2.2, 1.9);
    obi.add(sash);
    g.add(obi);

    /* ---- torso: white bow top ---- */
    var torso = box(4.5, 4.2, 2.8, C.white);
    torso.position.set(0, 11.1, 0);
    g.add(torso);
    for (var i = -1; i <= 1; i++) {           /* the little bows */
      var bow = box(1.1, 0.9, 0.5, C.trim);
      bow.position.set(i * 1.4, 12.4 - Math.abs(i) * 0.2, 1.45);
      g.add(bow);
    }

    /* ---- haori robe: back panel + one draped sleeve ---- */
    var back = box(5.4, 7.2, 0.9, C.robe);
    back.position.set(0, 10.2, -1.9);
    g.add(back);
    var hemStripe = box(5.6, 0.7, 1.0, C.trim);
    hemStripe.position.set(0, 6.8, -1.9);
    g.add(hemStripe);
    /* white trim stripe down the back so the robe reads from behind */
    var backTrim = box(0.7, 6.2, 1.0, C.trim);
    backTrim.position.set(0, 10.4, -1.9);
    g.add(backTrim);

    /* ---- arms (pivoted at the shoulders) ---- */
    var armL = pivot(-2.7, 12.6, 0);
    var armLm = box(1.6, 5, 1.6, C.skin);
    armLm.position.y = -2.5;
    armL.add(armLm);
    var sleeveL = box(2.3, 3.2, 2.3, C.robe);   /* draped haori sleeve */
    sleeveL.position.y = -2.6;
    armL.add(sleeveL);
    var fistL = box(1.7, 1.6, 1.7, C.skinDark);
    fistL.position.y = -5.2;
    armL.add(fistL);
    g.add(armL);

    var armR = pivot(2.7, 12.6, 0);
    var armRm = box(1.6, 5, 1.6, C.skin);
    armRm.position.y = -2.5;
    armR.add(armRm);
    var fistR = box(1.7, 1.6, 1.7, C.skinDark);
    fistR.position.y = -5.2;
    armR.add(fistR);
    g.add(armR);

    /* ---- head ---- */
    var neck = box(1.7, 1.1, 1.7, C.skin);
    neck.position.set(0, 13.5, 0);
    g.add(neck);

    var head = pivot(0, 15.9, 0);
    var skull = box(4.4, 4.2, 4, C.skin);
    head.add(skull);

    /* hair: cap, bangs, side tufts, back mass, bun + sakura pins */
    var cap = box(4.9, 1.7, 4.5, C.hair);
    cap.position.y = 1.9;
    head.add(cap);
    var bangs = box(4.9, 1.1, 0.7, C.hair);
    bangs.position.set(0, 1.5, 1.95);
    head.add(bangs);
    [-2.3, 2.3].forEach(function (x) {
      var tuft = box(0.8, 3, 4.2, C.hair);
      tuft.position.set(x, 0.5, 0);
      head.add(tuft);
    });
    var backHair = box(4.9, 3.6, 1.1, C.hair);
    backHair.position.set(0, 0.3, -2.1);
    head.add(backHair);
    var bun = box(2.6, 2.4, 2.4, C.hair);
    bun.position.set(-0.2, 2.5, -1.9);
    head.add(bun);
    var pony = box(1.6, 2.6, 1.6, C.hairHi);
    pony.position.set(-0.2, 1, -3.1);
    head.add(pony);
    [[-1.9, 2.6, 0.9], [-1.2, 3.1, -0.4], [-2.4, 1.9, -0.6], [-0.6, 2.9, 1.1]].forEach(function (c) {
      var petal = box(0.8, 0.8, 0.8, C.sakura, 0x551a33);
      petal.position.set(c[0], c[1], c[2]);
      head.add(petal);
    });

    /* eyes + brows sit proud of the face plane (front face is +Z) */
    [-1.05, 1.05].forEach(function (x) {
      var eye = box(0.95, 0.95, 0.45, C.eye);
      eye.position.set(x, -0.35, 2.15);
      head.add(eye);
      var brow = box(1.3, 0.4, 0.4, C.hair);
      brow.position.set(x, 0.55, 2.15);
      head.add(brow);
    });
    var mouth = box(0.7, 0.3, 0.4, 0xb4626a);
    mouth.position.set(0, -1.5, 2.15);
    head.add(mouth);
    g.add(head);

    p.armL = armL; p.armR = armR; p.head = head; p.obi = obi; p.torso = torso;
    g.userData.parts = p;
    return g;
  }

  /* ------------------------------- stage -------------------------------- */
  function buildStage() {
    var g = new THREE.Group();
    var floor = new THREE.Mesh(
      new THREE.CylinderGeometry(9.5, 9.5, 0.8, 24),
      new THREE.MeshLambertMaterial({ color: 0x0d0d1c })
    );
    floor.position.y = -0.6;
    g.add(floor);

    var ring = new THREE.Group();
    for (var i = 0; i < 28; i++) {
      var a = (i / 28) * Math.PI * 2;
      var seg = box(1.5, 0.5, 1.5, i % 2 ? 0xff2e88 : 0x22e6ff, 0x330a1e);
      seg.position.set(Math.cos(a) * 10.4, -0.2, Math.sin(a) * 10.4);
      seg.lookAt(0, -0.2, 0);
      ring.add(seg);
    }
    g.add(ring);
    g.userData.ring = ring;
    return g;
  }

  function buildDust() {
    var colors = [0xff2e88, 0x22e6ff, 0xffd23f, 0x9d4edd];
    for (var i = 0; i < 42; i++) {
      var c = box(0.5, 0.5, 0.5, colors[i % colors.length], 0x222222);
      var a = Math.random() * Math.PI * 2, r = 7 + Math.random() * 8;
      c.position.set(Math.cos(a) * r, Math.random() * 18, Math.sin(a) * r * 0.6);
      c.userData = { base: c.position.y, bx: c.position.x, sp: 0.4 + Math.random(), ph: Math.random() * 6.28 };
      state.dust.push(c);
      state.scene.add(c);
    }
  }

  function spawnSpark(x, y, z, color, n, spread) {
    n = n || 18;
    for (var i = 0; i < n; i++) {
      var s = box(0.45, 0.45, 0.45, color, color);
      s.position.set(x, y, z);
      s.userData = {
        vx: (Math.random() - 0.5) * spread,
        vy: Math.random() * spread * 0.6 + 0.4,
        vz: (Math.random() - 0.5) * spread,
        life: 1
      };
      state.sparks.push(s);
      state.scene.add(s);
    }
  }

  /* ------------------------------- poses -------------------------------- */
  var POSES = [
    /* 0: Kazama stance (fists up, elbows in) */
    { armL: [-0.42, 0, -0.48], armR: [-0.62, 0, 0.58], lean: 0.06, name: "KAZAMA STANCE" },
    /* 1: victory */
    { armL: [-2.45, 0, -0.42], armR: [-2.45, 0, 0.42], lean: -0.04, name: "WIN POSE" },
    /* 2: wave to chat */
    { armL: [-0.18, 0, -0.22], armR: [-2.55, 0, 0.85], lean: 0, name: "WAVING TO CHAT" }
  ];

  function applyPose(i, t) {
    var P = POSES[i % POSES.length], parts = state.parts;
    if (!parts.armL) return;
    parts.armL.rotation.x = P.armL[0] + Math.sin(t * 1.6) * 0.06;
    parts.armL.rotation.z = P.armL[2];
    parts.armR.rotation.x = P.armR[0] + Math.sin(t * 1.6 + 1) * 0.06;
    parts.armR.rotation.z = P.armR[2];
    state.root.rotation.z = P.lean * 0.4;
    state.bodyLean = P.lean;
  }

  /* ------------------------------ renderer ------------------------------ */
  function pixelSize() {
    var w = window.innerWidth;
    return w < 700 ? 2.2 : w < 1200 ? 2.8 : 3.4;
  }

  function resize() {
    if (!state.renderer) return;
    var r = canvas.getBoundingClientRect();
    var ps = pixelSize();
    var w = Math.max(160, Math.floor(r.width / ps));
    var h = Math.max(120, Math.floor(r.height / ps));
    state.renderer.setSize(w, h, false);
    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();

    /* desktop: the canvas sits on the right, so centre her in it.
       mobile: the canvas is a strip, so nudge her to its right edge. */
    var wide = window.innerWidth > 880;
    var s = wide ? 0.72 : 0.95;
    state.scale = s;
    state.camera.position.z = wide ? 46 : 33;

    /* how many world units fit across the canvas? place her relative to that
       so she always sits on the right, whatever the device width. */
    var visH = 2 * state.camera.position.z * Math.tan(38 * Math.PI / 360);
    var visW = visH * state.camera.aspect;
    state.focus.x = wide ? 0 : visW * 0.22;

    if (state.root) {
      state.root.scale.setScalar(s);
      state.root.position.x = state.focus.x;
    }
    if (state.stage) {
      state.stage.scale.setScalar(s);
      state.stage.position.x = state.focus.x;
    }
    state.dust.forEach(function (d) { d.userData.ox = state.focus.x; });
    state.onScreen = null;
  }

  function init() {
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
    } catch (e) { return false; }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(1);
    state.renderer = renderer;

    var scene = new THREE.Scene();
    state.scene = scene;

    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    camera.position.set(0, 9.5, 42);
    camera.lookAt(0, 8.5, 0);
    state.camera = camera;

    /* lights: soft key + arcade rim colours */
    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    var key = new THREE.DirectionalLight(0xffffff, 0.75);
    key.position.set(6, 14, 12);
    scene.add(key);
    var rimA = new THREE.PointLight(0xff2e88, 1.25, 60);
    rimA.position.set(-12, 12, 8);
    scene.add(rimA);
    var rimB = new THREE.PointLight(0x22e6ff, 1.1, 60);
    rimB.position.set(13, 9, -6);
    scene.add(rimB);

    var stage = buildStage();
    scene.add(stage);
    state.stage = stage;

    var asuka = buildAsuka();
    asuka.position.y = 0.4;
    scene.add(asuka);
    state.root = asuka;
    state.parts = asuka.userData.parts;

    buildDust();
    state.clock = new THREE.Clock();
    state.focus = new THREE.Vector3(0, 9.5, 0);

    resize();
    window.addEventListener("resize", resize);
    /* the framing is derived from the canvas aspect, so also react to pure CSS
       size changes (mobile svh shifts, breakpoint flips) that fire no resize. */
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    window.addEventListener("scroll", function () { state.onScreen = null; }, { passive: true });

    bindPointer();
    requestAnimationFrame(loop);
    return true;
  }

  /* --------------------------- interaction ------------------------------ */
  function bindPointer() {
    var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();

    function down(e) {
      state.dragging = true;
      state.lastX = (e.touches ? e.touches[0].clientX : e.clientX);
    }
    function move(e) {
      var x = (e.touches ? e.touches[0].clientX : e.clientX);
      var y = (e.touches ? e.touches[0].clientY : e.clientY);
      if (state.dragging) {
        state.yawTarget += (x - state.lastX) * 0.01;
        state.lastX = x;
      }
      var r = canvas.getBoundingClientRect();
      state.tiltTarget = ((x - r.left) / r.width - 0.5) * 0.35;
      state.camY = 9.5 - ((y - r.top) / r.height - 0.5) * 3;
    }
    function up() { state.dragging = false; }

    canvas.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    canvas.addEventListener("touchstart", down, { passive: true });
    canvas.addEventListener("touchmove", move, { passive: true });
    canvas.addEventListener("touchend", up);

    /* click her = parry spark */
    canvas.addEventListener("click", function (e) {
      var r = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ndc, state.camera);
      var hit = ray.intersectObject(state.root, true);
      var at = hit.length ? hit[0].point : null;
      if (at) {
        spawnSpark(at.x, at.y, at.z, 0x22e6ff, 14, 0.42);
        state.parry = 0.35;
        if (window.Arcade && window.Arcade.sfx) window.Arcade.sfx("parry");
      }
    });
  }

  /* ------------------------------- public ------------------------------- */
  function attack() {
    state.attack = 1;
    var p = state.parts;
    if (!p || !p.armR) return;
    var wp = new THREE.Vector3();
    p.armR.getWorldPosition(wp);
    spawnSpark(wp.x + 1, wp.y - 4, wp.z + 3, 0xffd23f, 22, 0.6);
    spawnSpark(wp.x + 1, wp.y - 4, wp.z + 3, 0xff2e88, 12, 0.35);
    if (window.Arcade && window.Arcade.sfx) window.Arcade.sfx("hit");
    state.shake = 0.35;
  }

  function cyclePose() {
    state.poseIndex = (state.poseIndex + 1) % POSES.length;
    if (window.Arcade && window.Arcade.sfx) window.Arcade.sfx("coin");
    return POSES[state.poseIndex].name;
  }

  /* is the hero roughly on screen? (cheap throttled check) */
  function onScreen(now) {
    if (state.onScreen !== null && now - (state.onScreenT || 0) < 400) return state.onScreen;
    var r = canvas.getBoundingClientRect();
    state.onScreen = r.bottom > -80 && r.top < (window.innerHeight || 0) + 80;
    state.onScreenT = now;
    return state.onScreen;
  }

  /* -------------------------------- loop -------------------------------- */
  function loop() {
    requestAnimationFrame(loop);
    var nowMs = (window.performance && performance.now()) || Date.now();
    if (document.hidden || !onScreen(nowMs)) { state.clock.getDelta(); return; }

    var dt = Math.min(state.clock.getDelta(), 0.05);
    var t = state.clock.getElapsedTime();

    /* rotation + parallax */
    if (!state.dragging) state.yawTarget += dt * 0.11;
    state.yaw += (state.yawTarget - state.yaw) * 0.08;
    state.tilt += (state.tiltTarget - state.tilt) * 0.06;
    state.root.rotation.y = state.yaw;
    state.root.rotation.x = state.tilt * 0.25;

    /* idle bob + breathing */
    state.root.position.y = 0.4 + Math.sin(t * 1.5) * 0.18;
    if (state.parts.torso) state.parts.torso.scale.y = 1 + Math.sin(t * 1.9) * 0.012;
    if (state.parts.head) state.parts.head.rotation.z = Math.sin(t * 0.9) * 0.04;

    applyPose(state.poseIndex, t);

    /* attack: quick forward punch + lunge */
    if (state.attack > 0) {
      state.attack = Math.max(0, state.attack - dt * 2.6);
      var k = Math.sin((1 - state.attack) * Math.PI);
      if (state.parts.armR) state.parts.armR.rotation.x = -1.2 - k * 1.5;
      state.root.position.z = k * 1.6;
      state.root.rotation.y = state.yaw - k * 0.25;
    } else {
      state.root.position.z += (0 - state.root.position.z) * 0.15;
    }

    /* parry flash */
    if (state.parry > 0) {
      state.parry -= dt;
      state.root.position.x = state.focus.x + Math.sin(t * 60) * 0.12;
    } else state.root.position.x = state.focus.x;

    /* camera + screen shake */
    var sh = state.shake || 0;
    if (sh > 0) state.shake = Math.max(0, sh - dt * 1.6);
    state.camera.position.x = state.focus.x + (Math.random() - 0.5) * state.shake * 3;
    state.camera.position.y = (state.camY || 9.5) + (Math.random() - 0.5) * state.shake * 3;
    state.camera.lookAt(state.focus.x, 8.5, 0);

    /* stage ring + dust */
    if (state.stage && state.stage.userData.ring) state.stage.userData.ring.rotation.y -= dt * 0.35;
    for (var i = state.dust.length - 1; i >= 0; i--) {
      var d = state.dust[i];
      d.position.x = d.userData.bx + (d.userData.ox || 0);
      d.position.y = d.userData.base + Math.sin(t * d.userData.sp + d.userData.ph) * 1.6;
      d.rotation.x += dt; d.rotation.y += dt * 0.7;
    }

    /* sparks */
    for (var j = state.sparks.length - 1; j >= 0; j--) {
      var s = state.sparks[j], u = s.userData;
      u.vy -= dt * 7;
      s.position.x += u.vx; s.position.y += u.vy * dt * 60 * 0.02; s.position.z += u.vz;
      s.position.y += u.vy * dt;
      u.life -= dt * 1.5;
      s.scale.setScalar(Math.max(0.01, u.life));
      if (u.life <= 0) { state.scene.remove(s); s.geometry.dispose(); state.sparks.splice(j, 1); }
    }

    state.renderer.render(state.scene, state.camera);
  }

  /* ------------------------------- exports ------------------------------ */
  window.Asuka3D = {
    _state: state,
    start: function () {
      var ok = false;
      try { ok = init(); } catch (e) { ok = false; }
      if (!ok) {
        canvas.style.display = "none";
        var host = canvas.parentNode;
        var img = document.createElement("img");
        img.className = "hero__fallback";
        img.src = "assets/img/photo6.jpg";
        img.alt = "Erien Amamiya as Asuka Kazama";
        img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" +
          "object-position:60% 18%;filter:saturate(1.1) contrast(1.06)";
        host.insertBefore(img, host.firstChild);
        var tag = document.querySelector(".hero__stagetag");
        if (tag) tag.textContent = "ASUKA KAZAMA // COSPLAY";
      }
      return ok;
    },
    attack: attack,
    cyclePose: cyclePose
  };
})();
