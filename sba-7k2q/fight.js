/* ==========================================================================
   SBA – « Secret Bar » : jeu de combat qui suit la session de surf
   - Solo (contre l'ordi), duo sur le même écran, duo en ligne (l'hôte calcule
     la partie, l'invité envoie ses commandes et reçoit l'état).
   - Poing, pied, lancer de bière, coup spécial quand la jauge est pleine.
   ========================================================================== */

export function createFight(api) {
  const { THREE, renderer, buildSurfer, buildTrash, buildPalm, Sound, getLang, isTouch, reducedMotion } = api;
  const $ = (s, r) => (r || document).querySelector(s);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ---------------- Textes ---------------- */
  const TXT = {
    fr: {
      round: 'Round {n}', fight: 'Baston !', ko: 'K.O. !', timeUp: 'Temps écoulé !', draw: 'Égalité !',
      roundWin: '{name} gagne le round', matchWin: '{name} remporte le Secret Bar !', perfect: 'Sans une égratignure !',
      cpu: 'Ordi', punch: 'Poing', kick: 'Pied', beer: 'Bière', special: 'Spécial',
      bonus: 'Bonus surf : jauge +{n} %', rematch: 'Revanche', resurf: 'Retour à l’eau', menu: 'Menu',
      waitHost: 'En attente de l’hôte…', overKicker: 'Secret Bar · Dakar', left: 'Ton pote a quitté la partie.',
      keys1: 'J1 : A/Q D · Z/W saut · F poing · G pied · H bière · R spécial',
      keys2: 'J2 : ← → · ↑ saut · J poing · K pied · L bière · I spécial',
      keysSolo: '← → / A D · ↑ saut · J ou F poing · K ou G pied · L ou H bière · Espace spécial',
      sp: {
        shugo: 'Invocation démoniaque !', quentin: 'Pause pipi stratégique !', victor: 'Vroussos Services : le 4x4 arrive !',
        max: 'Charge du rhinocéros !', luca: 'Pizza volante !',
      },
      gross: 'BEURK !', squash: 'ÉCRASÉ !', drink: 'Glou glou…', call: 'Allô, Vroussos ?', roar: 'RHAAAAA !', pizza: 'Mamma mia !', summon: 'Lok’tar !',
    },
    en: {
      round: 'Round {n}', fight: 'Fight!', ko: 'K.O.!', timeUp: 'Time up!', draw: 'Draw!',
      roundWin: '{name} wins the round', matchWin: '{name} rules the Secret Bar!', perfect: 'Flawless!',
      cpu: 'CPU', punch: 'Punch', kick: 'Kick', beer: 'Beer', special: 'Special',
      bonus: 'Surf bonus: meter +{n}%', rematch: 'Rematch', resurf: 'Back in the water', menu: 'Menu',
      waitHost: 'Waiting for the host…', overKicker: 'Secret Bar · Dakar', left: 'Your mate left the game.',
      keys1: 'P1: A/Q D · W/Z jump · F punch · G kick · H beer · R special',
      keys2: 'P2: ← → · ↑ jump · J punch · K kick · L beer · I special',
      keysSolo: '← → / A D · ↑ jump · J or F punch · K or G kick · L or H beer · Space special',
      sp: {
        shugo: 'Demonic summoning!', quentin: 'Tactical pee break!', victor: 'Vroussos Services: here comes the 4x4!',
        max: 'Rhino charge!', luca: 'Flying pizza!',
      },
      gross: 'EWWW!', squash: 'SQUASHED!', drink: 'Glug glug…', call: 'Hello, Vroussos?', roar: 'RHAAAAA!', pizza: 'Mamma mia!', summon: 'Lok’tar!',
    },
  };
  const tx = (k, v) => {
    const d = TXT[getLang()] || TXT.fr;
    let s = k.split('.').reduce((o, p) => (o ? o[p] : undefined), d);
    if (s == null) s = k.split('.').reduce((o, p) => (o ? o[p] : undefined), TXT.fr) || k;
    if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => (v[n] ?? m));
    return s;
  };

  /* ---------------- Scène : le Secret Bar ---------------- */
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
  const M = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
  const B = (c) => new THREE.MeshBasicMaterial({ color: c });
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const CYL = new THREE.CylinderGeometry(1, 1, 1, 12);
  const SPH = new THREE.SphereGeometry(1, 14, 10);
  const CONE = new THREE.ConeGeometry(1, 1, 10);
  const box = (w, h, d, m, x = 0, y = 0, z = 0, p) => { const o = new THREE.Mesh(BOX, m); o.scale.set(w, h, d); o.position.set(x, y, z); (p || scene).add(o); return o; };
  const cyl = (r, h, m, x = 0, y = 0, z = 0, p) => { const o = new THREE.Mesh(CYL, m); o.scale.set(r, h, r); o.position.set(x, y, z); (p || scene).add(o); return o; };
  const sph = (r, m, x = 0, y = 0, z = 0, p) => { const o = new THREE.Mesh(SPH, m); o.scale.setScalar(r); o.position.set(x, y, z); (p || scene).add(o); return o; };

  function textTexture(text, w, h, opts) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (opts.bg) { g.fillStyle = opts.bg; g.fillRect(0, 0, w, h); }
    if (opts.border) { g.strokeStyle = opts.border; g.lineWidth = h * 0.08; g.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h * 0.12 > 0 ? h - h * 0.12 : h); }
    g.font = `800 ${opts.size || h * 0.62}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (opts.shadow) { g.fillStyle = opts.shadow; g.fillText(text, w / 2 + 4, h / 2 + 5); }
    g.fillStyle = opts.color || '#fff'; g.fillText(text, w / 2, h / 2 + 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }

  // ciel de fin de journée
  (() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#2a1d52'); gr.addColorStop(0.42, '#b9507b'); gr.addColorStop(0.68, '#f4974a'); gr.addColorStop(1, '#ffd98c');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    scene.background = t;
  })();
  scene.fog = new THREE.Fog(0xe39470, 28, 110);
  scene.add(new THREE.HemisphereLight(0xffe3c4, 0x5a3550, 1.25));
  const sunL = new THREE.DirectionalLight(0xffc690, 2.1); sunL.position.set(-10, 12, 9); scene.add(sunL);
  const barLight = new THREE.PointLight(0xffb347, 6, 9, 1.6); barLight.position.set(0, 3.2, -2.2); scene.add(barLight);

  // sable, mer, soleil
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(220, 70), M(0xe8cd9c)); sand.rotation.x = -Math.PI / 2; sand.position.set(0, -0.02, 12); scene.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(500, 160), new THREE.MeshPhongMaterial({ color: 0x2f7fa6, shininess: 80, specular: 0xffb07a })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.05, -100); scene.add(sea);
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false })); sunDisc.position.set(30, 9, -170); scene.add(sunDisc);
  for (let i = 0; i < 6; i++) { // vaguelettes au loin
    const w = box(rand(6, 14), 0.06, 0.35, B(0xffe1b8), rand(-40, 40), 0.0, rand(-60, -25)); w.material.transparent = true; w.material.opacity = 0.55;
  }

  // plancher en bois
  const plankA = M(0x9b6b43), plankB = M(0x8a5d39);
  for (let i = -16; i < 16; i++) box(0.48, 0.12, 6.4, i % 2 ? plankA : plankB, i * 0.5 + 0.25, 0, -0.6);
  box(16.2, 0.1, 0.12, M(0x5e3b20), 0, 0.03, 2.6);

  // bar
  const wood = M(0x6e4526), woodDark = M(0x3b2412), bamboo = M(0xc9a15a);
  box(9.6, 3.4, 0.2, M(0xa8744a), 0, 1.7, -5.0);
  box(8.4, 1.1, 0.9, wood, 0, 0.55, -3.6);
  box(8.8, 0.12, 1.15, woodDark, 0, 1.15, -3.6);
  for (let i = 0; i < 28; i++) cyl(0.06, 1.0, bamboo, -4.05 + i * 0.3, 0.55, -3.12);
  for (const y of [1.85, 2.5]) box(7.4, 0.07, 0.42, woodDark, 0, y, -4.75);
  const bottleCols = [0x2f8f2a, 0x8a4b12, 0xe5e5d8, 0x2f8f2a, 0xc23b22, 0x3a7a93, 0x8a4b12];
  for (const y of [1.85, 2.5]) {
    for (let i = 0; i < 22; i++) {
      const m = new THREE.MeshPhongMaterial({ color: pick(bottleCols), transparent: true, opacity: 0.88, shininess: 90 });
      const h = rand(0.28, 0.4); const x = -3.4 + i * 0.32 + rand(-0.05, 0.05);
      cyl(0.065, h, m, x, y + h / 2 + 0.03, -4.72);
      cyl(0.025, 0.12, m, x, y + h + 0.09, -4.72);
    }
  }
  for (const x of [-3, -1.5, 1.5, 3]) { cyl(0.05, 0.75, woodDark, x, 0.42, -2.75); cyl(0.24, 0.07, M(0xd9483b), x, 0.82, -2.75); }
  // poteaux + toit de paille
  for (const [x, z] of [[-4.7, -4.9], [4.7, -4.9], [-4.7, -2.3], [4.7, -2.3]]) cyl(0.11, 3.6, bamboo, x, 1.8, z);
  const thatchGeo = new THREE.ConeGeometry(6.9, 1.7, 4, 1); thatchGeo.rotateY(Math.PI / 4);
  const thatch = new THREE.Mesh(thatchGeo, M(0xcaa45c)); thatch.scale.set(1, 1, 0.5); thatch.position.set(0, 4.35, -3.6); scene.add(thatch);
  for (let i = 0; i < 40; i++) { const f = box(0.25, rand(0.35, 0.55), 0.04, M(i % 2 ? 0xb88f45 : 0xd8b46a), -4.9 + i * 0.25, 3.35, -1.95); f.rotation.z = rand(-0.12, 0.12); }
  // enseigne
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.95), new THREE.MeshBasicMaterial({ map: textTexture('SECRET BAR', 768, 200, { bg: '#1c1208', color: '#F2A900', shadow: '#d9483b', border: '#F2A900' }) }));
  sign.position.set(0, 3.05, -1.9); scene.add(sign);
  const sub = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.32), new THREE.MeshBasicMaterial({ map: textTexture('SURF & BEER ASSOCIATION', 768, 140, { color: '#ffffff', size: 70 }), transparent: true }));
  sub.position.set(0, 2.42, -1.9); scene.add(sub);
  // guirlande lumineuse
  const bulbs = [];
  for (let i = 0; i <= 26; i++) {
    const u = i / 26, x = -8 + u * 16, y = 3.75 - Math.sin(u * Math.PI) * 0.7;
    const b = sph(0.06, B(pick([0xffd25a, 0xff8a4b, 0xfff0b0, 0x7fe0ff])), x, y, -1.7);
    bulbs.push(b);
  }
  // palmiers, planches, glacière, torches
  for (const [x, z, h, s] of [[-9.5, -3.5, 6.5, 1], [10.5, -2.5, 7, 1], [-14, -9, 7.5, 1], [15, -10, 6, 1]]) {
    const p = buildPalm(h); p.position.set(x, 0, z); p.scale.setScalar(s); scene.add(p);
  }
  const boardCols = [0xF2A900, 0x3A7A93, 0x4CAF2F, 0xffffff];
  boardCols.forEach((c, i) => { const b = new THREE.Mesh(SPH, M(c)); b.scale.set(0.3, 1.15, 0.05); b.position.set(6.1 + i * 0.42, 1.1, -4.6); b.rotation.z = -0.12; scene.add(b); });
  const cooler = box(0.9, 0.55, 0.55, M(0xF2A900), -6.4, 0.33, -3.6); box(0.95, 0.12, 0.6, M(0xffffff), -6.4, 0.66, -3.6); void cooler;
  const flames = [];
  for (const x of [-7.6, 7.6]) {
    cyl(0.05, 1.6, bamboo, x, 0.8, 1.6);
    const fl = new THREE.Mesh(CONE, new THREE.MeshBasicMaterial({ color: 0xffa024 })); fl.scale.set(0.12, 0.32, 0.12); fl.position.set(x, 1.78, 1.6); scene.add(fl); flames.push(fl);
    const pl = new THREE.PointLight(0xff8a2a, 2.5, 5, 2); pl.position.set(x, 1.9, 1.7); scene.add(pl); flames.push(pl);
  }

  /* ---------------- Accessoires & effets ---------------- */
  function buildBottle() { const g = buildTrash('gazelle'); const o = g.children[1]; g.remove(o); o.rotation.set(0, 0, 0); o.scale.setScalar(0.55); return o; }
  function buildPizza() {
    const g = new THREE.Group();
    cyl(0.34, 0.045, M(0xe0a453), 0, 0, 0, g);
    cyl(0.3, 0.05, M(0xc9361f), 0, 0.01, 0, g);
    for (let i = 0; i < 9; i++) { const a = rand(0, 6.28), r = rand(0.04, 0.24); cyl(0.07, 0.02, M(0xf4d36b), Math.cos(a) * r, 0.04, Math.sin(a) * r, g).scale.set(rand(0.05, 0.09), 0.02, rand(0.05, 0.09)); }
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28, r = i % 2 ? 0.2 : 0.11; cyl(0.045, 0.025, M(0x8e1f16), Math.cos(a) * r, 0.05, Math.sin(a) * r, g); }
    for (let i = 0; i < 5; i++) { const a = rand(0, 6.28), r = rand(0.05, 0.22); box(0.06, 0.02, 0.03, M(0x2f8a3a), Math.cos(a) * r, 0.06, Math.sin(a) * r, g); }
    return g;
  }
  function buildPhone() { const g = new THREE.Group(); box(0.05, 0.16, 0.09, M(0x111111), 0, 0, 0, g); box(0.052, 0.12, 0.07, B(0x7ad0ff), 0, 0, 0, g).position.x = -0.002; return g; }
  function buildLaptop() {
    const g = new THREE.Group();
    box(0.62, 0.04, 0.44, M(0x3a3f45), 0, 0.02, 0, g);
    const lid = new THREE.Group(); lid.position.set(0.21, 0.04, 0); g.add(lid);
    box(0.03, 0.42, 0.44, M(0x2b2f34), 0, 0.21, 0, lid);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.36), new THREE.MeshBasicMaterial({ map: textTexture('⚔', 128, 128, { bg: '#3b0d6b', color: '#c48bff', size: 90 }) }));
    scr.rotation.y = -Math.PI / 2; scr.position.set(-0.017, 0.21, 0); lid.add(scr);
    lid.rotation.z = 0.25;
    g.userData.lid = lid;
    return g;
  }
  function buildPortal() {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.08, 8, 40), new THREE.MeshBasicMaterial({ color: 0xb04dff }));
    const inner = new THREE.Mesh(new THREE.CircleGeometry(0.7, 40), new THREE.MeshBasicMaterial({ color: 0x23003a, transparent: true, opacity: 0.85 }));
    const swirl = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.55, 40, 1, 0, 4.2), new THREE.MeshBasicMaterial({ color: 0x7a2bd6, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    g.add(inner, ring, swirl); swirl.position.z = 0.01;
    g.userData.swirl = swirl;
    return g;
  }
  function buildDemon() {
    const g = new THREE.Group();
    const skin = M(0xa3162b), dark = M(0x3b0a2a), hornM = M(0xeadcc0);
    const eye = new THREE.MeshBasicMaterial({ color: 0xffe94a });
    sph(0.24, skin, 0, 0, 0, g).scale.set(0.24, 0.3, 0.22);
    sph(0.18, skin, -0.03, 0.36, 0, g);
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(CONE, hornM); h.scale.set(0.05, 0.22, 0.05); h.position.set(0, 0.55, s * 0.1); h.rotation.x = s * 0.45; g.add(h);
      sph(0.035, eye, -0.17, 0.39, s * 0.065, g);
      const arm = new THREE.Mesh(CYL, skin); arm.scale.set(0.045, 0.3, 0.045); arm.position.set(-0.12, 0.02, s * 0.22); arm.rotation.z = 1.0; g.add(arm);
      const claw = sph(0.06, dark, -0.27, 0.1, s * 0.22, g); void claw;
      const wing = new THREE.Group(); wing.position.set(0.12, 0.15, s * 0.14); g.add(wing);
      const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(0.55, 0.35); shape.lineTo(0.42, 0.05); shape.lineTo(0.6, -0.12); shape.lineTo(0.3, -0.1); shape.lineTo(0, 0);
      const wm = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshLambertMaterial({ color: 0x4a0d3a, side: THREE.DoubleSide }));
      wm.rotation.y = s * Math.PI / 2; wing.add(wm);
      wing.userData.s = s;
      (g.userData.wings = g.userData.wings || []).push(wing);
    }
    const tail = new THREE.Mesh(CYL, skin); tail.scale.set(0.025, 0.4, 0.025); tail.position.set(0.18, -0.25, 0); tail.rotation.z = -0.8; g.add(tail);
    const tip = new THREE.Mesh(CONE, dark); tip.scale.set(0.06, 0.1, 0.06); tip.position.set(0.33, -0.4, 0); tip.rotation.z = -2.4; g.add(tip);
    return g;
  }
  function buildTruck() {
    const g = new THREE.Group();
    const white = M(0xf3f3f0), dark = M(0x1d2328), glass = new THREE.MeshPhongMaterial({ color: 0x23394a, shininess: 120 });
    box(3.1, 0.75, 1.55, white, 0, 0.88, 0, g);
    box(1.75, 0.72, 1.45, white, -0.3, 1.6, 0, g);
    box(1.6, 0.44, 1.49, glass, -0.3, 1.66, 0, g);
    box(0.06, 0.44, 1.3, glass, 0.56, 1.64, 0, g).rotation.z = -0.25;
    box(0.18, 0.26, 1.65, dark, 1.6, 0.62, 0, g);
    for (const s of [-1, 1]) {
      box(0.04, 0.14, 0.3, new THREE.MeshBasicMaterial({ color: 0xfff3b0 }), 1.56, 0.98, s * 0.52, g);
      for (const x of [-1.05, 1.05]) {
        const w = new THREE.Mesh(CYL, dark); w.scale.set(0.43, 0.32, 0.43); w.rotation.x = Math.PI / 2; w.position.set(x, 0.43, s * 0.74); g.add(w);
        const hub = new THREE.Mesh(CYL, M(0xb9bec4)); hub.scale.set(0.18, 0.34, 0.18); hub.rotation.x = Math.PI / 2; hub.position.set(x, 0.43, s * 0.74); g.add(hub);
      }
      const label = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.34), new THREE.MeshBasicMaterial({ map: textTexture('VROUSSOS SERVICES', 640, 116, { color: '#1d2328', size: 62 }), transparent: true }));
      label.position.set(0.05, 0.9, s * 0.785); if (s < 0) label.rotation.y = Math.PI; g.add(label);
    }
    for (const y of [0.7, 1.05]) box(0.05, 0.05, 1.5, M(0x9aa1a8), 1.72, y, 0, g);
    const spare = new THREE.Mesh(CYL, dark); spare.scale.set(0.4, 0.25, 0.4); spare.rotation.z = Math.PI / 2; spare.position.set(-1.7, 1.0, 0); g.add(spare);
    box(1.6, 0.06, 1.3, dark, -0.3, 2.0, 0, g);
    const board = new THREE.Mesh(SPH, M(0xF2A900)); board.scale.set(1.3, 0.05, 0.28); board.position.set(-0.3, 2.08, 0); g.add(board);
    return g;
  }

  // effets d'un combattant (un jeu par joueur)
  function makeFx() {
    const fx = {
      laptop: buildLaptop(), portal: buildPortal(), demons: [buildDemon(), buildDemon(), buildDemon()],
      truck: buildTruck(), pizza: buildPizza(),
    };
    for (const k of ['laptop', 'portal', 'truck']) { fx[k].visible = false; scene.add(fx[k]); }
    for (const d of fx.demons) { d.visible = false; scene.add(d); }
    // jet jaune (Quentin)
    const N = 80;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    fx.stream = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xf2d43a, size: 0.085, transparent: true, opacity: 0.9, depthWrite: false }));
    fx.stream.visible = false; fx.stream.frustumCulled = false; scene.add(fx.stream);
    return fx;
  }

  // particules (étincelles, mousse, poussière)
  const PN = 500;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN), pGrav = new Float32Array(PN);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const parts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
  parts.frustumCulled = false; scene.add(parts);
  for (let i = 0; i < PN; i++) pPos[i * 3 + 1] = -50;
  let pIdx = 0;
  const tmpC = new THREE.Color();
  function emit(x, y, z, n, color, speed, grav = 9, spread = 1) {
    if (reducedMotion) n = Math.ceil(n / 3);
    for (let k = 0; k < n; k++) {
      const i = pIdx; pIdx = (pIdx + 1) % PN;
      pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
      pVel[i * 3] = rand(-1, 1) * speed * spread; pVel[i * 3 + 1] = rand(0.2, 1.2) * speed; pVel[i * 3 + 2] = rand(-0.6, 0.6) * speed;
      tmpC.set(Array.isArray(color) ? pick(color) : color);
      pCol[i * 3] = tmpC.r; pCol[i * 3 + 1] = tmpC.g; pCol[i * 3 + 2] = tmpC.b;
      pLife[i] = rand(0.35, 0.8); pGrav[i] = grav;
    }
  }
  function updateParts(dt) {
    for (let i = 0; i < PN; i++) {
      if (pLife[i] <= 0) continue;
      pLife[i] -= dt;
      if (pLife[i] <= 0) { pPos[i * 3 + 1] = -50; continue; }
      pVel[i * 3 + 1] -= pGrav[i] * dt;
      pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
      if (pPos[i * 3 + 1] < 0.07) { pPos[i * 3 + 1] = 0.07; pVel[i * 3 + 1] *= -0.3; pVel[i * 3] *= 0.6; }
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
  }

  // projectiles (rendu par réserve d'objets)
  const pool = { beer: [], pizza: [] };
  function poolGet(k, i) {
    while (pool[k].length <= i) { const o = k === 'beer' ? buildBottle() : buildPizza(); if (k === 'beer') o.scale.setScalar(0.75); scene.add(o); pool[k].push(o); }
    return pool[k][i];
  }

  /* ---------------- Interface HTML ---------------- */
  const root = document.createElement('div');
  root.id = 'fight-ui'; root.hidden = true;
  root.innerHTML = `
    <div class="f-top">
      <div class="f-side f-p0"><img class="f-photo" alt=""><div class="f-info"><span class="f-name"></span><span class="f-hp"><i class="f-hp-lag"></i><i class="f-hp-val"></i></span><span class="f-meter"><i></i><b>MAX</b></span><span class="f-wins"><i></i><i></i></span></div></div>
      <div class="f-timer">60</div>
      <div class="f-side f-p1"><img class="f-photo" alt=""><div class="f-info"><span class="f-name"></span><span class="f-hp"><i class="f-hp-lag"></i><i class="f-hp-val"></i></span><span class="f-meter"><i></i><b>MAX</b></span><span class="f-wins"><i></i><i></i></span></div></div>
    </div>
    <div class="f-banner" aria-live="assertive"></div>
    <div class="f-special"><img alt=""><span></span></div>
    <div class="f-pops" aria-hidden="true"></div>
    <div class="f-keys"></div>
    <div class="f-pads"></div>
    <div class="f-over" hidden>
      <div class="panel panel-small">
        <p class="step f-over-kicker"></p>
        <img class="f-over-photo" alt="" width="110" height="110">
        <h2 class="f-over-title"></h2>
        <p class="muted f-over-sub"></p>
        <div class="stack">
          <button type="button" class="btn btn-primary" data-f="rematch"></button>
          <button type="button" class="btn btn-ghost" data-f="surf"></button>
          <button type="button" class="btn btn-ghost" data-f="menu"></button>
        </div>
        <p class="tiny muted f-over-wait" hidden></p>
      </div>
    </div>`;
  document.getElementById('app').appendChild(root);
  const ui = {
    sides: [0, 1].map((i) => {
      const el = $('.f-p' + i, root);
      return { el, photo: $('.f-photo', el), name: $('.f-name', el), hp: $('.f-hp-val', el), lag: $('.f-hp-lag', el), meter: $('.f-meter i', el), meterBox: $('.f-meter', el), wins: [...el.querySelectorAll('.f-wins i')] };
    }),
    timer: $('.f-timer', root), banner: $('.f-banner', root), special: $('.f-special', root), pops: $('.f-pops', root),
    keys: $('.f-keys', root), pads: $('.f-pads', root), over: $('.f-over', root),
  };

  function padHTML(p) {
    return `<div class="f-pad" data-p="${p}">
      <div class="f-dpad">
        <button type="button" class="f-btn" data-a="l" aria-label="←">◀</button>
        <button type="button" class="f-btn f-up" data-a="up" aria-label="↑">▲</button>
        <button type="button" class="f-btn" data-a="r" aria-label="→">▶</button>
      </div>
      <div class="f-acts">
        <button type="button" class="f-btn f-act" data-a="punch"><span>👊</span><small>${tx('punch')}</small></button>
        <button type="button" class="f-btn f-act" data-a="kick"><span>🦶</span><small>${tx('kick')}</small></button>
        <button type="button" class="f-btn f-act" data-a="beer"><span>🍺</span><small>${tx('beer')}</small></button>
        <button type="button" class="f-btn f-act f-sp" data-a="special"><span>★</span><small>${tx('special')}</small></button>
      </div>
    </div>`;
  }
  function buildPads() {
    ui.pads.innerHTML = '';
    if (!isTouch) return;
    const players = F.mode === 'local' ? [0, 1] : [F.me];
    ui.pads.className = 'f-pads' + (F.mode === 'local' ? ' is-duo' : '');
    ui.pads.innerHTML = players.map(padHTML).join('');
    for (const pad of ui.pads.querySelectorAll('.f-pad')) {
      const p = +pad.dataset.p;
      for (const b of pad.querySelectorAll('.f-btn')) {
        const a = b.dataset.a;
        const down = (e) => { e.preventDefault(); b.classList.add('is-pressed'); press(p, a, true); };
        const up = (e) => { if (e) e.preventDefault(); b.classList.remove('is-pressed'); press(p, a, false); };
        b.addEventListener('pointerdown', down);
        b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
        b.addEventListener('contextmenu', (e) => e.preventDefault());
      }
    }
  }

  /* ---------------- État du combat ---------------- */
  const ARENA = 6.2;
  const ROUND_TIME = 60;
  const WINS_NEEDED = 2;
  const MOVES = {
    punch: { dur: 0.32, hitAt: 0.1, hitEnd: 0.2, range: 1.05, dmg: 6, kb: 0.6, stun: 0.28 },
    kick: { dur: 0.5, hitAt: 0.19, hitEnd: 0.32, range: 1.35, dmg: 10, kb: 1.2, stun: 0.42 },
    beer: { dur: 0.5, throwAt: 0.26, cd: 1.1 },
  };
  const SPECIAL_DUR = { shugo: 3.0, quentin: 3.0, victor: 3.0, max: 2.1, luca: 1.9 };

  const F = {
    on: false, mode: 'solo', role: 'local', me: 0, net: null, onExit: null,
    phase: 'off', phaseT: 0, round: 1, timer: ROUND_TIME, winner: -1, fs: [], projs: [], events: [], outEv: [], shake: 0,
    sendT: 0, lastSnap: null, chars: null, bonus: [0, 0], names: ['', ''],
  };

  function newFighter(ch, side, name) {
    const model = buildSurfer(ch, false, true);
    scene.add(model);
    const u = model.userData;
    const bottle = buildBottle(); bottle.position.set(0.12, -0.53, -0.27); bottle.visible = false; u.arms[0].add(bottle);
    const pizza = buildPizza(); pizza.position.set(0.15, -0.8, -0.25); pizza.visible = false; u.arms[0].add(pizza);
    const phone = buildPhone(); phone.position.set(0.12, -0.5, -0.27); phone.visible = false; u.arms[0].add(phone);
    let horn = null;
    if (ch.id === 'max') {
      horn = new THREE.Group();
      const h1 = new THREE.Mesh(CONE, M(0xddd5c4)); h1.scale.set(0.05, 0.24, 0.05); h1.rotation.z = Math.PI / 2 + 0.35; h1.position.set(-0.2, 0.0, 0); horn.add(h1);
      const h2 = new THREE.Mesh(CONE, M(0xddd5c4)); h2.scale.set(0.035, 0.12, 0.035); h2.rotation.z = Math.PI / 2 + 0.5; h2.position.set(-0.15, 0.1, 0); horn.add(h2);
      horn.visible = false; u.headG.add(horn);
    }
    return {
      ch, name, side, model, u, bottle, pizza, phone, horn, fx: makeFx(),
      x: side ? 2.3 : -2.3, y: 0, vy: 0, vx: 0, kx: 0, dash: 0, face: side ? -1 : 1,
      hp: 100, lag: 100, meter: 0, act: null, actT: 0, hitDone: false, stun: 0, flat: 0, cdThrow: 0, block: false,
      inp: { l: 0, r: 0, up: 0 }, buf: null, ev: {}, wins: 0, spx0: 0, tick: 0, aiT: 0, walkT: 0, prevHp: 100,
    };
  }
  function disposeFighter(f) {
    scene.remove(f.model);
    for (const k of ['laptop', 'portal', 'truck', 'stream']) scene.remove(f.fx[k]);
    for (const d of f.fx.demons) scene.remove(d);
  }

  function resetRound() {
    F.fs.forEach((f, i) => Object.assign(f, {
      x: i ? 2.3 : -2.3, y: 0, vy: 0, vx: 0, kx: 0, dash: 0, face: i ? -1 : 1, hp: 100, lag: 100, prevHp: 100,
      act: null, actT: 0, stun: 0, flat: 0, cdThrow: 0, buf: null, ev: {}, block: false,
    }));
    F.projs = [];
    F.timer = ROUND_TIME;
    F.winner = -1;
    setPhase('intro');
  }
  function setPhase(p) {
    F.phase = p; F.phaseT = 0;
    if (p === 'intro') { banner(tx('round', { n: F.round }), 'is-round'); Sound.tone(523, 0.18, 'square', 0.12); }
  }

  function evt(e) { F.events.push(e); if (F.role === 'host') F.outEv.push(e); }

  /* ---------------- Commandes ---------------- */
  function press(p, a, down) {
    if (F.role === 'guest') { // l'invité envoie ses commandes à l'hôte
      if (p !== F.me) return;
      const g = F.guestInp;
      if (a === 'l' || a === 'r' || a === 'up') g[a] = down ? 1 : 0;
      else if (down) g.acts.push(a);
      sendGuestInput(true);
      return;
    }
    const f = F.fs[p];
    if (!f) return;
    if (a === 'l' || a === 'r' || a === 'up') f.inp[a] = down ? 1 : 0;
    else if (down) f.buf = { a, t: 0.22 };
  }
  F.guestInp = { l: 0, r: 0, up: 0, acts: [] };
  function sendGuestInput(force) {
    const g = F.guestInp;
    if (!F.net) return;
    if (force || g.acts.length) { F.net.send({ t: 'fin', l: g.l, r: g.r, u: g.up, a: g.acts }); g.acts = []; }
  }

  const KEYS = {
    0: { l: ['KeyA', 'KeyQ'], r: ['KeyD'], up: ['KeyW', 'KeyZ'], punch: ['KeyF'], kick: ['KeyG'], beer: ['KeyH'], special: ['KeyR'] },
    1: { l: ['ArrowLeft'], r: ['ArrowRight'], up: ['ArrowUp'], punch: ['KeyJ', 'Numpad1'], kick: ['KeyK', 'Numpad2'], beer: ['KeyL', 'Numpad3'], special: ['KeyI', 'Numpad0'] },
  };
  function keyMap(code) {
    const out = [];
    for (const p of [0, 1]) for (const a in KEYS[p]) if (KEYS[p][a].includes(code)) out.push([p, a]);
    if (code === 'Space') out.push([0, 'special']);
    if (F.mode !== 'local') return out.map(([, a]) => [F.me, a]); // un seul joueur : toutes les touches
    return out;
  }
  window.addEventListener('keydown', (e) => {
    if (!F.on) return;
    const m = keyMap(e.code);
    if (!m.length) return;
    e.preventDefault();
    if (e.repeat) return;
    for (const [p, a] of m) press(p, a, true);
  });
  window.addEventListener('keyup', (e) => {
    if (!F.on) return;
    for (const [p, a] of keyMap(e.code)) if (a === 'l' || a === 'r' || a === 'up') press(p, a, false);
  });
  window.addEventListener('blur', () => { if (!F.on) return; for (const f of F.fs) f.inp.l = f.inp.r = f.inp.up = 0; });

  /* ---------------- Simulation (local et hôte) ---------------- */
  const canAct = (f) => !f.act && f.stun <= 0 && f.flat <= 0 && f.hp > 0;
  function startAct(f, a) { f.act = a; f.actT = 0; f.hitDone = false; f.ev = {}; f.tick = 0; f.vx = 0; }
  function endAct(f) { f.act = null; f.actT = 0; f.dash = 0; }
  const once = (f, k) => (f.ev[k] ? false : (f.ev[k] = 1, true));

  function hit(o, f, dmg, opts) {
    if (o.hp <= 0 || o.act === 'special' || F.phase !== 'fight') return false;
    const blocked = o.block && !opts.unblockable;
    const d = blocked ? dmg * (opts.special ? 0.35 : 0.2) : dmg;
    o.hp = Math.max(0, o.hp - d);
    if (!blocked) {
      o.act = 'hit'; o.actT = 0; o.stun = opts.stun; o.buf = null; o.dash = 0;
      if (opts.flat) o.flat = opts.flat;
      if (opts.vy) o.vy = opts.vy;
    }
    o.kx = f.face * (blocked ? opts.kb * 0.35 : opts.kb) * 4;
    if (!opts.special) f.meter = Math.min(100, f.meter + d * 1.4);
    o.meter = Math.min(100, o.meter + d * 0.8);
    if (!opts.quiet || !o.ev.q) evt({ k: blocked ? 'block' : (opts.k || 'hit'), x: o.x, y: o.y + 1.25, s: o.side });
    if (opts.quiet) o.ev.q = 1;
    if (o.hp <= 0) {
      o.act = 'ko'; o.actT = 0; o.stun = 99; o.kx = f.face * 4; o.vy = 4.5;
      f.wins++; F.winner = f.side;
      evt({ k: 'ko', s: o.side });
      setPhase('end');
    }
    return true;
  }

  function spawnProj(f, k) {
    const hand = f.x + f.face * 0.45;
    if (k === 'beer') F.projs.push({ k, x: hand, y: 1.55, vx: f.face * 9.5, vy: 2.2, r: 0, owner: f.side, dmg: 8 });
    else F.projs.push({ k, x: hand, y: 1.45, vx: f.face * 8.5, vy: 0, r: 0, owner: f.side, dmg: 26 });
    evt({ k: 'throw', s: f.side });
  }

  function runSpecial(f, o, dt) {
    const t = f.actT, id = f.ch.id;
    if (id === 'shugo') {
      for (let i = 0; i < 3; i++) if (t >= 1.25 + 0.4 * i && once(f, 'd' + i)) hit(o, f, 9, { kb: 0.6, stun: 0.55, special: true, k: 'demon' });
    } else if (id === 'quentin') {
      if (t >= 1.1 && t < 2.7) {
        f.tick += dt;
        while (f.tick >= 0.2) { f.tick -= 0.2; hit(o, f, 2.7, { kb: 0.12, stun: 0.4, special: true, k: 'pee', quiet: true }); }
      }
    } else if (id === 'victor') {
      if (once(f, 'x0')) f.spx0 = f.x - f.face * 10;
      const tx0 = f.spx0 + f.face * 14 * Math.max(0, t - 0.8);
      if (!f.ev.j && (tx0 - f.x) * f.face > -1.9) { f.ev.j = 1; f.vy = 8.6; }
      if (!f.ev.h && (tx0 - o.x) * f.face > -1.5) {
        f.ev.h = 1;
        if (o.y < 1.1) hit(o, f, 26, { kb: 1.4, stun: 1.6, special: true, k: 'truck', flat: 1.4 });
      }
    } else if (id === 'max') {
      if (t >= 0.5 && !f.ev.h) {
        f.dash = f.face * 11;
        if ((o.x - f.x) * f.face < 0.9 && o.y < 1.1) { f.ev.h = 1; f.dash = 0; hit(o, f, 25, { kb: 2.3, stun: 1.1, special: true, k: 'rhino', vy: 6 }); }
        else if (t > 1.7 || Math.abs(f.x) >= ARENA - 0.05) { f.ev.h = 1; f.dash = 0; }
      }
    } else if (id === 'luca') {
      if (t >= 1.2 && once(f, 'p')) spawnProj(f, 'pizza');
    }
    if (t >= SPECIAL_DUR[id]) endAct(f);
  }

  function updateFighter(f, o, dt) {
    f.cdThrow = Math.max(0, f.cdThrow - dt);
    if (f.buf) { f.buf.t -= dt; if (f.buf.t <= 0) f.buf = null; }
    if (f.flat > 0) f.flat -= dt;
    if (f.stun > 0 && f.hp > 0) { f.stun -= dt; if (f.stun <= 0 && f.act === 'hit') endAct(f); }
    if (f.y > 0 || f.vy > 0) { f.vy -= 22 * dt; f.y += f.vy * dt; if (f.y <= 0) { f.y = 0; f.vy = 0; } }
    f.kx *= Math.pow(0.015, dt);
    if (f.hp <= 0) { f.actT += dt; f.x = clamp(f.x + f.kx * dt, -ARENA, ARENA); return; }
    if (!f.act || f.act === 'hit') f.face = o.x >= f.x ? 1 : -1;
    const fighting = F.phase === 'fight';
    const dir = (f.inp.r ? 1 : 0) - (f.inp.l ? 1 : 0);
    f.block = fighting && !f.act && f.y === 0 && dir !== 0 && dir === -f.face && f.flat <= 0;
    f.vx = 0;
    if (fighting && canAct(f)) {
      f.vx = dir * (dir === f.face ? 3.4 : 2.3);
      if (f.inp.up && f.y === 0) { f.vy = 7.4; evt({ k: 'jump', s: f.side }); }
      if (f.buf) {
        const a = f.buf.a;
        if (a === 'special') { if (f.meter >= 100) { f.meter = 0; startAct(f, 'special'); evt({ k: 'sp', s: f.side, id: f.ch.id }); } }
        else if (a === 'beer') { if (f.cdThrow <= 0) { startAct(f, 'beer'); f.cdThrow = MOVES.beer.cd; } }
        else startAct(f, a);
        if (f.act) { f.buf = null; if (a === 'punch' || a === 'kick') evt({ k: 'swing', s: f.side, a }); }
      }
    }
    if (f.act) {
      f.actT += dt;
      const mv = MOVES[f.act];
      if (f.act === 'punch' || f.act === 'kick') {
        if (!f.hitDone && f.actT >= mv.hitAt && f.actT <= mv.hitEnd) {
          const dx = (o.x - f.x) * f.face;
          if (dx > 0 && dx < mv.range && Math.abs(o.y - f.y) < (f.act === 'kick' ? 1.1 : 0.8)) { f.hitDone = true; hit(o, f, mv.dmg, mv); }
        }
        if (f.actT >= mv.dur) endAct(f);
      } else if (f.act === 'beer') {
        if (f.actT >= mv.throwAt && once(f, 't')) spawnProj(f, 'beer');
        if (f.actT >= mv.dur) endAct(f);
      } else if (f.act === 'special') {
        runSpecial(f, o, dt);
      }
    }
    f.x = clamp(f.x + (f.vx + f.kx + f.dash) * dt, -ARENA, ARENA);
  }

  function updateProjs(dt) {
    for (let i = F.projs.length - 1; i >= 0; i--) {
      const p = F.projs[i];
      if (p.k === 'beer') p.vy -= 9 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * (p.k === 'beer' ? 14 : 22);
      const o = F.fs[1 - p.owner], f = F.fs[p.owner];
      const rad = p.k === 'pizza' ? 0.65 : 0.42;
      if (o.hp > 0 && Math.abs(p.x - o.x) < rad && p.y > o.y + 0.1 && p.y < o.y + 1.95 && o.act !== 'special') {
        hit(o, f, p.dmg, p.k === 'pizza' ? { kb: 1.8, stun: 1.0, special: true, k: 'pizza', vy: 4 } : { kb: 0.9, stun: 0.45, k: 'smash' });
        F.projs.splice(i, 1); continue;
      }
      if (p.y < 0.1 || Math.abs(p.x) > 14) {
        if (p.k === 'beer' && p.y < 0.1) evt({ k: 'smashGround', x: p.x, y: 0.15, s: -1 });
        F.projs.splice(i, 1);
      }
    }
  }

  function ai(f, o, dt) {
    f.aiT -= dt;
    if (f.aiT > 0) return;
    f.aiT = rand(0.14, 0.3);
    const inp = f.inp; inp.l = inp.r = inp.up = 0;
    const dx = o.x - f.x, dist = Math.abs(dx);
    const toward = dx > 0 ? 'r' : 'l', away = dx > 0 ? 'l' : 'r';
    const threat = (o.act === 'punch' || o.act === 'kick') && dist < 1.7;
    const incoming = F.projs.some((p) => p.owner === o.side && Math.abs(p.x - f.x) < 3.5 && Math.sign(f.x - p.x) === Math.sign(p.vx));
    if ((threat || incoming) && Math.random() < 0.5) { inp[away] = 1; if (incoming && Math.random() < 0.3) inp.up = 1; return; }
    if (f.meter >= 100 && Math.random() < 0.55) { f.buf = { a: 'special', t: 0.2 }; return; }
    if (dist > 3.4) {
      if (f.cdThrow <= 0 && Math.random() < 0.35) f.buf = { a: 'beer', t: 0.2 };
      else inp[toward] = 1;
      if (Math.random() < 0.05) inp.up = 1;
      return;
    }
    if (dist > 1.3) { inp[toward] = 1; if (Math.random() < 0.18) f.buf = { a: 'kick', t: 0.2 }; return; }
    const r = Math.random();
    if (r < 0.42) f.buf = { a: 'punch', t: 0.2 };
    else if (r < 0.66) f.buf = { a: 'kick', t: 0.2 };
    else if (r < 0.8) inp[away] = 1;
    else if (r < 0.86) inp.up = 1;
  }

  function step(dt) {
    F.phaseT += dt;
    const [a, b] = F.fs;
    if (F.phase === 'intro') {
      if (F.phaseT > 1.3 && !F.saidFight) { F.saidFight = true; banner(tx('fight'), 'is-fight'); Sound.tone(784, 0.3, 'square', 0.14); evt({ k: 'fightCall' }); }
      if (F.phaseT > 2.0) { F.saidFight = false; setPhase('fight'); }
    } else if (F.phase === 'fight') {
      F.timer = Math.max(0, F.timer - dt);
      if (F.mode === 'solo') ai(b, a, dt);
      if (F.timer <= 0) {
        if (a.hp !== b.hp) { const w = a.hp > b.hp ? a : b; w.wins++; F.winner = w.side; } else F.winner = -2;
        evt({ k: 'timeUp' });
        setPhase('end');
      }
    } else if (F.phase === 'end') {
      if (F.phaseT > 3.0) {
        if (a.wins >= WINS_NEEDED || b.wins >= WINS_NEEDED) { setPhase('over'); evt({ k: 'over' }); showOver(); }
        else { F.round++; resetRound(); evt({ k: 'round' }); }
      }
    }
    updateFighter(a, b, dt);
    updateFighter(b, a, dt);
    // les deux combattants ne se traversent pas
    const gap = b.x - a.x;
    if (Math.abs(gap) < 0.62 && a.y < 1.2 && b.y < 1.2 && a.hp > 0 && b.hp > 0) {
      const push = (0.62 - Math.abs(gap)) / 2 * (gap >= 0 ? 1 : -1);
      a.x = clamp(a.x - push, -ARENA, ARENA); b.x = clamp(b.x + push, -ARENA, ARENA);
    }
    updateProjs(dt);
  }

  /* ---------------- Réseau ---------------- */
  const r2 = (v) => Math.round(v * 100) / 100;
  function snapshot() {
    return {
      t: 'fs', ph: F.phase, pt: r2(F.phaseT), rd: F.round, tm: r2(F.timer), w: F.winner,
      f: F.fs.map((f) => [r2(f.x), r2(f.y), f.face, r2(f.hp), r2(f.meter), f.act || '', r2(f.actT), r2(f.flat), f.block ? 1 : 0, f.wins, r2(f.spx0), r2(f.vx + f.dash + f.kx)]),
      p: F.projs.map((p) => [p.k === 'beer' ? 0 : 1, r2(p.x), r2(p.y), r2(p.r)]),
      e: F.outEv.splice(0),
    };
  }
  function applySnapshot(s) {
    const prevPhase = F.phase, prevRound = F.round;
    F.phase = s.ph; F.phaseT = s.pt; F.round = s.rd; F.timer = s.tm; F.winner = s.w;
    s.f.forEach((a, i) => {
      const f = F.fs[i];
      if (!f) return;
      f.tx = a[0]; if (Math.abs(f.tx - f.x) > 2.5) f.x = f.tx;
      f.y = a[1]; f.face = a[2]; f.hp = a[3]; f.meter = a[4];
      const act = a[5] || null;
      if (act !== f.act || Math.abs(a[6] - f.actT) > 0.25) f.actT = a[6];
      f.act = act; f.flat = a[7]; f.block = !!a[8]; f.wins = a[9]; f.spx0 = a[10]; f.vx = a[11];
    });
    F.projs = s.p.map((p) => ({ k: p[0] ? 'pizza' : 'beer', x: p[1], y: p[2], r: p[3] }));
    for (const e of s.e) F.events.push(e);
    if (s.ph === 'intro' && (prevPhase !== 'intro' || prevRound !== s.rd)) banner(tx('round', { n: s.rd }), 'is-round');
    if (s.ph === 'over' && prevPhase !== 'over') showOver();
  }

  /* ---------------- Rendu ---------------- */
  const tmpV = new THREE.Vector3();
  function screenPos(x, y, z = 0) {
    tmpV.set(x, y, z).project(cam);
    return [(tmpV.x * 0.5 + 0.5) * window.innerWidth, (-tmpV.y * 0.5 + 0.5) * window.innerHeight];
  }
  function popText(text, x, y, cls) {
    const [sx, sy] = screenPos(x, y);
    const el = document.createElement('span');
    el.className = 'f-pop ' + (cls || '');
    el.textContent = text;
    el.style.left = clamp(sx, 90, window.innerWidth - 90) + 'px'; el.style.top = clamp(sy, 120, window.innerHeight - 160) + 'px';
    el.style.setProperty('--rot', rand(-12, 12).toFixed(0) + 'deg');
    ui.pops.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
  let bannerTimer = 0;
  function banner(text, cls) {
    ui.banner.className = 'f-banner';
    ui.banner.textContent = text;
    void ui.banner.offsetWidth;
    ui.banner.classList.add('is-show');
    if (cls) ui.banner.classList.add(cls);
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { ui.banner.className = 'f-banner'; }, cls === 'is-big' ? 2600 : 1250);
  }
  let spTimer = 0;
  function specialBanner(f) {
    $('img', ui.special).src = f.ch.photo;
    $('span', ui.special).textContent = tx('sp.' + f.ch.id);
    ui.special.className = 'f-special is-show ' + (f.side ? 'from-right' : 'from-left');
    clearTimeout(spTimer);
    spTimer = setTimeout(() => { ui.special.className = 'f-special'; }, 1700);
  }

  const S = Sound;
  function sfx(k) {
    if (k === 'hit') { S.noise(0.12, 900, 0.5); S.tone(150, 0.12, 'square', 0.14, -60); }
    else if (k === 'block') { S.tone(620, 0.06, 'square', 0.1); S.noise(0.05, 3000, 0.15); }
    else if (k === 'swing') S.noise(0.12, 2200, 0.12);
    else if (k === 'smash') { S.noise(0.3, 3500, 0.45); S.tone(1500, 0.12, 'triangle', 0.12, 600); }
    else if (k === 'throw') S.noise(0.2, 1500, 0.15);
    else if (k === 'jump') S.tone(300, 0.12, 'sine', 0.08, 200);
    else if (k === 'ko') { S.tone(200, 0.6, 'sawtooth', 0.18, -140); S.noise(0.5, 400, 0.4); }
  }
  function sfxSpecial(id) {
    if (id === 'shugo') { S.tone(70, 1.4, 'sawtooth', 0.22, -20); S.noise(1.2, 250, 0.3); setTimeout(() => S.tone(110, 0.8, 'square', 0.12, -50), 700); }
    else if (id === 'quentin') { for (let i = 0; i < 4; i++) setTimeout(() => S.tone(320 - i * 20, 0.12, 'sine', 0.2, -120), i * 220); setTimeout(() => S.noise(1.6, 2600, 0.14), 1100); }
    else if (id === 'victor') { S.tone(880, 0.1, 'sine', 0.12); setTimeout(() => S.tone(660, 0.1, 'sine', 0.12), 160); setTimeout(() => { S.tone(392, 0.25, 'square', 0.16); S.noise(1.4, 160, 0.35); }, 700); setTimeout(() => S.tone(330, 0.4, 'square', 0.16), 980); }
    else if (id === 'max') { S.tone(240, 0.9, 'sawtooth', 0.26, -170); S.noise(0.9, 500, 0.35); }
    else if (id === 'luca') { S.tone(523, 0.15, 'triangle', 0.14); setTimeout(() => S.tone(659, 0.15, 'triangle', 0.14), 150); setTimeout(() => S.tone(784, 0.25, 'triangle', 0.14), 300); setTimeout(() => S.noise(0.5, 1200, 0.3), 1200); }
  }
  const HITWORDS = ['PAF !', 'BIM !', 'POW !', 'BAM !', 'BOUM !'];
  function handleEvents() {
    for (const e of F.events.splice(0)) {
      const f = e.s >= 0 ? F.fs[e.s] : null;
      switch (e.k) {
        case 'hit': emit(e.x, e.y, 0.3, 14, [0xffffff, 0xffd25a], 3); sfx('hit'); popText(pick(HITWORDS), e.x, e.y + 0.4); F.shake = Math.max(F.shake, 0.08); break;
        case 'block': emit(e.x, e.y, 0.3, 8, [0x7fd0ff, 0xffffff], 2); sfx('block'); break;
        case 'smash': emit(e.x, e.y, 0.3, 26, [0xfff6d0, 0xffd25a, 0x2f8f2a], 4); sfx('smash'); popText('CLING !', e.x, e.y + 0.4, 'is-beer'); break;
        case 'smashGround': emit(e.x, e.y, 0.3, 18, [0xfff6d0, 0x2f8f2a], 3); sfx('smash'); break;
        case 'demon': emit(e.x, e.y, 0.3, 18, [0xb04dff, 0xff3355], 3.5); sfx('hit'); popText('GRAOU !', e.x, e.y + 0.4, 'is-demon'); F.shake = 0.12; break;
        case 'pee': popText(tx('gross'), e.x, e.y + 0.5, 'is-pee'); break;
        case 'truck': emit(e.x, 0.3, 0.3, 40, [0xd8c49a, 0xffffff], 5); sfx('hit'); popText(tx('squash'), e.x, e.y + 0.6, 'is-big'); F.shake = 0.35; break;
        case 'rhino': emit(e.x, e.y, 0.3, 30, [0xffffff, 0xffd25a], 5); sfx('hit'); popText('BOUM !', e.x, e.y + 0.4, 'is-big'); F.shake = 0.3; break;
        case 'pizza': emit(e.x, e.y, 0.3, 30, [0xc9361f, 0xf4d36b, 0xe0a453], 4); sfx('hit'); popText('SPLAT !', e.x, e.y + 0.4, 'is-big'); F.shake = 0.22; break;
        case 'swing': sfx('swing'); break;
        case 'throw': sfx('throw'); break;
        case 'jump': sfx('jump'); break;
        case 'sp':
          if (f) {
            specialBanner(f); sfxSpecial(e.id);
            const say = { shugo: 'summon', quentin: 'drink', victor: 'call', max: 'roar', luca: 'pizza' }[e.id];
            setTimeout(() => popText(tx(say), f.x, 2.4, 'is-say'), 150);
          }
          break;
        case 'ko': sfx('ko'); banner(tx('ko'), 'is-ko'); F.shake = 0.3; break;
        case 'timeUp': banner(tx('timeUp'), 'is-ko'); break;
        default: break;
      }
    }
  }

  function poseFighter(f, o, dt, t) {
    const u = f.u, m = f.model;
    // position et orientation (de trois quarts vers la caméra)
    m.position.set(f.x, 0.06 + f.y, f.side ? -0.2 : 0.2);
    const yawT = f.face > 0 ? Math.PI - 0.45 : 0.45;
    u.yaw.rotation.y = lerp(u.yaw.rotation.y, yawT, Math.min(1, dt * 14));
    // valeurs de base : garde
    let armZ0 = -1.35, armZ1 = -1.2, armX0 = 0.15, armX1 = -0.15, armPx = 0, torsoZ = 0.12, riderZ = 0, riderY = 0, legZ0 = 0, legZ1 = 0;
    const bob = Math.sin(t * 5 + f.side) * 0.02;
    riderY = bob;
    const moving = Math.abs(f.vx) > 0.2 && f.y === 0;
    if (moving) { f.walkT += dt * 11; legZ0 = Math.sin(f.walkT) * 0.5; legZ1 = -Math.sin(f.walkT) * 0.5; }
    if (f.y > 0.05) { legZ0 = -0.6; legZ1 = 0.3; }
    const k = f.actT;
    // objets tenus
    f.bottle.visible = false; f.pizza.visible = false; f.phone.visible = false;
    if (f.horn) f.horn.visible = false;
    const fx = f.fx;
    fx.laptop.visible = false; fx.portal.visible = false; fx.truck.visible = false; fx.stream.visible = false;
    for (const d of fx.demons) d.visible = false;
    m.scale.set(1, 1, 1);

    switch (f.act) {
      case 'punch': {
        const mv = MOVES.punch; const e = k < mv.hitAt + 0.04 ? k / (mv.hitAt + 0.04) : Math.max(0, 1 - (k - mv.hitAt - 0.04) / (mv.dur - mv.hitAt - 0.04));
        armZ0 = lerp(-1.35, -1.65, e); armPx = -0.26 * e; torsoZ = 0.12 + 0.12 * e; armX0 = 0.15 - 0.2 * e;
        break;
      }
      case 'kick': {
        const mv = MOVES.kick; const e = k < mv.hitAt + 0.05 ? k / (mv.hitAt + 0.05) : Math.max(0, 1 - (k - mv.hitAt - 0.05) / (mv.dur - mv.hitAt - 0.05));
        legZ0 = -1.55 * e; legZ1 = 0.15 * e; torsoZ = 0.12 - 0.38 * e; armZ0 = -0.8; armZ1 = -0.5;
        break;
      }
      case 'beer': {
        const mv = MOVES.beer;
        if (k < mv.throwAt) { armZ0 = lerp(-1.35, 2.5, k / mv.throwAt); f.bottle.visible = true; }
        else armZ0 = lerp(2.5, -1.7, clamp((k - mv.throwAt) / 0.12, 0, 1));
        torsoZ = k < mv.throwAt ? -0.12 : 0.3;
        break;
      }
      case 'hit': torsoZ = -0.35; armZ0 = -0.6; armZ1 = -0.5; riderZ = -0.1; break;
      case 'ko': {
        const e = clamp(k / 0.5, 0, 1);
        riderZ = -1.5 * e; riderY = 0.16 * e; armZ0 = 0.4; armZ1 = 0.6; torsoZ = 0;
        break;
      }
      case 'special': poseSpecial(f, o, k, t, (v) => { ({ armZ0, armZ1, armX0, armX1, armPx, torsoZ, riderZ, riderY, legZ0, legZ1 } = Object.assign({ armZ0, armZ1, armX0, armX1, armPx, torsoZ, riderZ, riderY, legZ0, legZ1 }, v)); }); break;
      default:
        if (f.block) { armZ0 = -2.3; armZ1 = -2.2; armX0 = 0.3; armX1 = -0.3; torsoZ = -0.08; }
        else if (F.phase === 'end' && F.winner === f.side) { armZ0 = -3.0; armZ1 = -2.9; riderY = Math.abs(Math.sin(t * 6)) * 0.12; }
    }
    if (f.flat > 0) m.scale.set(1.35, 0.28, 1.35);
    const s = Math.min(1, dt * 18);
    u.arms[0].rotation.z = lerp(u.arms[0].rotation.z, armZ0, s);
    u.arms[1].rotation.z = lerp(u.arms[1].rotation.z, armZ1, s);
    u.arms[0].rotation.x = lerp(u.arms[0].rotation.x, armX0, s);
    u.arms[1].rotation.x = lerp(u.arms[1].rotation.x, armX1, s);
    u.arms[0].position.x = lerp(u.arms[0].position.x, armPx, s);
    u.torso.rotation.z = lerp(u.torso.rotation.z, torsoZ, s);
    u.rider.rotation.z = lerp(u.rider.rotation.z, riderZ, Math.min(1, dt * 10));
    u.rider.position.y = riderY;
    u.legsG[0].rotation.z = lerp(u.legsG[0].rotation.z, legZ0, s);
    u.legsG[1].rotation.z = lerp(u.legsG[1].rotation.z, legZ1, s);
  }

  function poseSpecial(f, o, k, t, set) {
    const fx = f.fx, id = f.ch.id;
    if (id === 'shugo') {
      // l'ordi, le portail, puis trois démons qui foncent sur l'adversaire
      set({ torsoZ: 0.45, armZ0: -0.75 + Math.sin(t * 30) * 0.08, armZ1: -0.7 + Math.cos(t * 30) * 0.08, riderY: -0.12 });
      fx.laptop.visible = true;
      fx.laptop.position.set(f.x + f.face * 0.62, 0.06, f.side ? -0.2 : 0.2);
      fx.laptop.rotation.y = f.face > 0 ? Math.PI : 0;
      const pk = clamp((k - 0.3) / 0.5, 0, 1) * (k > 2.7 ? clamp((3.0 - k) / 0.3, 0, 1) : 1);
      if (pk > 0) {
        fx.portal.visible = true;
        fx.portal.position.set(f.x + f.face * 1.1, 1.75, -0.4);
        fx.portal.scale.setScalar(Math.max(0.01, pk));
        fx.portal.userData.swirl.rotation.z = t * 6;
        if (Math.random() < 0.3) emit(fx.portal.position.x, 1.75, -0.3, 1, [0xb04dff, 0x7a2bd6], 1.2, -1);
      }
      fx.demons.forEach((d, i) => {
        const t0 = 0.85 + 0.4 * i, t1 = t0 + 0.4;
        if (k < t0 || k > t1 + 0.6) return;
        d.visible = true;
        const sx = fx.portal.position.x, sy = 1.75, ex = o.x, ey = o.y + 1.2;
        if (k <= t1) {
          const e = (k - t0) / 0.4;
          d.position.set(lerp(sx, ex, e), lerp(sy, ey, e) + Math.sin(e * Math.PI) * 0.6, lerp(-0.4, 0.2, e));
          d.scale.setScalar(lerp(0.4, 1, Math.min(1, e * 2)));
        } else {
          const e = (k - t1) / 0.6;
          d.position.set(ex - f.face * e * 0.8, ey + e * 2.5, 0.3);
          d.scale.setScalar(Math.max(0.01, 1 - e));
        }
        d.rotation.y = f.face > 0 ? Math.PI : 0;
        for (const w of d.userData.wings) w.rotation.x = Math.sin(t * 28 + i) * 0.6 * w.userData.s;
      });
    } else if (id === 'quentin') {
      if (k < 1.0) {
        set({ armZ0: -2.55, armX0: 0.05, torsoZ: -0.25 }); // il boit
        f.bottle.visible = true;
      } else {
        set({ torsoZ: -0.28, armZ0: -0.5, armZ1: -0.45, armX0: 0.45, armX1: -0.45, riderY: 0 });
        if (k >= 1.1 && k < 2.7) {
          fx.stream.visible = true;
          const pos = fx.stream.geometry.attributes.position;
          const x0 = f.x + f.face * 0.24, y0 = 0.8 + f.y, x1 = o.x - f.face * 0.15, y1 = o.y + 1.0;
          const z0 = f.side ? -0.2 : 0.2;
          const n = pos.count;
          const reach = clamp((k - 1.1) / 0.25, 0, 1);
          for (let i = 0; i < n; i++) {
            const uu = ((i / n) + k * 1.6) % 1 * reach;
            const arc = 0.25 + Math.abs(x1 - x0) * 0.12;
            pos.setXYZ(i, lerp(x0, x1, uu) + rand(-0.03, 0.03), lerp(y0, y1, uu) + 4 * arc * uu * (1 - uu) + rand(-0.03, 0.03), z0 + rand(-0.04, 0.04));
          }
          pos.needsUpdate = true;
          if (Math.random() < 0.5) emit(x1, y1, 0.2, 2, [0xf2d43a, 0xfff2a0], 1.5);
        }
      }
    } else if (id === 'victor') {
      if (k < 0.8) { set({ armZ0: -2.75, armX0: 0.35 }); f.phone.visible = true; }
      else set({ armZ0: -2.9, armZ1: -2.8, armX0: Math.sin(t * 12) * 0.3, armX1: -Math.sin(t * 12) * 0.3 });
      if (k >= 0.8 && k < 2.95) {
        const x = f.spx0 + f.face * 14 * (k - 0.8);
        fx.truck.visible = true;
        fx.truck.position.set(x, 0.06, 0.45);
        fx.truck.rotation.y = f.face > 0 ? 0 : Math.PI;
        fx.truck.rotation.z = Math.sin(t * 25) * 0.015;
        if (Math.random() < 0.6) emit(x - f.face * 1.6, 0.2, 0.4, 2, [0xd8c49a, 0xc9b48a], 1.2);
      }
    } else if (id === 'max') {
      if (f.horn) f.horn.visible = true;
      if (k < 0.5) set({ torsoZ: -0.35, armZ0: -1.2, armZ1: -1.2, armX0: 1.0, armX1: -1.0, riderY: Math.sin(t * 40) * 0.015 });
      else {
        f.walkT += 0.6;
        set({ torsoZ: 0.75, armZ0: 0.4, armZ1: 0.4, legZ0: Math.sin(f.walkT) * 0.8, legZ1: -Math.sin(f.walkT) * 0.8 });
        if (!f.ev.h || F.role === 'guest') if (Math.random() < 0.8) emit(f.x - f.face * 0.4, 0.15, 0.2, 2, [0xd8c49a, 0xe8d5b0], 1.4);
      }
    } else if (id === 'luca') {
      if (k < 1.2) {
        set({ armZ0: -3.05, armX0: 0.1, torsoZ: -0.05 });
        f.pizza.visible = true;
        f.pizza.rotation.set(0.6, t * 18, 0, 'YXZ');
        f.pizza.scale.setScalar(lerp(0.8, 1.9, clamp(k / 1.0, 0, 1)));
      } else set({ armZ0: -1.7, armPx: -0.2, torsoZ: 0.3 });
    }
  }

  function render(dt) {
    const t = performance.now() / 1000;
    const [a, b] = F.fs;
    for (const f of F.fs) {
      if (F.role === 'guest') { // interpolation douce de la position reçue
        if (f.tx != null) f.x = lerp(f.x, f.tx, Math.min(1, dt * 14));
        if (f.act) f.actT += dt;
      }
      f.lag = f.lag > f.hp ? Math.max(f.hp, f.lag - dt * 30) : f.hp;
    }
    poseFighter(a, b, dt, t);
    poseFighter(b, a, dt, t);
    // projectiles
    let nb = 0, np = 0;
    for (const p of F.projs) {
      const o = poolGet(p.k, p.k === 'beer' ? nb++ : np++);
      o.visible = true;
      o.position.set(p.x, p.y, 0.25);
      if (p.k === 'beer') { o.rotation.set(0, 0, p.r * (p.x > 0 ? 1 : -1)); }
      else { o.rotation.set(0.9, p.r, 0, 'YXZ'); o.scale.setScalar(1.8); }
    }
    for (let i = nb; i < pool.beer.length; i++) pool.beer[i].visible = false;
    for (let i = np; i < pool.pizza.length; i++) pool.pizza[i].visible = false;
    handleEvents();
    updateParts(dt);
    // décor vivant
    for (let i = 0; i < flames.length; i += 2) { flames[i].scale.y = 0.32 + Math.sin(t * 17 + i) * 0.06; flames[i + 1].intensity = 2.3 + Math.sin(t * 13 + i) * 0.5; }
    bulbs.forEach((bb, i) => { bb.visible = Math.sin(t * 2 + i * 0.7) > -0.85; });
    // caméra
    const cx = clamp((a.x + b.x) / 2, -3.2, 3.2), dist = Math.abs(a.x - b.x);
    const portrait = cam.aspect < 1;
    const back = (portrait ? 6.8 : 6.3) + dist * (portrait ? 0.85 : 0.55);
    const shx = F.shake > 0 ? rand(-1, 1) * F.shake : 0, shy = F.shake > 0 ? rand(-1, 1) * F.shake : 0;
    F.shake = Math.max(0, F.shake - dt * 1.2);
    F.camX = lerp(F.camX ?? cx, cx, Math.min(1, dt * 4));
    F.camB = lerp(F.camB ?? back, back, Math.min(1, dt * 3));
    cam.position.set(F.camX + shx, (portrait ? 2.2 : 2.15) + shy, F.camB);
    cam.lookAt(F.camX, portrait ? 0.9 : 1.2, 0);
    updateUI();
    renderer.render(scene, cam);
  }

  function updateUI() {
    F.fs.forEach((f, i) => {
      const s = ui.sides[i];
      s.hp.style.width = f.hp.toFixed(1) + '%';
      s.lag.style.width = f.lag.toFixed(1) + '%';
      s.meter.style.width = f.meter.toFixed(1) + '%';
      s.meterBox.classList.toggle('is-full', f.meter >= 100);
      s.wins.forEach((w, k) => w.classList.toggle('is-on', f.wins > k));
      s.el.classList.toggle('is-low', f.hp < 25);
    });
    const secs = String(Math.ceil(F.timer));
    if (ui.timer.textContent !== secs) ui.timer.textContent = secs;
    // bouton spécial qui clignote quand la jauge est pleine
    for (const pad of ui.pads.querySelectorAll('.f-pad')) {
      const f = F.fs[+pad.dataset.p];
      const sp = pad.querySelector('.f-sp');
      if (f && sp) sp.classList.toggle('is-ready', f.meter >= 100);
    }
  }

  function showOver() {
    const [a, b] = F.fs;
    const w = a.wins >= WINS_NEEDED ? a : b.wins >= WINS_NEEDED ? b : null;
    if (!w) return;
    setTimeout(() => {
      if (!F.on) return;
      $('.f-over-kicker', ui.over).textContent = tx('overKicker');
      $('.f-over-photo', ui.over).src = w.ch.photo;
      $('.f-over-title', ui.over).textContent = tx('matchWin', { name: w.name });
      const l = w === a ? b : a;
      $('.f-over-sub', ui.over).textContent = w.name + ' ' + w.wins + ' – ' + l.wins + ' ' + l.name + (l.wins === 0 && w.hp >= 99.5 ? ' · ' + tx('perfect') : '');
      const guest = F.role === 'guest';
      for (const btn of ui.over.querySelectorAll('[data-f]')) {
        btn.textContent = tx(btn.dataset.f === 'surf' ? 'resurf' : btn.dataset.f);
        btn.hidden = guest && btn.dataset.f !== 'menu';
      }
      const wait = $('.f-over-wait', ui.over); wait.hidden = !guest; wait.textContent = tx('waitHost');
      ui.over.hidden = false;
      const first = ui.over.querySelector('.btn:not([hidden])');
      if (first && !isTouch) first.focus({ preventScroll: true });
      banner(tx('matchWin', { name: w.name }), 'is-big');
      Sound.tone(523, 0.2, 'triangle', 0.2); setTimeout(() => Sound.tone(659, 0.2, 'triangle', 0.2), 180); setTimeout(() => Sound.tone(784, 0.4, 'triangle', 0.2), 360);
    }, 900);
  }
  for (const btn of ui.over.querySelectorAll('[data-f]')) {
    btn.addEventListener('click', () => {
      const act = btn.dataset.f;
      if (act === 'rematch') { if (F.role === 'host') F.net.send({ t: 'fgo', a: 'rematch' }); rematch(); }
      else { if (F.role === 'host') F.net.send({ t: 'fgo', a: act }); const cb = F.onExit; stop(); if (cb) cb(act); }
    });
  }

  function rematch() {
    ui.over.hidden = true;
    for (const f of F.fs) { f.wins = 0; f.meter = 0; }
    F.round = 1;
    resetRound();
  }

  /* ---------------- API ---------------- */
  function start(opts) {
    if (F.on) stop();
    Object.assign(F, { on: true, mode: opts.mode, role: opts.role || 'local', me: opts.me || 0, net: opts.net || null, onExit: opts.onExit, round: 1, events: [], outEv: [], projs: [], shake: 0, camX: undefined, camB: undefined });
    F.guestInp = { l: 0, r: 0, up: 0, acts: [] };
    F.fs = opts.chars.map((ch, i) => newFighter(ch, i, opts.names[i]));
    F.fs.forEach((f, i) => { f.meter = clamp(opts.bonus ? opts.bonus[i] || 0 : 0, 0, 100); });
    ui.sides.forEach((s, i) => { s.photo.src = opts.chars[i].photo; s.name.textContent = opts.names[i]; });
    ui.over.hidden = true;
    root.hidden = false;
    root.classList.toggle('is-touch', isTouch);
    buildPads();
    ui.keys.textContent = isTouch ? '' : (F.mode === 'local' ? tx('keys1') + '   ·   ' + tx('keys2') : tx('keysSolo'));
    resize();
    resetRound();
    const bonusMe = Math.round(F.fs[F.me].meter);
    if (bonusMe > 0) setTimeout(() => { if (F.on) popText(tx('bonus', { n: bonusMe }), F.fs[F.me].x, 2.7, 'is-say'); }, 400);
  }
  function stop() {
    if (!F.on) return;
    F.on = false;
    for (const f of F.fs) disposeFighter(f);
    F.fs = []; F.projs = [];
    for (const k in pool) for (const o of pool[k]) o.visible = false;
    root.hidden = true;
    ui.over.hidden = true;
    ui.pops.innerHTML = '';
    F.phase = 'off';
  }
  function tick(dt) {
    if (!F.on) return;
    if (F.role !== 'guest') step(dt);
    if (F.role === 'host') {
      F.sendT -= dt;
      if (F.sendT <= 0 && F.net) { F.sendT = 0.05; F.net.send(snapshot()); }
    } else if (F.role === 'guest') {
      F.sendT -= dt;
      if (F.sendT <= 0) { F.sendT = 0.1; sendGuestInput(true); }
    }
    render(dt);
  }
  function onNet(m) {
    if (!F.on) return false;
    if (m.t === 'fs' && F.role === 'guest') { applySnapshot(m); return true; }
    if (m.t === 'fin' && F.role === 'host') {
      const f = F.fs[1];
      f.inp.l = m.l; f.inp.r = m.r; f.inp.up = m.u;
      for (const a of m.a || []) f.buf = { a, t: 0.25 };
      return true;
    }
    if (m.t === 'fgo' && F.role === 'guest') {
      if (m.a === 'rematch') rematch();
      else { const cb = F.onExit; stop(); if (cb) cb(m.a); }
      return true;
    }
    return false;
  }
  function resize() {
    cam.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    cam.fov = cam.aspect < 0.75 ? 62 : cam.aspect < 1.2 ? 52 : 42;
    cam.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  return { start, stop, tick, onNet, resize, get state() { return F; }, get active() { return F.on; }, peerLeft() { if (F.on) banner(tx('left'), 'is-big'); } };
}
