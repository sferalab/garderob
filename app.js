import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $ = id => document.getElementById(id);
const MM = 0.001;
const METAL = { white: 0xf1f0ec, black: 0x1d1e20, graphite: 0x4b4e52 };
const FLOORS = { oak: ['laminate_floor_02', 6], walnut: ['wood_floor_worn', 6], parquet: ['herringbone_parquet', 7], tile: ['marble_01', 5], concrete: ['concrete_floor_worn_001', 4] };
const TYPES = {
  mesh: 'Полка сетчатая', metal: 'Полка металлическая', ldsp: 'Полка ЛДСП',
  basket: 'Корзина стационарная', pull: 'Корзина выдвижная', rail: 'Штанга для вешалок', shoe: 'Полка для обуви'
};
const DEPTHS = { mesh: [30, 40, 50], metal: [30, 40], ldsp: [30, 40], basket: [30, 40], pull: [30, 40], rail: [30], shoe: [40] };
const REAL_DEPTH = { mesh: { 30: 306, 40: 406, 50: 506 }, metal: { 30: 327, 40: 427 }, ldsp: { 30: 330, 40: 430 }, basket: { 30: 340, 40: 440 }, pull: { 30: 340, 40: 440 }, rail: { 30: 300 }, shoe: { 40: 406 } };
const LAYOUTS = { straight: 'Прямая (одна стена)', L: 'Угловая Г-образная', U: 'П-образная' };
const WALLNAMES = ['Основная стена', 'Левая стена', 'Правая стена'];

function sec(w, items) { return { w, items }; }
function it(t, d, y, h) { const o = { t, d, y }; if (h) o.h = h; return o; }
function defaults() {
  return {
    layout: 'straight', metal: 'white', wall: '#e8d3bd', floor: 'oak', preset: 'warm', view: 'all', decor: true, card: null, postH: 1920, railTop: 210, dims: true, dm: { t: true, s: true, v: true, c: false },
    walls: [
      { gap: 0, sections: [sec(90, [it('mesh', 40, 192), it('rail', 30, 180), it('shoe', 40, 30)]), sec(90, [it('mesh', 40, 192), it('mesh', 40, 152), it('mesh', 40, 112), it('basket', 40, 75, 85), it('pull', 40, 50, 181)]), sec(90, [it('mesh', 40, 192), it('rail', 30, 180), it('rail', 30, 100)])] },
      { gap: 50, sections: [sec(60, [it('metal', 40, 192), it('mesh', 40, 150), it('mesh', 40, 110), it('mesh', 40, 70)]), sec(90, [it('ldsp', 40, 192), it('rail', 30, 180), it('shoe', 40, 30)])] },
      { gap: 50, sections: [sec(90, [it('mesh', 40, 192), it('rail', 30, 180)]), sec(60, [it('mesh', 40, 192), it('mesh', 40, 140), it('mesh', 40, 90), it('shoe', 40, 30)])] }
    ]
  };
}
let S = load('gs_auto') || defaults(); if (!FLOORS[S.floor]) S.floor = 'oak'; if (!S.view) S.view = 'all'; if (!S.preset) S.preset = 'none'; if (!S.dm) S.dm = { t: true, s: true, v: true, c: false }; if ('h' in S.dm) { S.dm.t = S.dm.s = S.dm.h; delete S.dm.h; } S.dims = true;
let cur = { w: 0, s: 0 };
function load(k) { try { const v = JSON.parse(localStorage.getItem(k)); return v && v.walls ? v : null; } catch (e) { return null; } }

// ---------- renderer ----------
const view = $('view');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
view.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
const hemi = new THREE.HemisphereLight(0xffffff, 0xd8cfc2, 0.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 6; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.01;
const sc = sun.shadow.camera; sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5; sc.near = 0.5; sc.far = 20;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xfff4e6, 0.35); fill.position.set(-3, 2, 4); scene.add(fill);
const sideFill = new THREE.DirectionalLight(0xffe6c8, 0); scene.add(sideFill, sideFill.target);

const room = new THREE.Group(); scene.add(room);
const model = new THREE.Group(); scene.add(model);
const dimsG = new THREE.Group(); scene.add(dimsG);
let catcher;

// ---------- textures ----------
function slotTex(horizontal) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#3a3a3a';
  if (!horizontal) { g.fillRect(14, 10, 10, 40); g.fillRect(40, 10, 10, 40); } else { g.fillRect(10, 22, 40, 14); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const TL = new THREE.TextureLoader(), TC = {};
function tex(name, srgb, rep) {
  const k = name + rep; if (!TC[k]) { const t = TL.load('tex/' + name + '.jpg', () => {}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; TC[k] = t; }
  return TC[k];
}
function floorMat() {
  const [n, rep] = FLOORS[S.floor];
  return new THREE.MeshStandardMaterial({ color: S.preset === 'warm' ? 0xfff0dc : 0xffffff, map: tex(n + '_diff', true, rep), normalMap: tex(n + '_nor_gl', false, rep), roughnessMap: tex(n + '_rough', false, rep), roughness: 1 });
}
function wallMat() {
  return new THREE.MeshStandardMaterial({ color: S.wall, normalMap: tex('painted_plaster_wall_nor_gl', false, 2), normalScale: new THREE.Vector2(0.35, 0.35), roughnessMap: tex('painted_plaster_wall_rough', false, 2), roughness: 1 });
}

// ---------- materials ----------
let M = {};
function makeMats() {
  const col = METAL[S.metal];
  const pc = { color: col, metalness: S.metal === 'white' ? 0.25 : 0.5, roughness: S.metal === 'black' ? 0.45 : 0.38 };
  M.metal = new THREE.MeshStandardMaterial(pc);
  const pt = slotTex(false); pt.repeat.set(1, S.postH / 32);
  M.post = new THREE.MeshStandardMaterial({ ...pc, map: pt });
  const rt = slotTex(true); M.railTex = rt;
  M.rail = new THREE.MeshStandardMaterial({ ...pc, map: rt });
  M.chrome = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 1, roughness: 0.18 });
  M.rod = S.rod === 'white' ? new THREE.MeshStandardMaterial({ color: 0xf2f1ee, metalness: 0.2, roughness: 0.35 }) : S.rod === 'black' ? new THREE.MeshStandardMaterial({ color: 0x1c1c1e, metalness: 0.7, roughness: 0.3 }) : new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 1, roughness: 0.12 });
  M.plastic = new THREE.MeshStandardMaterial({ color: S.metal === 'black' ? 0x2a2a2c : S.metal === 'graphite' ? 0x6a6d70 : 0xf4f3f0, roughness: 0.5, metalness: 0 });
  M.ldsp = new THREE.MeshStandardMaterial({ color: S.metal === 'black' ? 0x3b3836 : (S.metal === 'graphite' ? 0x8a8580 : 0xf3f1ec), roughness: 0.6, metalness: 0 });
}

