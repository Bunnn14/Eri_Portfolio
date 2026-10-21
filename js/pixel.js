/* ============================================================================
   ERIEN — 32x32 pixel chibi hero in her streaming room (zero dependencies)
   ----------------------------------------------------------------------------
   Hand-painted 32x32 avatar rebuilt from the reference art:
   a WIDE grey bob with chunky V-notched bangs, glossy streaks, the little ear
   poking out on the right, big sleepy eyes set far apart, strong pink blush,
   chin cropped at the bottom.

   Her look is DATA-DRIVEN: window.SITE.hero.avatar picks the head shape,
   hair style, hair color, bangs, eyes and mouth. The CMS
   (admin.html → AVATAR tab) edits it with a live preview, served through
   window.Chibi.render(canvas, cfg) — so this file also works WITHOUT the
   hero canvas (no #asuka → it only exposes the render API).

   Behind her: a tiny pixel streaming room — RGB wall glow, an LED strip, her
   PC monitor on the left and a boom mic on the right, desk with a keyboard in
   front. Everything in the room is drawn BEHIND her so it never hides her face.

   Default behaviour = she interacts with YOU:
   - her eyes and head follow your cursor anywhere on the page
   - she blinks, breathes, and chatters quietly while you move the mouse
   - she smiles and flicks hearts when the cursor comes close
   - with no pointer (touch), her gaze wanders so she still "looks around"
   - click her for kiss / wink / shy / sparkle reactions
   ========================================================================== */
