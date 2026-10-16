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
    layout: 'straight', metal: 'white', wall: '#ece7df', floor: 'oak', postH: 1920, railTop: 210, dims: true, secDims: true, hdims: false,
    walls: [
      { gap: 0, sections: [sec(90, [it('mesh', 40, 192), it('rail', 30, 180), it('shoe', 40, 30)]), sec(90, [it('mesh', 40, 192), it('mesh', 40, 152), it('mesh', 40, 112), it('basket', 40, 75, 85), it('pull', 40, 50, 181)]), sec(90, [it('mesh', 40, 192), it('rail', 30, 180), it('rail', 30, 100)])] },
      { gap: 45, sections: [sec(60, [it('metal', 40, 192), it('mesh', 40, 150), it('mesh', 40, 110), it('mesh', 40, 70)]), sec(90, [it('ldsp', 40, 192), it('rail', 30, 180), it('shoe', 40, 30)])] },
      { gap: 45, sections: [sec(90, [it('mesh', 40, 192), it('rail', 30, 180)]), sec(60, [it('mesh', 40, 192), it('mesh', 40, 140), it('mesh', 40, 90), it('shoe', 40, 30)])] }
    ]
  };
}
let S = load('gs_auto') || defaults(); if (!FLOORS[S.floor]) S.floor = 'oak';
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
scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc2, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 6; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.01;
const sc = sun.shadow.camera; sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5; sc.near = 0.5; sc.far = 20;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xfff4e6, 0.35); fill.position.set(-3, 2, 4); scene.add(fill);

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
  return new THREE.MeshStandardMaterial({ map: tex(n + '_diff', true, rep), normalMap: tex(n + '_nor_gl', false, rep), roughnessMap: tex(n + '_rough', false, rep), roughness: 1 });
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
  M.ldsp = new THREE.MeshStandardMaterial({ color: S.metal === 'black' ? 0x3b3836 : (S.metal === 'graphite' ? 0x8a8580 : 0xf3f1ec), roughness: 0.6, metalness: 0 });
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
  const total = wallWidth(wi), railY = S.railTop * 10 * MM, Z0 = 0.01;
  const rl = (total + 40) * MM;
  M.railTex.repeat.set(rl / 0.032, 1);
  g.add(box(rl, 0.045, 0.01, total * MM / 2, railY - 0.0225, 0.005, M.rail));
  const pb = postBottom() * MM, pt = (S.railTop * 10 - 10) * MM;
  let xs = [0]; W.sections.forEach(s => xs.push(xs[xs.length - 1] + s.w * 10 * MM));
  xs.forEach(x => g.add(box(0.027, pt - pb, 0.023, x, (pt + pb) / 2, Z0 + 0.0115, M.post)));
  W.sections.forEach((s, si) => s.items.forEach(item => buildItem(g, item, xs[si], xs[si + 1])));
  return g;
}
function bracket(g, x, y, L) {
  // tapered bracket: vertical part on post and arm
  g.add(box(0.004, 0.03, L, x, y - 0.015, 0.021 + L / 2, M.metal));
  g.add(box(0.004, 0.006, L, x, y - 0.003, 0.021 + L / 2, M.metal));
}
function buildItem(g, item, x0, x1) {
  const y = item.y * 10 * MM, dep = (REAL_DEPTH[item.t][item.d] || 400) * MM, z0 = 0.035, zf = z0 + dep;
  const a = x0 + 0.006, b = x1 - 0.006, L = b - a;
  const brL = dep + 0.03;
  if (item.t !== 'rail') { bracket(g, x0, y, brL); bracket(g, x1, y, brL); }
  if (item.t === 'mesh') {
    const r = []; const n = Math.max(2, Math.round(L / 0.025));
    for (let i = 0; i <= n; i++) { const x = a + L * i / n; r.push([V(x, y, z0), V(x, y, zf), 0.0018]); r.push([V(x, y, zf), V(x, y - 0.03, zf + 0.004), 0.0018]); }
    r.push([V(a, y, z0), V(b, y, z0), 0.003]); r.push([V(a, y - 0.004, z0 + dep * 0.5), V(b, y - 0.004, z0 + dep * 0.5), 0.0025]);
    r.push([V(a, y, zf), V(b, y, zf), 0.003]); r.push([V(a, y - 0.03, zf + 0.004), V(b, y - 0.03, zf + 0.004), 0.003]);
    r.push([V(a, y - 0.004, z0 + dep * 0.22), V(b, y - 0.004, z0 + dep * 0.22), 0.002]); r.push([V(a, y - 0.004, z0 + dep * 0.78), V(b, y - 0.004, z0 + dep * 0.78), 0.002]);
    g.add(rods(r, M.metal));
  } else if (item.t === 'metal') {
    g.add(box(L, 0.002, dep, (a + b) / 2, y - 0.001, z0 + dep / 2, M.metal));
    g.add(box(L, 0.03, 0.002, (a + b) / 2, y - 0.015, zf, M.metal));
    g.add(box(L, 0.02, 0.002, (a + b) / 2, y - 0.01, z0, M.metal));
  } else if (item.t === 'ldsp') {
    g.add(box(L, 0.016, dep, (a + b) / 2, y - 0.008, z0 + dep / 2, M.ldsp));
  } else if (item.t === 'basket' || item.t === 'pull') {
    const h = (item.h || 85) * MM, r = [], bot = y - h, n = Math.max(2, Math.round(L / 0.03)), aa = a + 0.012, bb = b - 0.012, LL = bb - aa;
    for (let i = 0; i <= n; i++) { const x = aa + LL * i / n; r.push([V(x, bot, z0), V(x, bot, zf), 0.0018]); r.push([V(x, bot, zf), V(x, y, zf), 0.0018]); r.push([V(x, bot, z0), V(x, y, z0), 0.0015]); }
    const m = Math.max(2, Math.round(dep / 0.03));
    for (let i = 0; i <= m; i++) { const z = z0 + dep * i / m; r.push([V(aa, bot, z), V(aa, y, z), 0.0016]); r.push([V(bb, bot, z), V(bb, y, z), 0.0016]); }
    [y, bot, (y + bot) / 2].forEach(yy => { r.push([V(aa, yy, z0), V(bb, yy, z0), 0.0028]); r.push([V(aa, yy, zf), V(bb, yy, zf), 0.0028]); r.push([V(aa, yy, z0), V(aa, yy, zf), 0.0028]); r.push([V(bb, yy, z0), V(bb, yy, zf), 0.0028]); });
    g.add(rods(r, M.metal));
    if (item.t === 'pull') {
      g.add(box(0.008, 0.02, dep, a + 0.004, y - 0.01, z0 + dep / 2, M.chrome)); g.add(box(0.008, 0.02, dep, b - 0.004, y - 0.01, z0 + dep / 2, M.chrome));
      g.add(rods([[V(aa + LL * 0.3, y - 0.01, zf + 0.02), V(bb - LL * 0.3, y - 0.01, zf + 0.02), 0.005], [V(aa + LL * 0.3, y - 0.01, zf), V(aa + LL * 0.3, y - 0.01, zf + 0.02), 0.003], [V(bb - LL * 0.3, y - 0.01, zf), V(bb - LL * 0.3, y - 0.01, zf + 0.02), 0.003]], M.chrome));
    }
  } else if (item.t === 'shoe') {
    const drop = 0.11, r = [], n = Math.max(2, Math.round(L / 0.03));
    const P = t => V(0, y - drop * t, z0 + dep * t);
    for (let i = 0; i <= n; i++) { const x = a + L * i / n, p0 = P(0), p1 = P(1); r.push([V(x, p0.y, p0.z), V(x, p1.y, p1.z), 0.0018]); r.push([V(x, p1.y, p1.z), V(x, p1.y + 0.04, p1.z + 0.003), 0.0018]); }
    [0, 0.33, 0.66, 1].forEach(t => { const p = P(t); r.push([V(a, p.y, p.z), V(b, p.y, p.z), 0.0028]); });
    const p1 = P(1); r.push([V(a, p1.y + 0.04, p1.z + 0.003), V(b, p1.y + 0.04, p1.z + 0.003), 0.003]);
    g.add(rods(r, M.metal));
  } else if (item.t === 'rail') {
    const arm = 0.335, zr = 0.3, ty = y + 0.06;
    [x0, x1].forEach(x => g.add(box(0.004, 0.025, arm, x, ty - 0.012, 0.021 + arm / 2, M.metal)));
    [a + 0.01, b - 0.01].forEach(x => g.add(box(0.03, 0.065, 0.004, x, y + 0.025, zr, M.chrome)));
    const rr = rods([[V(a, y, zr), V(b, y, zr), 0.0125]], M.chrome); rr.scale.set(1, 1, 1); g.add(rr);
  }
}

