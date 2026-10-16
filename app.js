import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CATALOG, RULES } from './catalog.js';

const $ = id => document.getElementById(id);
const MM = 0.001;
const METAL = { white: 0xf1f0ec, black: 0x1d1e20, graphite: 0x4b4e52, silver: 0xbfc2c5 };
const FLOORS = { oak: ['herringbone_parquet', 6, 0xffffff], lam: ['laminate_floor_02', 6, 0xffffff], tile: ['marble_01', 4, 0xffffff], carpet: [null, 1, 0xffffff] };
const TYPES = {
  mesh: 'Полка сетчатая', metal: 'Полка металлическая', ldsp: 'Полка ЛДСП',
  basket: 'Корзина стационарная', pull: 'Корзина выдвижная', rail: 'Штанга для вешалок', shoe: 'Полка для обуви', trouser: 'Брючница выдвижная'
};
const DEPTHS = { mesh: [30, 40, 50], metal: [30, 40], ldsp: [30, 40], basket: [30, 40], pull: [30, 40], rail: [30], shoe: [40], trouser: [30, 40] };
const REAL_DEPTH = { mesh: { 30: 306, 40: 406, 50: 506 }, metal: { 30: 327, 40: 427 }, ldsp: { 30: 330, 40: 430 }, basket: { 30: 340, 40: 440 }, pull: { 30: 340, 40: 440 }, rail: { 30: 300 }, shoe: { 40: 406 }, trouser: { 30: 340, 40: 440 } };
const LAYOUTS = { straight: 'Прямая (одна стена)', L: 'Угловая, угол слева', Lr: 'Угловая, угол справа', U: 'П-образная' };
const CATS = { shelf: 'Полка', rod: 'Штанга', basket: 'Корзина', trouser: 'Брючница' };
const catOf = t => t === 'rail' ? 'rod' : t === 'basket' || t === 'pull' ? 'basket' : t === 'trouser' ? 'trouser' : 'shelf';
const VARS = { shelf: [['mesh', 'Сетчатая'], ['metal', 'Металлическая'], ['ldsp', 'ЛДСП'], ['shoe', 'Для обуви']], rod: [['rail', 'Штанга на фланцах']], basket: [['pull|mesh', 'Выдвижная сетчатая'], ['pull|perf', 'Выдвижная перфорированная'], ['basket|mesh', 'Стационарная сетчатая'], ['basket|perf', 'Стационарная перфорированная']], trouser: [['trouser', 'Выдвижная']] };
const isBasket = t => t === 'basket' || t === 'pull';
const perfOf = o => (o.v || (S.basketStyle === 'plastic' ? 'perf' : 'mesh')) === 'perf';
const WALLNAMES = ['Основная стена', 'Левая стена', 'Правая стена'];

function sec(w, items) { return { w, items }; }
function it(t, d, y, h) { const o = { t, d, y }; if (h) o.h = h; return o; }
function defaults() {
  return {
    layout: 'straight', metal: 'white', wall: '#ecdcc8', floor: 'oak', preset: 'warm', view: 'all', decor: true, card: null, postH: 1920, railTop: 210, dims: true, dm: { t: true, s: true, v: true, c: false },
    walls: [
      { gap: 0, sections: [sec(90, [it('mesh', 40, 192), it('rail', 30, 180), it('shoe', 40, 30)]), sec(90, [it('mesh', 40, 192), it('mesh', 40, 152), it('mesh', 40, 112), it('basket', 40, 75, 85), it('pull', 40, 50, 181)]), sec(90, [it('mesh', 40, 192), it('rail', 30, 180), it('rail', 30, 100)])] },
      { gap: 50, sections: [sec(60, [it('metal', 40, 192), it('mesh', 40, 150), it('mesh', 40, 110), it('mesh', 40, 70)]), sec(90, [it('ldsp', 40, 192), it('rail', 30, 180), it('shoe', 40, 30)])] },
      { gap: 50, sections: [sec(90, [it('mesh', 40, 192), it('rail', 30, 180)]), sec(60, [it('mesh', 40, 192), it('mesh', 40, 140), it('mesh', 40, 90), it('shoe', 40, 30)])] }
    ]
  };
}
const ROOMDEF = { extra: 0, ceiling: false, ceilH: 275, skirting: true, lamps: false, glare: 0.3, shadow: 0.5, angle: 90, skirtColor: '#ffffff', lampType: 'spot', glow: 'none', shOn: true, shAng: 20, shBlur: 6, shDist: 0.4 };
function migrate(S) { S.room = Object.assign({}, ROOMDEF, S.room || {}); S.room.lampType = 'spot'; if (!S.basketStyle) S.basketStyle = 'mesh'; if (!S.prices) S.prices = {}; if (!S.depth) S.depth = 40; S.walls.forEach(w => { if (w.sections.length > 6) w.sections.length = 6; }); return S; }
function setTemplate(t) {
  const m = y => ({ t: 'mesh', d: 40, y }), rl = y => ({ t: 'rail', d: 30, y }), sh = y => ({ t: 'shoe', d: 40, y }), pu = (y, h) => ({ t: 'pull', d: 40, y, h });
  const A = () => ({ w: 90, items: [m(192), rl(180), m(40)] }), B = () => ({ w: 90, items: [m(192), m(152), m(112), m(72), m(32)] }), C = () => ({ w: 60, items: [m(192), m(150), pu(95, 181), pu(70, 181), sh(30)] }), D = () => ({ w: 90, items: [m(192), rl(180), rl(100)] });
  S.walls[0].gap = S.walls[0].gap || 0;
  if (t === 'p2') { S.layout = 'straight'; S.walls[0].sections = [A(), B()]; }
  if (t === 'p3') { S.layout = 'straight'; S.walls[0].sections = [A(), B(), D()]; }
  if (t === 'p6') { S.layout = 'straight'; S.walls[0].sections = [A(), B(), C(), C(), B(), D()]; }
  if (t === 'l23') { S.layout = 'L'; S.walls[0].sections = [A(), B(), D()]; S.walls[1].gap = Math.max(S.walls[1].gap || 0, 46); S.walls[1].sections = [B(), C()]; }
  if (t === 'zero') { S.layout = 'straight'; S.walls[0].sections = [{ w: 90, items: [] }]; }
  cur = { w: 0, s: 0 }; fillGeneral(); rebuild(); renderSec(); camTo(S.layout === 'straight' ? 'front' : 'iso');
}
function cardPreset() {
  const S = defaults(), m = y => ({ t: 'mesh', d: 40, y }), rl = y => ({ t: 'rail', d: 30, y });
  Object.assign(S, { layout: 'L', view: 'fill', preset: 'warm', wall: '#ecdcc8', floor: 'oak', railTop: 205, postH: 1920, metal: 'white', rod: 'chrome', decor: true, dm: { t: false, s: false, v: false, c: false } });
  S.walls[0].gap = 0; S.walls[0].sections = [{ w: 90, items: [m(190), rl(178), m(42)] }, { w: 60, items: [m(190), rl(178), m(42)] }];
  S.walls[1].gap = 46; S.walls[1].sections = [{ w: 60, items: [m(190), m(140), m(90), m(42)] }];
  S.card = Object.assign(cardDefaults(), { size: '156 × 110 × 205 см' }); S._cam = 'card'; return S;
}
let S = migrate(load('gs_auto') || defaults());
const QS = new URLSearchParams(location.search);
try {
  if (QS.get('preset') === 'card') S = migrate(cardPreset());
  else if (QS.get('cfg')) { const v = JSON.parse(decodeURIComponent(escape(atob(QS.get('cfg').replace(/-/g, '+').replace(/_/g, '/'))))); if (v && v.walls) S = migrate(v); }
} catch (e) { console.warn('cfg', e); } if (!FLOORS[S.floor]) S.floor = S.floor === 'parquet' || S.floor === 'walnut' ? 'oak' : 'lam'; if (!S.view) S.view = 'all'; S = migrate(S); if (!S.basketStyle) S.basketStyle = 'mesh'; if (!S.prices) S.prices = {}; if (!S.preset) S.preset = 'none'; if (!S.dm) S.dm = { t: true, s: true, v: true, c: false }; if ('h' in S.dm) { S.dm.t = S.dm.s = S.dm.h; delete S.dm.h; } S.dims = true;
let cur = { w: 0, s: 0 }, drag = null;
function load(k) { try { const v = JSON.parse(localStorage.getItem(k)); return v && v.walls ? v : null; } catch (e) { return null; } }