(function () {
  "use strict";

  var canvas = document.getElementById("asuka");
  var ctx = canvas ? canvas.getContext("2d") : null;
  var bubbleEl = document.getElementById("heroBubble");

  var reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ------------------------------ palette -------------------------------
     16 colours, softly shaded like the reference (not flat 8-bit).
     Slots 1-5 (the hair) are overwritten by applyHairColor() before any
     sprite canvas is built, so the preset in AV.hairColor wins:          */
  var PAL = [
    null,
    "#5f5f69", /* 1  hair dark      */
    "#87878f", /* 2  hair base      */
    "#a4a4ad", /* 3  hair light     */
    "#c9c9d1", /* 4  hair gloss     */
    "#ececed", /* 5  hair spec      */
    "#e0b49f", /* 6  skin edge      */
    "#f7dece", /* 7  skin base      */
    "#fdeee3", /* 8  skin light     */
    "#dcae9c", /* 9  skin shadow    */
    "#f7a9ae", /* 10 blush soft     */
    "#ef7f8f", /* 11 blush hot      */
    "#33333f", /* 12 eye            */
    "#23232d", /* 13 eye deep       */
    "#ffffff", /* 14 glint          */
    "#b87066", /* 15 mouth          */
    "#e0567c"  /* 16 lips           */
  ];
  var I = {
    HAIRD: 1, HAIR: 2, HAIRL: 3, GLOSS: 4, SPEC: 5,
    SKINE: 6, SKIN: 7, SKINL: 8, SKINS: 9,
    BLUSH: 10, BLUSHH: 11,
    EYE: 12, EYED: 13, GLINT: 14,
    MOUTH: 15, LIPS: 16
  };

  /* hair color presets — each row = [dark, base, light, gloss, spec].
     "ash" is the reference grey; the others follow the same 5-step ramp   */
  var HAIR_COLORS = {
    ash:    ["#5f5f69", "#87878f", "#a4a4ad", "#c9c9d1", "#ececed"], /* reference grey */
    silver: ["#6f6f7a", "#a8a8b8", "#d6d6e6", "#f0f0f8", "#ffffff"],
    black:  ["#34343d", "#4a4a56", "#5a5a68", "#6e6e80", "#818196"],
    blonde: ["#a3874b", "#e8c06a", "#ffe981", "#ffff9e", "#ffffb9"],
    ginger: ["#9e542d", "#e07840", "#ff924e", "#ffb35f", "#ffd270"],
    brown:  ["#613f29", "#8a5a3a", "#a86d46", "#cd8656", "#f19d65"],
    pink:   ["#b46c87", "#ff9ac0", "#ffbbe9", "#ffe5ff", "#ffffff"],
    lilac:  ["#7f63b4", "#b48cff", "#dbaaff", "#ffd0ff", "#fff5ff"],
    blue:   ["#3863b4", "#4f8cff", "#60aaff", "#76d0ff", "#8af5ff"],
    red:    ["#a2313a", "#e64552", "#ff5464", "#ff677a", "#ff798f"]
  };
  /* stash the chosen preset into the hair palette slots (before rasterising) */
  function applyHairColor() {
    var s = HAIR_COLORS[AV.hairColor] || HAIR_COLORS.ash;
    PAL[I.HAIRD] = s[0]; PAL[I.HAIR] = s[1]; PAL[I.HAIRL] = s[2];
    PAL[I.GLOSS] = s[3]; PAL[I.SPEC] = s[4];
  }

  var GW = 32, GH = 32;              /* sprite size, in "pixels" */

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* =========================== AVATAR OPTIONS ===========================
     Edited in the CMS (admin.html → AVATAR tab) as window.SITE.hero.avatar.
     Every value is whitelisted — an unknown value falls back to the default,
     so a typo in data.js can never break the sprite.                    */
  var DEFAULT_AVATAR = {
    headShape: "wide",   /* wide | round | slim             */
    hairStyle: "bob",    /* see AVATAR_OPTS.hairStyle       */
    hairColor: "ash",    /* see HAIR_COLORS                 */
    bangs: "jagged",     /* see AVATAR_OPTS.bangs           */
    eyes: "sleepy",      /* see AVATAR_OPTS.eyes            */
    mouth: "tiny"        /* see AVATAR_OPTS.mouth           */
  };
  var AVATAR_OPTS = {
    headShape: ["wide", "round", "slim"],
    hairStyle: ["bob", "blunt", "long", "pixie", "buns", "twin", "asym", "wavy"],
    hairColor: ["ash", "silver", "black", "blonde", "ginger", "brown", "pink", "lilac", "blue", "red"],
    bangs: ["jagged", "straight", "side", "wispy", "curtain", "bowl", "baby", "zigzag"],
    eyes: ["sleepy", "round", "sparkle", "dot", "half", "heart", "star"],
    mouth: ["tiny", "smile", "cat", "open"]
  };
  function normAvatar(cfg) {
    var a = {}, k;
    cfg = cfg || {};
    for (k in DEFAULT_AVATAR) {
      a[k] = (AVATAR_OPTS[k] && AVATAR_OPTS[k].indexOf(cfg[k]) >= 0) ? cfg[k] : DEFAULT_AVATAR[k];
    }
    return a;
  }
  var AV = normAvatar((window.SITE && window.SITE.hero) ? window.SITE.hero.avatar : null);

  /* variant geometry ------------------------------------------------------ */
  var HEADS = {
    wide:  { cx: 15.5, cy: 22,   rx: 10,  ry: 9 },
    round: { cx: 15.5, cy: 21.5, rx: 9.6, ry: 9.6 },
    slim:  { cx: 15.5, cy: 22,   rx: 8.6, ry: 9.6 }
  };
  /* bangs: deepest hair row per column over the face (cols 7..25) */
  var FRINGES = {
    jagged:   { 7: 15, 8: 16, 9: 17, 10: 16, 11: 15, 12: 14, 13: 15, 14: 16, 15: 17, 16: 16, 17: 15, 18: 14, 19: 15, 20: 16, 21: 17, 22: 16, 23: 15, 24: 14, 25: 15 },
    straight: { 7: 15, 8: 16, 9: 16, 10: 16, 11: 16, 12: 16, 13: 16, 14: 16, 15: 16, 16: 16, 17: 16, 18: 16, 19: 16, 20: 16, 21: 16, 22: 16, 23: 16, 24: 16, 25: 15 },
    side:     { 7: 13, 8: 14, 9: 14, 10: 15, 11: 15, 12: 15, 13: 16, 14: 16, 15: 16, 16: 17, 17: 17, 18: 17, 19: 18, 20: 18, 21: 18, 22: 18, 23: 18, 24: 18, 25: 18 },
    wispy:    { 7: 16, 8: 14, 9: 17, 10: 13, 11: 16, 12: 14, 13: 17, 14: 13, 15: 16, 16: 14, 17: 17, 18: 13, 19: 16, 20: 14, 21: 17, 22: 13, 23: 16, 24: 14, 25: 17 },
    curtain:  { 7: 17, 8: 17, 9: 17, 10: 17, 11: 16, 12: 16, 13: 15, 14: 14, 15: 13, 16: 13, 17: 14, 18: 15, 19: 16, 20: 16, 21: 17, 22: 17, 23: 17, 24: 17, 25: 17 },
    bowl:     { 7: 16, 8: 17, 9: 18, 10: 18, 11: 18, 12: 18, 13: 18, 14: 18, 15: 18, 16: 18, 17: 18, 18: 18, 19: 18, 20: 18, 21: 18, 22: 18, 23: 18, 24: 18, 25: 16 },
    baby:     { 7: 14, 8: 13, 9: 13, 10: 13, 11: 13, 12: 13, 13: 13, 14: 13, 15: 13, 16: 13, 17: 13, 18: 13, 19: 13, 20: 13, 21: 13, 22: 13, 23: 13, 24: 13, 25: 14 },
    zigzag:   { 7: 15, 8: 18, 9: 13, 10: 18, 11: 13, 12: 18, 13: 13, 14: 18, 15: 13, 16: 18, 17: 13, 18: 18, 19: 13, 20: 18, 21: 13, 22: 18, 23: 13, 24: 18, 25: 15 }
  };
  /* side locks: lt/lb = left lock top/bottom row, *tip = rounded end,
     band = dark underside rows, earY = centre of the ear poking out right.
     Optional extras: crown (custom dome), earRy (smaller ear for short cuts),
     buns / tails (extra shapes), waveL / waveR (scalloped per-column tips). */
  var LOCKS = {
    bob:   { lt: 14, lb: 23, ltip: 24, ltx: 3, ltw: 3, rt: 14, rb: 22, rtip: 23, rtx: 27, rtw: 3, band: [22, 24], earY: 19.5 },
    blunt: { lt: 14, lb: 19, ltip: 20, ltx: 2, ltw: 5, rt: 14, rb: 19, rtip: 20, rtx: 26, rtw: 5, band: [18, 20], earY: 17.5 },
    long:  { lt: 14, lb: 29, ltip: 30, ltx: 3, ltw: 3, rt: 14, rb: 29, rtip: 30, rtx: 27, rtw: 3, band: [27, 30], earY: 19.5 },
    pixie: { lt: 14, lb: 16, ltip: 17, ltx: 3, ltw: 3, rt: 14, rb: 16, rtip: 17, rtx: 27, rtw: 3, band: [15, 17], earY: 15.5, earRy: 1.9, crown: { cx: 16, cy: 12.5, rx: 13.5, ry: 8.5 } },
    buns:  { lt: 14, lb: 23, ltip: 24, ltx: 3, ltw: 3, rt: 14, rb: 22, rtip: 23, rtx: 27, rtw: 3, band: [22, 24], earY: 19.5, buns: true },
    twin:  { lt: 14, lb: 18, ltip: 19, ltx: 3, ltw: 3, rt: 14, rb: 18, rtip: 19, rtx: 27, rtw: 3, band: [17, 19], earY: 16.5, earRy: 2.4, tails: true },
    asym:  { lt: 14, lb: 17, ltip: 18, ltx: 2, ltw: 4, rt: 14, rb: 29, rtip: 30, rtx: 27, rtw: 3, band: [26, 30], earY: 19.5 },
    wavy:  { lt: 14, lb: 18, ltip: 24, ltx: 3, ltw: 3, rt: 14, rb: 17, rtip: 23, rtx: 26, rtw: 3, band: [21, 24], earY: 19.5, waveL: [21, 24, 23, 24, 21], waveR: [20, 23, 22, 23, 20] }
  };
  function fringe() { return FRINGES[AV.bangs] || FRINGES.jagged; }

  /* --------------------------- pixel primitives ------------------------- */
  function make(w, h) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var x = c.getContext("2d");
    x.imageSmoothingEnabled = false;
    return { c: c, x: x };
  }
  function set(px, x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= GW || y >= GH) return;
    px[y * GW + x] = c;
  }
  function get(px, x, y) {
    if (x < 0 || y < 0 || x >= GW || y >= GH) return 0;
    return px[y * GW + x];
  }
  function clear(px, x, y) { set(px, x, y, 0); }
  function rect(px, x0, y0, w, h, c) {
    for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) set(px, x, y, c);
  }
  function ell(px, cx, cy, rx, ry, c) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        var dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) set(px, x, y, c);
      }
    }
  }
  function raster(px) {
    var s = make(GW, GH), g = s.x;
    for (var i = 0; i < px.length; i++) {
      if (!px[i]) continue;
      g.fillStyle = PAL[px[i]];
      g.fillRect(i % GW, (i / GW) | 0, 1, 1);
    }
    return s.c;
  }

  /* ------------------------------ the face ------------------------------ */
  function buildFace() {
    var px = new Uint8Array(GW * GH), x, y, c;
    var hd = HEADS[AV.headShape] || HEADS.wide;
    var fr = fringe();
    /* face shape from the avatar config — cropped by the chin at the bottom */
    ell(px, hd.cx, hd.cy, hd.rx, hd.ry, I.SKIN);

    /* soft edge shading all around */
    var cp = px.slice();
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) {
      if (!get(cp, x, y)) continue;
      if (!get(cp, x - 1, y) || !get(cp, x + 1, y) || !get(cp, x, y - 1) || !get(cp, x, y + 1)) set(px, x, y, I.SKINE);
    }
    /* light on the left cheek */
    ell(px, 12, 21, 3.5, 2.5, I.SKINL);

    /* shadow the bangs cast on the forehead */
    for (c = 7; c <= 25; c++) {
      var f = (fr[c] || 15) + 1;
      if (get(px, c, f) === I.SKIN) set(px, c, f, I.SKINS);
    }

    /* blush — big soft pink patches right under the eyes */
    ell(px, 10, 24, 2.6, 1.5, I.BLUSH);
    ell(px, 10, 24, 1.2, 0.9, I.BLUSHH);
    ell(px, 20.5, 24, 3.2, 1.7, I.BLUSH);
    ell(px, 20.5, 24, 1.6, 1.0, I.BLUSHH);
    return raster(px);
  }

  /* ------------------------------ the hair ------------------------------ */
  function buildHair() {
    var px = new Uint8Array(GW * GH), x, y, c, i;
    var L = LOCKS[AV.hairStyle] || LOCKS.bob;
    var fr = fringe();
    var cr = L.crown || { cx: 16, cy: 12, rx: 14.5, ry: 9.5 };
    /* wide, flattish crown spanning almost the whole sprite */
    ell(px, cr.cx, cr.cy, cr.rx, cr.ry, I.HAIR);
    /* space buns (optional): two round buns on the top corners */
    if (L.buns) {
      ell(px, 5.5, 5.5, 3, 3, I.HAIR);
      ell(px, 26.5, 5.5, 3, 3, I.HAIR);
    }
    /* thick locks hanging down both sides of the face */
    rect(px, 2, L.lt, 5, L.lb - L.lt + 1, I.HAIR);        /* left  lock  */
    if (!L.waveL) rect(px, L.ltx, L.ltip, L.ltw, 1, I.HAIR);   /* rounded tip */
    rect(px, 26, L.rt, 5, L.rb - L.rt + 1, I.HAIR);        /* right lock  */
    if (!L.waveR) rect(px, L.rtx, L.rtip, L.rtw, 1, I.HAIR);   /* rounded tip */
    /* wavy style: scalloped per-column lengths instead of one flat tip */
    if (L.waveL) { for (i = 0; i < 5; i++) { if (L.waveL[i] > L.lb) rect(px, 2 + i, L.lb + 1, 1, L.waveL[i] - L.lb, I.HAIR); } }
    if (L.waveR) { for (i = 0; i < 5; i++) { if (L.waveR[i] > L.rb) rect(px, 26 + i, L.rb + 1, 1, L.waveR[i] - L.rb, I.HAIR); } }
    /* twin tails (optional): two tied bundles hanging below the ears */
    if (L.tails) {
      rect(px, 0, 20, 5, 9, I.HAIR);
      rect(px, 1, 29, 3, 1, I.HAIR);
      rect(px, 27, 20, 5, 9, I.HAIR);
      rect(px, 28, 29, 3, 1, I.HAIR);
      rect(px, 0, 20, 5, 2, I.HAIRD);                    /* hair ties */
      rect(px, 27, 20, 5, 2, I.HAIRD);
    }

    /* carve the window where the face shows through, below the bangs */
    for (c = 7; c <= 25; c++) {
      var f = (fr[c] || 15) + 1;
      for (y = f; y <= 21; y++) clear(px, c, y);
    }

    /* darker strands: silhouette rim, inner lock edges, the underside */
    var cp = px.slice();
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) {
      if (cp[y * GW + x] !== I.HAIR) continue;
      if (!get(cp, x - 1, y) || !get(cp, x + 1, y) || !get(cp, x, y - 1) || !get(cp, x, y + 1)) set(px, x, y, I.HAIRD);
    }
    for (y = L.lt; y <= L.ltip; y++) { if (get(px, 6, y) === I.HAIR) set(px, 6, y, I.HAIRD); }
    for (y = L.rt; y <= L.rtip; y++) { if (get(px, 26, y) === I.HAIR) set(px, 26, y, I.HAIRD); }
    for (x = 2; x <= 30; x++) { for (y = L.band[0]; y <= L.band[1]; y++) if (get(px, x, y) === I.HAIR) set(px, x, y, I.HAIRD); }

    /* glossy highlight + streaks on the upper left, plus lit bang tips
       (bang streaks only where hair actually is — some styles carve higher) */
    ell(px, 9, 7, 5.5, 2.8, I.HAIRL);
    rect(px, 5, 9, 3, 1, I.SPEC);
    rect(px, 4, 11, 2, 1, I.SPEC);
    if (get(px, 10, 15) === I.HAIR) set(px, 10, 15, I.SPEC);
    if (get(px, 20, 16) === I.HAIR) set(px, 20, 16, I.SPEC);
    if (L.buns) {
      if (get(px, 5, 4) === I.HAIR) set(px, 5, 4, I.SPEC);
      if (get(px, 27, 4) === I.HAIR) set(px, 27, 4, I.SPEC);
    }

    /* the little ear poking out of the hair on the right */
    var ey0 = L.earY, ery = L.earRy || 2.6;
    ell(px, 28, ey0, 1.6, ery, I.SKIN);
    set(px, 29, ey0 - 0.5, I.SKINE); set(px, 29, ey0 + 0.5, I.SKINE);
    set(px, 28, ey0 + 0.5, I.SKINE);                 /* inner curl */
    var curl = ey0 + 2.5;
    if (get(px, 28, curl) === I.SKIN) set(px, 28, curl, I.SKINE);
    return raster(px);
  }

  /* heavier blush, shown when she's kissed or shy */
  function buildHotBlush() {
    var px = new Uint8Array(GW * GH);
    ell(px, 20.5, 24, 3.0, 1.6, I.BLUSHH);
    ell(px, 10, 24, 2.3, 1.3, I.BLUSHH);
    return raster(px);
  }

  var faceCv, hairCv;
  var hotBlushCv = buildHotBlush();
  var frameCv = make(GW, GH);              /* per-frame composite */
  function rebuild() { applyHairColor(); faceCv = buildFace(); hairCv = buildHair(); }
  rebuild();

  /* composite face + hair + features into the little frame canvas —
     shared by the live hero loop and the CMS avatar preview */
  function paintFrame(eyeL, eyeR, mouth, ex, ey, heavy) {
    var fc = frameCv.x;
    fc.clearRect(0, 0, GW, GH);
    fc.drawImage(faceCv, 0, 0);
    fc.drawImage(hairCv, 0, 0);
    if (heavy) fc.drawImage(hotBlushCv, 0, 0);
    eyeAt(fc, 8, ex, ey, eyeL);
    eyeAt(fc, 18, ex, ey, eyeR);
    mouthAt(fc, mouth);
    return frameCv.c;
  }

  /* --------------------------- eyes & mouth ----------------------------- */
  /* c = left column of the eye; kind = blink / happy / block (normal) */
  function eyeAt(g, c, ex, ey, kind) {
    var style = AV.eyes;
    if (kind === "blink") {
      g.fillStyle = PAL[I.EYE];
      var byRow = style === "round" ? 23 : 22;
      var bw = style === "dot" ? 3 : 5, bx = style === "dot" ? c + 1 : c;
      g.fillRect(bx + ex, byRow + ey, bw, 1);
      return;
    }
    if (kind === "happy") {
      g.fillStyle = PAL[I.EYE];
      g.fillRect(c + ex, 21 + ey, 1, 1);
      g.fillRect(c + 1 + ex, 20 + ey, 3, 1);
      g.fillRect(c + 4 + ex, 21 + ey, 1, 1);
      return;
    }
    if (style === "half") {                      /* heavy half-lidded stare */
      g.fillStyle = PAL[I.SKINE];
      g.fillRect(c + ex, 20 + ey, 5, 1);         /* lid covers the top row */
      g.fillStyle = PAL[I.EYE];
      g.fillRect(c + ex, 21 + ey, 5, 1);
      g.fillStyle = PAL[I.EYED];
      g.fillRect(c + 4 + ex, 21 + ey, 1, 1);
      g.fillStyle = PAL[I.EYE];
      g.fillRect(c + 1 + ex, 22 + ey, 3, 1);
      g.fillStyle = PAL[I.GLINT];
      g.fillRect(c + ex, 21 + ey, 1, 1);
      return;
    }
    if (style === "round") {                     /* big 4x4 rounded eye */
      g.fillStyle = PAL[I.EYE];
      g.fillRect(c + 1 + ex, 20 + ey, 2, 1);
      g.fillRect(c + ex, 21 + ey, 4, 2);
      g.fillRect(c + 1 + ex, 23 + ey, 2, 1);
      g.fillStyle = PAL[I.EYED];
      g.fillRect(c + 3 + ex, 21 + ey, 1, 2);
      g.fillStyle = PAL[I.GLINT];
      g.fillRect(c + ex, 21 + ey, 1, 1);
      g.fillRect(c + 2 + ex, 22 + ey, 1, 1);
      return;
    }
    if (style === "dot") {                       /* small 3x3 dot */
      g.fillStyle = PAL[I.EYE];
      g.fillRect(c + 1 + ex, 21 + ey, 3, 2);
      g.fillRect(c + 2 + ex, 23 + ey, 2, 1);     /* rounded bottom */
      g.fillStyle = PAL[I.EYED];
      g.fillRect(c + 3 + ex, 21 + ey, 1, 2);
      g.fillStyle = PAL[I.GLINT];
      g.fillRect(c + 1 + ex, 21 + ey, 1, 1);
      return;
    }
    /* blocky styles: sleepy (default), sparkle, heart-glint, star-glint */
    g.fillStyle = PAL[I.EYE];    g.fillRect(c + ex, 20 + ey, 5, 2);
    g.fillStyle = PAL[I.EYED];   g.fillRect(c + 4 + ex, 20 + ey, 1, 2);
    g.fillRect(c + 2 + ex, 20 + ey, 1, 1);     /* little lid notch */
    g.fillStyle = PAL[I.EYE];    g.fillRect(c + 1 + ex, 22 + ey, 3, 1);
    if (style === "heart") {                    /* tiny white heart glint */
      g.fillStyle = PAL[I.GLINT];
      g.fillRect(c + 1 + ex, 20 + ey, 1, 1);
      g.fillRect(c + 3 + ex, 20 + ey, 1, 1);
      g.fillRect(c + 1 + ex, 21 + ey, 3, 1);
      g.fillRect(c + 2 + ex, 22 + ey, 1, 1);
    } else if (style === "star") {              /* 4-point twinkle glint */
      g.fillStyle = PAL[I.GLINT];
      g.fillRect(c + 1 + ex, 20 + ey, 3, 1);
      g.fillRect(c + 2 + ex, 21 + ey, 1, 1);
    } else {
      g.fillStyle = PAL[I.GLINT];
      g.fillRect(c + ex, 20 + ey, 1, 1);
      if (style === "sparkle") g.fillRect(c + 3 + ex, 21 + ey, 1, 1);
    }
  }
  function mouthAt(g, kind) {
    if (kind === "pucker") {                      /* heart-shaped kiss */
      g.fillStyle = PAL[I.LIPS];
      g.fillRect(15, 26, 1, 1); g.fillRect(17, 26, 1, 1);
      g.fillRect(15, 27, 3, 1); g.fillRect(16, 28, 1, 1);
      return;
    }
    g.fillStyle = PAL[I.MOUTH];
    if (kind === "talk1") { g.fillRect(15, 26, 2, 2); return; }
    if (kind === "talk2") { g.fillRect(14, 26, 4, 1); g.fillRect(15, 27, 2, 1); return; }
    if (kind === "smile") {                        /* forced smile arc */
      g.fillRect(14, 26, 1, 1); g.fillRect(15, 27, 2, 1); g.fillRect(17, 26, 1, 1);
      return;
    }
    /* resting mouth from the avatar config */
    if (AV.mouth === "smile") {
      g.fillRect(14, 26, 1, 1); g.fillRect(15, 27, 2, 1); g.fillRect(17, 26, 1, 1);
    } else if (AV.mouth === "cat") {              /* tiny ω */
      g.fillRect(14, 26, 1, 1); g.fillRect(15, 27, 1, 1);
      g.fillRect(16, 26, 1, 1); g.fillRect(17, 27, 1, 1);
    } else if (AV.mouth === "open") {
      g.fillRect(15, 26, 2, 2);
    } else {
      g.fillRect(15, 27, 2, 1);                   /* tiny resting line */
    }
  }

  /* ============================ THE ROOM ================================= */
  var DESKTOP = 0;                          /* desk surface row (logical px) */
  var DEV = 1;                              /* device px per logical pixel   */

  function disc(g, cx, cy, r, color) {
    g.fillStyle = color;
    for (var y = Math.floor(cy - r); y <= cy + r; y++) {
      for (var x = Math.floor(cx - r); x <= cx + r; x++) {
        var dx = x - cx, dy = (y - cy) * 1.4;    /* flatter blob */
        if (dx * dx + dy * dy <= r * r) g.fillRect(x, y, 1, 1);
      }
    }
  }

  function drawRoom(g, w, h, deskTop, t) {
    if (deskTop < 4) return;
    var i;

    /* wall: gentle vertical gradient */
    var shades = ["#1c1530", "#191229", "#151022", "#120d1d", "#0f0b18"];
    for (i = 0; i < 5; i++) {
      var y0 = Math.round(deskTop * i / 5), y1 = Math.round(deskTop * (i + 1) / 5);
      g.fillStyle = shades[i];
      g.fillRect(0, y0, w, y1 - y0);
    }

    /* RGB corner glow — magenta left, cyan right */
    var r1 = Math.max(6, Math.min(w, deskTop) * 0.30);
    disc(g, w * 0.18, deskTop * 0.52, r1, "#241544");
    disc(g, w * 0.18, deskTop * 0.52, r1 * 0.62, "#3a2170");
    var r2 = Math.max(5, Math.min(w, deskTop) * 0.26);
    disc(g, w * 0.82, deskTop * 0.45, r2, "#0f1d38");
    disc(g, w * 0.82, deskTop * 0.45, r2 * 0.6, "#153358");

    /* LED strip across the wall behind her */
    var stripY = Math.round(deskTop * 0.34);
    var seg = reduced ? 0 : Math.floor(t) % 2;
    for (var x = 1; x < w - 1; x += 3) {
      g.fillStyle = (((x / 3) | 0) + seg) % 2 ? "#6f3fb5" : "#2f5fbe";
      g.fillRect(x, stripY, 2, 1);
    }

    /* --- PC monitor on the left, standing flush on the desk --- */
    var monW = clamp(Math.round(w * 0.26), 12, 26);
    var monH = Math.round(monW * 0.72) + 3;
    var mx = 1, my = deskTop - monH;
    if (my < 0) my = 0;
    g.fillStyle = "#0e0d16"; g.fillRect(mx, my, monW, monH);          /* bezel */
    g.fillStyle = "#16243c"; g.fillRect(mx + 1, my + 1, monW - 2, monH - 2);  /* screen */
    g.fillStyle = "#29486b";                                            /* chat lines */
    g.fillRect(mx + 2, my + 3, Math.max(2, monW - 8), 1);
    g.fillRect(mx + 2, my + 5, Math.max(2, monW - 12), 1);
    g.fillRect(mx + 2, my + 7, Math.max(2, monW - 9), 1);
    g.fillStyle = "#5f9fff";                                            /* accent bar */
    g.fillRect(mx + 2, my + monH - 4, Math.max(2, monW - 10), 1);
    g.fillStyle = "#ff5461";                                            /* live dot */
    g.fillRect(mx + monW - 4, my + 2, 2, 2);

    /* --- boom mic on the right --- */
    var micW = clamp(Math.round(w * 0.05) + 2, 3, 5);
    var micH = clamp(Math.round(deskTop * 0.28), 6, 12);
    var micX = w - micW - clamp(Math.round(w * 0.06), 3, 9);
    var micTop = deskTop - micH - clamp(Math.round(deskTop * 0.18), 3, 10);
    /* boom arm coming in from the top right */
    g.fillStyle = "#2d2740";
    var ax = w - 2, ay = Math.round(micTop * 0.45), bx = micX + micW - 1, by2 = micTop;
    var steps = Math.max(1, Math.max(Math.abs(bx - ax), Math.abs(by2 - ay)));
    for (i = 0; i <= steps; i++) {
      g.fillRect(Math.round(ax + (bx - ax) * i / steps), Math.round(ay + (by2 - ay) * i / steps), 1, 1);
    }
    /* capsule */
    g.fillStyle = "#3b3549"; g.fillRect(micX, micTop, micW, micH);
    g.fillStyle = "#575070";                                           /* grille */
    g.fillRect(micX, micTop + 1, micW, 1);
    g.fillRect(micX, micTop + (micH >> 1), micW, 1);
    g.fillStyle = "#b061ff";                                           /* RGB ring */
    g.fillRect(micX, micTop + micH - 2, micW, 1);
    g.fillStyle = "#ff4d5e";                                           /* rec dot */
    g.fillRect(micX + (micW >> 1), micTop - 1, 1, 1);
  }

  /* desk in FRONT of her (she sits behind it) + keyboard with RGB */
  function drawDesk(g, w, h, deskTop, OX) {
    if (deskTop < 4 || w <= 2) return;
    g.fillStyle = "#221830";
    g.fillRect(0, deskTop, w, h - deskTop);
    g.fillStyle = "#3a2b52";
    g.fillRect(0, deskTop, w, 1);
    var kw = 14, kx = OX + 16 - (kw >> 1);
    g.fillStyle = "#15111e";
    g.fillRect(kx, deskTop + 1, kw, 2);
    g.fillStyle = "#ff4757"; g.fillRect(kx + 2, deskTop + 1, 1, 1);
    g.fillStyle = "#4f92ff"; g.fillRect(kx + 7, deskTop + 1, 1, 1);
    g.fillStyle = "#b061ff"; g.fillRect(kx + 11, deskTop + 1, 1, 1);
  }

  /* ----------------------------- particles ------------------------------- */
  var parts = [];
  function spawn(kind, x, y, n) {
    if (reduced) return;
    for (var i = 0; i < (n || 1); i++) {
      parts.push({
        k: kind, x: x, y: y,
        vx: (Math.random() - 0.5) * (kind === "star" ? 24 : 9),
        vy: kind === "star" ? (Math.random() - 0.5) * 24 : -6 - Math.random() * 8,
        life: 1
      });
    }
  }
  function drawParts(g, dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k !== "star") p.vy += 6 * dt;
      p.life -= dt * (p.k === "star" ? 2.2 : 0.72);
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      var x = Math.round(p.x), y = Math.round(p.y);
      if (p.k === "heart") {
        g.fillStyle = "#ff4757";
        g.fillRect(x, y, 1, 1); g.fillRect(x + 2, y, 1, 1);
        g.fillRect(x, y + 1, 3, 1); g.fillRect(x + 1, y + 2, 1, 1);
      } else if (p.k === "spark") {
        g.fillStyle = p.life > 0.5 ? "#6aa8ff" : "#ffffff";
        g.fillRect(x + 1, y, 1, 1); g.fillRect(x, y + 1, 3, 1); g.fillRect(x + 1, y + 2, 1, 1);
      } else {
        g.fillStyle = p.life > 0.5 ? "#c08bff" : "#ffffff";
        g.fillRect(x, y, 1, 1); g.fillRect(x - 2, y, 1, 1); g.fillRect(x + 2, y, 1, 1);
        g.fillRect(x, y - 2, 1, 1); g.fillRect(x, y + 2, 1, 1);
      }
    }
  }

  /* ------------------------------- layout -------------------------------- */
  var LW = 1, LH = 1, OX = 0, OY = 0;
  function layoutOf(w, h) {
    var px = Math.max(3, Math.round(Math.min(w, h) / 44));   /* device px per pixel */
    var LWn = Math.ceil(w / px), LHn = Math.ceil(h / px);
    var deskH = clamp(Math.round(LHn * 0.16), 6, 14);
    var deskTop = LHn - deskH;
    return {
      px: px, LW: LWn, LH: LHn, deskTop: deskTop,
      OX: Math.round(LWn / 2 - GW / 2),
      OY: deskTop - GH + 1                 /* she sits at the desk */
    };
  }
  function resize() {
    var r = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    var L = layoutOf(w, h);
    LW = L.LW; LH = L.LH; DEV = L.px; DESKTOP = L.deskTop; OX = L.OX; OY = L.OY;
    canvas.width = LW; canvas.height = LH;
    ctx.imageSmoothingEnabled = false;
    /* keep the speech bubble just above her head */
    if (bubbleEl) bubbleEl.style.top = Math.max(4, (OY - 4) * L.px) + "px";
  }

  /* ====================== PUBLIC RENDER API (always) =====================
     Works on the site AND on admin.html (which has no hero canvas), so the
     CMS can show a live avatar preview with the exact same renderer.      */
  var api = {
    /* one-frame draw of the room + avatar into any canvas */
    render: function (cv, cfg) {
      if (!cv || !cv.getContext) return;
      if (cfg !== undefined) { AV = normAvatar(cfg); rebuild(); }
      var g = cv.getContext("2d");
      var r = cv.getBoundingClientRect();
      var w = Math.round(r.width) || 340, h = Math.round(r.height) || 420;
      var L = layoutOf(Math.max(1, w), Math.max(1, h));
      cv.width = L.LW; cv.height = L.LH;
      g.imageSmoothingEnabled = false;
      var t = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
      drawRoom(g, L.LW, L.LH, L.deskTop, t);
      g.drawImage(paintFrame("block", "block", "line", 0, 0, false), L.OX, L.OY);
      drawDesk(g, L.LW, L.LH, L.deskTop, L.OX);
    },
    avatar: function () { return AV; },
    setAvatar: function (cfg) { AV = normAvatar(cfg); rebuild(); return AV; }
  };
  window.Chibi = api;

  /* without the hero canvas (CMS panel) the render API is all we need */
  if (!canvas || !ctx) return;

  /* ------------------------------- speech -------------------------------- */
  var sayT = 0;
  function say(text, ms) {
    if (!bubbleEl) return;
    bubbleEl.textContent = text;
    bubbleEl.hidden = false;
    bubbleEl.classList.remove("is-pop");
    void bubbleEl.offsetWidth;                     /* restart the pop */
    bubbleEl.classList.add("is-pop");
    clearTimeout(sayT);
    sayT = setTimeout(function () { bubbleEl.hidden = true; }, ms || 1700);
  }
  function sfx(n) { if (window.Arcade && Arcade.sfx) Arcade.sfx(n); }

  /* --------------------------- state machine ----------------------------- */
  var st = {
    name: "idle", t: 0, dur: 1, dy: 0, flip: false,
    blink: 2.4, blinkT: 0,
    gx: -0.4, gy: 0.3, tx: -0.4, ty: 0.3,          /* gaze + target */
    lean: 0,
    mouseSeen: false, lastMove: -1e9, near: false,
    wanderT: 1.8, heartT: 5,
    poseI: 0, cool: 0, started: false, visible: true
  };
  var POSES = ["WINK", "BIG SMILE", "SHY", "SPIN & TWIRL"];

  function setState(n, dur) {
    st.name = n; st.t = 0; st.dur = dur || 1; st.flip = false;
  }

  /* ---- pointer: her eyes and head follow yours, anywhere on the page ---- */
  function lookAt(cx, cy, near) {
    var r = canvas.getBoundingClientRect();
    var ox = r.left + r.width / 2, oy = r.top + r.height / 2;
    st.tx = clamp((cx - ox) / Math.max(60, r.width * 0.6), -1, 1);
    st.ty = clamp((cy - oy) / Math.max(60, r.height * 0.6), -1, 1);
    st.mouseSeen = true;
    st.lastMove = Date.now();
    if (typeof near === "boolean") st.near = near;
    else {
      var m = 40;
      st.near = cx > r.left - m && cx < r.right + m && cy > r.top - m && cy < r.bottom + m;
    }
  }
  window.addEventListener("mousemove", function (e) { lookAt(e.clientX, e.clientY); }, { passive: true });
  canvas.addEventListener("touchmove", function (e) {
    if (e.touches[0]) lookAt(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  /* ------------------------------ actions -------------------------------- */
  function begin() {
    if (st.started) return;
    st.started = true;
    if (reduced) { say("HELLO! I'M ERIEN \u2661", 2200); return; }
    /* wait for the boot overlay to clear, then make an entrance */
    var waited = 0;
    (function waitForBoot() {
      var boot = document.getElementById("boot");
      if ((!boot || !boot.isConnected) || waited > 9000) { welcome(); return; }
      waited += 180; setTimeout(waitForBoot, 180);
    })();
  }
  function welcome() {
    setState("drop", 2.7);
    st.dy = -LH;
    say("HELLO! I'M ERIEN \u2661", 1900);
    sfx("good");
    setTimeout(function () {
      say("WELCOME, PLAYER 1!", 2200);
      spawn("heart", OX + 14, OY + 10, 6);
    }, 1100);
  }

  function cyclePose() {
    if (st.name === "drop") return "";
    var name = POSES[st.poseI % POSES.length];
    st.poseI++;
    st.cool = 0.7;
    if (name === "WINK") { setState("wink", 1.0); say("EHEHE~", 1200); sfx("coin"); spawn("spark", OX + 22, OX ? OY + 20 : 0, 4); }
    else if (name === "BIG SMILE") { setState("happy", 1.2); say("LOVE YOU \u2661", 1400); spawn("heart", OX + 16, OY + 24, 6); sfx("good"); }
    else if (name === "SHY") { setState("shy", 1.1); say("/// SO SHY", 1300); sfx("move"); }
    else { setState("spin", 1.15); st.flip = true; say("TA-DA!", 1200); spawn("spark", OX + 16, OY + 14, 8); sfx("parry"); }
    return name;
  }

  function react() {
    if (st.cool > 0 || st.name === "drop") return;
    st.cool = 0.7;
    var pick = Math.random();
    if (pick < 0.4) {                                    /* the kiss */
      setState("kiss", 1.15);
      sfx("good"); say("MWAH! \u2661", 1300);
      spawn("heart", OX + 14, OY + 20, 6);
    } else if (pick < 0.65) {
      setState("wink", 0.9); sfx("coin"); say("TEHE \u2661", 1100);
      spawn("spark", OX + 22, OY + 18, 4);
    } else if (pick < 0.875) {
      setState("shy", 1.0); sfx("move"); say("///", 1000);
    } else {
      setState("happy", 0.9); sfx("parry"); say("KYAA!", 1000);
      spawn("spark", OX + 16, OY + 15, 8);
    }
  }

  canvas.addEventListener("click", react);
  canvas.addEventListener("touchend", function (e) { e.preventDefault(); react(); }, { passive: false });

  /* ------------------------------- loop ---------------------------------- */
  var last = 0, talkFrames = ["line", "talk1", "line", "talk2"];
  function loop(ts) {
    requestAnimationFrame(loop);
    if (document.hidden || !st.visible) { last = ts; return; }
    var dt = Math.min((ts - last) / 1000 || 0, 0.05);
    last = ts;
    st.t += dt;
    if (st.cool > 0) st.cool -= dt;

    /* -------- gaze: follow the cursor (or wander when there is none) ---- */
    if (!st.mouseSeen || Date.now() - st.lastMove > 4000) {
      st.wanderT -= dt;
      if (st.wanderT <= 0) {
        st.tx = (Math.random() - 0.5) * 1.4;
        st.ty = (Math.random() - 0.5) * 1.2;
        st.near = false;
        st.wanderT = 1.4 + Math.random() * 2.4;
      }
    }
    st.gx += (st.tx - st.gx) * Math.min(1, dt * 7);
    st.gy += (st.ty - st.gy) * Math.min(1, dt * 7);
    st.lean += (st.tx - st.lean) * Math.min(1, dt * 4);

    /* blinks */
    if (!reduced) {
      st.blink -= dt;
      if (st.blink <= 0) { st.blink = 2 + Math.random() * 3.4; st.blinkT = 0.13; }
      if (st.blinkT > 0) st.blinkT -= dt;
    }

    /* tiny hearts while the cursor lingers close to her */
    if (st.near && !reduced) {
      st.heartT -= dt;
      if (st.heartT <= 0) { st.heartT = 5 + Math.random() * 3; spawn("heart", OX + 12 + Math.random() * 6, OY + 24, 1); }
    }

    /* state timers */
    if (st.name !== "idle" && st.t >= st.dur) setState("idle", 1);
    if (st.name === "drop") {
      var k = Math.min(1, st.t / 0.75);
      st.dy = -LH * (1 - k) * (1 - k) * (k < 0.5 ? 1 : -0.28);   /* ease + little bounce */
      if (st.t > 0.75) st.dy = 0;
    }

    /* ---------------------------- draw ---------------------------- */
    var ex = clamp(Math.round(st.gx), -1, 1);
    var ey = clamp(Math.round(st.gy * 0.7), -1, 1);
    var kl = "block", kr = "block", m = "line", heavy = false;

    if (st.name === "kiss") { kl = kr = "blink"; m = "pucker"; heavy = true; }
    else if (st.name === "shy") { kl = kr = "blink"; m = "smile"; heavy = true; }
    else if (st.name === "wink") { kl = "blink"; kr = "block"; m = "smile"; }
    else if (st.name === "happy" || st.name === "drop") { kl = kr = "happy"; m = "smile"; }
    else {
      if (st.blinkT > 0) kl = kr = "blink";
      if (Date.now() - st.lastMove < 1400) m = talkFrames[((st.t * 7) | 0) % 4];
      else if (st.near) m = "smile";
    }

    /* compose face + hair + features into the little frame canvas */
    var frame = paintFrame(kl, kr, m, ex, ey, heavy);

    ctx.clearRect(0, 0, LW, LH);
    var time = ts / 1000;
    drawRoom(ctx, LW, LH, DESKTOP, time);       /* the room is always behind her */

    var bob = reduced ? 0 : Math.round(Math.sin(st.t * 2.2));
    var lx = reduced ? 0 : clamp(Math.round(st.lean), -1, 1);   /* head leans your way */
    var bx = OX + lx, by = OY + bob + Math.round(st.dy);
    if (st.flip) {
      ctx.save(); ctx.translate(bx + GW, by); ctx.scale(-1, 1);
      ctx.drawImage(frame, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(frame, bx, by);
    }

    /* desk in FRONT of her (she sits behind it) + keyboard with RGB */
    drawDesk(ctx, LW, LH, DESKTOP, OX);

    drawParts(ctx, dt);
  }

  /* ------------------------------ plumbing ------------------------------- */
  var ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas); else window.addEventListener("resize", resize);
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (e) { st.visible = e[0].isIntersecting; }).observe(canvas);
  }
  resize();
  requestAnimationFrame(function (ts) { last = ts; requestAnimationFrame(loop); });

  /* hero-only methods (main.js calls these) */
  api.start = begin;
  api.pose = cyclePose;
  api.cyclePose = cyclePose;
  api.kiss = react;
  api.debug = function () {
    return {
      name: st.name,
      gx: +st.gx.toFixed(2), gy: +st.gy.toFixed(2),
      near: st.near,
      talking: Date.now() - st.lastMove < 1400,
      avatar: AV
    };
  };
})();