function placeWall(g, wi, backW) {
  if (wi === 0) return;
  const gap = S.walls[wi].gap * 10 * MM;
  if (wi === 1) { g.rotation.y = -Math.PI / 2; g.scale.z = -1; g.position.set(-0.02, 0, gap); }
  if (wi === 2) { g.rotation.y = Math.PI / 2; g.scale.x = -1; g.scale.z = -1; g.position.set(backW + 0.02, 0, gap); }
}

function buildRoom(backW) {
  room.clear();
  const floorM = floorMat();
  const wallM = wallMat();
  const left = S.layout === 'straight' ? -2 : -0.02, right = S.layout === 'U' ? backW + 0.02 : backW + 2;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), floorM); fl.rotation.x = -Math.PI / 2; fl.position.set(backW / 2, 0, 5); fl.receiveShadow = true; room.add(fl);
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(right - left, 3.2), wallM); bw.position.set((left + right) / 2, 1.6, 0); bw.receiveShadow = true; room.add(bw);
  const side = x => { const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), wallM); p.rotation.y = x < 0.5 ? Math.PI / 2 : -Math.PI / 2; p.position.set(x, 1.6, 3); p.receiveShadow = true; room.add(p); };
  if (S.layout !== 'straight') side(left); if (S.layout === 'U') side(right);
  const base = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  room.add(box(right - left, 0.06, 0.012, (left + right) / 2, 0.03, 0.006, base));
  if (!catcher) { catcher = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.25 })); catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; model.add(catcher); }
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
function dimH(g, labels, xa, xb, y, z, text, ext) {
  const t = 0.012, p = [V(xa, y, z), V(xb, y, z)];
  [xa, xb].forEach(x => p.push(V(x, y - ext, z), V(x, y + 0.025, z), V(x - t, y - t, z), V(x + t, y + t, z)));
  segs(g, p); labels.push([V((xa + xb) / 2, y, z), text]);
}
function dimV(g, labels, x, ya, yb, z, text, ext) {
  const t = 0.012, p = [V(x, ya, z), V(x, yb, z)];
  [ya, yb].forEach(y => p.push(V(x - 0.025, y, z), V(x + ext, y, z), V(x - t, y - t, z), V(x + t, y + t, z)));
  segs(g, p); labels.push([V(x, (ya + yb) / 2, z), text]);
}
const cm = mm => String(Math.round(mm / 10 * 10) / 10).replace('.', ',');
function buildDims(g, wi) {
  const labels = [], W = S.walls[wi], z = 0.004, railY = S.railTop * 10 * MM;
  let xs = [0]; W.sections.forEach(s => xs.push(xs[xs.length - 1] + s.w * 10 * MM));
  const tot = xs[xs.length - 1], sec2 = S.secDims !== false;
  const yTot = railY + (sec2 ? 0.2 : 0.12);
  if (sec2) W.sections.forEach((s, i) => dimH(g, labels, xs[i], xs[i + 1], railY + 0.09, z, cm(s.w * 10), 0.06));
  dimH(g, labels, 0, tot, yTot, z, cm(tot / MM), yTot - railY - 0.02);
  // overall height at the free side of the wall
  const left = wi === 0 && S.layout === 'straight', sgn = left ? -1 : 1, xb = left ? 0 : tot;
  const xH = xb + sgn * (sec2 ? 0.22 : 0.13);
  dimV(g, labels, xH, 0, railY, z, cm(railY / MM), -sgn * (Math.abs(xH - xb) - 0.03));
  if (sec2) { const pb = postBottom() * MM, pt = (S.railTop * 10 - 10) * MM, xP = xb + sgn * 0.11; dimV(g, labels, xP, pb, pt, z, cm(S.postH), -sgn * 0.08); }
  if (S.hdims) W.sections.forEach((s, i) => {
    const x = xs[i] + 0.06, zz = 0.5, ys = [...new Set(s.items.map(o => o.y))].sort((a, b) => a - b);
    const p = []; if (!ys.length) return; const top = ys[ys.length - 1] * 10 * MM;
    p.push(V(x, 0, zz), V(x, top, zz));
    ys.forEach(yc => { const y = yc * 10 * MM; p.push(V(x - 0.012, y - 0.012, zz), V(x + 0.012, y + 0.012, zz), V(x - 0.02, y, zz), V(x + 0.02, y, zz)); labels.push([V(x + 0.075, y + 0.03, zz), cm(yc * 10)]); });
    segs(g, p, LINE2);
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
  applyModelXf();
  setDims(S.dims);
  bbox = new THREE.Box3();
  model.children.forEach(c => { if (c !== catcher) bbox.expandByObject(c); });
  const c = bbox.getCenter(new THREE.Vector3());
  sun.position.set(c.x + 2.5, 4.5, 5); sun.target.position.copy(c);
  catcher.visible = !!photo && !$('showRoom').checked;
  room.visible = !photo || $('showRoom').checked;
  summary(); localStorage.setItem('gs_auto', JSON.stringify(S));
}
function setDims(on) {
  S.dims = on; dimsG.visible = on; model.traverse(o => { if (o.userData.dims) o.visible = on; });
  $('dimBtn').classList.toggle('on', on); $('secBtn').classList.toggle('on', S.secDims !== false); $('hBtn').classList.toggle('on', !!S.hdims);
}
function applyModelXf() {
  if (!photo) { model.position.set(0, 0, 0); model.scale.setScalar(1); model.rotation.y = 0; dimsG.position.set(0, 0, 0); dimsG.scale.setScalar(1); dimsG.rotation.y = 0; return; }
  const p = [+$('mx').value, +$('my').value, 0], s = +$('ms').value, r = +$('mr').value * Math.PI / 180;
  [model, dimsG].forEach(o => { o.position.set(...p); o.scale.setScalar(s); o.rotation.y = r; });
}

// ---------- camera ----------
function camTo(kind) {
  const c = bbox.getCenter(new THREE.Vector3()), sz = bbox.getSize(new THREE.Vector3());
  const dir = kind === 'front' ? V(0, 0.05, 1) : kind === 'iso' ? V(1, 0.45, 1.1) : V(0, 1, 0.35);
  dir.normalize();
  const asp = camera.aspect, fov = camera.fov * Math.PI / 180;
  const span = Math.max(sz.x, sz.z * (kind === 'front' ? 0 : 1), 1), hgt = kind === 'top' ? Math.max(sz.z, 1) : sz.y;
  const dist = Math.max(hgt / (2 * Math.tan(fov / 2)), span / (2 * Math.tan(fov / 2) * asp)) * 1.35 + sz.z * 0.5;
  if (photo) { c.applyMatrix4(new THREE.Matrix4()); }
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
function setBg() { scene.background = photo && !$('showRoom').checked ? null : new THREE.Color(0xe9e6e0); }

// ---------- export ----------
$('pngBtn').onclick = async () => {
  const hide = S.dims && !$('pngDims').checked; if (hide) setDims(false);
  const w = view.clientWidth, h = view.clientHeight, k = Math.max(2, Math.ceil(3000 / Math.max(w, h)));
  renderer.setPixelRatio(k); renderer.setSize(w, h, false); renderer.render(scene, camera);
  const W = renderer.domElement.width, H = renderer.domElement.height;
  const out = document.createElement('canvas'); out.width = W; out.height = H; const g = out.getContext('2d');
  if (photoImg && !$('showRoom').checked) { const s = Math.max(W / photoImg.width, H / photoImg.height), iw = photoImg.width * s, ih = photoImg.height * s; g.drawImage(photoImg, (W - iw) / 2, (H - ih) / 2, iw, ih); }
  g.drawImage(renderer.domElement, 0, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); resize(); if (hide) setDims(true);
  out.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'garderob-titan.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, 'image/png');
};

// ---------- spec / summary ----------
function nearest(arr, v) { return arr.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a); }
function railCombo(len) { const L = [1560, 1260, 1000, 700, 520], res = []; let rest = len; while (rest > 0) { const fit = L.slice().reverse().find(l => l >= rest); if (fit) { res.push(fit); break; } res.push(1560); rest -= 1560; } return res; }
function summary() {
  const spec = {}; const add = (k, n = 1) => spec[k] = (spec[k] || 0) + n;
  let html = '';
  wallsActive().forEach(wi => {
    const W = S.walls[wi], tot = wallWidth(wi);
    const rails = railCombo(tot + 40); rails.forEach(r => add(`Рельс несущий ${r} мм`));
    add(`Стойка ${S.postH} мм`, W.sections.length + 1);
    W.sections.forEach(s => s.items.forEach(o => {
      const w = s.w * 10, d = REAL_DEPTH[o.t][o.d];
      const br = { 306: 335, 327: 335, 330: 335, 340: 335, 406: 435, 427: 435, 430: 435, 440: 435, 506: 535 }[d] || 435;
      if (o.t === 'mesh') add(`Полка сетчатая ${nearest([463, 603, 903, 1203], w)}x${d}`);
      if (o.t === 'metal') add(`Полка металлическая 597x${d}`);
      if (o.t === 'ldsp') add(`Полка ЛДСП ${nearest([446, 587, 887], w)}x${d}`);
      if (o.t === 'basket') add(`Корзина стационарная ${nearest([603, 903], w)}x${d}x85`);
      if (o.t === 'pull') add(`Корзина выдвижная ${nearest([563, 863], w)}x${d}x${o.h || 85}`);
      if (o.t === 'shoe') add(`Полка для обуви ${nearest([603, 903], w)}x406x77`);
      if (o.t === 'rail') { add(`Перекладина ${nearest([640, 940, 1240, 2000], w)} мм`); add('Кронштейн для перекладины', 2); add('Кронштейн 335 мм', 2); }
      else add(`Кронштейн ${br} мм`, 2);
    }));
    html += `<b>${WALLNAMES[wi]}:</b> ${cm(tot)} см, секций ${W.sections.length}, рельс ${rails.join(' + ')} мм<br>`;
  });
  html += '<details><summary>Спецификация элементов</summary>' + Object.entries(spec).map(([k, v]) => `${k} — ${v} шт`).join('<br>') + '</details>';
  $('summary').innerHTML = html;
}

// ---------- UI ----------
function clampY(v) { const lo = Math.ceil(postBottom() / 10) + 3, hi = S.railTop - 4; return Math.max(lo, Math.min(hi, v)); }
function fillGeneral() {
  $('metal').value = S.metal; $('wall').value = S.wall; $('floor').value = S.floor; $('railTop').value = S.railTop;
  const pre = ['512', '1025', '1156', '1536', '1920', '2304'].includes(String(S.postH));
  $('postH').value = pre ? String(S.postH) : 'custom'; $('postHc').value = S.postH;
  if (!$('layout')) {
    const l = document.createElement('label'); l.innerHTML = 'Тип гардеробной<select id="layout">' + Object.entries(LAYOUTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('') + '</select>';
    $('metal').parentNode.before(l); $('layout').onchange = e => { S.layout = e.target.value; cur = { w: 0, s: 0 }; rebuild(); renderSec(); camTo(S.layout === 'straight' ? 'front' : 'iso'); };
  }
  $('layout').value = S.layout;
}
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
  if (cur.w > 0) h += `<label>Отступ от угла (свободный угол), см<input type="number" id="gap" min="0" max="150" value="${W.gap}"></label>`;
  $('secTabs').innerHTML = h + '<div class="tabs">' + W.sections.map((s, i) => `<button data-s="${i}" class="${i === cur.s ? 'on' : ''}">${i + 1}: ${s.w}</button>`).join('') + '</div>';
  $('secTabs').querySelectorAll('[data-w]').forEach(b => b.onclick = () => { cur = { w: +b.dataset.w, s: 0 }; renderSec(); });
  $('secTabs').querySelectorAll('[data-s]').forEach(b => b.onclick = () => { cur.s = +b.dataset.s; renderSec(); });
  if ($('gap')) $('gap').onchange = e => { W.gap = Math.max(0, Math.min(150, +e.target.value || 0)); rebuild(); };
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
document.querySelectorAll('[data-cam]').forEach(b => b.onclick = () => { lastCam = b.dataset.cam; camTo(lastCam); });
$('secBtn').onclick = () => { S.secDims = S.secDims === false; rebuild(); };
$('hBtn').onclick = () => { S.hdims = !S.hdims; rebuild(); };
$('dimBtn').onclick = () => { setDims(!S.dims); localStorage.setItem('gs_auto', JSON.stringify(S)); };
const msg = t => { $('msg').textContent = t; setTimeout(() => $('msg').textContent = '', 3000); };
$('saveBtn').onclick = () => { localStorage.setItem('gs_saved', JSON.stringify(S)); msg('Конфигурация сохранена'); };
$('loadBtn').onclick = () => { const v = load('gs_saved'); if (!v) return msg('Сохраненной конфигурации нет'); S = v; cur = { w: 0, s: 0 }; fillGeneral(); rebuild(); renderSec(); camTo(lastCam); msg('Конфигурация загружена'); };
$('resetBtn').onclick = () => { if (!confirm('Сбросить все настройки?')) return; S = defaults(); cur = { w: 0, s: 0 }; fillGeneral(); rebuild(); renderSec(); camTo('front'); };

fillGeneral(); setBg(); resize(); rebuild(); renderSec(); camTo(S.layout === 'straight' ? 'front' : 'iso');
window.__gs = { S, camTo, setLayout: l => { $('layout').value = l; $('layout').onchange({ target: $('layout') }); }, setDims };