// ---------- renderer ----------
const view = $('view');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
const PR_MAX = Math.min(devicePixelRatio, innerWidth < 800 ? 2 : 1.5); let PR = PR_MAX;
renderer.setPixelRatio(PR);
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
function canvasTex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; return t; }
let CARPET;
function carpetTex() {
  if (!CARPET) { let sd = 3; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const col = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#b9ab98'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60000; i++) { const l = 150 + rnd() * 50; g.fillStyle = `rgba(${l + 25},${l + 12},${l - 6},0.55)`; g.fillRect(rnd() * w, rnd() * h, 1.6, 1.6); } }, 6);
    col.colorSpace = THREE.SRGBColorSpace;
    const nor = canvasTex(512, 512, (g, w, h) => { g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40000; i++) { g.fillStyle = `rgb(${100 + rnd() * 56},${100 + rnd() * 56},255)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } }, 6);
    CARPET = [col, nor]; }
  return CARPET;
}
function floorMat() {
  const [n, rep, tint] = FLOORS[S.floor] || FLOORS.oak, warm = S.preset === 'warm';
  if (!n) { const [c, nn] = carpetTex(); return new THREE.MeshStandardMaterial({ color: warm ? 0xfff2e2 : 0xffffff, map: c, normalMap: nn, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1, envMapIntensity: 0.2 }); }
  return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(tint).multiply(new THREE.Color(warm ? 0xfff6ec : 0xffffff)), map: tex(n + '_diff', true, rep), normalMap: tex(n + '_nor_gl', false, rep), roughnessMap: tex(n + '_rough', false, rep), roughness: 1, clearcoat: S.floor === 'tile' ? 0.6 : 0.25, clearcoatRoughness: 0.35 });
}
let PAPER;
function paperTex() {
  if (!PAPER) PAPER = canvasTex(256, 512, (g, w, h) => { g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgb(150,128,255)'; g.fillRect(x, 0, 2, h); g.fillStyle = 'rgb(106,128,255)'; g.fillRect(x + 2, 0, 2, h); }
    for (let y = 32; y < h; y += 64) for (let x = 16; x < w; x += 64) { g.strokeStyle = 'rgb(150,150,255)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x + (y % 128 ? 32 : 0), y, 10, 18, 0, 0, 7); g.stroke(); } }, 2);
  return PAPER;
}
// walls: unlit exact color (identical on every wall) with a baked finish texture; shadows via a ShadowMaterial overlay
const FIN = {};
function finishTex(f) {
  if (!FIN[f]) { let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    FIN[f] = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
      if (f === 'plaster') { for (let i = 0; i < 900; i++) { const x = rnd() * w, y = rnd() * h, r = 6 + rnd() * 26, l = 228 + rnd() * 27; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${l},${l},${l},0.22)`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); } }
      else if (f === 'paper') { for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(0,0,0,0.035)'; g.fillRect(x, 0, 30, h); } g.strokeStyle = 'rgba(0,0,0,0.06)'; g.lineWidth = 2; for (let y = 32; y < h; y += 64) for (let x = 0; x < w; x += 64) { const cx = x + 32 + (y % 128 > 64 ? 32 : 0); g.beginPath(); g.ellipse(cx % w, y, 9, 16, 0, 0, 7); g.stroke(); } }
      for (let i = 0; i < 20000; i++) { const l = 235 + rnd() * 20; g.fillStyle = `rgba(${l},${l},${l},0.25)`; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); } }, f === 'paper' ? 3 : 2);
    FIN[f].colorSpace = THREE.SRGBColorSpace; }
  return FIN[f];
}
function wallMat() { return new THREE.MeshBasicMaterial({ color: new THREE.Color(S.wall), map: finishTex(S.wallFin || 'paint'), toneMapped: false }); }
function wallShadowMat() { return new THREE.ShadowMaterial({ opacity: 0.2, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }); }
let CONTACT;
function contactMat() {
  if (!CONTACT) { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.35, 'rgba(0,0,0,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 64);
    const m = g.getImageData(0, 0, 128, 64); for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) { const k = Math.min(1, Math.min(x, 127 - x) / 18); m.data[(y * 128 + x) * 4 + 3] *= k; } g.putImageData(m, 0, 0); CONTACT = new THREE.CanvasTexture(c); }
  return new THREE.MeshBasicMaterial({ map: CONTACT, transparent: true, depthWrite: false, opacity: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}

// ---------- materials ----------
let M = {};
function makeMats() {
  const col = METAL[S.metal];
  const pc = { color: col, metalness: S.metal === 'white' ? 0.25 : 0.5, roughness: S.metal === 'black' ? 0.45 : 0.38 };
  pc.metalness = S.metal === 'silver' ? 0.85 : pc.metalness; pc.roughness = S.metal === 'silver' ? 0.3 : pc.roughness;
  const pp = { ...pc, clearcoat: 0.35, clearcoatRoughness: 0.25 };
  M.metal = new THREE.MeshPhysicalMaterial(pp);
  const pt = slotTex(false); pt.repeat.set(1, S.postH / 32);
  M.post = new THREE.MeshPhysicalMaterial({ ...pp, map: pt });
  const rt = slotTex(true); M.railTex = rt;
  M.rail = new THREE.MeshPhysicalMaterial({ ...pp, map: rt });
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
function wallsActive() { return S.layout === 'straight' ? [0] : S.layout === 'L' ? [0, 1] : S.layout === 'Lr' ? [0, 2] : [0, 1, 2]; }
function wallWidth(w) { return S.walls[w].sections.reduce((a, s) => a + s.w * 10, 0); }

function buildWall(wi) {
  const W = S.walls[wi], g = new THREE.Group(); g.userData.wi = wi;
  const total = wallWidth(wi), railY = S.railTop * 10 * MM, Z0 = 0.017;
  const rl = (total + 50) * MM;
  M.railTex.repeat.set(rl / 0.032, 1);
  // heavy rail profile: back plate, top/bottom returns, front lip
  { const cx = total * MM / 2, H = 0.042, parts = [box(rl, H, 0.003, cx, railY - H / 2, 0.0015, M.rail), box(rl, 0.003, 0.011, cx, railY - 0.0015, 0.0055, M.metal), box(rl, 0.003, 0.011, cx, railY - H + 0.0015, 0.0055, M.metal), box(rl, 0.012, 0.003, cx, railY - 0.006, 0.0095, M.metal), box(0.003, H, 0.011, cx - rl / 2, railY - H / 2, 0.0055, M.metal), box(0.003, H, 0.011, cx + rl / 2, railY - H / 2, 0.0055, M.metal)]; parts.forEach(p => { p.userData.frame = true; g.add(p); }); }
  const pb = postBottom() * MM, pt = (S.railTop * 10 - 10) * MM;
  let xs = [0]; W.sections.forEach(s => xs.push(xs[xs.length - 1] + s.w * 10 * MM));
  // uprights 32 x 34 mm (seller data), metal 1.8 mm with hook head and floor-side end cap
  xs.forEach(x => { const pm = box(0.032, pt - pb, 0.034, x, (pt + pb) / 2, 0.011 + 0.017, M.post); pm.userData.frame = true; g.add(pm);
    const hk = box(0.036, 0.03, 0.03, x, pt - 0.012, 0.026, M.metal); hk.userData.frame = true; g.add(hk);
    const cap = box(0.034, 0.012, 0.036, x, pb + 0.006, 0.028, M.plastic); cap.userData.frame = true; g.add(cap); });
  W.sections.forEach((s, si) => s.items.forEach((item, ii) => { const ig = new THREE.Group(); ig.userData.ref = { wi, si, ii }; g.add(ig); buildItem(ig, item, xs[si], xs[si + 1], s);
    const ch = isBasket(item.t) ? (item.h || 85) * MM + 0.08 : 0.11, cs = new THREE.Mesh(new THREE.PlaneGeometry(xs[si + 1] - xs[si], ch), contactMat()); cs.position.set((xs[si] + xs[si + 1]) / 2, itemTop(item) - ch / 2 + 0.005, 0.0012); cs.userData.contact = true; ig.add(cs);
    if (isBasket(item.t) || item.t === 'trouser' || item.t === 'shoe') { const fl = new THREE.Mesh(new THREE.PlaneGeometry(xs[si + 1] - xs[si], 0.02), contactMat()); fl.visible = false; ig.add(fl); } }));
  return g;
}
const BRG = {};
// shelf bracket: top flange ends exactly at y (shelf sits on it)
function bracket(g, x, y, L) {
  const k = L.toFixed(3);
  if (!BRG[k]) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(L, 0); sh.lineTo(L, -0.014); sh.lineTo(0.045, -0.068); sh.lineTo(0, -0.072); sh.lineTo(0, 0);
    const ge = new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: false }); ge.rotateY(-Math.PI / 2); ge.translate(-0.003, 0, 0); BRG[k] = ge; }
  const m = new THREE.Mesh(BRG[k], M.metal); m.position.set(x, y, 0.045); m.castShadow = m.receiveShadow = true; g.add(m);
  g.add(box(0.024, 0.004, L, x, y - 0.002, 0.045 + L / 2, M.metal));
  g.add(box(0.012, 0.016, 0.008, x, y - 0.008, 0.045 + L - 0.004, M.metal));
}
function buildItem(g, item, x0, x1, sec) {
  const y = item.y * 10 * MM, dep = (REAL_DEPTH[item.t][item.d] || 400) * MM, z0 = 0.052, zf = z0 + dep;
  const a = x0 + 0.012, b = x1 - 0.012, L = b - a, mid = (x0 + x1) / 2;
  const brL = dep + 0.02;
  if (item.t !== 'rail') { bracket(g, x0, y, brL); bracket(g, x1, y, brL); }
  if (item.t === 'mesh') {
    // everything is above y: cross wires lie on the bracket flanges, side rims sit right over them
    const r = [], ea = x0 + 0.004, eb = x1 - 0.004, Lw = eb - ea, n = Math.max(2, Math.round(Lw / 0.014));
    for (let t = 0; t <= 1.001; t += 0.125) { const z = z0 + 0.004 + (dep - 0.008) * t; r.push([V(x0 - 0.006, y + 0.0025, z), V(x1 + 0.006, y + 0.0025, z), 0.0025]); }
    for (let i = 1; i < n; i++) { const x = ea + Lw * i / n; r.push([V(x, y + 0.007, z0), V(x, y + 0.007, zf), 0.0022]); }
    [ea, eb].forEach(x => r.push([V(x, y + 0.0045, z0), V(x, y + 0.0045, zf), 0.0045]));
    r.push([V(ea, y + 0.007, z0), V(eb, y + 0.007, z0), 0.0035]);
    g.add(rods(r, M.metal));
    g.add(box(x1 - x0 - 0.002, 0.036, 0.005, mid, y - 0.009, zf + 0.0025, M.metal));
    g.add(box(x1 - x0 - 0.002, 0.006, 0.016, mid, y + 0.006, zf - 0.006, M.metal));
  } else if (item.t === 'metal') {
    g.add(box(x1 - x0, 0.003, dep, mid, y + 0.0015, z0 + dep / 2, M.metal));
    g.add(box(x1 - x0, 0.034, 0.004, mid, y - 0.014, zf, M.metal));
    g.add(box(x1 - x0, 0.022, 0.004, mid, y + 0.011, z0, M.metal));
  } else if (item.t === 'ldsp') {
    g.add(box(x1 - x0 + 0.01, 0.018, dep, mid, y + 0.009, z0 + dep / 2, M.ldsp));
  } else if (isBasket(item.t) && !perfOf(item)) {
    const h = (item.h || 85) * MM, r = [], bot = y - h, aa = a + 0.012, bb = b - 0.012, LL = bb - aa, n = Math.max(2, Math.round(LL / 0.025)), wz0 = z0 + 0.01, wzf = zf - 0.01;
    for (let i = 0; i <= n; i++) { const x = aa + LL * i / n; r.push([V(x, bot, wz0), V(x, bot, wzf), 0.0022]); r.push([V(x, bot, wzf), V(x, y, wzf), 0.0022]); r.push([V(x, bot, wz0), V(x, y, wz0), 0.002]); }
    const m = Math.max(2, Math.round((wzf - wz0) / 0.025));
    for (let i = 0; i <= m; i++) { const z = wz0 + (wzf - wz0) * i / m; r.push([V(aa, bot, z), V(aa, y, z), 0.002]); r.push([V(bb, bot, z), V(bb, y, z), 0.002]); }
    const levels = [y, bot]; for (let yy = bot + 0.03; yy < y - 0.01; yy += 0.03) levels.push(yy);
    levels.forEach((yy, k) => { const rr = k < 2 ? 0.004 : 0.002; r.push([V(aa, yy, wz0), V(bb, yy, wz0), rr]); r.push([V(aa, yy, wzf), V(bb, yy, wzf), rr]); r.push([V(aa, yy, wz0), V(aa, yy, wzf), rr]); r.push([V(bb, yy, wz0), V(bb, yy, wzf), rr]); });
    g.add(rods(r, M.metal));
    // runners from bracket to basket rim
    [[x0 + 0.003, aa], [x1 - 0.003, bb]].forEach(([xa, xb]) => g.add(box(Math.abs(xb - xa) + 0.004, 0.016, dep, (xa + xb) / 2, y - 0.008, z0 + dep / 2, M.metal)));
    if (item.t === 'pull') g.add(rods([[V(aa + LL * 0.3, y - 0.014, wzf + 0.028), V(bb - LL * 0.3, y - 0.014, wzf + 0.028), 0.006], [V(aa + LL * 0.3, y - 0.014, wzf), V(aa + LL * 0.3, y - 0.014, wzf + 0.028), 0.0035], [V(bb - LL * 0.3, y - 0.014, wzf), V(bb - LL * 0.3, y - 0.014, wzf + 0.028), 0.0035]], M.chrome));
  } else if (isBasket(item.t)) {
    const h = (item.h || 85) * MM, bot = y - h, aa = a + 0.014, bb = b - 0.014, LL = bb - aa;
    [[x0 + 0.003, aa], [x1 - 0.003, bb]].forEach(([xa, xb]) => g.add(box(Math.abs(xb - xa) + 0.004, 0.016, dep, (xa + xb) / 2, y - 0.008, z0 + dep / 2, M.metal)));
    const bw = LL, bd = dep - 0.03, cz = z0 + dep / 2, fh = h - 0.014;
    const face = (w, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, fh), basketMat(w / 0.05, fh / 0.06)); m.position.set(x, bot + fh / 2, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; g.add(m); };
    face(bw, (aa + bb) / 2, cz + bd / 2, 0); face(bw, (aa + bb) / 2, cz - bd / 2, Math.PI);
    face(bd, aa, cz, -Math.PI / 2); face(bd, bb, cz, Math.PI / 2);
    g.add(box(bw, 0.004, bd, (aa + bb) / 2, bot + 0.002, cz, M.plastic));
    g.add(box(bw + 0.016, 0.014, bd + 0.016, (aa + bb) / 2, y - 0.007, cz, M.plastic));
    if (item.t === 'pull') g.add(box(LL * 0.3, 0.014, 0.014, (aa + bb) / 2, y - 0.04, cz + bd / 2 + 0.009, M.plastic));
  } else if (item.t === 'trouser') {
    const h = 0.1, aa = a + 0.012, bb = b - 0.012, r = [], n = 8;
    [[x0 + 0.003, aa], [x1 - 0.003, bb]].forEach(([xa, xb]) => g.add(box(Math.abs(xb - xa) + 0.004, 0.018, dep, (xa + xb) / 2, y - 0.009, z0 + dep / 2, M.metal)));
    [aa, bb].forEach(x => { g.add(box(0.008, h, 0.02, x, y - h / 2, z0 + 0.02, M.metal)); g.add(box(0.008, h, 0.02, x, y - h / 2, zf - 0.02, M.metal)); r.push([V(x, y - h + 0.01, z0 + 0.02), V(x, y - h + 0.01, zf - 0.02), 0.005]); });
    for (let k = 0; k < n; k++) { const z = z0 + 0.03 + (dep - 0.06) * k / (n - 1); r.push([V(aa, y - h + 0.014, z), V(bb, y - h + 0.014, z), 0.005]); }
    g.add(rods(r, M.rod));
    g.add(rods([[V(aa + L * 0.3, y - 0.05, zf + 0.012), V(bb - L * 0.3, y - 0.05, zf + 0.012), 0.006]], M.chrome));
  } else if (item.t === 'shoe') {
    const drop = 0.11, r = [], n = Math.max(2, Math.round(L / 0.03));
    const P = t => V(0, y + 0.003 - drop * t, z0 + dep * t);
    for (let i = 0; i <= n; i++) { const x = a + L * i / n, p0 = P(0), p1 = P(1); r.push([V(x, p0.y, p0.z), V(x, p1.y, p1.z), 0.0024]); r.push([V(x, p1.y, p1.z), V(x, p1.y + 0.04, p1.z + 0.003), 0.0024]); }
    [0, 0.33, 0.66, 1].forEach(t => { const p = P(t); r.push([V(x0, p.y, p.z), V(x1, p.y, p.z), 0.0035]); });
    const p1 = P(1); r.push([V(a, p1.y + 0.04, p1.z + 0.003), V(b, p1.y + 0.04, p1.z + 0.003), 0.004]);
    g.add(rods(r, M.metal));
  } else if (item.t === 'rail') {
    // rod in flange cups on both ends; cups hang from the shelf bracket above or from a rod arm in the upright
    const sh = sec && sec.items.filter(o => o !== item && o.t !== 'rail' && o.t !== 'shoe' && o.y > item.y && o.y - item.y <= 25).sort((p, q) => p.y - q.y)[0];
    let zr = 0.3;
    if (sh) zr = Math.min(0.052 + (REAL_DEPTH[sh.t][sh.d] || 400) * MM - 0.08, 0.34);
    const ca = x0 + 0.016, cb = x1 - 0.016;
    [[x0, ca], [x1, cb]].forEach(([x, cx]) => {
      let top;
      if (sh) top = sh.y * 10 * MM - 0.02;
      else { top = y + 0.1; const arm = zr + 0.02 - 0.045; g.add(box(0.006, 0.05, arm, x, top - 0.025, 0.045 + arm / 2, M.metal)); }
      const hh = top - y; g.add(box(0.006, hh, 0.03, x, y + hh / 2, zr, M.metal));
      const cup = rods([[V(x, y, zr), V(cx + (cx > x ? 0.004 : -0.004), y, zr), 0.02]], M.metal); cup.geometry = new THREE.CylinderGeometry(1, 1, 1, 28, 1).translate(0, 0.5, 0); g.add(cup);
      g.add(box(0.006, 0.05, 0.05, x, y, zr, M.metal));
    });
    const rr = rods([[V(ca, y, zr), V(cb, y, zr), 0.0125]], M.rod); rr.geometry = new THREE.CylinderGeometry(1, 1, 1, 24, 1).translate(0, 0.5, 0); g.add(rr);
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
  const floorM = floorMat(), wallM = wallMat(), CH = (S.room.ceilH || 275) / 100;
  const RX = (S.room.extra || 0) / 100, g0 = effGap(0) * 10 * MM, cr = S.layout === 'U' || S.layout === 'Lr', cl = S.layout !== 'Lr';
  const left = cl ? -0.02 : -2.5 - RX, right = cr ? g0 + backW + 0.02 + (S.layout === 'U' ? RX : 0) : g0 + backW + 2.5 + RX;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), floorM); fl.rotation.x = -Math.PI / 2; fl.position.set(backW / 2, 0, 5); fl.receiveShadow = true; room.add(fl);
  const plane = (w, h, x, y, z, ry, parent) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallM); p.position.set(x, y, z); p.rotation.y = ry; parent.add(p); const q = new THREE.Mesh(p.geometry, wallShadowMat()); q.position.copy(p.position); q.rotation.y = ry; q.receiveShadow = true; parent.add(q); };
  plane(right - left, CH, (left + right) / 2, CH / 2, 0, 0, room);
  const cmM = new THREE.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 0.7 }), cornice = (len, x, z, ry, parent) => { const g = new THREE.Group(); g.position.set(x, CH, z); g.rotation.y = ry; [[0.012, 0.09, 0.006], [0.03, 0.05, 0.02], [0.05, 0.022, 0.04]].forEach(([d, hh, zz]) => { const m = box(len, hh, d, 0, -hh / 2, zz - d / 2 + 0.006, cmM); m.castShadow = false; g.add(m); }); parent.add(g); };
  const dA = ((S.room.angle || 90) - 90) * Math.PI / 180, skM = new THREE.MeshStandardMaterial({ color: S.room.skirtColor || '#ffffff', roughness: 0.6 });
  const side = x => { const L = x === left, pv = new THREE.Group(); pv.position.set(x, 0, 0); pv.rotation.y = L ? -dA : dA;
    plane(6 + RX * 2, CH, 0, CH / 2, 3 + RX, L ? Math.PI / 2 : -Math.PI / 2, pv);
    if (S.room.skirting !== false) { pv.add(box(0.016, 0.08, 6 + RX * 2, L ? 0.008 : -0.008, 0.04, 3 + RX, skM)); pv.add(box(0.022, 0.012, 6 + RX * 2, L ? 0.011 : -0.011, 0.074, 3 + RX, skM)); }
    if (S.room.ceiling) { const cg = new THREE.Group(); cornice(6 + RX * 2, 0, 3 + RX, L ? Math.PI / 2 : -Math.PI / 2, cg); cg.children[0].position.set(0, CH, 3 + RX); pv.add(cg); } room.add(pv); };
  if (cl) side(left); if (cr) side(right);
  if (S.room.skirting !== false) { room.add(box(right - left, 0.08, 0.016, (left + right) / 2, 0.04, 0.008, skM)); room.add(box(right - left, 0.012, 0.022, (left + right) / 2, 0.074, 0.011, skM)); }
  if (S.room.ceiling) { const ce = new THREE.Mesh(new THREE.PlaneGeometry(right - left + 0.1, 6 + RX * 2), new THREE.MeshBasicMaterial({ color: 0xf6f4ef, toneMapped: false })); ce.rotation.x = Math.PI / 2; ce.position.set((left + right) / 2, CH, 3 + RX); room.add(ce);
    cornice(right - left, (left + right) / 2, 0, 0, room); }
  if (S.room.lamps) { const n = Math.max(2, Math.round((right - left) / 1.2)); for (let i = 0; i < n; i++) { const x = left + (right - left) * (i + 0.5) / n; const d = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.008, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2dc, emissiveIntensity: 1.5 })); d.position.set(x, CH - 0.004, 0.9); room.add(d); const pl = new THREE.PointLight(0xffe9cc, 1.0, 0, 2); pl.position.set(x, CH - 0.12, 0.9); room.add(pl); } }
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
  const corner = S.layout === 'L' || S.layout === 'U', Wb = wallWidth(0) * MM;
  const sideLen = corner ? (effGap(1) + wallWidth(1) / 10) / 100 : 0;
  const px = corner ? 0.2 : -0.45, pz = corner ? sideLen + 0.5 : 0.4;
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
function labelSprite(text, small, col = '#222') {
  const c = document.createElement('canvas'), g = c.getContext('2d'), fs = 44;
  g.font = `600 ${fs}px Manrope,Arial,sans-serif`; const w = Math.ceil(g.measureText(text).width) + 28;
  c.width = w; c.height = 64; g.font = `600 ${fs}px Manrope,Arial,sans-serif`;
  g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.roundRect(1, 6, w - 2, 52, 10); g.fill();
  g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 33);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  const h = 0.085; sp.scale.set(h * w / 64, h, 1); sp.renderOrder = 10; return sp;
}
const LINE2 = new THREE.LineBasicMaterial({ color: 0x777777, transparent: true, opacity: 0.7 });
let curLine = LINE;
function segs(g, pts, mat = curLine) { const geo = new THREE.BufferGeometry().setFromPoints(pts); const l = new THREE.LineSegments(geo, mat); l.renderOrder = 9; g.add(l); }
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
function itemBot(o) { const y = o.y * 10 * MM; return o.t === 'basket' || o.t === 'pull' ? y - (o.h || 85) * MM : o.t === 'trouser' ? y - 0.1 : o.t === 'shoe' ? y - 0.11 : o.t === 'rail' ? y - 0.0125 : y - 0.028; }
function buildDims(g, wi) {
  curLine = new THREE.LineBasicMaterial({ color: S.walls[wi].dimColor || '#2a2a2a' });
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
    const left = wi === 0 && (S.layout === 'straight' || S.layout === 'Lr'), sg = left ? -1 : 1, xb = left ? -0.0125 : tot + 0.0125;
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
const HIST = [], RED = []; let histT = 0, histLock = false;
function pushHist() { if (histLock) return; clearTimeout(histT); histT = setTimeout(() => { const j = JSON.stringify(S); if (HIST[HIST.length - 1] !== j) { HIST.push(j); if (HIST.length > 80) HIST.shift(); RED.length = 0; } }, 250); }
function restoreHist(j) { histLock = true; S = migrate(JSON.parse(j)); fillGeneral(); rebuild(); renderSec(); cardUI(); histLock = false; }
function undo() { clearTimeout(histT); if (HIST.length < 2) return; RED.push(HIST.pop()); restoreHist(HIST[HIST.length - 1]); }
function redo() { if (!RED.length) return; const j = RED.pop(); HIST.push(j); restoreHist(j); }
function rebuild() {
  makeMats();
  const keep = catcher; model.clear(); if (keep) model.add(keep); dimsG.clear();
  const backW = wallWidth(0) * MM;
  buildRoom(backW);
  wallsActive().forEach(wi => {
    const g = buildWall(wi); placeWall(g, wi, backW);
    if (wi > 0) { const d = ((S.room.angle || 90) - 90) * Math.PI / 180, cx = wi === 1 ? -0.02 : effGap(0) / 100 + backW + 0.02, pv = new THREE.Group(); pv.position.set(cx, 0, 0); pv.rotation.y = wi === 1 ? -d : d; g.position.x -= cx; pv.add(g); model.add(pv); pv.updateMatrixWorld(true); } else model.add(g);
    const dg = new THREE.Group(); const labels = buildDims(dg, wi); g.add(dg); dg.userData.dims = true;
    g.updateMatrixWorld(true);
    labels.forEach(([p, t]) => { const sp = labelSprite(t, true, S.walls[wi].dimColor || '#222'); sp.position.copy(dg.localToWorld(p.clone())); sp.userData.parentWall = g; dimsG.add(sp); });
  });
  model.traverse(o => { if (o.isMesh && o !== catcher && !o.userData.dims) { const f = !!o.userData.frame; o.visible = S.view === 'all' || (S.view === 'frame' ? f : !f); } });
  buildDecor();
  applyLights(); applyGlareShadow();
  applyModelXf();
  setDims(true);
  bbox = new THREE.Box3();
  model.children.forEach(c => { if (c !== catcher) bbox.expandByObject(c); });
  const c = bbox.getCenter(new THREE.Vector3());
  sun.position.set(c.x + 2.5, 4.5, 5); sun.target.position.copy(c); applyLights(); applyGlareShadow(); pushHist();
  catcher.visible = !!photo && !$('showRoom').checked;
  room.visible = !photo || $('showRoom').checked;
  summary(); fillDims(); localStorage.setItem('gs_auto', JSON.stringify(S));
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
  const corner = S.layout !== 'straight', az = corner ? V(S.layout === 'Lr' ? -0.62 : 0.62, 0, 1).normalize() : V(0.32, 0, 1).normalize(), e = (corner ? 15 : 12) * Math.PI / 180;
  const dir = V(az.x * Math.cos(e), Math.sin(e), az.z * Math.cos(e));
  const cam = camera.clone(); cam.aspect = aspect; cam.fov = 28; cam.updateProjectionMatrix();
  const pts = []; for (let i = 0; i < 8; i++) pts.push(V(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
  const yTop = 1 - 2 * topF, yBot = -1 + 2 * botF, xm = 1 - 2 * sideF;
  let tg = c.clone();
  const ndc = d => { cam.position.copy(tg).addScaledVector(dir, d); cam.lookAt(tg); cam.updateMatrixWorld(); let x0 = 9, x1 = -9, y0 = 9, y1 = -9; pts.forEach(p => { const q = p.clone().project(cam); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }); return [x0, x1, y0, y1]; };
  let d = 3;
  for (let it = 0; it < 5; it++) {
    let lo = 0.5, hi = 40; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2, [x0, x1, y0, y1] = ndc(m); if ((x1 - x0) <= 2 * xm && (y1 - y0) <= (yTop - yBot)) hi = m; else lo = m; } d = hi;
    const [x0, x1, y0, y1] = ndc(d), up = V(0, 1, 0).applyQuaternion(cam.quaternion), rt = V(1, 0, 0).applyQuaternion(cam.quaternion);
    const th = Math.tan(cam.fov * Math.PI / 360) * d * 0.9, dy = ((y0 + y1) / 2 - (yTop + yBot) / 2) * th, dx = ((x0 + x1) / 2) * th * aspect;
    tg.addScaledVector(up, dy).addScaledVector(rt, dx);
  }
  cam.position.copy(tg).addScaledVector(dir, d);
  return { pos: cam.position.clone(), tg, fov: 28 };
}
let level = 0, levelTarget = 0;
function levelCam(cam, tg, k) {
  // keep position; rotate toward horizontal look; lens shift keeps tg centered
  if (k <= 0) { cam.clearViewOffset(); return; }
  const d = tg.clone().sub(cam.position), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
  const ap = Math.abs(pitch); k *= Math.max(0, Math.min(1, (0.62 - ap) / 0.22)); if (k <= 0.001) { cam.clearViewOffset(); return; }
  const qO = new THREE.Quaternion().copy(cam.quaternion);
  const m = new THREE.Matrix4().lookAt(cam.position, V(tg.x, cam.position.y, tg.z), V(0, 1, 0));
  const qH = new THREE.Quaternion().setFromRotationMatrix(m);
  cam.quaternion.slerpQuaternions(qO, qH, k); cam.clearViewOffset(); cam.updateMatrixWorld();
  const p = tg.clone().applyMatrix4(cam.matrixWorldInverse), t = Math.tan(cam.fov * Math.PI / 360);
  const yN = (p.y / -p.z) / t; // ndc y of target
  const H = 1000, W = 1000 * cam.aspect; cam.setViewOffset(W, H, 0, -yN * H / 2, W, H);
}
// ---- level orbit: pitch always 0, height + lens shift ----
const orb = { on: false, T: V(0, 1, 0), az: 0, R: 4, h: 1.5 };
function syncFromCam(kind) {
  orb.on = kind !== 'top'; controls.enabled = !orb.on;
  if (!orb.on) { camera.clearViewOffset(); return; }
  const T = controls.target.clone(), p = camera.position;
  orb.T.copy(T); orb.az = Math.atan2(p.x - T.x, p.z - T.z); orb.R = Math.max(0.5, Math.hypot(p.x - T.x, p.z - T.z)); orb.h = p.y; applyCam();
}
function applyCam(cam = camera) {
  const o = orb; o.h = Math.max(0.15, Math.min(o.T.y + o.R * 0.75, Math.max(o.h, o.T.y - o.R * 0.6)));
  cam.position.set(o.T.x + o.R * Math.sin(o.az), o.h, o.T.z + o.R * Math.cos(o.az));
  cam.up.set(0, 1, 0); cam.lookAt(o.T.x, o.h, o.T.z); cam.clearViewOffset(); cam.updateMatrixWorld();
  const yN = (o.T.y - o.h) / (o.R * Math.tan(cam.fov * Math.PI / 360));
  const H = 1000, W = 1000 * cam.aspect; cam.setViewOffset(W, H, 0, -yN * H / 2, W, H);
}
{
  const el = renderer.domElement, P = new Map(); let last = null, pinch = null;
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('pointerdown', e => { if (!orb.on) return; el.setPointerCapture(e.pointerId); P.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, sh: e.shiftKey }); last = null; pinch = null; });
  const end = e => { P.delete(e.pointerId); last = null; pinch = null; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('pointermove', e => {
    if (!orb.on || !P.has(e.pointerId)) return; const p = P.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    const hpx = el.clientHeight || 600, unit = orb.R * Math.tan(camera.fov * Math.PI / 360) * 2 / hpx;
    if (P.size >= 2) {
      const [a, b] = [...P.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) { orb.R = Math.max(0.6, Math.min(30, orb.R * pinch / Math.max(d, 1))); }
      pinch = d; const rt = V(Math.cos(orb.az), 0, -Math.sin(orb.az));
      orb.T.addScaledVector(rt, -dx * unit / 2); orb.T.y += dy * unit / 2; return;
    }
    if (p.b === 2 || p.b === 1 || p.sh) { const rt = V(Math.cos(orb.az), 0, -Math.sin(orb.az)); orb.T.addScaledVector(rt, -dx * unit); orb.T.y += dy * unit; return; }
    orb.az -= dx * 0.004; orb.h += dy * unit * 1.2;
  });
  el.addEventListener('wheel', e => { if (!orb.on) return; e.preventDefault(); orb.R = Math.max(0.6, Math.min(30, orb.R * Math.exp(e.deltaY * 0.001))); }, { passive: false });
}

function camTo(kind) {
  const c = bbox.getCenter(new THREE.Vector3()), sz = bbox.getSize(new THREE.Vector3());
  const dir = kind === 'front' ? V(0, 0, 1) : kind === 'iso' ? V(S.layout === 'Lr' ? -1 : 1, 0.25, 1.1) : V(0, 1, 0.35);
  dir.normalize();
  camera.fov = kind === 'top' ? 35 : 28; const asp = camera.aspect, fov = camera.fov * Math.PI / 180;
  const span = Math.max(sz.x, sz.z * (kind === 'front' ? 0 : 1), 1), hgt = kind === 'top' ? Math.max(sz.z, 1) : sz.y;
  const dist = Math.max(hgt / (2 * Math.tan(fov / 2)), span / (2 * Math.tan(fov / 2) * asp)) * (view.clientWidth < 800 ? 1.08 : 1.3) + sz.z * 0.35;
  if (kind === 'card') { const f = fitCard(camera.aspect, 0.13, 0.05); camera.fov = f.fov; camera.updateProjectionMatrix(); camera.position.copy(f.pos); controls.target.copy(f.tg); controls.update(); syncFromCam('card'); document.querySelectorAll('[data-cam]').forEach(b => b.classList.toggle('on', b.dataset.cam === kind)); return; }
  camera.fov = kind === 'top' ? 35 : 28; camera.updateProjectionMatrix();
  camera.position.copy(c).addScaledVector(dir, dist); controls.target.copy(c); camera.up.set(0, 1, 0); controls.update(); syncFromCam(kind);
  document.querySelectorAll('[data-cam]').forEach(b => b.classList.toggle('on', b.dataset.cam === kind));
}
function resize() { const w = view.clientWidth, h = view.clientHeight; renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px'; camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(view);
let fpsT = performance.now(), fpsN = 0, lowCnt = 0, hiCnt = 0;
function adapt() { fpsN++; const t = performance.now(); if (t - fpsT < 1500) return; const fps = fpsN * 1000 / (t - fpsT); fpsN = 0; fpsT = t; if (document.hidden) return;
  if (fps < 32) { hiCnt = 0; if (++lowCnt >= 2 && PR > 1) { PR = Math.max(1, PR - 0.25); renderer.setPixelRatio(PR); resize(); lowCnt = 0; } else if (lowCnt >= 2 && sun.shadow.mapSize.x > 1024) { sun.shadow.mapSize.set(1024, 1024); sun.shadow.map && (sun.shadow.map.dispose(), sun.shadow.map = null); lowCnt = 0; } }
  else if (fps > 55) { lowCnt = 0; if (++hiCnt >= 4 && PR < PR_MAX) { PR = Math.min(PR_MAX, PR + 0.25); renderer.setPixelRatio(PR); resize(); hiCnt = 0; } } }
renderer.setAnimationLoop(() => { if (orb.on) applyCam(); else controls.update(); renderer.render(scene, camera); adapt(); });

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
  if (warm && !S.sun) {
    sun.color.set(0xfff1e0); sun.intensity = 0.55; sun.position.set(c.x + 1, 4.5, 4); sun.shadow.radius = 8; gobo.intensity = 0;
    renderer.toneMappingExposure = 1.0; hemi.color.set(0xfff4e8); hemi.groundColor.set(0xeed6b8); hemi.intensity = 1.35; fill.color.set(0xfff0e0); fill.intensity = 0.9; fill.position.set(c.x - 0.5, 1.8, 5); sideFill.intensity = 0.35; sideFill.position.set(c.x + 4, 1.8, c.z + 1); sideFill.target.position.set(-1, 1.2, c.z);
  } else if (warm) {
    sun.color.set(0xffe4c0); sun.intensity = 0.9; sun.position.set(c.x - 1.6, 3.4, 4.2); sun.shadow.radius = 3;
    gobo.color.set(0xffcf94); gobo.intensity = 9; gobo.position.set(c.x - 1.4, 3.3, 3.0); gobo.target.position.set(c.x + 0.4, 1.5, 0);
    renderer.toneMappingExposure = 1.0; hemi.color.set(0xfff0dd); hemi.groundColor.set(0xe8c49c); hemi.intensity = 1.0; fill.color.set(0xffe2c2); fill.intensity = 0.45; fill.position.set(c.x + 3, 2.2, 4); sideFill.intensity = 2.0; sideFill.position.set(c.x + 4, 1.8, c.z + 1); sideFill.target.position.set(-1, 1.2, c.z);
  } else { sun.color.set(0xffffff); sun.intensity = 1.6; gobo.intensity = 0; renderer.toneMappingExposure = 1.0; hemi.color.set(0xffffff); hemi.groundColor.set(0xd8cfc2); sideFill.intensity = 0; hemi.intensity = 0.6; fill.color.set(0xfff4e6); fill.intensity = 0.35; fill.position.set(-3, 2, 4); }
}
const glow = new THREE.SpotLight(0xfff0dc, 0, 0, 0.9, 1, 0); scene.add(glow, glow.target);
function applyGlareShadow() {
  const R = S.room || {}, gl = R.glare ?? 0.3, sh = R.shadow ?? 0.5, c = bbox.getCenter(new THREE.Vector3());
  if (R.glow === 'left' || R.glow === 'right') { const sx = R.glow === 'left' ? -1 : 1; glow.intensity = 1.6; glow.position.set(c.x + sx * 3, 2.4, 2.6); glow.target.position.set(c.x + sx * 0.6, 1.5, 0); } else glow.intensity = 0;
  sun.castShadow = R.shOn !== false; if (catcher) catcher.visible = catcher.visible && R.shOn !== false;
  if (R.shOn !== false && !S.sun) { const az = (R.shAng ?? 20) * Math.PI / 180, el = (70 - 45 * (R.shDist ?? 0.4)) * Math.PI / 180, D = 6; sun.position.set(c.x + D * Math.sin(az) * Math.cos(el), D * Math.sin(el), D * Math.cos(az) * Math.cos(el)); sun.target.position.copy(c); }
  sun.shadow.radius = R.shBlur ?? 6; sun.shadow.blurSamples = 16;
  sun.intensity *= 0.3 + 1.4 * sh; hemi.intensity *= 1.3 - 0.6 * sh; if (catcher) catcher.material.opacity = 0.08 + 0.4 * sh;
  scene.traverse(o => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial) o.material.envMapIntensity = o.material.metalness > 0.6 ? 0.4 + gl * 1.6 : 0.7 + gl * 0.8; });
}
function setBg() { scene.background = photo && !$('showRoom').checked ? null : new THREE.Color(0xe9e6e0); }