let SLOT;
function basketMat(rx, ry) {
  if (!SLOT) { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#000'; g.beginPath(); g.roundRect(27, 14, 10, 36, 5); g.fill(); SLOT = c; }
  const t = new THREE.CanvasTexture(SLOT); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.round(rx), Math.max(1, Math.round(ry)));
  return new THREE.MeshStandardMaterial({ color: M.plastic.color, roughness: 0.5, alphaMap: t, alphaTest: 0.5, side: THREE.DoubleSide });
}
// ---------- geometry helpers ----------
const CYL = new THREE.CylinderGeometry(1, 1, 1, 8, 1); CYL.translate(0, 0.5, 0);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const _up = new THREE.Vector3(0, 1, 0);
function rods(list, mat) {
  const im = new THREE.InstancedMesh(CYL, mat, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), d = new THREE.Vector3();
  list.forEach(([a, b, r], i) => { d.subVectors(b, a); const L = d.length(); q.setFromUnitVectors(_up, d.normalize()); s.set(r, L, r); m.compose(a, q, s); im.setMatrixAt(i, m); });
  im.castShadow = true; im.receiveShadow = true; return im;
}
function box(w, h, d, x, y, z, mat) { const b = new THREE.Mesh(BOX, mat); b.scale.set(w, h, d); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; return b; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- build ----------
function postBottom() { return S.railTop * 10 - 10 - S.postH; } // mm
function wallsActive() { return S.layout === 'straight' ? [0] : S.layout === 'L' ? [0, 1] : [0, 1, 2]; }
function wallWidth(w) { return S.walls[w].sections.reduce((a, s) => a + s.w * 10, 0); }

function buildWall(wi) {
  const W = S.walls[wi], g = new THREE.Group(); g.userData.wi = wi;
  const total = wallWidth(wi), railY = S.railTop * 10 * MM, Z0 = 0.017;
  const rl = (total + 40) * MM;
  M.railTex.repeat.set(rl / 0.032, 1);
  { const cx = total * MM / 2, parts = [box(rl, 0.05, 0.003, cx, railY - 0.025, 0.0015, M.metal), box(rl, 0.003, 0.016, cx, railY - 0.0015, 0.008, M.metal), box(rl, 0.003, 0.016, cx, railY - 0.0485, 0.008, M.metal), box(rl, 0.012, 0.003, cx, railY - 0.006, 0.0155, M.metal)]; parts.forEach(p => { p.userData.frame = true; g.add(p); }); }
  const pb = postBottom() * MM, pt = (S.railTop * 10 - 10) * MM;
  let xs = [0]; W.sections.forEach(s => xs.push(xs[xs.length - 1] + s.w * 10 * MM));
  xs.forEach(x => { const pm = box(0.025, pt - pb, 0.018, x, (pt + pb) / 2, Z0 + 0.009, M.post); pm.userData.frame = true; g.add(pm); });
  W.sections.forEach((s, si) => s.items.forEach(item => buildItem(g, item, xs[si], xs[si + 1])));
  return g;
}
const BRG = {};
function bracket(g, x, y, L) {
  const k = L.toFixed(3);
  if (!BRG[k]) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(L, 0); sh.lineTo(L, -0.008); sh.lineTo(0.03, -0.045); sh.lineTo(0, -0.048); sh.lineTo(0, 0);
    const ge = new THREE.ExtrudeGeometry(sh, { depth: 0.003, bevelEnabled: false }); ge.rotateY(-Math.PI / 2); ge.translate(-0.0015, 0, 0); BRG[k] = ge; }
  const m = new THREE.Mesh(BRG[k], M.metal); m.position.set(x, y - 0.003, 0.048); m.castShadow = m.receiveShadow = true; g.add(m);
  g.add(box(0.016, 0.003, L, x, y - 0.0015, 0.048 + L / 2, M.metal));
}
function buildItem(g, item, x0, x1) {
  const y = item.y * 10 * MM, dep = (REAL_DEPTH[item.t][item.d] || 400) * MM, z0 = 0.052, zf = z0 + dep;
  const a = x0 + 0.006, b = x1 - 0.006, L = b - a;
  const brL = dep + 0.03;
  if (item.t !== 'rail') { bracket(g, x0, y, brL); bracket(g, x1, y, brL); }
  if (item.t === 'mesh') {
    const r = []; const n = Math.max(2, Math.round(L / 0.013)), wr = 0.0016;
    for (let i = 0; i <= n; i++) { const x = a + L * i / n; r.push([V(x, y, z0), V(x, y, zf), wr]); }
    for (let t = 0; t <= 1.001; t += 0.125) r.push([V(a, y - 0.003, z0 + dep * t), V(b, y - 0.003, z0 + dep * t), 0.0018]);
    r.push([V(a, y, z0), V(b, y, z0), 0.003]);
    g.add(rods(r, M.metal));
    // front lip frame 28 mm
    g.add(box(L, 0.028, 0.004, (a + b) / 2, y - 0.012, zf + 0.002, M.metal));
    g.add(box(L, 0.004, 0.012, (a + b) / 2, y + 0.001, zf - 0.004, M.metal));
  } else if (item.t === 'metal') {
    g.add(box(L, 0.002, dep, (a + b) / 2, y - 0.001, z0 + dep / 2, M.metal));
    g.add(box(L, 0.03, 0.002, (a + b) / 2, y - 0.015, zf, M.metal));
    g.add(box(L, 0.02, 0.002, (a + b) / 2, y - 0.01, z0, M.metal));
  } else if (item.t === 'ldsp') {
    g.add(box(L, 0.016, dep, (a + b) / 2, y - 0.008, z0 + dep / 2, M.ldsp));
  } else if (item.t === 'basket' || item.t === 'pull') {
    const h = (item.h || 85) * MM, bot = y - h, aa = a + 0.02, bb = b - 0.02, LL = bb - aa;
    g.add(box(0.012, 0.012, dep, a + 0.006, y - 0.006, z0 + dep / 2, M.metal)); g.add(box(0.012, 0.012, dep, b - 0.006, y - 0.006, z0 + dep / 2, M.metal));
    g.add(box(LL + 0.02, 0.014, 0.012, (a + b) / 2, y - 0.007, zf - 0.006, M.metal)); g.add(box(LL + 0.02, 0.006, 0.01, (a + b) / 2, y - 0.003, z0 + 0.005, M.metal));
    const bw = LL, bd = dep - 0.03, cz = z0 + dep / 2, fh = h - 0.012;
    const face = (w, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, fh), basketMat(w / 0.05, fh / 0.06)); m.position.set(x, bot + fh / 2, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; g.add(m); };
    face(bw, (aa + bb) / 2, cz + bd / 2, 0); face(bw, (aa + bb) / 2, cz - bd / 2, Math.PI);
    face(bd, aa, cz, -Math.PI / 2); face(bd, bb, cz, Math.PI / 2);
    g.add(box(bw, 0.003, bd, (aa + bb) / 2, bot + 0.0015, cz, M.plastic));
    g.add(box(bw + 0.02, 0.012, bd + 0.02, (aa + bb) / 2, y - 0.018, cz, M.plastic));
    if (item.t === 'pull') g.add(box(LL * 0.3, 0.012, 0.012, (aa + bb) / 2, y - 0.04, cz + bd / 2 + 0.008, M.plastic));
  } else if (item.t === 'shoe') {
    const drop = 0.11, r = [], n = Math.max(2, Math.round(L / 0.03));
    const P = t => V(0, y - drop * t, z0 + dep * t);
    for (let i = 0; i <= n; i++) { const x = a + L * i / n, p0 = P(0), p1 = P(1); r.push([V(x, p0.y, p0.z), V(x, p1.y, p1.z), 0.0018]); r.push([V(x, p1.y, p1.z), V(x, p1.y + 0.04, p1.z + 0.003), 0.0018]); }
    [0, 0.33, 0.66, 1].forEach(t => { const p = P(t); r.push([V(a, p.y, p.z), V(b, p.y, p.z), 0.0028]); });
    const p1 = P(1); r.push([V(a, p1.y + 0.04, p1.z + 0.003), V(b, p1.y + 0.04, p1.z + 0.003), 0.003]);
    g.add(rods(r, M.metal));
  } else if (item.t === 'rail') {
    const arm = 0.37, zr = 0.33, ty = y + 0.06;
    [x0, x1].forEach(x => g.add(box(0.004, 0.025, arm, x, ty - 0.012, 0.048 + arm / 2, M.metal)));
    [a + 0.008, b - 0.008].forEach(x => { g.add(box(0.006, 0.07, 0.03, x, y + 0.025, zr, M.metal)); });
    const rr = rods([[V(a, y, zr), V(b, y, zr), 0.0125]], M.rod); rr.geometry = new THREE.CylinderGeometry(1, 1, 1, 24, 1).translate(0, 0.5, 0); rr.scale.set(1, 1, 1); g.add(rr);
  }
}