// ---------- export ----------
$('pngBtn').onclick = async () => {
  const hide = false;
  const w = view.clientWidth, h = view.clientHeight, k = Math.min(4, Math.max(2, Math.ceil(3600 / Math.max(w, h)))), sm = sun.shadow.mapSize.x; sun.shadow.mapSize.set(4096, 4096); sun.shadow.map && (sun.shadow.map.dispose(), sun.shadow.map = null);
  renderer.setPixelRatio(k); renderer.setSize(w, h, false); renderer.render(scene, camera);
  const W = renderer.domElement.width, H = renderer.domElement.height;
  const out = document.createElement('canvas'); out.width = W; out.height = H; const g = out.getContext('2d');
  if (photoImg && !$('showRoom').checked) { const s = Math.max(W / photoImg.width, H / photoImg.height), iw = photoImg.width * s, ih = photoImg.height * s; g.drawImage(photoImg, (W - iw) / 2, (H - ih) / 2, iw, ih); }
  g.drawImage(renderer.domElement, 0, 0);
  sun.shadow.mapSize.set(sm, sm); sun.shadow.map && (sun.shadow.map.dispose(), sun.shadow.map = null); renderer.setPixelRatio(PR); resize(); if (hide) setDims(true);
  out.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'garderob-snimok.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, 'image/png');
};

// ---------- marketplace card ----------
function cardDefaults() { return { title: 'Наполнение для каркаса', tOn: true, size: '', sOn: true, panel: '', pOn: true, pos: 'auto', pColor: '#fff7ee', pOp: 0.62, pScale: 1, pFit: true, pX: -1, pY: -1, pW: 0, sSize: 38, sColor: '#231c16', tSize: 66, tColor: '#231c16', tY: 0, note: 'Для монтажа необходимо приобрести\nКАРКАС', nOn: true, dims: false }; }
function cardUI() {
  if (!S.card) S.card = cardDefaults(); const C = S.card = Object.assign(cardDefaults(), S.card);
  if (!C.size) C.size = overall(); if (!C.panel) C.panel = specData().cardLines.join('\n');
  $('cTitle').value = C.title; $('cPX').value = C.pX; $('cPY').value = C.pY; $('cPW').value = C.pW; $('cSSize').value = C.sSize; $('cSColor').value = C.sColor; $('cTSize').value = C.tSize; $('cTColor').value = C.tColor; $('cTY').value = C.tY; $('cPColor').value = C.pColor; $('cPOp').value = C.pOp; $('cPScale').value = C.pScale; $('cPFit').checked = C.pFit; $('cFont').value = C.font || 'manrope'; $('cTOn').checked = C.tOn; $('cSize').value = C.size; $('cSOn').checked = C.sOn; $('cPanel').value = C.panel; $('cPOn').checked = C.pOn; $('cPos').value = C.pos; $('cNote').value = C.note; $('cNOn').checked = C.nOn; $('cDims').checked = C.dims;
}
function cardRead() { const C = S.card; C.pX = +$('cPX').value; C.pY = +$('cPY').value; C.pW = +$('cPW').value; C.sSize = +$('cSSize').value; C.sColor = $('cSColor').value; C.tSize = +$('cTSize').value; C.tColor = $('cTColor').value; C.tY = +$('cTY').value; C.pColor = $('cPColor').value; C.pOp = +$('cPOp').value; C.pScale = +$('cPScale').value; C.pFit = $('cPFit').checked; C.font = $('cFont').value; C.title = $('cTitle').value; C.tOn = $('cTOn').checked; C.size = $('cSize').value; C.sOn = $('cSOn').checked; C.panel = $('cPanel').value; C.pOn = $('cPOn').checked; C.pos = $('cPos').value; C.note = $('cNote').value; C.nOn = $('cNOn').checked; C.dims = $('cDims').checked; localStorage.setItem('gs_auto', JSON.stringify(S)); }
['Manrope', 'Montserrat', 'Inter', 'Playfair Display'].forEach(f => [500, 700, 800].forEach(w => document.fonts.load(`${w} 40px "${f}"`, 'Наполнение КАРКАС 0123')));
function makeCard() {
  cardRead(); const C = S.card, CW = 900, CH = 1200, top = C.tOn || C.sOn ? 230 : 40, bot = C.nOn ? 190 : 40;
  const sv = { pos: camera.position.clone(), tg: controls.target.clone(), pr: renderer.getPixelRatio() };
  const dimsWas = dimsG.visible; if (!C.dims) setDims(false);
  renderer.setPixelRatio(2); renderer.setSize(CW, CH, false); camera.aspect = CW / CH; camera.updateProjectionMatrix();
  const sfov = camera.fov; if (orb.on) applyCam();
  { // same viewing angle as on screen; only dolly back/shift (no rotation) so the set fits between texts
    const b = meshBox(), pts = []; for (let i = 0; i < 8; i++) pts.push(V(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
    const fwd = V(0, 0, -1).applyQuaternion(camera.quaternion), up = V(0, 1, 0).applyQuaternion(camera.quaternion), rt = V(1, 0, 0).applyQuaternion(camera.quaternion);
    const c = b.getCenter(new THREE.Vector3()), base = camera.position.clone(), yTop = 1 - 2 * top / CH, yBot = -1 + 2 * bot / CH, xm = 0.9;
    const dist0 = c.clone().sub(base).dot(fwd); let off = V(0, 0, 0);
    const ndc = dd => { camera.position.copy(c).addScaledVector(fwd, -dd).add(off); camera.updateMatrixWorld(); let x0 = 9, x1 = -9, y0 = 9, y1 = -9; pts.forEach(p => { const q = p.clone().project(camera); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }); return [x0, x1, y0, y1]; };
    let d = Math.max(dist0, 0.5);
    for (let it = 0; it < 4; it++) {
      let lo = 0.3, hi = 60; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2, [x0, x1, y0, y1] = ndc(m); if (x1 - x0 <= 2 * xm && y1 - y0 <= yTop - yBot) hi = m; else lo = m; } d = hi;
      const [x0, x1, y0, y1] = ndc(d), th = Math.tan(camera.fov * Math.PI / 360) * d;
      off.addScaledVector(up, ((y0 + y1) / 2 - (yTop + yBot) / 2) * th).addScaledVector(rt, ((x0 + x1) / 2) * th * camera.aspect);
    }
    ndc(d);
  }
  renderer.render(scene, camera);
  const out = document.createElement('canvas'); out.width = CW; out.height = CH; const g = out.getContext('2d');
  g.drawImage(renderer.domElement, 0, 0, CW, CH);
  // occupancy: projected boxes of visible meshes
  const rects = []; model.traverse(o => { if (o.isMesh && o.visible && o !== catcher && !o.userData.dims) { const b = new THREE.Box3().setFromObject(o); if (b.isEmpty()) return; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < 8; i++) { const p = V(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(camera); const X = (p.x + 1) / 2 * CW, Y = (1 - p.y) / 2 * CH; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); } rects.push([x0, y0, x1, y1]); } });
  const FF = { manrope: ['Manrope', 'Manrope'], montserrat: ['Montserrat', 'Montserrat'], inter: ['Inter', 'Inter'], playfair: ['Playfair Display', 'Manrope'] }[C.font || 'manrope'] || ['Manrope', 'Manrope'];
  const TF = `"${FF[0]}", Arial, sans-serif`, serif = `"${FF[1]}", Arial, sans-serif`, ink = C.tColor || '#231c16';
  const rule = (y, x0, x1) => { g.strokeStyle = 'rgba(35,28,22,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); };
  g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = ink;
  if (C.tOn) { let fs = C.tSize || 66; const tw = FF[0] === 'Playfair Display' ? 600 : 700; g.font = `${tw} ${fs}px ${TF}`; while (g.measureText(C.title).width > CW - 80 && fs > 30) { fs -= 2; g.font = `${tw} ${fs}px ${TF}`; } g.fillText(C.title, CW / 2, 112 + (C.tY || 0)); }
  if (C.sOn) { const ty = C.tY || 0; g.fillStyle = C.sColor || ink; g.font = `500 ${C.sSize || 38}px ${serif}`; const w = g.measureText(C.size).width; g.fillText(C.size, CW / 2, 182 + ty); rule(170 + ty, CW / 2 - w / 2 - 110, CW / 2 - w / 2 - 25); rule(170 + ty, CW / 2 + w / 2 + 25, CW / 2 + w / 2 + 110); g.fillStyle = ink; }
  if (C.nOn) { const L = C.note.split('\n').filter(Boolean), last = L.pop() || ''; g.font = `400 32px ${serif}`; L.forEach((t, i) => g.fillText(t, CW / 2, CH - 118 + (i - L.length + 1) * 38)); g.font = `800 48px ${serif}`; g.letterSpacing = '2px'; const w = g.measureText(last).width; g.fillText(last, CW / 2, CH - 52); rule(CH - 68, CW / 2 - w / 2 - 140, CW / 2 - w / 2 - 25); rule(CH - 68, CW / 2 + w / 2 + 25, CW / 2 + w / 2 + 140); g.letterSpacing = '0px'; }
  if (C.pOn && C.panel.trim()) {
    const lines = C.panel.split('\n').filter(Boolean); let k = C.pScale || 1; const meas = () => { g.font = `500 ${Math.round(24 * k)}px ${serif}`; return [Math.max(330 * k, ...lines.map(t => g.measureText(t).width + 64 * k)), (104 + lines.length * 40) * k]; };
    let [pw, ph] = meas(); if (C.pW > 0) { let it = 0; while (pw > C.pW && it++ < 40) { k *= 0.96; [pw, ph] = meas(); } pw = C.pW; } else if (C.pFit) { let it = 0; while ((pw > CW * 0.58 || ph > (CH - top - bot) * 0.62) && it++ < 30) { k *= 0.95; [pw, ph] = meas(); } }
    pw = Math.min(CW - 80, pw);
    const yT = top + 20, yB = CH - bot - ph - 20, yM = (top + CH - bot - ph) / 2;
    const cand = { tl: [40, yT], tr: [CW - pw - 40, yT], bl: [40, yB], br: [CW - pw - 40, yB], cr: [CW - pw - 40, yM] };
    const ov = ([x, y]) => rects.reduce((a, [x0, y0, x1, y1]) => a + Math.max(0, Math.min(x + pw, x1) - Math.max(x, x0)) * Math.max(0, Math.min(y + ph, y1) - Math.max(y, y0)), 0);
    let key = C.pos; if (key === 'auto') key = Object.keys(cand).sort((a, b) => ov(cand[a]) - ov(cand[b]))[0];
    let [px, py] = cand[key]; if (C.pX >= 0) px = Math.round(C.pX * (CW - pw)); if (C.pY >= 0) py = Math.round(C.pY * (CH - ph));
    g.save(); g.beginPath(); g.roundRect(px, py, pw, ph, 22); g.clip(); g.filter = 'blur(8px)'; g.drawImage(out, 0, 0); g.filter = 'none';
    { const pc = new THREE.Color(C.pColor || '#fff7ee'); g.fillStyle = `rgba(${Math.round(pc.r * 255)},${Math.round(pc.g * 255)},${Math.round(pc.b * 255)},${C.pOp ?? 0.62})`; } g.fillRect(px, py, pw, ph); g.restore();
    g.fillStyle = ink; g.font = `700 ${Math.round(26 * k)}px ${serif}`; g.letterSpacing = '3px'; g.textAlign = 'center'; g.fillText('КОМПЛЕКТАЦИЯ', px + pw / 2, py + 52 * k); g.letterSpacing = '0px'; rule(py + 68 * k, px + 40 * k, px + pw - 40 * k);
    g.textAlign = 'left'; g.font = `500 ${Math.round(24 * k)}px ${serif}`; lines.forEach((t, i) => g.fillText(t, px + 32 * k, py + (112 + i * 40) * k));
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
      const bk = perfOf(o) ? 'перфорированная' : 'сетчатая';
      if (o.t === 'basket') { add(fill, `Корзина ${bk} стационарная ${nearest([603, 903], w)}x${d}x${o.h || 85}`); add(card, `Корзина ${nom}`); }
      if (o.t === 'pull') { add(fill, `Корзина ${bk} выдвижная ${nearest([563, 863], w)}x${d}x${o.h || 85}`); add(card, `Корзина выдвижная ${nom}`); }
      if (o.t === 'trouser') { add(fill, `Брючница выдвижная ${nearest([463, 603], w)}x440x45`); add(card, `Брючница ${nom}`); }
      if (o.t === 'shoe') { add(fill, `Полка обувная сетчатая ${nearest([604, 904], w)}x${o.d === 30 ? 306 : 406}`); add(card, `Полка для обуви ${nom}`); }
      if (o.t === 'rail') { add(fill, `Перекладина ${nearest([520, 640, 940, 1240, 2000], w)} мм`); add(fill, 'Кронштейн для перекладины 30×30×100', 2); add(fill, 'Заглушка перекладины 15×23×23', 2); add(card, 'Штанга'); }
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
  let total = 0; const row = ([k, v]) => { const p = +(S.prices[k] || 0); total += p * v; return `<tr><td>${k}</td><td>${v} шт</td><td><input type="number" min="0" step="1" data-price="${k}" value="${p || ''}" placeholder="цена"></td><td>${p ? (p * v).toLocaleString('ru-RU') + ' ₽' : ''}</td></tr>`; };
  const tb = o => `<table class="est">${Object.entries(o).map(row).join('')}</table>`;
  const fr = tb(d.frame), fi = tb(d.fill);
  const MC = { white: 'белый', black: 'черный', graphite: 'графит' }[S.metal], RC = { chrome: 'хром', white: 'белый', black: 'черный' }[S.rod || 'chrome'];
  const parts = [...Object.entries(d.frame), ...Object.entries(d.fill)].map(([k, v]) => `<tr><td><span class="tbd">—</span></td><td>${k}</td><td>${/Перекладина|Штанга/.test(k) ? RC : MC}</td><td>${v} шт</td></tr>`).join('');
  const W = [];
  wallsActive().forEach(wi => S.walls[wi].sections.forEach((sc, si) => {
    const nm = `${WALLNAMES[wi]}, секция ${si + 1}`;
    if (sc.items.length && ![45, 60, 90, 120].includes(sc.w)) W.push(`${nm}: ширина ${sc.w} см не совпадает с каталогом (45/60/90/120). Ближайшая: ${nearest([45, 60, 90, 120], sc.w)} см`);
    if (collisions(sc).size) W.push(`${nm}: элементы пересекаются`);
    sc.items.forEach(o => { if (itemTop(o) > S.railTop * 10 * MM - 0.04) W.push(`${nm}: ${TYPES[o.t]} выше стоек`); if (itemBot(o) < postBottom() * MM - 0.005) W.push(`${nm}: ${TYPES[o.t]} ниже стоек`); });
  }));
  if (S.walls.some(w => w.sections.some(sc => sc.items.some(o => o.t === 'pull' && (o.h || 85) === 285)))) W.push('Выдвижной корзины высотой 285 мм нет в крупной сетке (есть 85 и 181); 285 мм бывает у мелкосетчатой 535');
  if (S.room.ceiling && S.railTop > (S.room.ceilH || 275)) W.push(`Гардеробная (${S.railTop} см) выше потолка (${S.room.ceilH} см)`);
  if (!['512', '1025', '1156', '1536', '1920', '2304'].includes(String(S.postH))) W.push(`Стоек ${S.postH} мм нет в каталоге. Стандартные: 512, 1025, 1156, 1536, 1920, 2304 мм`);
  wallsActive().forEach(wi => { const L = wallWidth(wi) + 40, c = railCombo(L); if (c.length > 1) W.push(`${WALLNAMES[wi]}: рельс ${L} мм собирается из ${c.length} частей (${c.join(' + ')} мм), нужен стык`); });
  $('summary').innerHTML = (W.length ? `<div class="warnbox"><b>Проверьте конфигурацию:</b><br>${W.join('<br>')}</div>` : '<div class="okbox">Конфигурация собирается из каталога</div>') + d.walls.join('<br>') + `<br>Габарит: ${overall()}<details><summary>Комплектность (все детали)</summary><div class="catwrap"><table class="cat"><thead><tr><th>Артикул</th><th>Наименование и размер</th><th>Цвет</th><th>Кол-во</th></tr></thead><tbody>${parts}</tbody></table></div></details><details><summary>Каркас</summary>${fr}</details><details><summary>Наполнение</summary>${fi}</details><details${total ? ' open' : ''}><summary>Смета</summary>Итого: <b>${total.toLocaleString('ru-RU')} ₽</b><br><span class="foot">Цены за штуку вводятся в списках выше и сохраняются.</span></details>`;
  $('summary').querySelectorAll('[data-price]').forEach(el => el.onchange = () => { S.prices[el.dataset.price] = +el.value || 0; const open = [...$('summary').querySelectorAll('details')].map(x => x.open); summary(); [...$('summary').querySelectorAll('details')].forEach((x, i) => x.open = open[i] || x.open); localStorage.setItem('gs_auto', JSON.stringify(S)); pushHist(); });
}

// ---------- UI ----------
function clampY(v) { const lo = Math.ceil(postBottom() / 10) + 3, hi = S.railTop - 4; return Math.max(lo, Math.min(hi, v)); }
function fillGeneral() {
  $('metal').value = S.metal; $('rodC').value = S.rod || 'chrome'; $('wall').value = S.wall; $('floor').value = S.floor; $('railTop').value = S.railTop;
  const pre = ['512', '1025', '1156', '1536', '1920', '2304'].includes(String(S.postH));
  $('postH').value = pre ? String(S.postH) : 'custom'; $('postHc').value = S.postH;
  $('layout').value = S.layout; $('viewMode').value = S.view || 'all'; $('decor').checked = !!S.decor; $('sunT').checked = !!S.sun; $('bStyle').value = S.basketStyle || 'mesh'; const R = S.room; $('ceilT').checked = !!R.ceiling; $('skirtT').checked = R.skirting !== false; $('lampT').checked = !!R.lamps; $('glare').value = R.glare; $('glareV').textContent = Math.round(R.glare * 100) + '%'; $('shadow').value = R.shadow; $('shadowV').textContent = Math.round(R.shadow * 100) + '%'; $('roomX').value = R.extra; $('roomV').textContent = R.extra; $('angR').value = R.angle; $('wallFin').value = S.wallFin || 'paint'; $('ceilH').value = R.ceilH; $('ceilV').textContent = R.ceilH; $('angV').textContent = R.angle + '°'; $('skirtC').value = R.skirtColor; $('glowS').value = R.glow; $('shOnT').checked = R.shOn !== false; $('shAng').value = R.shAng; $('shAngV').textContent = R.shAng + '°'; $('shBlur').value = R.shBlur; $('shBlurV').textContent = R.shBlur; $('shDist').value = R.shDist; $('shDistV').textContent = Math.round(R.shDist * 100) + '%'; $('preset').value = S.preset || 'none'; fillDims();
}
$('rodC').onchange = e => { S.rod = e.target.value; rebuild(); };
$('metal').onchange = e => { S.metal = e.target.value; rebuild(); };
$('wallTone').onchange = e => { if (e.target.value) { S.wall = e.target.value; $('wall').value = S.wall; rebuild(); } e.target.value = ''; };
$('wall').oninput = e => { S.wall = e.target.value; rebuild(); };
$('floor').onchange = e => { S.floor = e.target.value; rebuild(); };
$('wallFin').onchange = e => { S.wallFin = e.target.value; rebuild(); };
$('postH').onchange = e => { if (e.target.value !== 'custom') { S.postH = +e.target.value; $('postHc').value = S.postH; fix(); } };
$('postHc').onchange = e => { S.postH = Math.max(300, Math.min(3000, +e.target.value || 1920)); $('postH').value = 'custom'; fix(); };
$('railTop').onchange = e => { S.railTop = Math.max(60, Math.min(350, +e.target.value || 210)); fix(); };
$('nSec').onchange = e => { const n = Math.max(1, Math.min(6, +e.target.value || 1)), secs = S.walls[cur.w].sections; while (secs.length < n) secs.push(JSON.parse(JSON.stringify(secs[secs.length - 1]))); secs.length = n; cur.s = Math.min(cur.s, n - 1); rebuild(); renderSec(); camTo(lastCam); };
$('allW').onchange = e => { if (e.target.value) { S.walls[cur.w].sections.forEach(s => s.w = +e.target.value); e.target.value = ''; rebuild(); renderSec(); } };
function fix() { if (S.postH > S.railTop * 10) S.railTop = Math.ceil(S.postH / 10) + 2; $('railTop').value = S.railTop; fillDims(); S.walls.forEach(w => w.sections.forEach(s => s.items.forEach(o => o.y = clampY(o.y)))); rebuild(); renderSec(); }

function renderSec() {
  const act = wallsActive(); if (!act.includes(cur.w)) cur.w = 0;
  const W = S.walls[cur.w]; $('nSec').value = W.sections.length;
  $('nSec').parentNode.firstChild.textContent = act.length > 1 ? 'Секций на этой стене' : 'Количество секций';
  let h = '';
  if (act.length > 1) h += '<div class="tabs">' + act.map(wi => `<button data-w="${wi}" class="${wi === cur.w ? 'on' : ''}">${WALLNAMES[wi]}</button>`).join('') + '</div>';
  { const eg = effGap(cur.w); h += `<label>Отступ от угла: <b id="gapV">${eg}</b> см<input type="range" id="gapR" min="0" max="300" step="1" value="${eg}"></label><label>Точно, см<input type="number" id="gap" min="0" max="300" step="1" value="${eg}"></label><div id="gapWarn" class="sum" style="color:#b0552a"></div>`; }
  $('secTabs').innerHTML = h + '<div class="tabs secchips">' + W.sections.map((s, i) => `<button data-s="${i}" class="${i === cur.s ? 'on' : ''}">Секция ${i + 1}<small>${s.w} см</small></button>`).join('') + '</div>';
  $('secTabs').querySelectorAll('[data-w]').forEach(b => b.onclick = () => { cur = { w: +b.dataset.w, s: 0 }; renderSec(); });
  $('secTabs').querySelectorAll('[data-s]').forEach(b => b.onclick = () => { cur.s = +b.dataset.s; renderSec(); });
  const warn = () => { const m = minGap(), bad = cur.w > 0 && S.layout !== 'straight' && W.gap < m; $('gapWarn').textContent = bad ? `Полки пересекутся с полками основной стены. Нужно от ${m} см.` : ''; };
  let tmr; const setGap = (v, live) => { W.gap = Math.max(0, Math.min(300, Math.round(v))); $('gapV').textContent = W.gap; $('gap').value = W.gap; $('gapR').value = W.gap; warn(); clearTimeout(tmr); tmr = setTimeout(rebuild, live ? 30 : 0); };
  $('gapR').oninput = e => setGap(+e.target.value, true); $('gap').onchange = e => setGap(+e.target.value || 0); warn();
  const s = W.sections[cur.s];
  let e = `${s.items.length && ![45, 60, 90, 120].includes(s.w) ? `<div class="wtxt">Ширины ${s.w} см нет в каталоге. Подходят: 45, 60, 90, 120 см</div>` : ''}<label>Ширина секции между стойками, см<input type="number" id="secW" min="20" max="200" value="${s.w}"></label>
  <div class="chips">${[[45, 'полка 463'], [60, 'полка 603'], [90, 'полка 903'], [120, 'полка 1203']].map(([v, t]) => `<button data-pw="${v}" class="${s.w === v ? 'on' : ''}" title="${t} мм по каталогу">${v} см</button>`).join('')}<button class="mini" id="copyAll">Скопировать на все секции</button></div>`;
  const ord = s.items.map((o, i) => [o, i]).sort((a, b) => b[0].y - a[0].y), lo = Math.ceil(postBottom() / 10) + 3, hi = S.railTop - 4;
  const coll = collisions(s);
  if (!s.items.length) e += '<p class="sum">Секция пустая. Добавьте элементы кнопками ниже.</p>';
  ord.forEach(([o, i], k) => {
    const c = catOf(o.t), vv = c === 'basket' ? o.t + '|' + (perfOf(o) ? 'perf' : 'mesh') : o.t;
    e += `<div class="item${coll.has(i) ? ' warn' : ''}"><div class="top"><b class="num">${k + 1}</b><select data-i="${i}" data-k="cat">${Object.entries(CATS).map(([kk, v]) => `<option value="${kk}" ${kk === c ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <button class="mini" data-sw="${i}" data-dir="-1" title="Поменять с элементом выше" ${k === 0 ? 'disabled' : ''}>↑</button><button class="mini" data-sw="${i}" data-dir="1" title="Поменять с элементом ниже" ${k === ord.length - 1 ? 'disabled' : ''}>↓</button><button class="mini danger" data-del="${i}" title="Удалить">✕</button></div>
    <div class="grid"><label>Вариант<select data-i="${i}" data-k="var">${VARS[c].map(([kk, v]) => `<option value="${kk}" ${kk === vv ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label>Глубина<select data-i="${i}" data-k="d">${DEPTHS[o.t].map(d => `<option value="${d}" ${d === o.d ? 'selected' : ''}>${d} см</option>`).join('')}</select></label>
    ${isBasket(o.t) ? `<label>Высота корзины<select data-i="${i}" data-k="h">${[85, 181, 285].map(v => `<option value="${v}" ${v === (o.h || 85) ? 'selected' : ''}>${v} мм</option>`).join('')}</select></label>` : `<label>Ширина<input type="text" value="${s.w} см" disabled></label>`}</div>
    <div class="yrow"><label>Высота от пола<input type="range" data-i="${i}" data-k="yr" min="${lo}" max="${hi}" step="1" value="${o.y}"></label><label class="yn"><input type="number" data-i="${i}" data-k="y" value="${o.y}" min="${lo}" max="${hi}"> см</label></div>
    ${coll.has(i) ? '<div class="wtxt">Пересекается с соседним элементом</div>' : ''}</div>`;
  });
  e += '<div class="chips">' + Object.entries(CATS).map(([k, v]) => `<button data-add="${k}">+ ${v}</button>`).join('') + '<button data-empty="1">Пусто</button></div>';
  e += `<label>Шаблон секции<select id="tpl"><option value="">Выбрать шаблон…</option><option value="shelves">Только полки</option><option value="rod">Штанга под полкой + полка внизу</option><option value="two">Две штанги</option><option value="baskets">Полки + корзины</option><option value="shoes">Полки + обувь</option></select></label>`;
  e += `<label>Цвет размеров этой стены<input type="color" id="dimCol" value="${W.dimColor || '#2a2a2a'}"></label>`;
  $('secEdit').innerHTML = e;
  $('tpl').onchange = ev => { const t = ev.target.value; if (!t) return; const top = S.railTop - 16, lo = Math.ceil(postBottom() / 10) + 10, mid = Math.round((top + lo) / 2), M_ = y => it('mesh', 40, y), R_ = y => it('rail', 30, y);
    const T = { shelves: () => { const a = []; for (let y = top; y >= lo; y -= 36) a.push(M_(y)); return a; }, rod: () => [M_(top), R_(top - 12), M_(lo + 20)], two: () => [M_(top), R_(top - 12), M_(mid), R_(mid - 12)], baskets: () => [M_(top), M_(top - 38), M_(top - 76), it('pull', 40, lo + 70, 181), it('pull', 40, lo + 45, 181), it('pull', 40, lo + 20, 181)], shoes: () => [M_(top), M_(top - 38), M_(top - 76), it('shoe', 40, lo + 50), it('shoe', 40, lo + 25)] };
    s.items = T[t]().map(o => (o.y = clampY(o.y), o)); rebuild(); renderSec(); };
  $('dimCol').oninput = ev => { W.dimColor = ev.target.value; rebuild(); };
  const E = $('secEdit');
  $('secW').onchange = ev => { s.w = Math.max(20, Math.min(200, +ev.target.value || 90)); rebuild(); renderSec(); };
  E.querySelectorAll('[data-pw]').forEach(b => b.onclick = () => { s.w = +b.dataset.pw; rebuild(); renderSec(); });
  $('copyAll').onclick = () => { W.sections.forEach((t, i) => { if (i !== cur.s) W.sections[i] = JSON.parse(JSON.stringify(s)); }); rebuild(); renderSec(); };
  const setT = (o, t) => { o.t = t; if (!DEPTHS[o.t].includes(o.d)) o.d = DEPTHS[o.t].includes(S.depth) ? S.depth : DEPTHS[o.t].includes(40) ? 40 : DEPTHS[o.t][0]; if (isBasket(o.t)) o.h = o.h || 85; };
  let yt;
  E.querySelectorAll('[data-k]').forEach(el => {
    if (el.dataset.k === 'yr') { el.oninput = () => { const o = s.items[+el.dataset.i]; o.y = clampY(+el.value); el.closest('.yrow').querySelector('[data-k=y]').value = o.y; clearTimeout(yt); yt = setTimeout(rebuild, 30); }; el.onchange = () => { rebuild(); renderSec(); }; return; }
    el.onchange = () => {
      const o = s.items[+el.dataset.i], k = el.dataset.k;
      if (k === 'cat') { const t = VARS[el.value][0][0].split('|'); setT(o, t[0]); if (t[1]) o.v = t[1]; }
      else if (k === 'var') { const t = el.value.split('|'); setT(o, t[0]); if (t[1]) o.v = t[1]; }
      else if (k === 'y') o.y = clampY(+el.value || o.y); else o[k] = +el.value;
      rebuild(); renderSec();
    };
  });
  E.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { const i = +b.dataset.sw, k = ord.findIndex(p => p[1] === i), j = ord[k + +b.dataset.dir]; if (!j) return; const o = s.items[i], p = j[0], t = o.y; o.y = p.y; p.y = t; rebuild(); renderSec(); });
  E.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { s.items.splice(+b.dataset.del, 1); rebuild(); renderSec(); });
  E.querySelector('[data-empty]').onclick = () => { s.items = []; rebuild(); renderSec(); };
  E.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
    const c = b.dataset.add, t = VARS[c][0][0].split('|')[0], ys = s.items.map(o => o.y);
    const y = clampY((ys.length ? Math.min(...ys) : S.railTop) - (c === 'rod' ? 12 : c === 'basket' ? 25 : 35));
    const o = it(t, 40, y); setT(o, t); o.d = DEPTHS[t].includes(S.depth) ? S.depth : o.d; if (c === 'basket') { o.h = 85; o.v = S.basketStyle === 'plastic' ? 'perf' : 'mesh'; }
    s.items.push(o); rebuild(); renderSec();
  });
}

let lastCam = 'front';
// ---------- collisions, dims fields, mirror, catalog ----------
function collisions(sec) {
  const bad = new Set(), iv = sec.items.map((o, i) => [itemBot(o) - (o.t === 'rail' ? 0.01 : 0), itemTop(o) + (o.t === 'rail' ? 0.02 : 0.009), i]);
  iv.forEach(([a0, a1, i]) => iv.forEach(([b0, b1, j]) => { if (i < j && a0 < b1 - 0.001 && b0 < a1 - 0.001) { bad.add(i); bad.add(j); } })); return bad;
}
function liftCm() { return Math.round(S.railTop - 1 - S.postH / 10); }
function fillDims() {
  const W = Math.round(wallWidth(cur.w) / 10), H = Math.round(S.postH / 10);
  $('fW').value = $('rW').value = W; $('fH').value = $('rH').value = H; $('fD').value = $('rD').value = S.depth || 40;
  $('lift').value = liftCm(); $('liftV').textContent = liftCm(); $('railTop').value = S.railTop; $('layout').value = S.layout;
  $('postH').value = ['512', '1025', '1156', '1536', '1920', '2304'].includes(String(S.postH)) ? String(S.postH) : 'custom'; $('postHc').value = S.postH;
}
let dimT;
const later = (fn, live) => { clearTimeout(dimT); dimT = setTimeout(fn, live ? 40 : 0); };
function setWidth(v, live) { const secs = S.walls[cur.w].sections, n = secs.length, w = Math.max(20, Math.min(200, Math.round(Math.max(40, Math.min(720, v)) / n))), ws = live ? w : nearest([45, 60, 90, 120], w); secs.forEach(s => s.w = ws); if (!live && ws !== w) msg(`Ширина секций подобрана по каталогу: ${ws} см`); $('fW').value = $('rW').value = (live ? w : ws) * n; later(() => { rebuild(); if (!live) renderSec(); }, live); }
function setHeight(v, live) { const lift = liftCm(); S.postH = Math.max(500, Math.min(3000, Math.round(v) * 10)); S.railTop = lift + S.postH / 10 + 1; S.walls.forEach(w => w.sections.forEach(s => s.items.forEach(o => o.y = clampY(o.y)))); $('fH').value = $('rH').value = Math.round(S.postH / 10); later(() => { fillDims(); rebuild(); if (!live) renderSec(); }, live); }
function setDepth(v, live) { const d = [30, 40, 50].reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a); S.depth = d; S.walls.forEach(w => w.sections.forEach(s => s.items.forEach(o => { const D = DEPTHS[o.t]; o.d = D.reduce((a, b) => Math.abs(b - d) < Math.abs(a - d) ? b : a); }))); $('fD').value = $('rD').value = d; later(() => { rebuild(); if (!live) renderSec(); }, live); }
function setLift(v, live) { const d = Math.round(v) - liftCm(); if (!d) return; S.railTop += d; S.walls.forEach(w => w.sections.forEach(s => s.items.forEach(o => o.y += d))); $('liftV').textContent = liftCm(); $('railTop').value = S.railTop; later(() => { rebuild(); if (!live) renderSec(); }, live); }
[['W', setWidth], ['H', setHeight], ['D', setDepth]].forEach(([k, f]) => { $('r' + k).oninput = e => f(+e.target.value, true); $('r' + k).onchange = e => f(+e.target.value); $('f' + k).onchange = e => f(+e.target.value || 0); });
$('lift').oninput = e => setLift(+e.target.value, true); $('lift').onchange = e => setLift(+e.target.value);
$('layout').innerHTML = Object.entries(LAYOUTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
$('layout').onchange = e => { S.layout = e.target.value; cur = { w: 0, s: 0 }; rebuild(); renderSec(); fillDims(); camTo(S.layout === 'straight' ? 'front' : 'iso'); };
function mirror() {
  S.walls[0].sections.reverse();
  if (S.layout !== 'straight') { const t = S.walls[1]; S.walls[1] = S.walls[2]; S.walls[2] = t; if (S.layout === 'U') { S.walls[1].sections.reverse(); S.walls[2].sections.reverse(); } }
  if (S.layout === 'L') S.layout = 'Lr'; else if (S.layout === 'Lr') S.layout = 'L';
  if (S.layout === 'Lr' && cur.w === 1) cur.w = 2; else if (S.layout === 'L' && cur.w === 2) cur.w = 1;
  cur.s = Math.max(0, S.walls[cur.w].sections.length - 1 - cur.s);
  rebuild(); renderSec(); fillDims(); camTo(lastCam === 'card' ? 'card' : lastCam);
}
$('mirrorBtn').onclick = mirror;
function renderCatalog() {
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cell = v => v === 'уточнить' ? '<span class="tbd">уточнить</span>' : esc(v);
  $('catalog').innerHTML = '<div class="catwrap"><table class="cat"><thead><tr><th>Артикул</th><th>Название</th><th>Размеры</th><th>Правила соединения</th><th>Нагрузка</th><th>Монтаж</th></tr></thead><tbody>' +
    CATALOG.map(c => `<tr><td>${c.art ? esc(c.art) : '<span class="tbd">—</span>'}</td><td><b>${esc(c.name)}</b><br><span class="foot">${esc(c.group)}</span></td><td>${cell(c.size)}</td><td>${cell(c.conn)}</td><td>${cell(c.load)}</td><td>${cell(c.mount)}</td></tr>`).join('') + '</tbody></table></div><h4>Правила и примечания</h4><ul class="rules">' + RULES.map(t => `<li>${esc(t)}</li>`).join('') + '</ul>';
}
renderCatalog();
// ---------- start choice and user templates ----------
document.querySelectorAll('[data-start]').forEach(b => b.onclick = () => setTemplate(b.dataset.start));
const TK = 'gs_tpls', tpls = () => { try { return JSON.parse(localStorage.getItem(TK)) || []; } catch (e) { return []; } }, saveT = a => localStorage.setItem(TK, JSON.stringify(a));
function renderTpl() {
  const a = tpls(), esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  $('myTpl').innerHTML = a.length ? a.map((t, i) => `<div class="tplrow"><b>${esc(t.name)}</b><span class="btns"><button class="mini" data-tl="${i}">Загрузить</button><button class="mini" data-td="${i}">Дублировать</button><button class="mini" data-tr="${i}">Переименовать</button><button class="mini danger" data-tx="${i}">✕</button></span></div>`).join('') : 'Пока нет сохраненных шаблонов.';
  const Q = (k, f) => $('myTpl').querySelectorAll(`[data-${k}]`).forEach(b => b.onclick = () => f(+b.dataset[k]));
  Q('tl', i => { S = migrate(JSON.parse(JSON.stringify(tpls()[i].cfg))); cur = { w: 0, s: 0 }; fillGeneral(); rebuild(); renderSec(); cardUI(); camTo(S.layout === 'straight' ? 'front' : 'iso'); msg('Шаблон загружен'); });
  Q('td', i => { const a = tpls(); a.splice(i + 1, 0, { name: a[i].name + ' (копия)', cfg: a[i].cfg }); saveT(a); renderTpl(); });
  Q('tr', i => { const a = tpls(), n = prompt('Новое название шаблона', a[i].name); if (n && n.trim()) { a[i].name = n.trim(); saveT(a); renderTpl(); } });
  Q('tx', i => { const a = tpls(); if (!confirm(`Удалить шаблон «${a[i].name}»?`)) return; a.splice(i, 1); saveT(a); renderTpl(); });
}
$('tplSave').onclick = () => { const n = prompt('Название шаблона', 'Мой шаблон ' + (tpls().length + 1)); if (!n || !n.trim()) return; const a = tpls(); a.push({ name: n.trim(), cfg: JSON.parse(JSON.stringify(S)) }); saveT(a); renderTpl(); $('myTplBox').open = true; msg('Шаблон сохранен'); };
renderTpl();
// ---------- drag items vertically ----------
{
  const el = renderer.domElement, rc = new THREE.Raycaster(), tip = $('dragTip');
  const findRef = o => { while (o) { if (o.userData && o.userData.ref) return o; o = o.parent; } return null; };
  window.__gsDrag = { start: null };
  el.addEventListener('pointerdown', e => {
    if (!orb.on || e.button !== 0) return;
    const r = el.getBoundingClientRect(), p = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rc.setFromCamera(p, camera); const hit = rc.intersectObjects(model.children, true).find(h => h.object.visible && h.object !== catcher && findRef(h.object));
    if (!hit) return; const g = findRef(hit.object), { wi, si, ii } = g.userData.ref, o = S.walls[wi].sections[si].items[ii];
    drag = { g, o, y0: o.y, py: e.clientY, unit: hit.distance * Math.tan(camera.fov * Math.PI / 360) * 2 / (el.clientHeight || 600) * 100 * (g.parent ? 1 : 1) };
    cur = { w: wi, s: si }; e.stopImmediatePropagation(); el.setPointerCapture(e.pointerId);
    tip.classList.remove('hide'); tip.textContent = `${o.y} см`; tip.style.left = (e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top - 30) + 'px';
  }, true);
  el.addEventListener('pointermove', e => {
    if (!drag) return; e.stopImmediatePropagation(); const r = el.getBoundingClientRect();
    const ny = clampY(Math.round(drag.y0 + (drag.py - e.clientY) * drag.unit)); drag.g.position.y = (ny - drag.y0) / 100; drag.ny = ny;
    tip.textContent = `${ny} см от пола`; tip.style.left = (e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top - 30) + 'px';
  }, true);
  const up = e => { if (!drag) return; e.stopImmediatePropagation(); if (drag.ny != null) drag.o.y = drag.ny; drag = null; tip.classList.add('hide'); rebuild(); renderSec(); };
  el.addEventListener('pointerup', up, true); el.addEventListener('pointercancel', up, true);
}
document.querySelectorAll('[data-cam]').forEach(b => b.onclick = () => { lastCam = b.dataset.cam; camTo(lastCam); document.querySelector('.tools').classList.remove('open'); });
$('menuT').onclick = () => document.querySelector('.tools').classList.toggle('open');
const DMB = { dT: 't', dS: 's', dV: 'v', dC: 'c' };
Object.entries(DMB).forEach(([id, k]) => $(id).onclick = () => { S.dm[k] = !S.dm[k]; rebuild(); });
$('dAll').onclick = () => { S.dm = { t: true, s: true, v: true, c: true }; rebuild(); };
$('dNone').onclick = () => { S.dm = { t: false, s: false, v: false, c: false }; rebuild(); };
const msg = t => { $('msg').textContent = t; setTimeout(() => $('msg').textContent = '', 3000); };
$('shareBtn').onclick = async () => { const u = location.origin + location.pathname + '?cfg=' + btoa(unescape(encodeURIComponent(JSON.stringify(S)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); try { await navigator.clipboard.writeText(u); msg('Ссылка скопирована'); } catch (e) { prompt('Ссылка на конфигурацию', u); } };
$('saveBtn').onclick = () => { localStorage.setItem('gs_saved', JSON.stringify(S)); msg('Конфигурация сохранена'); };
$('loadBtn').onclick = () => { const v = load('gs_saved'); if (!v) return msg('Сохраненной конфигурации нет'); S = migrate(v); cur = { w: 0, s: 0 }; fillGeneral(); rebuild(); renderSec(); camTo(lastCam); msg('Конфигурация загружена'); };
$('resetBtn').onclick = () => { if (!confirm('Сбросить все настройки?')) return; S = migrate(defaults()); cur = { w: 0, s: 0 }; fillGeneral(); cardUI(); rebuild(); renderSec(); camTo('front'); };

async function fontsFor(C) { const f = { montserrat: 'Montserrat', inter: 'Inter', playfair: 'Playfair Display' }[C.font] || 'Manrope'; await Promise.all([document.fonts.load(`700 60px "${f}"`, 'Наполнение КАРКАС 0123'), document.fonts.load('500 30px Manrope', 'Наполнение КАРКАС 0123'), document.fonts.load('800 48px Manrope', 'Наполнение КАРКАС 0123'), document.fonts.load(`800 48px "${f}"`, 'Наполнение КАРКАС 0123'), document.fonts.load(`500 30px "${f}"`, 'Наполнение КАРКАС 0123')]).catch(() => {}); }
$('cardBtn').onclick = async () => { cardRead(); await fontsFor(S.card); const o = makeCard(); o.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'kartochka-900x1200.png'; a.click(); }, 'image/png'); };
$('cAuto').onclick = () => { S.card.size = overall(); S.card.panel = specData().cardLines.join('\n'); cardUI(); cardRead(); };
['cPX', 'cPY', 'cPW', 'cSSize', 'cSColor', 'cTSize', 'cTColor', 'cTY', 'cPColor', 'cPOp', 'cPScale', 'cPFit', 'cFont', 'cTitle', 'cTOn', 'cSize', 'cSOn', 'cPanel', 'cPOn', 'cPos', 'cNote', 'cNOn', 'cDims'].forEach(id => $(id).onchange = cardRead);
$('decor').onchange = e => { S.decor = e.target.checked; rebuild(); };
$('sunT').onchange = e => { S.sun = e.target.checked; rebuild(); };
$('setTpl').onchange = e => { if (e.target.value) setTemplate(e.target.value); e.target.value = ''; };
$('bStyle').onchange = e => { S.basketStyle = e.target.value; rebuild(); };
[['ceilT', 'ceiling'], ['skirtT', 'skirting'], ['lampT', 'lamps'], ['shOnT', 'shOn']].forEach(([id, k]) => $(id).onchange = e => { S.room[k] = e.target.checked; rebuild(); });
[['angR', 'angle', 'angV', v => v + '°'], ['shAng', 'shAng', 'shAngV', v => v + '°'], ['shBlur', 'shBlur', 'shBlurV', v => v], ['shDist', 'shDist', 'shDistV', v => Math.round(v * 100) + '%'], ['glare', 'glare', 'glareV', v => Math.round(v * 100) + '%'], ['shadow', 'shadow', 'shadowV', v => Math.round(v * 100) + '%'], ['roomX', 'extra', 'roomV', v => v], ['ceilH', 'ceilH', 'ceilV', v => v]].forEach(([id, k, lab, f]) => { let t; $(id).oninput = e => { S.room[k] = +e.target.value; $(lab).textContent = f(S.room[k]); clearTimeout(t); t = setTimeout(rebuild, 40); }; });
const SW = ['#ecdcc8', '#e8d3bd', '#f2efe9', '#ffffff', '#dcd9d3', '#c9d3cf', '#d8c3b0', '#bfc7d1'];
$('skirtC').oninput = e => { S.room.skirtColor = e.target.value; rebuild(); }; $('glowS').onchange = e => { S.room.glow = e.target.value; rebuild(); };
$('swatches').innerHTML = SW.map(c => `<button type="button" style="background:${c}" data-sw="${c}" title="${c}"></button>`).join('');
$('swatches').querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { S.wall = b.dataset.sw; $('wall').value = S.wall; rebuild(); });
$('eyeBtn').onclick = async () => { if (!window.EyeDropper) return alert('Пипетка работает в Chrome и Edge на компьютере. Выберите цвет в палитре.'); try { const r = await new EyeDropper().open(); S.wall = r.sRGBHex; $('wall').value = S.wall; rebuild(); } catch (e) {} };
$('undoBtn').onclick = undo; $('redoBtn').onclick = redo;
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) { e.preventDefault(); redo(); } } });
function dockTools() { const t = document.querySelector('.tools'); if (t.parentNode !== $('toolsDock')) $('toolsDock').appendChild(t); }
addEventListener('resize', dockTools); dockTools();
$('viewMode').onchange = e => { S.view = e.target.value; rebuild(); };
$('preset').onchange = e => { S.preset = e.target.value; if (S.preset === 'warm') { S.wall = '#ecdcc8'; S.floor = 'oak'; } fillGeneral(); rebuild(); };
fillGeneral(); setBg(); resize(); rebuild(); renderSec(); cardUI(); if (S._cam) { lastCam = S._cam; delete S._cam; } camTo(lastCam === 'card' ? 'card' : S.layout === 'straight' ? 'front' : 'iso');
const _x=0;window.__gs = { get S() { return S; }, set S(v) { S = v; }, rebuild, renderSec, fillGeneral, cardUI, makeCard, makeCardAsync: async () => { cardRead(); await fontsFor(S.card); return makeCard(); }, camTo, setOrb: (az, h, R, tx, ty, tz) => { orb.on = true; controls.enabled = false; orb.az = az; orb.h = h; orb.R = R; orb.T.set(tx, ty, tz); }, setLayout: l => { $('layout').value = l; $('layout').onchange({ target: $('layout') }); }, setDims };
document.fonts.ready.then(() => rebuild());