function effGap(wi) { let d = 0; S.walls[0].sections.forEach(s => s.items.forEach(o => d = Math.max(d, (REAL_DEPTH[o.t][o.d] || 400) / 10))); return Math.max(0, S.walls[wi].gap || 0); }
function minGap() { let d = 0; S.walls[0].sections.forEach(s => s.items.forEach(o => d = Math.max(d, (REAL_DEPTH[o.t][o.d] || 400) / 10))); return Math.ceil(d + 5.5); }
function placeWall(g, wi, backW) {
  const g0 = effGap(0) * 10 * MM;
  if (wi === 0) { g.position.x = g0; return; }
  const gap = effGap(wi) * 10 * MM;
  if (wi === 1) { g.rotation.y = -Math.PI / 2; g.scale.z = -1; g.position.set(-0.02, 0, gap); }
  if (wi === 2) { g.rotation.y = Math.PI / 2; g.scale.x = -1; g.scale.z = -1; g.position.set(g0 + backW + 0.02, 0, gap); }
}

function buildRoom(backW) {
  room.clear();
  const floorM = floorMat();
  const wallM = wallMat();
  const g0 = effGap(0) * 10 * MM, left = -0.02, right = S.layout === 'U' ? g0 + backW + 0.02 : g0 + backW + 2.5;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), floorM); fl.rotation.x = -Math.PI / 2; fl.position.set(backW / 2, 0, 5); fl.receiveShadow = true; room.add(fl);
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(right - left, 3.2), wallM); bw.position.set((left + right) / 2, 1.6, 0); bw.receiveShadow = true; room.add(bw);
  const side = x => { const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), wallM); p.rotation.y = x < 0.5 ? Math.PI / 2 : -Math.PI / 2; p.position.set(x, 1.6, 3); p.receiveShadow = true; room.add(p); };
  side(left); if (S.layout === 'U') side(right);
  const base = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  room.add(box(right - left, 0.06, 0.012, (left + right) / 2, 0.03, 0.006, base));
  if (!catcher) { catcher = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.25 })); catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; model.add(catcher); }
}

// ---------- decor ----------
const decor = new THREE.Group(); scene.add(decor);
function juteTex() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#c9ad84'; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 8) for (let x = 0; x < 512; x += 8) { const l = 150 + Math.random() * 60; g.fillStyle = `rgba(${l + 40},${l + 15},${l - 30},0.9)`; if (((x + y) / 8) % 2) g.fillRect(x, y, 8, 5); else g.fillRect(x, y, 5, 8); }
  g.strokeStyle = 'rgba(90,70,40,0.5)'; g.lineWidth = 6; g.strokeRect(14, 14, 484, 484);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); return t;
}
function buildDecor() {
  decor.clear(); decor.visible = !!S.decor && !photo; if (!S.decor) return;
  const corner = S.layout !== 'straight', Wb = wallWidth(0) * MM;
  const sideLen = corner ? (effGap(1) + wallWidth(1) / 10) / 100 : 0;
  const px = corner ? 0.2 : -0.45, pz = corner ? sideLen + 0.5 : 0.4;
  // pot
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.3, 32), new THREE.MeshStandardMaterial({ color: 0xe9e1d4, roughness: 0.75 }));
  pot.position.set(px, 0.15, pz); pot.castShadow = pot.receiveShadow = true; decor.add(pot);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.01, 24), new THREE.MeshStandardMaterial({ color: 0x4a3a2a })); soil.position.set(px, 0.29, pz); decor.add(soil);
  // olive branches
  const stemM = new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.9 }), leafM = new THREE.MeshStandardMaterial({ color: 0x6f7d4e, roughness: 0.65, side: THREE.DoubleSide });
  const leafG = new THREE.SphereGeometry(1, 8, 4); leafG.scale(0.035, 0.008, 0.011);
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stems = [], leaves = [];
  for (let b = 0; b < 7; b++) {
    let p = V(px + (rnd() - 0.5) * 0.06, 0.29, pz + (rnd() - 0.5) * 0.06); const d = V((rnd() - 0.5) * 0.6, 1, (rnd() - 0.5) * 0.6).normalize();
    const n = 9 + Math.floor(rnd() * 5);
    for (let k = 0; k < n; k++) { const q = p.clone().addScaledVector(d, 0.058); stems.push([p, q, 0.006 - k * 0.0003]); d.x += (rnd() - 0.5) * 0.25; d.z += (rnd() - 0.5) * 0.25; d.normalize();
      if (k > 1) for (let l = 0; l < 3; l++) leaves.push([q.clone(), rnd() * 6.28, rnd() * 6.28]); p = q; }
  }
  decor.add(rods(stems, stemM));
  const im = new THREE.InstancedMesh(leafG, leafM, leaves.length), m4 = new THREE.Matrix4(), e = new THREE.Euler();
  leaves.forEach(([p, a, b], i) => { e.set(b * 0.3, a, 0.6 + b * 0.2); m4.makeRotationFromEuler(e); m4.setPosition(p.x + Math.cos(a) * 0.03, p.y, p.z + Math.sin(a) * 0.03); im.setMatrixAt(i, m4); });
  im.castShadow = true; decor.add(im);
  // rug
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshStandardMaterial({ map: juteTex(), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(corner ? 0.95 : Wb * 0.25, 0.004, corner ? sideLen + 0.55 : 1.3); rug.rotation.z = 0.08; rug.receiveShadow = true; decor.add(rug);
  // sheer curtain
  const cg = new THREE.PlaneGeometry(0.9, 2.7, 60, 1), pa = cg.attributes.position;
  for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) * 38) * 0.03);
  cg.computeVertexNormals();
  const cur = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0xfff8ee, roughness: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  if (corner) { cur.rotation.y = Math.PI / 2; cur.position.set(0.02, 1.38, sideLen + 1.25); } else { cur.position.set(-0.9, 1.38, 0.08); }
  decor.add(cur);
}

// ---------- dimensions ----------
const LINE = new THREE.LineBasicMaterial({ color: 0x2a2a2a });
function labelSprite(text, small) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), fs = 44;
  g.font = `500 ${fs}px -apple-system,Segoe UI,Roboto,Arial`; const w = Math.ceil(g.measureText(text).width) + 28;
  c.width = w; c.height = 64; g.font = `500 ${fs}px -apple-system,Segoe UI,Roboto,Arial`;
  g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.roundRect(1, 6, w - 2, 52, 10); g.fill();
  g.fillStyle = '#222'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 33);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  const h = 0.085; sp.scale.set(h * w / 64, h, 1); sp.renderOrder = 10; return sp;
}
const LINE2 = new THREE.LineBasicMaterial({ color: 0x777777, transparent: true, opacity: 0.7 });
function segs(g, pts, mat = LINE) { const geo = new THREE.BufferGeometry().setFromPoints(pts); const l = new THREE.LineSegments(geo, mat); l.renderOrder = 9; g.add(l); }
function dimH(g, labels, xa, xb, y, z, text, yPart) {
  const t = 0.014, gap = 0.02, p = [V(xa, y, z), V(xb, y, z)];
  [xa, xb].forEach(x => p.push(V(x, yPart + gap, z), V(x, y + 0.02, z), V(x, y - t, z), V(x, y + t, z)));
  segs(g, p); labels.push([V((xa + xb) / 2, y + 0.04, z), text]);
}
function dimV(g, labels, x, ya, yb, z, text, xPart) {
  const t = 0.014, gap = 0.02, sg = Math.sign(x - xPart) || 1, p = [V(x, ya, z), V(x, yb, z)];
  [ya, yb].forEach(y => p.push(V(xPart + sg * gap, y, z), V(x + sg * 0.02, y, z), V(x - t, y, z), V(x + t, y, z)));
  segs(g, p); labels.push([V(x + sg * 0.05, (ya + yb) / 2, z), text]);
}
const cm = mm => String(Math.round(mm / 10 * 10) / 10).replace('.', ',');
function itemTop(o) { return o.y * 10 * MM + (o.t === 'rail' ? 0.0125 : 0); }
function itemBot(o) { const y = o.y * 10 * MM; return o.t === 'basket' || o.t === 'pull' ? y - (o.h || 85) * MM : o.t === 'shoe' ? y - 0.11 : o.t === 'rail' ? y - 0.0125 : y - 0.028; }
function buildDims(g, wi) {
  const labels = [], W = S.walls[wi], z = 0.004, railY = S.railTop * 10 * MM, D = S.dm || {};
  let xs = [0]; W.sections.forEach(s => xs.push(xs[xs.length - 1] + s.w * 10 * MM));
  const tot = xs[xs.length - 1];
  if (D.s) W.sections.forEach((s, i) => dimH(g, labels, xs[i], xs[i + 1], railY + 0.1, z, cm(s.w * 10), railY));
  if (D.t) dimH(g, labels, -0.0125, tot + 0.0125, railY + (D.s ? 0.21 : 0.1), z, cm(tot / MM + 25), railY);
  if (D.s) {
    const eg = effGap(wi); if (eg > 0 && !(wi === 2)) dimH(g, labels, -eg / 100 - (wi === 0 ? 0.02 : 0), -0.0125, railY + 0.1, z, cm(eg * 10 - 12.5), railY);
    if (wi === 2 && eg > 0) dimH(g, labels, -eg / 100, -0.0125, railY + 0.1, z, cm(eg * 10 - 12.5), railY);
  }
  if (D.v) {
    const left = wi === 0 && S.layout === 'straight', sg = left ? -1 : 1, xb = left ? -0.0125 : tot + 0.0125;
    const pb = postBottom() * MM, pt = (S.railTop * 10 - 10) * MM;
    dimV(g, labels, xb + sg * 0.12, pb, pt, z, cm(S.postH), xb);
    dimV(g, labels, xb + sg * 0.27, 0, railY, z, cm(railY / MM), xb);
  }
  if (D.c) W.sections.forEach((s, i) => {
    const its = s.items.slice().sort((a, b) => itemBot(a) - itemBot(b)); if (!its.length) return;
    const x = xs[i] + Math.min(0.1, (xs[i + 1] - xs[i]) * 0.2), zz = 0.52, t = 0.012, p = [];
    const pts = [0]; its.forEach(o => pts.push(itemBot(o), itemTop(o))); pts.push(railY);
    for (let k = 0; k < pts.length - 1; k += 2) {
      const ya = pts[k], yb = pts[k + 1]; if (yb - ya < 0.005) continue;
      p.push(V(x, ya, zz), V(x, yb, zz), V(x - t, ya, zz), V(x + t, ya, zz), V(x - t, yb, zz), V(x + t, yb, zz));
      labels.push([V(x + 0.05, (ya + yb) / 2, zz), cm((yb - ya) / MM)]);
    }
    segs(g, p);
  });
  return labels;
}

// ---------- rebuild ----------
let bbox = new THREE.Box3();
function rebuild() {
  makeMats();
  const keep = catcher; model.clear(); if (keep) model.add(keep); dimsG.clear();
  const backW = wallWidth(0) * MM;
  buildRoom(backW);
  wallsActive().forEach(wi => {
    const g = buildWall(wi); placeWall(g, wi, backW); model.add(g);
    const dg = new THREE.Group(); const labels = buildDims(dg, wi); g.add(dg); dg.userData.dims = true;
    g.updateMatrixWorld(true);
    labels.forEach(([p, t]) => { const sp = labelSprite(t, true); sp.position.copy(dg.localToWorld(p.clone())); sp.userData.parentWall = g; dimsG.add(sp); });
  });
  model.traverse(o => { if (o.isMesh && o !== catcher && !o.userData.dims) { const f = !!o.userData.frame; o.visible = S.view === 'all' || (S.view === 'frame' ? f : !f); } });
  buildDecor();
  applyLights();
  applyModelXf();
  setDims(true);
  bbox = new THREE.Box3();
  model.children.forEach(c => { if (c !== catcher) bbox.expandByObject(c); });
  const c = bbox.getCenter(new THREE.Vector3());
  sun.position.set(c.x + 2.5, 4.5, 5); sun.target.position.copy(c); applyLights();
  catcher.visible = !!photo && !$('showRoom').checked;
  room.visible = !photo || $('showRoom').checked;
  summary(); localStorage.setItem('gs_auto', JSON.stringify(S));
}
function setDims(on) {
  S.dims = on; dimsG.visible = on; model.traverse(o => { if (o.userData.dims) o.visible = on; });
  Object.entries(DMB).forEach(([id, k]) => $(id).classList.toggle('on', !!S.dm[k]));
}
function applyModelXf() {
  if (!photo) { model.position.set(0, 0, 0); model.scale.setScalar(1); model.rotation.y = 0; dimsG.position.set(0, 0, 0); dimsG.scale.setScalar(1); dimsG.rotation.y = 0; return; }
  const p = [+$('mx').value, +$('my').value, 0], s = +$('ms').value, r = +$('mr').value * Math.PI / 180;
  [model, dimsG].forEach(o => { o.position.set(...p); o.scale.setScalar(s); o.rotation.y = r; });
}

// ---------- camera ----------
function meshBox() { const b = new THREE.Box3(); model.traverse(o => { if (o.isMesh && o.visible && o !== catcher && !o.userData.dims) { let p = o.parent, ok = true; while (p) { if (p.visible === false) ok = false; p = p.parent; } if (ok) b.expandByObject(o); } }); return b.isEmpty() ? bbox.clone() : b; }
function fitCard(aspect, topF, botF, sideF = 0.06) {
  const b = meshBox(), c = b.getCenter(new THREE.Vector3());
  const corner = S.layout !== 'straight', az = corner ? V(0.62, 0, 1).normalize() : V(0.32, 0, 1).normalize(), e = (corner ? 26 : 24) * Math.PI / 180;
  const dir = V(az.x * Math.cos(e), Math.sin(e), az.z * Math.cos(e));
  const cam = camera.clone(); cam.aspect = aspect; cam.fov = 46; cam.updateProjectionMatrix();
  const pts = []; for (let i = 0; i < 8; i++) pts.push(V(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
  const yTop = 1 - 2 * topF, yBot = -1 + 2 * botF, xm = 1 - 2 * sideF;
  let tg = c.clone();
  const ndc = d => { cam.position.copy(tg).addScaledVector(dir, d); cam.lookAt(tg); cam.updateMatrixWorld(); let x0 = 9, x1 = -9, y0 = 9, y1 = -9; pts.forEach(p => { const q = p.clone().project(cam); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }); return [x0, x1, y0, y1]; };
  let d = 3;
  for (let it = 0; it < 5; it++) {
    let lo = 0.5, hi = 40; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2, [x0, x1, y0, y1] = ndc(m); if ((x1 - x0) <= 2 * xm && (y1 - y0) <= (yTop - yBot)) hi = m; else lo = m; } d = hi;
    const [x0, x1, y0, y1] = ndc(d), up = V(0, 1, 0).applyQuaternion(cam.quaternion), rt = V(1, 0, 0).applyQuaternion(cam.quaternion);
    const th = Math.tan(cam.fov * Math.PI / 360) * d, dy = ((y0 + y1) / 2 - (yTop + yBot) / 2) * th, dx = ((x0 + x1) / 2) * th * aspect;
    tg.addScaledVector(up, dy).addScaledVector(rt, dx);
  }
  cam.position.copy(tg).addScaledVector(dir, d);
  return { pos: cam.position.clone(), tg, fov: 46 };
}
function camTo(kind) {
  const c = bbox.getCenter(new THREE.Vector3()), sz = bbox.getSize(new THREE.Vector3());
  const dir = kind === 'front' ? V(0, 0.05, 1) : kind === 'iso' ? V(1, 0.45, 1.1) : V(0, 1, 0.35);
  dir.normalize();
  const asp = camera.aspect, fov = camera.fov * Math.PI / 180;
  const span = Math.max(sz.x, sz.z * (kind === 'front' ? 0 : 1), 1), hgt = kind === 'top' ? Math.max(sz.z, 1) : sz.y;
  const dist = Math.max(hgt / (2 * Math.tan(fov / 2)), span / (2 * Math.tan(fov / 2) * asp)) * (view.clientWidth < 800 ? 1.08 : 1.3) + sz.z * 0.35;
  if (kind === 'card') { const f = fitCard(camera.aspect, 0.06, 0.06); camera.fov = f.fov; camera.updateProjectionMatrix(); camera.position.copy(f.pos); controls.target.copy(f.tg); controls.update(); document.querySelectorAll('[data-cam]').forEach(b => b.classList.toggle('on', b.dataset.cam === kind)); return; }
  camera.fov = 35; camera.updateProjectionMatrix();
  camera.position.copy(c).addScaledVector(dir, dist); controls.target.copy(c); camera.up.set(0, 1, 0); controls.update();
  document.querySelectorAll('[data-cam]').forEach(b => b.classList.toggle('on', b.dataset.cam === kind));
}
function resize() { const w = view.clientWidth, h = view.clientHeight; renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px'; camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(view);
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

// ---------- photo ----------
let photo = null, photoImg = null;
$('photo').onchange = e => {
  const f = e.target.files[0]; if (!f) return; const rd = new FileReader();
  rd.onload = () => { photo = rd.result; photoImg = new Image(); photoImg.src = photo; $('photoBg').style.backgroundImage = `url(${photo})`; $('photoCtl').classList.remove('hide'); scene.background = null; rebuild(); };
  rd.readAsDataURL(f);
};
$('photoOff').onclick = () => { photo = null; photoImg = null; $('photoBg').style.backgroundImage = ''; $('photoCtl').classList.add('hide'); $('photo').value = ''; setBg(); rebuild(); };
['mx', 'my', 'ms', 'mr'].forEach(id => $(id).oninput = applyModelXf);
$('showRoom').onchange = () => { setBg(); rebuild(); };
function goboTex() {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 1024);
  g.fillStyle = '#fff'; g.filter = 'blur(3px)';
  const fx = 180, fy = 120, fw = 660, fh = 820, m = 22;
  g.fillRect(fx, fy, fw, fh);
  g.fillStyle = '#000'; g.fillRect(fx + fw / 2 - m / 2, fy, m, fh); g.fillRect(fx, fy + fh * 0.38, fw, m);
  // leaves (olive branch silhouettes)
  g.filter = 'blur(5px)';
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let br = 0; br < 5; br++) {
    let x = 120 + rnd() * 380, y = 1000, a = -1.3 - rnd() * 0.5; g.strokeStyle = '#000'; g.lineWidth = 5;
    for (let k = 0; k < 16; k++) { const nx = x + Math.cos(a) * 34, ny = y + Math.sin(a) * 34; g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
      for (const sd of [-1, 1]) { g.save(); g.translate(nx, ny); g.rotate(a + sd * (0.7 + rnd() * 0.4)); g.beginPath(); g.ellipse(26, 0, 28, 7, 0, 0, 7); g.fill(); g.restore(); }
      x = nx; y = ny; a += (rnd() - 0.5) * 0.35; }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const gobo = new THREE.SpotLight(0xffd9a8, 0); gobo.map = goboTex(); gobo.castShadow = true; gobo.shadow.mapSize.set(1024, 1024); gobo.shadow.radius = 4;
gobo.angle = 0.62; gobo.penumbra = 0.15; gobo.shadow.bias = -0.0005; gobo.decay = 0; scene.add(gobo, gobo.target);
function applyLights() {
  const c = bbox.getCenter(new THREE.Vector3()); const warm = S.preset === 'warm';
  if (warm) {
    sun.color.set(0xffe4c0); sun.intensity = 0.9; sun.position.set(c.x - 1.6, 3.4, 4.2); sun.shadow.radius = 3;
    gobo.color.set(0xffcf94); gobo.intensity = 9; gobo.position.set(c.x - 1.4, 3.3, 3.0); gobo.target.position.set(c.x + 0.4, 1.5, 0);
    renderer.toneMappingExposure = 1.0; hemi.color.set(0xfff0dd); hemi.groundColor.set(0xe8c49c); hemi.intensity = 1.0; fill.color.set(0xffe2c2); fill.intensity = 0.45; fill.position.set(c.x + 3, 2.2, 4); sideFill.intensity = 2.0; sideFill.position.set(c.x + 4, 1.8, c.z + 1); sideFill.target.position.set(-1, 1.2, c.z);
  } else { sun.color.set(0xffffff); sun.intensity = 1.6; gobo.intensity = 0; renderer.toneMappingExposure = 1.0; hemi.color.set(0xffffff); hemi.groundColor.set(0xd8cfc2); sideFill.intensity = 0; hemi.intensity = 0.6; fill.color.set(0xfff4e6); fill.intensity = 0.35; fill.position.set(-3, 2, 4); }
}
function setBg() { scene.background = photo && !$('showRoom').checked ? null : new THREE.Color(0xe9e6e0); }

// ---------- export ----------
$('pngBtn').onclick = async () => {
  const hide = false;
  const w = view.clientWidth, h = view.clientHeight, k = Math.max(2, Math.ceil(3000 / Math.max(w, h)));
  renderer.setPixelRatio(k); renderer.setSize(w, h, false); renderer.render(scene, camera);
  const W = renderer.domElement.width, H = renderer.domElement.height;
  const out = document.createElement('canvas'); out.width = W; out.height = H; const g = out.getContext('2d');
  if (photoImg && !$('showRoom').checked) { const s = Math.max(W / photoImg.width, H / photoImg.height), iw = photoImg.width * s, ih = photoImg.height * s; g.drawImage(photoImg, (W - iw) / 2, (H - ih) / 2, iw, ih); }
  g.drawImage(renderer.domElement, 0, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); resize(); if (hide) setDims(true);
  out.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'garderob-titan.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, 'image/png');
};

// ---------- marketplace card ----------
function cardDefaults() { return { title: 'Наполнение для каркаса', tOn: true, size: '', sOn: true, panel: '', pOn: true, pos: 'auto', note: 'Для монтажа необходимо приобрести\nКАРКАС', nOn: true, dims: false }; }
function cardUI() {
  if (!S.card) S.card = cardDefaults(); const C = S.card;
  if (!C.size) C.size = overall(); if (!C.panel) C.panel = specData().cardLines.join('\n');
  $('cTitle').value = C.title; $('cTOn').checked = C.tOn; $('cSize').value = C.size; $('cSOn').checked = C.sOn; $('cPanel').value = C.panel; $('cPOn').checked = C.pOn; $('cPos').value = C.pos; $('cNote').value = C.note; $('cNOn').checked = C.nOn; $('cDims').checked = C.dims;
}
function cardRead() { const C = S.card; C.title = $('cTitle').value; C.tOn = $('cTOn').checked; C.size = $('cSize').value; C.sOn = $('cSOn').checked; C.panel = $('cPanel').value; C.pOn = $('cPOn').checked; C.pos = $('cPos').value; C.note = $('cNote').value; C.nOn = $('cNOn').checked; C.dims = $('cDims').checked; localStorage.setItem('gs_auto', JSON.stringify(S)); }
function makeCard() {
  cardRead(); const C = S.card, CW = 900, CH = 1200, top = C.tOn || C.sOn ? 230 : 40, bot = C.nOn ? 190 : 40;
  const sv = { pos: camera.position.clone(), tg: controls.target.clone(), pr: renderer.getPixelRatio() };
  const dimsWas = dimsG.visible; if (!C.dims) setDims(false);
  renderer.setPixelRatio(2); renderer.setSize(CW, CH, false); camera.aspect = CW / CH; camera.updateProjectionMatrix();
  const sfov = camera.fov; const f = fitCard(CW / CH, top / CH, bot / CH, 0.05); camera.fov = f.fov; camera.updateProjectionMatrix(); camera.position.copy(f.pos); camera.lookAt(f.tg); camera.updateMatrixWorld();
  renderer.render(scene, camera);
  const out = document.createElement('canvas'); out.width = CW; out.height = CH; const g = out.getContext('2d');
  g.drawImage(renderer.domElement, 0, 0, CW, CH);
  // occupancy: projected boxes of visible meshes
  const rects = []; model.traverse(o => { if (o.isMesh && o.visible && o !== catcher && !o.userData.dims) { const b = new THREE.Box3().setFromObject(o); if (b.isEmpty()) return; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < 8; i++) { const p = V(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(camera); const X = (p.x + 1) / 2 * CW, Y = (1 - p.y) / 2 * CH; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); } rects.push([x0, y0, x1, y1]); } });
  const serif = 'Georgia, "Times New Roman", "PT Serif", serif', ink = '#231c16';
  const rule = (y, x0, x1) => { g.strokeStyle = 'rgba(35,28,22,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); };
  g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = ink;
  if (C.tOn) { let fs = 66; g.font = `500 ${fs}px ${serif}`; while (g.measureText(C.title).width > CW - 80 && fs > 30) { fs -= 2; g.font = `500 ${fs}px ${serif}`; } g.fillText(C.title, CW / 2, 112); }
  if (C.sOn) { g.font = `400 40px ${serif}`; const w = g.measureText(C.size).width; g.fillText(C.size, CW / 2, 182); rule(170, CW / 2 - w / 2 - 110, CW / 2 - w / 2 - 25); rule(170, CW / 2 + w / 2 + 25, CW / 2 + w / 2 + 110); }
  if (C.nOn) { const L = C.note.split('\n').filter(Boolean), last = L.pop() || ''; g.font = `400 32px ${serif}`; L.forEach((t, i) => g.fillText(t, CW / 2, CH - 118 + (i - L.length + 1) * 38)); g.font = `700 50px ${serif}`; const w = g.measureText(last).width; g.fillText(last, CW / 2, CH - 52); rule(CH - 68, CW / 2 - w / 2 - 140, CW / 2 - w / 2 - 25); rule(CH - 68, CW / 2 + w / 2 + 25, CW / 2 + w / 2 + 140); }
  if (C.pOn && C.panel.trim()) {
    const lines = C.panel.split('\n').filter(Boolean); g.font = `400 25px ${serif}`;
    const pw = Math.min(CW - 80, Math.max(330, ...lines.map(t => g.measureText(t).width + 64))), ph = 104 + lines.length * 40;
    const yT = top + 20, yB = CH - bot - ph - 20, yM = (top + CH - bot - ph) / 2;
    const cand = { tl: [40, yT], tr: [CW - pw - 40, yT], bl: [40, yB], br: [CW - pw - 40, yB], cr: [CW - pw - 40, yM] };
    const ov = ([x, y]) => rects.reduce((a, [x0, y0, x1, y1]) => a + Math.max(0, Math.min(x + pw, x1) - Math.max(x, x0)) * Math.max(0, Math.min(y + ph, y1) - Math.max(y, y0)), 0);
    let key = C.pos; if (key === 'auto') key = Object.keys(cand).sort((a, b) => ov(cand[a]) - ov(cand[b]))[0];
    const [px, py] = cand[key];
    g.save(); g.beginPath(); g.roundRect(px, py, pw, ph, 22); g.clip(); g.filter = 'blur(8px)'; g.drawImage(out, 0, 0); g.filter = 'none';
    g.fillStyle = 'rgba(255,247,238,0.62)'; g.fillRect(px, py, pw, ph); g.restore();
    g.fillStyle = ink; g.font = `500 29px ${serif}`; g.textAlign = 'center'; g.fillText('КОМПЛЕКТАЦИЯ', px + pw / 2, py + 52); rule(py + 68, px + 40, px + pw - 40);
    g.textAlign = 'left'; g.font = `400 25px ${serif}`; lines.forEach((t, i) => g.fillText(t, px + 32, py + 112 + i * 40));
  }
  // restore
  renderer.setPixelRatio(sv.pr); resize(); camera.fov = sfov; camera.updateProjectionMatrix(); camera.position.copy(sv.pos); controls.target.copy(sv.tg); controls.update(); if (dimsWas) setDims(true);
  return out;
}

// ---------- spec / summary ----------
function nearest(arr, v) { return arr.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a); }
function railCombo(len) { const L = [1560, 1260, 1000, 700, 520], res = []; let rest = len; while (rest > 0) { const fit = L.slice().reverse().find(l => l >= rest); if (fit) { res.push(fit); break; } res.push(1560); rest -= 1560; } return res; }
function specData() {
  const frame = {}, fill = {}, card = {}, brk = new Set();
  const add = (o, k, n = 1) => o[k] = (o[k] || 0) + n;
  const walls = [];
  wallsActive().forEach(wi => {
    const W = S.walls[wi], tot = wallWidth(wi), rails = railCombo(tot + 40);
    rails.forEach(r => add(frame, `Рельс несущий ${r} мм`)); add(frame, `Стойка ${S.postH} мм`, W.sections.length + 1);
    W.sections.forEach((s, si) => s.items.forEach(o => {
      const w = s.w * 10, d = REAL_DEPTH[o.t][o.d], br = { 306: 335, 327: 335, 330: 335, 340: 335, 406: 435, 427: 435, 430: 435, 440: 435, 506: 535 }[d] || 435;
      const nom = `${s.w}×${o.d} см`;
      if (o.t === 'mesh') { add(fill, `Полка сетчатая ${nearest([463, 603, 903, 1203], w)}x${d}`); add(card, `Полка ${nom}`); }
      if (o.t === 'metal') { add(fill, `Полка металлическая 597x${d}`); add(card, `Полка металлическая ${nom}`); }
      if (o.t === 'ldsp') { add(fill, `Полка ЛДСП ${nearest([446, 587, 887], w)}x${d}`); add(card, `Полка ЛДСП ${nom}`); }
      if (o.t === 'basket') { add(fill, `Корзина стационарная ${nearest([603, 903], w)}x${d}x85`); add(card, `Корзина ${nom}`); }
      if (o.t === 'pull') { add(fill, `Корзина выдвижная ${nearest([563, 863], w)}x${d}x${o.h || 85}`); add(card, `Корзина выдвижная ${nom}`); }
      if (o.t === 'shoe') { add(fill, `Полка для обуви ${nearest([603, 903], w)}x406x77`); add(card, `Полка для обуви ${nom}`); }
      if (o.t === 'rail') { add(fill, `Перекладина ${nearest([640, 940, 1240, 2000], w)} мм`); add(fill, 'Кронштейн для перекладины', 2); add(card, 'Штанга'); }
      else [si, si + 1].forEach(p => { const k = `${wi}:${p}:${o.y}`; if (!brk.has(k)) { brk.add(k); add(fill, `Кронштейн ${br} мм`); add(card, 'Кронштейн для полки'); } });
    }));
    walls.push(`<b>${WALLNAMES[wi]}:</b> ${cm(tot)} см, секций ${W.sections.length}, рельс ${rails.join(' + ')} мм`);
  });
  const ck = Object.keys(card).sort((a, b) => (a.startsWith('Кронштейн') - b.startsWith('Кронштейн')) || (a.startsWith('Штанга') - b.startsWith('Штанга')) || b.localeCompare(a));
  return { frame, fill, walls, cardLines: ck.map(k => `${k} — ${card[k]} шт`) };
}
function overall() {
  const W = Math.round(wallWidth(0) / 10 + 2.5);
  let maxD = 0; S.walls[0].sections.forEach(s => s.items.forEach(o => maxD = Math.max(maxD, o.d)));
  let D = maxD + 5;
  if (S.layout !== 'straight') { const w = [1, 2].filter(i => wallsActive().includes(i)).map(i => effGap(i) + wallWidth(i) / 10 + 2.5); D = Math.round(Math.max(D, ...w)); }
  return `${W} × ${D} × ${S.railTop} см`;
}
function summary() {
  const d = specData(), li = o => Object.entries(o).map(([k, v]) => `${k} — ${v} шт`).join('<br>');
  $('summary').innerHTML = d.walls.join('<br>') + `<br>Габарит: ${overall()}<details><summary>Каркас</summary>${li(d.frame)}</details><details><summary>Наполнение</summary>${li(d.fill)}</details>`;
}

// ---------- UI ----------
function clampY(v) { const lo = Math.ceil(postBottom() / 10) + 3, hi = S.railTop - 4; return Math.max(lo, Math.min(hi, v)); }
function fillGeneral() {
  $('metal').value = S.metal; $('rodC').value = S.rod || 'chrome'; $('wall').value = S.wall; $('floor').value = S.floor; $('railTop').value = S.railTop;
  const pre = ['512', '1025', '1156', '1536', '1920', '2304'].includes(String(S.postH));
  $('postH').value = pre ? String(S.postH) : 'custom'; $('postHc').value = S.postH;
  if (!$('layout')) {
    const l = document.createElement('label'); l.innerHTML = 'Тип гардеробной<select id="layout">' + Object.entries(LAYOUTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('') + '</select>';
    $('metal').parentNode.before(l); $('layout').onchange = e => { S.layout = e.target.value; cur = { w: 0, s: 0 }; rebuild(); renderSec(); camTo(S.layout === 'straight' ? 'front' : 'iso'); };
  }
  $('layout').value = S.layout; $('viewMode').value = S.view || 'all'; $('decor').checked = !!S.decor; $('preset').value = S.preset || 'none';
}
$('rodC').onchange = e => { S.rod = e.target.value; rebuild(); };
$('metal').onchange = e => { S.metal = e.target.value; rebuild(); };
$('wall').oninput = e => { S.wall = e.target.value; rebuild(); };
$('floor').onchange = e => { S.floor = e.target.value; rebuild(); };
$('postH').onchange = e => { if (e.target.value !== 'custom') { S.postH = +e.target.value; $('postHc').value = S.postH; fix(); } };
$('postHc').onchange = e => { S.postH = Math.max(300, Math.min(3000, +e.target.value || 1920)); $('postH').value = 'custom'; fix(); };
$('railTop').onchange = e => { S.railTop = Math.max(60, Math.min(320, +e.target.value || 210)); fix(); };
$('nSec').onchange = e => { const n = Math.max(1, Math.min(12, +e.target.value || 1)), secs = S.walls[cur.w].sections; while (secs.length < n) secs.push(JSON.parse(JSON.stringify(secs[secs.length - 1]))); secs.length = n; cur.s = Math.min(cur.s, n - 1); rebuild(); renderSec(); camTo(lastCam); };
$('allW').onchange = e => { if (e.target.value) { S.walls[cur.w].sections.forEach(s => s.w = +e.target.value); e.target.value = ''; rebuild(); renderSec(); } };
function fix() { if (S.postH > S.railTop * 10) S.railTop = Math.ceil(S.postH / 10) + 2; $('railTop').value = S.railTop; S.walls.forEach(w => w.sections.forEach(s => s.items.forEach(o => o.y = clampY(o.y)))); rebuild(); renderSec(); }

function renderSec() {
  const act = wallsActive(); if (!act.includes(cur.w)) cur.w = 0;
  const W = S.walls[cur.w]; $('nSec').value = W.sections.length;
  $('nSec').parentNode.firstChild.textContent = act.length > 1 ? 'Секций на этой стене' : 'Количество секций';
  let h = '';
  if (act.length > 1) h += '<div class="tabs">' + act.map(wi => `<button data-w="${wi}" class="${wi === cur.w ? 'on' : ''}">${WALLNAMES[wi]}</button>`).join('') + '</div>';
  { const eg = effGap(cur.w); h += `<label>Отступ от угла: <b id="gapV">${eg}</b> см<input type="range" id="gapR" min="0" max="300" step="1" value="${eg}"></label><label>Точно, см<input type="number" id="gap" min="0" max="300" step="1" value="${eg}"></label><div id="gapWarn" class="sum" style="color:#b0552a"></div>`; }
  $('secTabs').innerHTML = h + '<div class="tabs">' + W.sections.map((s, i) => `<button data-s="${i}" class="${i === cur.s ? 'on' : ''}">${i + 1}: ${s.w}</button>`).join('') + '</div>';
  $('secTabs').querySelectorAll('[data-w]').forEach(b => b.onclick = () => { cur = { w: +b.dataset.w, s: 0 }; renderSec(); });
  $('secTabs').querySelectorAll('[data-s]').forEach(b => b.onclick = () => { cur.s = +b.dataset.s; renderSec(); });
  const warn = () => { const m = minGap(), bad = cur.w > 0 && S.layout !== 'straight' && W.gap < m; $('gapWarn').textContent = bad ? `Полки пересекутся с полками основной стены. Нужно от ${m} см.` : ''; };
  let tmr; const setGap = (v, live) => { W.gap = Math.max(0, Math.min(300, Math.round(v))); $('gapV').textContent = W.gap; $('gap').value = W.gap; $('gapR').value = W.gap; warn(); clearTimeout(tmr); tmr = setTimeout(rebuild, live ? 30 : 0); };
  $('gapR').oninput = e => setGap(+e.target.value, true); $('gap').onchange = e => setGap(+e.target.value || 0); warn();
  const s = W.sections[cur.s];
  let e = `<label>Ширина секции между стойками, см<input type="number" id="secW" min="20" max="200" value="${s.w}"></label>
  <div class="btns">${[45, 60, 90, 120].map(v => `<button class="mini" data-pw="${v}">${v}</button>`).join('')}<button class="mini" id="copyAll">Скопировать на все секции</button></div>`;
  s.items.slice().map((o, i) => [o, i]).sort((a, b) => b[0].y - a[0].y).forEach(([o, i]) => {
    e += `<div class="item"><div class="top"><select data-i="${i}" data-k="t">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${k === o.t ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <button class="mini" data-mv="${i}" data-dy="5" title="Выше">▲</button><button class="mini" data-mv="${i}" data-dy="-5" title="Ниже">▼</button><button class="mini danger" data-del="${i}" title="Удалить">✕</button></div>
    <div class="grid"><label>Высота, см<input type="number" data-i="${i}" data-k="y" value="${o.y}"></label>
    <label>Глубина<select data-i="${i}" data-k="d">${DEPTHS[o.t].map(d => `<option value="${d}" ${d === o.d ? 'selected' : ''}>${d} см</option>`).join('')}</select></label>
    ${o.t === 'pull' || o.t === 'basket' ? `<label>Высота корзины<select data-i="${i}" data-k="h">${(o.t === 'pull' ? [85, 181] : [85]).map(v => `<option value="${v}" ${v === (o.h || 85) ? 'selected' : ''}>${v} мм</option>`).join('')}</select></label>` : ''}</div></div>`;
  });
  e += '<div class="btns">' + Object.entries(TYPES).map(([k, v]) => `<button class="mini" data-add="${k}">+ ${v}</button>`).join('') + '</div>';
  $('secEdit').innerHTML = e;
  const E = $('secEdit');
  $('secW').onchange = ev => { s.w = Math.max(20, Math.min(200, +ev.target.value || 90)); rebuild(); renderSec(); };
  E.querySelectorAll('[data-pw]').forEach(b => b.onclick = () => { s.w = +b.dataset.pw; rebuild(); renderSec(); });
  $('copyAll').onclick = () => { W.sections.forEach((t, i) => { if (i !== cur.s) W.sections[i] = JSON.parse(JSON.stringify(s)); }); rebuild(); renderSec(); };
  E.querySelectorAll('[data-k]').forEach(el => el.onchange = () => {
    const o = s.items[+el.dataset.i], k = el.dataset.k;
    if (k === 't') { o.t = el.value; if (!DEPTHS[o.t].includes(o.d)) o.d = DEPTHS[o.t].includes(40) ? 40 : DEPTHS[o.t][0]; if (o.t === 'pull' || o.t === 'basket') o.h = o.h || 85; }
    else if (k === 'y') o.y = clampY(+el.value || o.y); else o[k] = +el.value;
    rebuild(); renderSec();
  });
  E.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { const o = s.items[+b.dataset.mv]; o.y = clampY(o.y + +b.dataset.dy); rebuild(); renderSec(); });
  E.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { s.items.splice(+b.dataset.del, 1); rebuild(); renderSec(); });
  E.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
    const t = b.dataset.add, ys = s.items.map(o => o.y), lo = Math.ceil(postBottom() / 10) + 3;
    let y = t === 'shoe' ? Math.max(lo + 10, 30) : clampY((ys.length ? Math.min(...ys) : S.railTop) - 35);
    s.items.push(it(t, DEPTHS[t].includes(40) ? 40 : DEPTHS[t][0], clampY(y), t === 'pull' || t === 'basket' ? 85 : undefined)); rebuild(); renderSec();
  });
}

let lastCam = 'front';
document.querySelectorAll('[data-cam]').forEach(b => b.onclick = () => { lastCam = b.dataset.cam; camTo(lastCam); document.querySelector('.tools').classList.remove('open'); });
$('menuT').onclick = () => document.querySelector('.tools').classList.toggle('open');
const DMB = { dT: 't', dS: 's', dV: 'v', dC: 'c' };
Object.entries(DMB).forEach(([id, k]) => $(id).onclick = () => { S.dm[k] = !S.dm[k]; rebuild(); });
$('dAll').onclick = () => { S.dm = { t: true, s: true, v: true, c: true }; rebuild(); };
$('dNone').onclick = () => { S.dm = { t: false, s: false, v: false, c: false }; rebuild(); };
const msg = t => { $('msg').textContent = t; setTimeout(() => $('msg').textContent = '', 3000); };
$('saveBtn').onclick = () => { localStorage.setItem('gs_saved', JSON.stringify(S)); msg('Конфигурация сохранена'); };
$('loadBtn').onclick = () => { const v = load('gs_saved'); if (!v) return msg('Сохраненной конфигурации нет'); S = v; cur = { w: 0, s: 0 }; fillGeneral(); rebuild(); renderSec(); camTo(lastCam); msg('Конфигурация загружена'); };
$('resetBtn').onclick = () => { if (!confirm('Сбросить все настройки?')) return; S = defaults(); cur = { w: 0, s: 0 }; fillGeneral(); cardUI(); rebuild(); renderSec(); camTo('front'); };

$('cardBtn').onclick = () => { const o = makeCard(); o.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'kartochka-900x1200.png'; a.click(); }, 'image/png'); };
$('cAuto').onclick = () => { S.card.size = overall(); S.card.panel = specData().cardLines.join('\n'); cardUI(); cardRead(); };
['cTitle', 'cTOn', 'cSize', 'cSOn', 'cPanel', 'cPOn', 'cPos', 'cNote', 'cNOn', 'cDims'].forEach(id => $(id).onchange = cardRead);
$('decor').onchange = e => { S.decor = e.target.checked; rebuild(); };
$('viewMode').onchange = e => { S.view = e.target.value; rebuild(); };
$('preset').onchange = e => { S.preset = e.target.value; if (S.preset === 'warm') { S.wall = '#e8d3bd'; S.floor = 'oak'; } fillGeneral(); rebuild(); };
fillGeneral(); setBg(); resize(); rebuild(); renderSec(); cardUI(); camTo(S.layout === 'straight' ? 'front' : 'iso');
const _x=0;window.__gs = { get S() { return S; }, set S(v) { S = v; }, rebuild, renderSec, fillGeneral, cardUI, makeCard, camTo, setLayout: l => { $('layout').value = l; $('layout').onchange({ target: $('layout') }); }, setDims };
