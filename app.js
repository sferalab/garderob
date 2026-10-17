import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CATALOG, RULES } from './catalog.js';

const $ = id => document.getElementById(id);
const MM = 0.001;
const METAL = { white: 0xf7f9fc, black: 0x202124, silver: 0xc3c6c8 };
// floors: texture, repeat (m per tile set), tint, optional porcelain joint grid [w, h] in m
const FLOORS = { oak: ['herringbone_parquet', 6, 0xffffff], lam: ['laminate_floor_02', 6, 0xfffaf3], lamD: ['wood_floor_worn', 5, 0x7d6656], conc: ['concrete_floor_worn_001', 3, 0xdedcd8, [0.6, 1.2]], marble: ['marble_01', 4, 0xffffff, [0.6, 0.6]], carpet: [null, 1, 0xffffff] };
const TYPES = {
  mesh: 'Полка сетчатая', metal: 'Полка металлическая', ldsp: 'Полка ЛДСП',
  basket: 'Корзина стационарная', pull: 'Корзина выдвижная', rail: 'Штанга для вешалок', shoe: 'Полка для обуви', trouser: 'Брючница выдвижная'
};
const DEPTHS = { mesh: [30, 40, 50], metal: [30, 40], ldsp: [30, 40], basket: [30, 40], pull: [30, 40], rail: [30], shoe: [30, 40], trouser: [40] };
const REAL_DEPTH = { mesh: { 30: 306, 40: 406, 50: 506 }, metal: { 30: 327, 40: 427 }, ldsp: { 30: 330, 40: 430 }, basket: { 30: 340, 40: 440 }, pull: { 30: 340, 40: 440 }, rail: { 30: 300 }, shoe: { 30: 306, 40: 406 }, trouser: { 40: 440 } };
// catalog lengths (mm) per element; the section width follows the chosen length
const LENS = { mesh: [463, 603, 903, 1203], metal: [597], ldsp: [446, 587, 887], basket: [603, 903], pull: [563, 863], fine: [535], shoe: [604, 904], trouser: [463, 603], rail: [520, 640, 940, 1240] };
const lensOf = o => o.t === 'pull' && o.v === 'fine' ? LENS.fine : LENS[o.t];
const depthsOf = o => o.t === 'pull' && o.v === 'fine' ? [40] : DEPTHS[o.t];
const secW = mm => nearest([45, 60, 90, 120], mm / 10);
const LAYOUTS = { straight: 'Прямая (одна стена)', L: 'Угловая, угол слева', Lr: 'Угловая, угол справа', U: 'П-образная' };
const CATS = { shelf: 'Полка', rod: 'Штанга', combo: 'Штанга с полкой', basket: 'Корзина', trouser: 'Брючница' };
const rowCat = o => o.g ? 'combo' : catOf(o.t);
const catOf = t => t === 'rail' ? 'rod' : t === 'basket' || t === 'pull' ? 'basket' : t === 'trouser' ? 'trouser' : 'shelf';
const VARS = { shelf: [['mesh', 'Сетчатая'], ['metal', 'Металлическая'], ['ldsp', 'ЛДСП'], ['shoe', 'Для обуви']], rod: [['rail', 'Штанга на кронштейнах']], combo: [['mesh', 'Сетчатая полка + штанга'], ['metal', 'Металлическая полка + штанга'], ['ldsp', 'Полка ЛДСП + штанга']], basket: [['pull|mesh', 'Сетчатая выдвижная'], ['basket|mesh', 'Стационарная'], ['pull|fine', 'Мелкосетчатая'], ['pull|perf', 'Перфорированная'], ['basket|perf', 'Перфор. стационарная']], trouser: [['trouser', 'Выдвижная']] };
const isBasket = t => t === 'basket' || t === 'pull';
const perfOf = o => (o.v || (S.basketStyle === 'plastic' ? 'perf' : 'mesh')) === 'perf';
const fineOf = o => o.v === 'fine';
const WALLNAMES = ['Основная стена', 'Вторая стена', 'Вторая стена'];

function sec(w, items) { return { w, items }; }
function it(t, d, y, h) { const o = { t, d, y }; if (h) o.h = h; return o; }
function defaults() {
  return {
    v4: 1, v5: 1, v7: 1, v8: 1, layout: 'L', metal: 'white', wall: '#a9a49c', wallFin: 'paint', wallVar: { paint: 'matte', plaster: 'koroed', paper: 'linen' }, floor: 'oak', preset: 'warm', view: 'all', decor: false, card: null, postH: 1920, railTop: 213, plants: [], dims: false, dm: { o: false, s: false, h: false, g: false, sd: false }, dimC: 'white', dimStyle: 'bold', studio: false, rug: null, room: { shOn: true, shP: 'soft', winL: 'off', glareM: 'soft', glare: 0.3, shadow: 0.55, shBlur: 4, shDist: 0.12, ceiling: false, skirting: true, extra: 250 },
    walls: [
      { gap: 0, gapR: 0, sections: [sec(90, [it('mesh', 40, 192), it('rail', 30, 183), it('mesh', 40, 40)]), sec(90, [it('mesh', 40, 192), it('mesh', 40, 152), it('mesh', 40, 112), Object.assign(it('pull', 40, 75, 181), { v: 'mesh' }), Object.assign(it('pull', 40, 52, 181), { v: 'mesh' })])] },
      { gap: 50, sections: [sec(60, [it('mesh', 40, 192), it('mesh', 40, 150), it('mesh', 40, 110), it('mesh', 40, 70)]), sec(90, [it('mesh', 40, 192), it('rail', 30, 183), it('mesh', 40, 40)])] },
      { gap: 50, sections: [sec(90, [it('mesh', 40, 192), it('rail', 30, 183)]), sec(60, [it('mesh', 40, 192), it('mesh', 40, 140), it('mesh', 40, 90), it('shoe', 40, 30)])] }
    ]
  };
}
const ROOMDEF = { shP: 'soft', winL: 'off', glareM: 'soft', win: false, door: false, winX: 0, cornice: false, extra: 250, ceiling: false, ceilH: 275, skirting: true, lamps: false, glare: 0.3, shadow: 0.5, angle: 90, skirtColor: '#ffffff', lampType: 'spot', glow: 'none', shOn: true, shAng: 20, shBlur: 4, shDist: 0.12, shadow: 0.55 };
function migrate(S) { S.room = Object.assign({}, ROOMDEF, S.room || {}); if (!S.v4) { S.v4 = 1; Object.assign(S.room, { shBlur: 4, shDist: 0.12, shadow: 0.55 }); } S.room.lampType = 'spot'; if (!S.v7) { S.v7 = 1; const d = S.dm || {}; S.dm = { o: !!(d.t || d.v), s: !!d.s, h: false, g: !!d.c, sd: false }; S.room.shAng = Math.max(-35, Math.min(35, S.room.shAng ?? 20)); S.room.shBlur = Math.min(8, S.room.shBlur ?? 4); S.room.shadow = Math.max(0.2, Math.min(0.8, S.room.shadow ?? 0.55)); } if (S.metal === 'graphite') S.metal = 'black'; if (!METAL[S.metal]) S.metal = 'white'; if (S.rod && S.rod !== 'white') S.rod = 'chrome'; if (!S.dm || !('o' in S.dm)) S.dm = { o: false, s: false, h: false, g: false, sd: false }; S.dimC = S.dimC === 'black' ? 'black' : 'white'; S.dimStyle = S.dimStyle === 'thin' ? 'thin' : 'bold'; if (!S.basketStyle) S.basketStyle = 'mesh'; if (!S.prices) S.prices = {}; if (!S.depth) S.depth = 40;
  if (!S.v8) { S.v8 = 1; if (S.wall === '#b3b1ad') S.wall = '#a9a49c'; S.room.shP = S.room.shOn === false ? 'none' : 'soft'; S.room.extra = Math.max(250, S.room.extra || 0); S.room.glareM = 'soft'; if (S.rug === true) S.rug = { shape: 'rect', pile: 'flat' }; }
  if (S.floor === 'tile') S.floor = 'marble'; if (S.rug && typeof S.rug !== 'object') S.rug = { shape: 'rect', pile: 'flat' }; if (!S.plants) S.plants = []; if (!S.wallVar) S.wallVar = { paint: 'matte', plaster: 'koroed', paper: 'linen' }; if (!['soft', 'left', 'right', 'top', 'none'].includes(S.room.shP)) S.room.shP = 'soft'; if (!['off', 'wall', 'floor', 'both'].includes(S.room.winL)) S.room.winL = 'off'; if (!['soft', 'bright', 'off'].includes(S.room.glareM)) S.room.glareM = 'soft';
  S.walls.forEach(w => { if (w.gap == null) w.gap = 0; }); if (S.walls[0].gapR == null) S.walls[0].gapR = 0; return S; }
function setTemplate(t) {
  const m = y => ({ t: 'mesh', d: 40, y }), rl = y => ({ t: 'rail', d: 30, y: y + 3 }), sh = y => ({ t: 'shoe', d: 40, y }), pu = (y, h) => ({ t: 'pull', d: 40, y, h });
  const A = () => ({ w: 90, items: [m(192), rl(180), m(40)] }), B = () => ({ w: 90, items: [m(192), m(152), m(112), m(72), m(32)] }), C = () => ({ w: 60, items: [m(192), m(150), pu(95, 181), pu(70, 181), sh(30)] }), D = () => ({ w: 90, items: [m(192), rl(180), rl(100)] });
  S.walls[0].gap = S.walls[0].gap || 0;
  if (t === 'p2') { S.layout = 'straight'; S.walls[0].sections = [A(), B()]; }
  if (t === 'p3') { S.layout = 'straight'; S.walls[0].sections = [A(), B(), D()]; }
  if (t === 'p6') { S.layout = 'straight'; S.walls[0].sections = [A(), B(), C(), C(), B(), D()]; }
  if (t === 'l23') { S.layout = 'L'; S.walls[0].sections = [A(), B()]; S.walls[1].gap = Math.max(S.walls[1].gap || 0, 46); S.walls[1].sections = [B(), D()]; }
  if (t === 'zero') { S.layout = 'straight'; S.walls[0].sections = [{ w: 90, items: [] }, { w: 90, items: [] }]; }
  cur = { w: 0, s: 0, it: -1 }; fillGeneral(); rebuild(); renderSec(); camTo('nice');
}
function cardPreset() {
  const S = defaults(), m = y => ({ t: 'mesh', d: 40, y }), rl = y => ({ t: 'rail', d: 30, y });
  Object.assign(S, { layout: 'L', view: 'fill', preset: 'warm', wall: '#ecdcc8', floor: 'oak', railTop: 205, postH: 1920, metal: 'white', rod: 'chrome', decor: true });
  S.walls[0].gap = 0; S.walls[0].sections = [{ w: 90, items: [m(190), rl(178), m(42)] }, { w: 60, items: [m(190), rl(178), m(42)] }];
  S.walls[1].gap = 46; S.walls[1].sections = [{ w: 60, items: [m(190), m(140), m(90), m(42)] }];
  S.card = Object.assign(cardDefaults(), { size: '156 × 110 × 205 см' }); S._cam = 'card'; return S;
}
let S = (() => { const v = load('gs_auto'); return migrate(v && v.v5 ? v : defaults()); })();
const QS = new URLSearchParams(location.search);
try {
  if (QS.get('preset') === 'card') S = migrate(cardPreset());
  else if (QS.get('cfg')) { const v = JSON.parse(decodeURIComponent(escape(atob(QS.get('cfg').replace(/-/g, '+').replace(/_/g, '/'))))); if (v && v.walls) S = migrate(v); }
} catch (e) { console.warn('cfg', e); } if (!FLOORS[S.floor]) S.floor = S.floor === 'parquet' || S.floor === 'walnut' ? 'oak' : S.floor === 'tile' ? 'marble' : 'lam'; if (!S.view) S.view = 'all'; S = migrate(S); if (!S.basketStyle) S.basketStyle = 'mesh'; if (!S.prices) S.prices = {}; if (!S.preset) S.preset = 'none'; S.dims = true;
let cur = { w: 0, s: 0, it: -1 }, drag = null;
function load(k) { try { const v = JSON.parse(localStorage.getItem(k)); return v && v.walls ? v : null; } catch (e) { return null; } }

// ---------- renderer ----------
const view = $('view');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
const PR_MAX = Math.min(devicePixelRatio, innerWidth < 800 ? 2 : 1.5); let PR = PR_MAX;
renderer.setPixelRatio(PR);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
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
const SLOTC = {};
// perforation with soft AO around the slot and a light lower lip (edge highlight) so it reads on every color
function slotTex(horizontal, dark) {
  const k = (horizontal ? 'h' : 'v') + (dark ? 'd' : 'l'); if (SLOTC[k]) return SLOTC[k];
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64);
  const slot = (x, y, w, h) => { g.save(); g.filter = 'blur(2px)'; g.fillStyle = dark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.22)'; g.fillRect(x - 2, y - 2, w + 4, h + 4); g.restore();
    g.fillStyle = dark ? '#d8d8d8' : '#ffffff'; g.fillRect(x, y + h, w, 2); g.fillStyle = dark ? '#000' : '#2e2e2e'; g.fillRect(x, y, w, h); };
  if (!horizontal) { slot(14, 10, 10, 40); slot(40, 10, 10, 40); } else slot(10, 22, 40, 14);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; SLOTC[k] = t; return t;
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
  return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(tint).multiply(new THREE.Color(warm ? 0xfff6ec : 0xffffff)), map: tex(n + '_diff', true, rep), normalMap: tex(n + '_nor_gl', false, rep), roughnessMap: tex(n + '_rough', false, rep), roughness: 1, normalScale: new THREE.Vector2(1.2, 1.2), clearcoat: S.floor === 'marble' ? 0.75 : S.floor === 'conc' ? 0.45 : 0.35, clearcoatRoughness: S.floor === 'marble' ? 0.12 : S.floor === 'conc' ? 0.25 : 0.28, envMapIntensity: 0.9 });
}
let PAPER;
function paperTex() {
  if (!PAPER) PAPER = canvasTex(256, 512, (g, w, h) => { g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgb(150,128,255)'; g.fillRect(x, 0, 2, h); g.fillStyle = 'rgb(106,128,255)'; g.fillRect(x + 2, 0, 2, h); }
    for (let y = 32; y < h; y += 64) for (let x = 16; x < w; x += 64) { g.strokeStyle = 'rgb(150,150,255)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x + (y % 128 ? 32 : 0), y, 10, 18, 0, 0, 7); g.stroke(); } }, 2);
  return PAPER;
}
// walls: unlit exact color (identical on every wall) with a baked finish texture tinted by the wall color; shadows via a ShadowMaterial overlay
const FINS = { paint: [['matte', 'Матовая'], ['satin', 'Сатин'], ['roller', 'Валик']], plaster: [['koroed', 'Короед, крошка'], ['venet', 'Венецианка'], ['beton', 'Бетон'], ['silk', 'Шелк'], ['trav', 'Травертин']], paper: [['linen', 'Лен'], ['geo', 'Геометрия'], ['botan', 'Ботаника'], ['stripe', 'Полоска'], ['damask', 'Дамаск']] };
const FINK = { matte: 0.9, satin: 1.4, roller: 0.8, koroed: 0.7, venet: 1.3, beton: 1.6, silk: 0.6, trav: 1.2, linen: 0.45, geo: 0.5, botan: 0.75, stripe: 0.6, damask: 0.7 };
const FIN = {};
function finVar() { const f = S.wallFin || 'paint', v = S.wallVar && S.wallVar[f]; return FINS[f].some(p => p[0] === v) ? v : FINS[f][0][0]; }
function finishTex(v) {
  if (FIN[v]) return FIN[v];
  let sd = 11 + v.length * 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), w = 512, h = 512;
  const wrap = f => { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { g.save(); g.translate(dx, dy); f(); g.restore(); } };
  const blob = (x, y, r, col) => wrap(() => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); });
  const specks = (n, lo, a, s = 1.4) => { for (let i = 0; i < n; i++) { const l = lo + rnd() * (255 - lo); g.fillStyle = `rgba(${l},${l},${l},${a})`; g.fillRect(rnd() * w, rnd() * h, s, s); } };
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  if (v === 'matte') specks(16000, 236, 0.22);
  else if (v === 'satin') { for (let x = 0; x < w; x += 4) { const l = 248 + 7 * Math.sin(x / w * Math.PI * 2); g.fillStyle = `rgb(${l},${l},${l})`; g.fillRect(x, 0, 4, h); } specks(6000, 242, 0.15, 1); }
  else if (v === 'roller') { for (let x = 0; x < w; x += 128) { g.fillStyle = 'rgba(0,0,0,0.018)'; g.fillRect(x, 0, 64, h); } for (let i = 0; i < 9000; i++) { const x = rnd() * w, y = rnd() * h, r = 0.8 + rnd() * 2.4, l = 205 + rnd() * 40; g.fillStyle = `rgba(${l},${l},${l},0.28)`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(x - r * 0.4, y - r * 0.4, r * 0.5, 0, 7); g.fill(); } }
  else if (v === 'koroed') { specks(30000, 215, 0.35, 1.6); for (let i = 0; i < 1300; i++) { const x = rnd() * w, y = rnd() * h, a = Math.PI / 2 + (rnd() - 0.5) * 1.3, L = 6 + rnd() * 22, x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L, mx = (x + x2) / 2 + (rnd() - 0.5) * 6, my = (y + y2) / 2;
      wrap(() => { g.lineCap = 'round'; g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 2 + rnd() * 1.6; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, x2, y2); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 1.6, y + 1); g.quadraticCurveTo(mx + 1.6, my + 1, x2 + 1.6, y2 + 1); g.stroke(); }); } }
  else if (v === 'venet') { for (let i = 0; i < 260; i++) { const l = 222 + rnd() * 33; blob(rnd() * w, rnd() * h, 30 + rnd() * 90, `rgba(${l},${l},${l},0.32)`); } g.lineCap = 'round'; for (let i = 0; i < 160; i++) { const x = rnd() * w, y = rnd() * h, a = rnd() * 3, L = 40 + rnd() * 90; wrap(() => { g.strokeStyle = `rgba(255,255,255,${0.35 + rnd() * 0.35})`; g.lineWidth = 2 + rnd() * 5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.2 + 10, x + Math.cos(a) * L, y + Math.sin(a) * L * 0.3); g.stroke(); }); } for (let i = 0; i < 30; i++) { const x = rnd() * w, y = rnd() * h; wrap(() => { g.strokeStyle = 'rgba(0,0,0,0.05)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 40, y + 20, x + 60, y - 30, x + 120, y + 10); g.stroke(); }); } }
  else if (v === 'beton') { g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { const l = 195 + rnd() * 55; blob(rnd() * w, rnd() * h, 10 + rnd() * 60, `rgba(${l},${l},${l},0.3)`); } specks(20000, 180, 0.2, 1.2); for (let i = 0; i < 380; i++) { const x = rnd() * w, y = rnd() * h, r = 0.6 + rnd() * 1.8; g.fillStyle = 'rgba(40,40,40,0.4)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(x + r * 0.6, y + r * 0.6, r * 0.6, 0, 7); g.fill(); } g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(0, 255, w, 2); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(0, 257, w, 1); }
  else if (v === 'silk') { for (let i = 0; i < 14000; i++) { const x = rnd() * w, y = rnd() * h, a = rnd() * 6.3, L = 2 + rnd() * 6, l = 215 + rnd() * 40; g.strokeStyle = `rgba(${l},${l},${l},0.45)`; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); } specks(1500, 255, 0.9, 1); }
  else if (v === 'trav') { g.fillStyle = '#f2f0ec'; g.fillRect(0, 0, w, h); let y = 0; while (y < h) { const bh = 3 + rnd() * 18, l = 228 + rnd() * 27; g.fillStyle = `rgba(${l},${l - 2},${l - 5},0.7)`; g.fillRect(0, y, w, bh); y += bh; } for (let i = 0; i < 420; i++) { const x = rnd() * w, yy = rnd() * h, rw = 2 + rnd() * 9, rh = 0.8 + rnd() * 2; wrap(() => { g.fillStyle = 'rgba(70,60,50,0.28)'; g.beginPath(); g.ellipse(x, yy, rw, rh, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(x, yy + rh, rw * 0.8, rh * 0.5, 0, 0, 7); g.fill(); }); } specks(8000, 210, 0.2); }
  else if (v === 'linen') { for (let y = 0; y < h; y += 2) { const l = 236 + rnd() * 19; g.fillStyle = `rgba(${l},${l},${l},0.6)`; g.fillRect(0, y, w, 1); } for (let x = 0; x < w; x += 2) { const l = 232 + rnd() * 23; g.fillStyle = `rgba(${l},${l},${l},0.45)`; g.fillRect(x, 0, 1, h); } for (let i = 0; i < 400; i++) { const l = 220 + rnd() * 20; g.fillStyle = `rgba(${l},${l},${l},0.5)`; g.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 30, 1); } }
  else if (v === 'geo') { specks(6000, 240, 0.2, 1); g.strokeStyle = 'rgba(0,0,0,0.13)'; g.lineWidth = 1.6; const s = 64; for (let y = 0; y <= h; y += s) for (let x = 0; x <= w; x += s) { g.beginPath(); g.moveTo(x, y - s / 2); g.lineTo(x + s / 2, y); g.lineTo(x, y + s / 2); g.lineTo(x - s / 2, y); g.closePath(); g.stroke(); g.beginPath(); g.arc(x, y, 4, 0, 7); g.stroke(); } g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1; for (let y = 0; y <= h; y += s) for (let x = 0; x <= w; x += s) { g.beginPath(); g.moveTo(x + 1, y - s / 2 + 1); g.lineTo(x + s / 2 + 1, y + 1); g.stroke(); } }
  else if (v === 'botan') { specks(6000, 240, 0.2, 1); const leaf = (x, y, a, L) => wrap(() => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = 'rgba(0,0,0,0.085)'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * 0.5, -L * 0.28, L, 0); g.quadraticCurveTo(L * 0.5, L * 0.28, 0, 0); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(2, 0); g.lineTo(L - 4, 0); g.stroke(); g.restore(); });
    for (let b = 0; b < 7; b++) { let x = rnd() * w, y = rnd() * h, a = rnd() * 6.3; for (let k = 0; k < 9; k++) { const nx = x + Math.cos(a) * 22, ny = y + Math.sin(a) * 22; wrap(() => { g.strokeStyle = 'rgba(0,0,0,0.09)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke(); }); leaf(nx, ny, a + 0.9, 26 + rnd() * 10); leaf(nx, ny, a - 0.9, 26 + rnd() * 10); x = nx; y = ny; a += (rnd() - 0.5) * 0.5; } } }
  else if (v === 'stripe') { for (let x = 0; x < w; x++) { const t = (x % 256) / 256, k = 0.5 + 0.5 * Math.tanh(Math.sin(t * Math.PI * 2) * 4), l = 255 - 14 * k; g.fillStyle = `rgb(${l},${l},${l})`; g.fillRect(x, 0, 1, h); } specks(5000, 240, 0.2, 1); }
  else if (v === 'damask') { specks(6000, 242, 0.2, 1); const motif = (cx, cy) => { g.save(); g.translate(cx, cy); for (const sx of [1, -1]) { g.save(); g.scale(sx, 1); g.fillStyle = 'rgba(0,0,0,0.075)'; g.beginPath(); g.moveTo(0, -100); g.bezierCurveTo(30, -80, 60, -60, 40, -20); g.bezierCurveTo(80, -30, 90, 20, 50, 30); g.bezierCurveTo(70, 60, 40, 90, 0, 100); g.bezierCurveTo(10, 60, 30, 40, 18, 10); g.bezierCurveTo(30, -20, 8, -40, 0, -60); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.2; g.stroke(); g.beginPath(); g.ellipse(26, -4, 8, 16, 0.4, 0, 7); g.fill(); g.restore(); } g.fillStyle = 'rgba(0,0,0,0.07)'; g.beginPath(); g.ellipse(0, 0, 6, 22, 0, 0, 7); g.fill(); g.restore(); };
    wrap(() => { motif(128, 128); motif(384, 384); motif(384, -128 + 0); }); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; FIN[v] = t; return t;
}
function wallMat() { const v = finVar(), t = finishTex(v).clone(); t.needsUpdate = true; const k = FINK[v] || 0.9; t.repeat.set(1 / k, 1 / k); const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(S.wall), map: t, toneMapped: false }); m.userData.wall = true; return m; }
// small tile preview of a finish, tinted by the wall color
function finSwatch(v) { const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'), src = finishTex(v).image, k = FINK[v] || 0.9, px = Math.min(512, 512 * 0.35 / k); g.drawImage(src, 0, 0, px, px, 0, 0, 96, 96); g.globalCompositeOperation = 'multiply'; g.fillStyle = S.wall; g.fillRect(0, 0, 96, 96); return c.toDataURL('image/jpeg', 0.85); }

function wallShadowMat() { return new THREE.ShadowMaterial({ opacity: (SHP[S.room.shP] || SHP.soft).k, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }); }
const AOG = {};
function aoGrad(k) { // soft quadratic falloff, alpha along u (u=0 darkest)
  if (!AOG[k]) { const c = document.createElement('canvas'); c.width = 256; c.height = 2; const g = c.getContext('2d'), im = g.createImageData(256, 2); for (let x = 0; x < 256; x++) { const t = x / 255, a = Math.pow(1 - t, 2.2) * 255; for (let y = 0; y < 2; y++) { const i = (y * 256 + x) * 4; im.data[i + 3] = a; } } g.putImageData(im, 0, 0); AOG[k] = new THREE.CanvasTexture(c); }
  return new THREE.MeshBasicMaterial({ map: AOG[k], color: 0x000000, transparent: true, opacity: k, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
}
// strip of AO on a plane: len along v, width w; u runs from the joint into the surface
function aoStrip(parent, len, w, k, place) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), aoGrad(k)); place(m); parent.add(m); return m; }
let CONTACT;
function contactMat() {
  if (!CONTACT) { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.35, 'rgba(0,0,0,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 64);
    const m = g.getImageData(0, 0, 128, 64); for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) { const k = Math.min(1, Math.min(x, 127 - x) / 18); m.data[(y * 128 + x) * 4 + 3] *= k; } g.putImageData(m, 0, 0); CONTACT = new THREE.CanvasTexture(c); }
  return new THREE.MeshBasicMaterial({ map: CONTACT, transparent: true, depthWrite: false, opacity: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}

// ---------- materials ----------
let M = {}, GRAIN = null;
// fine powder-coat grain: soft orange-peel normal map + roughness variation (tileable)
function grainTex() {
  if (GRAIN) return GRAIN;
  const N = 256; let sd = 9; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  let h = new Float32Array(N * N).map(() => rnd());
  const blur = (a, r) => { const o = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let s = 0, n = 0; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { s += a[((y + dy + N) % N) * N + ((x + dx + N) % N)]; n++; } o[y * N + x] = s / n; } return o; };
  const lo = blur(blur(h, 2), 2), fine = blur(h, 1); h = lo.map((v, i) => v * 0.75 + fine[i] * 0.25);
  let mn = 1, mx = 0; h.forEach(v => { mn = Math.min(mn, v); mx = Math.max(mx, v); }); h = h.map(v => (v - mn) / (mx - mn));
  const mk = f => { const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), im = g.createImageData(N, N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = (y * N + x) * 4, [r, gg, b] = f(x, y); im.data[i] = r; im.data[i + 1] = gg; im.data[i + 2] = b; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  const H = (x, y) => h[((y + N) % N) * N + ((x + N) % N)];
  const nor = mk((x, y) => { const dx = (H(x + 1, y) - H(x - 1, y)) * 2.2, dy = (H(x, y + 1) - H(x, y - 1)) * 2.2, l = Math.hypot(dx, dy, 1); return [128 - dx / l * 127, 128 + dy / l * 127, 128 + 127 / l]; });
  const rough = mk((x, y) => { const v = 190 + H(x, y) * 65; return [v, v, v]; });
  GRAIN = { nor, rough }; return GRAIN;
}
const rep = (t, x, y) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(x, y); return c; };
function makeMats() {
  // Titan-GS powder coat: RAL 9016 snow white (slightly cool, glowing), RAL 9006 silver, RAL 9005 black
  const gm = { soft: 1, bright: 2.6, off: 0.3 }[S.room.glareM || 'soft'] || 1, bright = S.room.glareM === 'bright';
  const PB = {
    white: { color: bright ? 0xeceff4 : METAL.white, metalness: bright ? 0.12 : 0.04, roughness: bright ? 0.16 : S.room.glareM === 'off' ? 0.6 : 0.3, clearcoat: S.room.glareM === 'off' ? 0 : bright ? 1 : 0.6, clearcoatRoughness: bright ? 0.04 : 0.16, specularIntensity: bright ? 1 : S.room.glareM === 'off' ? 0.12 : 0.5, sheen: S.room.glareM === 'off' ? 0 : 0.3, sheenRoughness: 0.35, sheenColor: new THREE.Color(0xeef4ff), emissive: new THREE.Color(0x181c22), envMapIntensity: 0.95 * gm },
    silver: { color: METAL.silver, metalness: 0.62, roughness: 0.4, clearcoat: bright ? 0.6 : 0.25, clearcoatRoughness: bright ? 0.12 : 0.4, specularIntensity: 0.75, envMapIntensity: 1.35 * gm },
    black: { color: METAL.black, metalness: 0.25, roughness: 0.42, clearcoat: bright ? 1 : 0.7, clearcoatRoughness: bright ? 0.1 : 0.26, specularIntensity: 0.9, sheen: 0.5, sheenRoughness: 0.35, sheenColor: new THREE.Color(0x6c7078), envMapIntensity: 1.25 * gm }
  }[S.metal] || {};
  const G = grainTex();
  M.metal = new THREE.MeshPhysicalMaterial({ ...PB, normalMap: rep(G.nor, 6, 6), normalScale: new THREE.Vector2(0.22, 0.22), roughnessMap: rep(G.rough, 6, 6) });
  const dark = S.metal === 'black', pt = slotTex(false, dark).clone(); pt.needsUpdate = true; pt.repeat.set(1, S.postH / 32);
  // uprights: crisp perforation as color + bump relief, powder grain in the roughness
  M.post = new THREE.MeshPhysicalMaterial({ ...PB, map: pt, bumpMap: pt, bumpScale: 2.2, roughnessMap: rep(G.rough, 1, S.postH / 60) });
  const rt = slotTex(true, dark).clone(); rt.needsUpdate = true; M.railTex = rt;
  M.rail = new THREE.MeshPhysicalMaterial({ ...PB, map: rt, bumpMap: rt, bumpScale: 2, roughnessMap: rep(G.rough, 30, 1) });
  M.chrome = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.12, envMapIntensity: 1.6 * Math.max(0.6, gm) });
  M.rod = S.rod === 'white' ? new THREE.MeshPhysicalMaterial({ color: METAL.white, metalness: 0.04, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.16, emissive: new THREE.Color(0x10141a), sheen: 0.3, sheenColor: new THREE.Color(0xeef4ff), envMapIntensity: 0.95 * gm, normalMap: rep(G.nor, 8, 2), normalScale: new THREE.Vector2(0.2, 0.2) }) : M.chrome;
  M.plastic = new THREE.MeshStandardMaterial({ color: dark ? 0x2a2b2e : S.metal === 'silver' ? 0xb4b7ba : 0xf6f7f8, roughness: 0.5, metalness: 0 });
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x3a3b3d, roughness: 0.85, metalness: 0 });
  M.ldsp = new THREE.MeshStandardMaterial({ color: dark ? 0x3b3836 : 0xf3f1ec, roughness: 0.6, metalness: 0 });
}

let SLOT;
function basketMat(rx, ry) {
  if (!SLOT) { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#000'; g.beginPath(); g.roundRect(27, 14, 10, 36, 5); g.fill(); SLOT = c; }
  const t = new THREE.CanvasTexture(SLOT); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.round(rx), Math.max(1, Math.round(ry)));
  return new THREE.MeshStandardMaterial({ color: M.plastic.color, roughness: 0.5, alphaMap: t, alphaTest: 0.5, side: THREE.DoubleSide });
}
// ---------- geometry helpers ----------
const CYL = new THREE.CylinderGeometry(1, 1, 1, 12, 1); CYL.translate(0, 0.5, 0);
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
function postLen(wi, i) { const L = S.walls[wi].postL; return (L && L[i]) || S.postH; }
function secLo(wi, si) { return Math.ceil((S.railTop * 10 - 10 - Math.min(postLen(wi, si), postLen(wi, si + 1))) / 10) + 3; }
let selPost = null;
function postBottom() { return S.railTop * 10 - 10 - S.postH; } // mm
function wallsActive() { return S.layout === 'straight' ? [0] : S.layout === 'L' ? [0, 1] : S.layout === 'Lr' ? [0, 2] : [0, 1, 2]; }
function wallWidth(w) { return S.walls[w].sections.reduce((a, s) => a + s.w * 10, 0); }
function wallsBuilt() { return wallsActive().filter(wi => !S.walls[wi].off); }
const ZB = 0.048, ZI = 0.055; // bracket base and back of the filling, m from the wall
// room frame per layout: x of the left side wall, start of the main wall, x of the right side wall
// every wall keeps its own shift from its corner (Lr: the main wall is measured from the right corner)
function frame() {
  const backW = wallWidth(0) * MM, g0 = effGap(0) / 100, gR = effGapR() / 100;
  if (S.layout === 'L') return { xL: -0.02, x0: g0, xR: null, backW };
  if (S.layout === 'Lr') return { xL: null, x0: -g0, xR: backW + 0.02, backW };
  if (S.layout === 'U') return { xL: -0.02, x0: g0, xR: g0 + backW + gR + 0.02, backW };
  return { xL: null, x0: 0, xR: null, backW };
}
// top rail: one profile at one height on every wall; in a corner it runs to the room corner (butt joint)
function railSpan(wi) {
  const tot = wallWidth(wi) * MM; let a = -0.025, b = tot + 0.025;
  if (wi === 0) { const F = frame(); if (F.xL != null && wallsBuilt().includes(1)) a = F.xL - F.x0; if (F.xR != null && wallsBuilt().includes(2)) b = F.xR - F.x0; }
  else if (!S.walls[0].off) a = -effGap(wi) / 100 + 0.017;
  return [Math.min(a, -0.025), Math.max(b, tot + 0.025)];
}
function buildWall(wi) {
  const W = S.walls[wi], g = new THREE.Group(); g.userData.wi = wi;
  const total = wallWidth(wi), railY = S.railTop * 10 * MM, [ra, rb] = railSpan(wi), rl = rb - ra, rc = (ra + rb) / 2;
  const rt = M.railTex.clone(); rt.needsUpdate = true; rt.repeat.set(rl / 0.032, 1); const rm = M.rail.clone(); rm.map = rt; rm.bumpMap = rt;
  // load-bearing rail 60 x 16 (visual), same on every wall: back plate, returns, rounded front lips, end caps
  { const H = 0.06, D = 0.016;
    const parts = [box(rl, H, 0.004, rc, railY - H / 2, 0.002, rm), box(rl, 0.0045, D, rc, railY - 0.00225, D / 2, M.metal), box(rl, 0.0045, D, rc, railY - H + 0.00225, D / 2, M.metal), box(0.004, H, D, ra + 0.002, railY - H / 2, D / 2, M.metal), box(0.004, H, D, rb - 0.002, railY - H / 2, D / 2, M.metal)];
    const lip = (h, y) => { const m = new THREE.Mesh(new RoundedBoxGeometry(rl, h, 0.0056, 2, 0.0022), M.metal); m.position.set(rc, y, D - 0.0026); m.castShadow = m.receiveShadow = true; return m; };
    parts.push(lip(0.022, railY - 0.011), lip(0.014, railY - H + 0.007));
    parts.forEach(p => { p.userData.frame = true; g.add(p); }); }
  const pt = (S.railTop * 10 - 10) * MM;
  let xs = [0]; W.sections.forEach(s => xs.push(xs[xs.length - 1] + s.w * 10 * MM));
  // uprights (catalog 32 x 34 mm, drawn about 1.5x heavier so they read in photos) with hook head and end cap
  xs.forEach((x, pi) => { const pb = pt - postLen(wi, pi) * MM, sel = selPost && selPost.wi === wi && selPost.i === pi, pm = new THREE.Mesh(new RoundedBoxGeometry(0.046, pt - pb, 0.042, 3, 0.0065), sel ? M.post.clone() : M.post); if (sel) { pm.material.emissive.set(0x2f7bff); pm.material.emissiveIntensity = 0.6; } pm.userData.post = { wi, i: pi }; pm.position.set(x, (pt + pb) / 2, 0.027); pm.castShadow = pm.receiveShadow = true; pm.userData.frame = true; g.add(pm);
    const hk = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.034, 0.03, 2, 0.004), M.metal); hk.position.set(x, pt - 0.012, 0.021); hk.castShadow = true; hk.userData.frame = true; g.add(hk);
    const cap = new THREE.Mesh(new RoundedBoxGeometry(0.048, 0.014, 0.044, 2, 0.004), M.plastic); cap.position.set(x, pb + 0.007, 0.027); cap.userData.frame = true; g.add(cap); });
  W.sections.forEach((s, si) => s.items.forEach((item, ii) => { const ig = new THREE.Group(); ig.userData.ref = { wi, si, ii }; g.add(ig); buildItem(ig, item, xs[si], xs[si + 1], s);
    if (item.t !== 'rail') { const ch = isBasket(item.t) ? (item.h || 85) * MM + 0.08 : 0.11, cs = new THREE.Mesh(new THREE.PlaneGeometry(xs[si + 1] - xs[si], ch), contactMat()); cs.position.set((xs[si] + xs[si + 1]) / 2, itemTop(item) - ch / 2 + 0.005, 0.0012); cs.userData.contact = true; ig.add(cs); } }));
  // soft contact shade on the floor under and just in front of the wall (the only shadow in Студия)
  { const fs = new THREE.Mesh(new THREE.PlaneGeometry(0.75, total * MM + 0.14), aoGrad(S.studio ? 0.36 : 0.12)); fs.rotation.x = -Math.PI / 2; fs.rotation.z = Math.PI / 2; fs.scale.x = -1; fs.position.set(total * MM / 2, 0.0025, 0.375); fs.userData.contact = fs.userData.keep = true; g.add(fs); }
  return g;
}
const BRG = {};
// shelf bracket: top flange ends exactly at y (shelf sits on it)
function bracket(g, x, y, L) {
  const k = L.toFixed(3);
  if (!BRG[k]) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(L, 0); sh.lineTo(L, -0.016); sh.lineTo(0.06, -0.082); sh.lineTo(0, -0.088); sh.lineTo(0, 0);
    const ge = new THREE.ExtrudeGeometry(sh, { depth: 0.0065, bevelEnabled: true, bevelThickness: 0.0013, bevelSize: 0.0012, bevelSegments: 2 }); ge.rotateY(-Math.PI / 2); ge.translate(0.00325, 0, 0); BRG[k] = ge; }
  const m = new THREE.Mesh(BRG[k], M.metal); m.position.set(x, y - 0.0012, ZB); m.castShadow = m.receiveShadow = true; g.add(m);
  g.add(box(0.03, 0.005, L, x, y - 0.0025, ZB + L / 2, M.metal));
  g.add(box(0.016, 0.02, 0.01, x, y - 0.01, ZB + L - 0.005, M.metal));
}
const ROD_G = new THREE.CylinderGeometry(1, 1, 1, 32, 1).translate(0, 0.5, 0), HOOK_G = new THREE.TorusGeometry(0.0195, 0.0028, 10, 28, Math.PI * 1.25);
function rodHolder(g, x, by, ry, zr) {
  // saddle over the bracket top flange, flat strap down, open hook cradling the rod
  const top = by + 0.002, len = Math.max(0.02, top - (ry + 0.017));
  g.add(box(0.015, 0.0028, 0.034, x, top + 0.0014, zr, M.metal));
  [-1, 1].forEach(s => g.add(box(0.0028, 0.018, 0.034, x + s * 0.0062, top - 0.008, zr, M.metal)));
  g.add(box(0.0028, len, 0.034, x + 0.0062, top - len / 2, zr, M.metal));
  const hk = new THREE.Mesh(HOOK_G, M.metal); hk.rotation.y = Math.PI / 2; hk.rotation.x = Math.PI * 0.917; hk.scale.set(1, 1, 6); hk.position.set(x + 0.0062, ry, zr); hk.castShadow = true; g.add(hk);
}
function buildItem(g, item, x0, x1, sec) {
  const y = item.y * 10 * MM, dep = (REAL_DEPTH[item.t][item.d] || 400) * MM, z0 = ZI, zf = z0 + dep;
  const a = x0 + 0.014, b = x1 - 0.014, L = b - a, mid = (x0 + x1) / 2;
  const brL = dep + 0.02;
  if (item.t !== 'rail') { bracket(g, x0, y, brL); bracket(g, x1, y, brL); }
  if (item.t === 'mesh') {
    // cross wires lie on the bracket flanges, side rims sit right over them; heavy front lip and rolled top rim
    const r = [], ea = x0 + 0.005, eb = x1 - 0.005, Lw = eb - ea, n = Math.max(2, Math.round(Lw / 0.015));
    for (let t = 0; t <= 1.001; t += 0.125) { const z = z0 + 0.005 + (dep - 0.01) * t; r.push([V(x0 - 0.007, y + 0.0035, z), V(x1 + 0.007, y + 0.0035, z), 0.0035]); }
    for (let i = 1; i < n; i++) { const x = ea + Lw * i / n; r.push([V(x, y + 0.0095, z0), V(x, y + 0.0095, zf), 0.003]); }
    [ea, eb].forEach(x => r.push([V(x, y + 0.0065, z0), V(x, y + 0.0065, zf), 0.0065]));
    r.push([V(ea, y + 0.0095, z0), V(eb, y + 0.0095, z0), 0.005]);
    g.add(rods(r, M.metal));
    const lip = new THREE.Mesh(new RoundedBoxGeometry(x1 - x0 - 0.002, 0.042, 0.008, 2, 0.0028), M.metal); lip.position.set(mid, y - 0.01, zf + 0.004); lip.castShadow = lip.receiveShadow = true; g.add(lip);
    const rim = new THREE.Mesh(new RoundedBoxGeometry(x1 - x0 - 0.002, 0.009, 0.02, 2, 0.0035), M.metal); rim.position.set(mid, y + 0.0075, zf - 0.006); rim.castShadow = true; g.add(rim);
  } else if (item.t === 'metal') {
    g.add(box(x1 - x0, 0.0045, dep, mid, y + 0.00225, z0 + dep / 2, M.metal));
    const f = new THREE.Mesh(new RoundedBoxGeometry(x1 - x0, 0.038, 0.007, 2, 0.0025), M.metal); f.position.set(mid, y - 0.015, zf); f.castShadow = true; g.add(f);
    g.add(box(x1 - x0, 0.024, 0.006, mid, y + 0.012, z0, M.metal));
  } else if (item.t === 'ldsp') {
    g.add(box(x1 - x0 + 0.01, 0.018, dep, mid, y + 0.009, z0 + dep / 2, M.ldsp));
  } else if (isBasket(item.t) && !perfOf(item)) {
    const h = (item.h || 85) * MM, r = [], bot = y - h, aa = a + 0.012, bb = b - 0.012, LL = bb - aa, SP = fineOf(item) ? 0.011 : 0.025, n = Math.max(2, Math.round(LL / SP)), wz0 = z0 + 0.01, wzf = zf - 0.01, wr = fineOf(item) ? 0.0024 : 0.003;
    for (let i = 0; i <= n; i++) { const x = aa + LL * i / n; r.push([V(x, bot, wz0), V(x, bot, wzf), wr]); r.push([V(x, bot, wzf), V(x, y, wzf), wr]); r.push([V(x, bot, wz0), V(x, y, wz0), wr * 0.9]); }
    const m = Math.max(2, Math.round((wzf - wz0) / SP));
    for (let i = 0; i <= m; i++) { const z = wz0 + (wzf - wz0) * i / m; r.push([V(aa, bot, z), V(aa, y, z), wr * 0.9]); r.push([V(bb, bot, z), V(bb, y, z), wr * 0.9]); }
    const levels = [y, bot]; for (let yy = bot + (fineOf(item) ? 0.012 : 0.03); yy < y - 0.008; yy += fineOf(item) ? 0.012 : 0.03) levels.push(yy);
    levels.forEach((yy, k) => { const rr = k < 2 ? 0.0058 : wr * 0.9; r.push([V(aa, yy, wz0), V(bb, yy, wz0), rr]); r.push([V(aa, yy, wzf), V(bb, yy, wzf), rr]); r.push([V(aa, yy, wz0), V(aa, yy, wzf), rr]); r.push([V(bb, yy, wz0), V(bb, yy, wzf), rr]); });
    g.add(rods(r, M.metal));
    [[x0 + 0.003, aa], [x1 - 0.003, bb]].forEach(([xa, xb]) => g.add(box(Math.abs(xb - xa) + 0.006, 0.02, dep, (xa + xb) / 2, y - 0.01, z0 + dep / 2, M.metal)));
    if (item.t === 'pull') g.add(rods([[V(aa + LL * 0.3, y - 0.014, wzf + 0.03), V(bb - LL * 0.3, y - 0.014, wzf + 0.03), 0.0075], [V(aa + LL * 0.3, y - 0.014, wzf), V(aa + LL * 0.3, y - 0.014, wzf + 0.03), 0.0045], [V(bb - LL * 0.3, y - 0.014, wzf), V(bb - LL * 0.3, y - 0.014, wzf + 0.03), 0.0045]], M.chrome));
  } else if (isBasket(item.t)) {
    const h = (item.h || 85) * MM, bot = y - h, aa = a + 0.014, bb = b - 0.014, LL = bb - aa;
    [[x0 + 0.003, aa], [x1 - 0.003, bb]].forEach(([xa, xb]) => g.add(box(Math.abs(xb - xa) + 0.006, 0.02, dep, (xa + xb) / 2, y - 0.01, z0 + dep / 2, M.metal)));
    const bw = LL, bd = dep - 0.03, cz = z0 + dep / 2, fh = h - 0.014;
    const face = (w, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, fh), basketMat(w / 0.05, fh / 0.06)); m.position.set(x, bot + fh / 2, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; g.add(m); };
    face(bw, (aa + bb) / 2, cz + bd / 2, 0); face(bw, (aa + bb) / 2, cz - bd / 2, Math.PI);
    face(bd, aa, cz, -Math.PI / 2); face(bd, bb, cz, Math.PI / 2);
    g.add(box(bw, 0.004, bd, (aa + bb) / 2, bot + 0.002, cz, M.plastic));
    g.add(box(bw + 0.018, 0.016, bd + 0.018, (aa + bb) / 2, y - 0.008, cz, M.plastic));
    if (item.t === 'pull') g.add(box(LL * 0.3, 0.016, 0.016, (aa + bb) / 2, y - 0.04, cz + bd / 2 + 0.01, M.plastic));
  } else if (item.t === 'trouser') {
    // Titan-GS pull-out trouser rack 463 / 603 x 440 x 45: flat frame on roller runners under the brackets,
    // the bars run from the wall to the front (trousers hang over them), rubber rings stop slipping
    const h = 0.045, aa = a + 0.006, bb = b - 0.006, n = Math.max(4, Math.round(L / 0.072)), yb = y - h + 0.009;
    [[x0 + 0.003, aa], [x1 - 0.003, bb]].forEach(([xa, xb]) => g.add(box(Math.abs(xb - xa) + 0.006, 0.022, dep, (xa + xb) / 2, y - 0.011, z0 + dep / 2, M.metal)));
    [aa, bb].forEach(x => g.add(box(0.012, 0.024, dep - 0.02, x, y - 0.02, z0 + dep / 2, M.metal)));
    g.add(box(bb - aa + 0.012, 0.03, 0.012, (aa + bb) / 2, y - 0.022, z0 + 0.012, M.metal));
    const fr = new THREE.Mesh(new RoundedBoxGeometry(bb - aa + 0.024, h - 0.004, 0.016, 2, 0.005), M.metal); fr.position.set((aa + bb) / 2, y - h / 2, zf - 0.008); fr.castShadow = fr.receiveShadow = true; g.add(fr);
    const r = [], rings = [];
    for (let k = 0; k < n; k++) { const x = aa + 0.03 + (bb - aa - 0.06) * k / (n - 1); r.push([V(x, yb, z0 + 0.018), V(x, yb, zf - 0.016), 0.0055]); for (let zz = z0 + 0.05; zz < zf - 0.05; zz += 0.05) rings.push([V(x, yb, zz), V(x, yb, zz + 0.008), 0.0078]); }
    g.add(rods(r, M.metal)); g.add(rods(rings, M.rubber));
  } else if (item.t === 'shoe') {
    const drop = 0.11, r = [], n = Math.max(2, Math.round(L / 0.03));
    const P = t => V(0, y + 0.004 - drop * t, z0 + dep * t);
    for (let i = 0; i <= n; i++) { const x = a + L * i / n, p0 = P(0), p1 = P(1); r.push([V(x, p0.y, p0.z), V(x, p1.y, p1.z), 0.0034]); r.push([V(x, p1.y, p1.z), V(x, p1.y + 0.04, p1.z + 0.003), 0.0034]); }
    [0, 0.33, 0.66, 1].forEach(t => { const p = P(t); r.push([V(x0, p.y, p.z), V(x1, p.y, p.z), 0.005]); });
    const p1 = P(1); r.push([V(a, p1.y + 0.04, p1.z + 0.003), V(b, p1.y + 0.04, p1.z + 0.003), 0.0055]);
    g.add(rods(r, M.metal));
  } else if (item.t === 'rail') {
    // Titan-GS rod holder: sheet-steel hook 101 x 31 x 30 mm hung on the shelf bracket (before the shelf), seat for the d25 rod
    const sh = sec && sec.items.filter(o => o !== item && o.t !== 'rail' && o.t !== 'shoe' && o.y > item.y && o.y - item.y <= 25).sort((p, q) => p.y - q.y)[0];
    const by = sh ? sh.y * 10 * MM : y + 0.09, zr = Math.min(ZI + (sh ? (REAL_DEPTH[sh.t][sh.d] || 400) * MM : 0.4) - 0.07, 0.36);
    if (!sh) { bracket(g, x0, by, 0.355); bracket(g, x1, by, 0.355); }
    const ca = x0 + 0.004, cb = x1 - 0.004;
    [x0, x1].forEach(x => rodHolder(g, x, by, y, zr));
    const rr = rods([[V(ca, y, zr), V(cb, y, zr), 0.017]], M.rod); rr.geometry = ROD_G; g.add(rr);
  }
}

function effGap(wi) { return Math.max(0, Math.min(300, S.walls[wi].gap || 0)); }
function effGapR() { return Math.max(0, Math.min(300, S.walls[0].gapR || 0)); }
const maxDep = wis => { let d = 0; wis.forEach(k => S.walls[k] && !S.walls[k].off && S.walls[k].sections.forEach(s => s.items.forEach(o => d = Math.max(d, (REAL_DEPTH[o.t][o.d] || 400) / 10)))); return d; };
// shift at which the shelves of the two walls in that corner stop overlapping
function optGap(key) { const act = wallsActive(); const other = key === '0' ? (S.layout === 'Lr' ? [2] : [1]) : key === '0r' ? [2] : [0]; return Math.ceil(maxDep(other.filter(k => act.includes(k))) + 5.5); }
function minGap() { return Math.ceil(maxDep([0]) + 5.5); }
function placeWall(g, wi) {
  const F = frame();
  if (wi === 0) { g.position.x = F.x0; return; }
  const gap = effGap(wi) / 100;
  if (wi === 1) { g.rotation.y = -Math.PI / 2; g.scale.z = -1; g.position.set(F.xL, 0, gap); }
  if (wi === 2) { g.rotation.y = Math.PI / 2; g.scale.x = -1; g.scale.z = -1; g.position.set(F.xR, 0, gap); }
}

let ROOMB = null;
// window and door openings: which wall, position along it (m), size
function openingsList(F, CH) {
  const R = S.room, out = [], act = wallsActive(), ext = wi => act.includes(wi) ? effGap(wi) / 100 + wallWidth(wi) * MM : 0;
  if (R.win) { const w = 1.3, b = 0.82, h = Math.min(1.5, CH - b - 0.28), off = (R.winX || 0) / 100;
    if (S.layout === 'U') out.push({ wall: 'R', z: ext(2) + 0.45 + w / 2 + off, w, h, b, kind: 'win' });
    else if (S.layout === 'Lr') out.push({ wall: 'B', x: F.x0 - 0.45 - w / 2 - off, w, h, b, kind: 'win' });
    else out.push({ wall: 'B', x: F.x0 + F.backW + 0.45 + w / 2 + off, w, h, b, kind: 'win' }); }
  if (R.door) { const w = 0.9, h = Math.min(2.1, CH - 0.2), b = 0;
    if (S.layout === 'straight') out.push({ wall: 'B', x: F.x0 - 0.55 - w / 2, w, h, b, kind: 'door' });
    else if (S.layout === 'Lr') out.push({ wall: 'R', z: ext(2) + 0.5 + w / 2, w, h, b, kind: 'door' });
    else out.push({ wall: 'L', z: ext(1) + 0.5 + w / 2, w, h, b, kind: 'door' }); }
  return out;
}
let SKYT = null;
function skyTex() { if (!SKYT) { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#e4eef8'); gr.addColorStop(0.55, '#ffffff'); gr.addColorStop(0.7, '#f3f5ef'); gr.addColorStop(1, '#dfe4d8'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); SKYT = new THREE.CanvasTexture(c); SKYT.colorSpace = THREE.SRGBColorSpace; } return SKYT; }
// opening built in the wall plane's local frame (z = 0 is the wall surface, +z into the room)
function buildOpening(grp, o, H) {
  const g = new THREE.Group(); grp.add(g);
  const x0 = o.c - o.w / 2, x1 = o.c + o.w / 2, yb = o.b - H / 2, yt = yb + o.h, D = 0.24, cx = o.c, cy = (yb + yt) / 2, door = o.kind === 'door';
  const rev = new THREE.MeshStandardMaterial({ color: new THREE.Color(S.wall), roughness: 0.95, envMapIntensity: 0.5 });
  const trim = new THREE.MeshPhysicalMaterial({ color: 0xf8f7f3, roughness: 0.4, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  const add = (w, h, d, x, y, z, m, cast = true, r = 0) => { const b = r ? new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), m) : box(w, h, d, 0, 0, 0, m); if (r) { b.receiveShadow = true; } b.position.set(x, y, z); b.castShadow = cast; g.add(b); return b; };
  add(0.02, o.h + 0.02, D, x0 - 0.01, cy, -D / 2, rev, false); add(0.02, o.h + 0.02, D, x1 + 0.01, cy, -D / 2, rev, false); add(o.w + 0.04, 0.02, D, cx, yt + 0.01, -D / 2, rev, false);
  const cw = 0.075, ct = 0.018;
  add(cw, o.h + cw, ct, x0 - cw / 2, yb + (o.h + cw) / 2, ct / 2, trim, true, 0.004); add(cw, o.h + cw, ct, x1 + cw / 2, yb + (o.h + cw) / 2, ct / 2, trim, true, 0.004); add(o.w + 2 * cw, cw, ct, cx, yt + cw / 2, ct / 2, trim, true, 0.004);
  if (!door) {
    add(o.w + 0.04, 0.02, D, cx, yb - 0.01, -D / 2, rev, false);
    add(o.w + 2 * cw + 0.05, 0.028, 0.31, cx, yb + 0.014, -0.085, trim, true, 0.006); // sill
    add(o.w + 2 * cw, 0.06, ct, cx, yb - 0.03, ct / 2, trim, true, 0.004); // apron
    const fz = -0.16, fw = 0.06, fd = 0.07, fm = new THREE.MeshPhysicalMaterial({ color: 0xfbfbf9, roughness: 0.35, clearcoat: 0.4 });
    add(fw, o.h, fd, x0 + fw / 2, cy, fz, fm, false, 0.006); add(fw, o.h, fd, x1 - fw / 2, cy, fz, fm, false, 0.006); add(o.w, fw, fd, cx, yt - fw / 2, fz, fm, false, 0.006); add(o.w, fw, fd, cx, yb + 0.028 + fw / 2, fz, fm, false, 0.006);
    add(0.05, o.h - 0.1, fd * 0.85, cx, cy + 0.01, fz, fm, false, 0.005); add(o.w - 0.1, 0.045, fd * 0.85, cx, yb + o.h * 0.7, fz, fm, false, 0.005);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(o.w - 0.06, o.h - 0.06), new THREE.MeshPhysicalMaterial({ color: 0xeef5fb, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 2.2, clearcoat: 1, depthWrite: false })); gl.position.set(cx, cy, fz - 0.005); g.add(gl);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(o.w + 0.8, o.h + 0.8), new THREE.MeshBasicMaterial({ map: skyTex(), toneMapped: false })); sky.position.set(cx, cy, -0.7); g.add(sky);
    // soft daylight glow spilling onto the reveal and sill
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(o.w + 0.5, o.h + 0.5), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xfff6e8, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); glow.position.set(cx, cy, 0.002); g.add(glow);
  } else {
    const leaf = add(o.w - 0.012, o.h - 0.006, 0.04, cx, yb + (o.h - 0.006) / 2, -0.06, new THREE.MeshPhysicalMaterial({ color: 0xf4f2ed, roughness: 0.38, clearcoat: 0.3 }), true, 0.004);
    leaf.castShadow = false;
    const jm = trim; add(0.03, o.h, 0.06, x0 + 0.015, cy, -0.06, jm, false); add(0.03, o.h, 0.06, x1 - 0.015, cy, -0.06, jm, false); add(o.w, 0.03, 0.06, cx, yt - 0.015, -0.06, jm, false);
    const hm = M.chrome, hx = x1 - 0.08, hy = yb + 1.0;
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.012, 32), hm); rose.rotation.x = Math.PI / 2; rose.position.set(hx, hy, -0.034); g.add(rose);
    const lev = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.018, 0.018, 2, 0.007), hm); lev.position.set(hx - 0.055, hy, -0.016); g.add(lev);
  }
}
let GLOWT = null;
function glowTex() { if (!GLOWT) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.35)'); gr.addColorStop(0.75, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); GLOWT = new THREE.CanvasTexture(c); } return GLOWT; }
let JOINTS = {};
function jointTex(k) { if (!JOINTS[k]) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.clearRect(0, 0, 256, 256); g.fillStyle = 'rgba(70,64,58,0.55)'; g.fillRect(0, 0, 256, 2); g.fillRect(0, 0, 2, 256); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 2, 256, 1); g.fillRect(2, 0, 1, 256); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; JOINTS[k] = t; } return JOINTS[k]; }
function buildRoom() {
  room.clear();
  if (!catcher) { catcher = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.25 })); catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; model.add(catcher); }
  const F = frame(), backW = F.backW, ST = !!S.studio && !photo, CH = (S.room.ceilH || 275) / 100, Mg = 0.8 + (S.room.extra ?? 250) / 100;
  const cl = F.xL != null, cr = F.xR != null, left = cl ? F.xL : F.x0 - Mg, right = cr ? F.xR : F.x0 + backW + Mg, cx = (left + right) / 2;
  ROOMB = { l: cl && !photo ? left : -1e9, r: cr && !photo ? right : 1e9, ch: S.room.ceiling && !ST ? CH : 1e9 };
  const act = wallsActive(), sideLen = Math.max(5, ...[1, 2].filter(w => act.includes(w)).map(w => effGap(w) / 100 + wallWidth(w) * MM + Mg));
  const floorM = ST ? new THREE.ShadowMaterial({ opacity: 0.16 }) : floorMat();
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorM); fl.rotation.x = -Math.PI / 2; fl.position.set(cx, 0, 15); fl.receiveShadow = true; room.add(fl);
  const FJ = FLOORS[S.floor] && FLOORS[S.floor][3];
  if (!ST && FJ) { const jt = jointTex(S.floor).clone(); jt.needsUpdate = true; jt.repeat.set(40 / FJ[0], 40 / FJ[1]); const j = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ map: jt, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); j.rotation.x = -Math.PI / 2; j.position.set(cx + 0.0, 0.0005, 15); room.add(j); }
  const ops = ST ? [] : openingsList(F, CH), WH = CH + 0.03;
  const wallPlane = (w, x, z, ry, parent, holes) => {
    const sh = new THREE.Shape(); sh.moveTo(-w / 2, -WH / 2); sh.lineTo(w / 2, -WH / 2); sh.lineTo(w / 2, WH / 2); sh.lineTo(-w / 2, WH / 2); sh.lineTo(-w / 2, -WH / 2);
    holes.forEach(o => { const x0 = o.c - o.w / 2, y0 = Math.max(o.b, 0.002) - WH / 2, p = new THREE.Path(); p.moveTo(x0, y0); p.lineTo(x0 + o.w, y0); p.lineTo(x0 + o.w, o.b + o.h - WH / 2); p.lineTo(x0, o.b + o.h - WH / 2); p.lineTo(x0, y0); sh.holes.push(p); });
    const geo = new THREE.ShapeGeometry(sh), grp = new THREE.Group(); grp.position.set(x, WH / 2, z); grp.rotation.y = ry; parent.add(grp);
    if (!ST) grp.add(new THREE.Mesh(geo, wallMat()));
    const q = new THREE.Mesh(geo, wallShadowMat()); q.receiveShadow = true; grp.add(q);
    holes.forEach(o => buildOpening(grp, o, WH)); return grp;
  };
  const bo = ops.filter(o => o.wall === 'B').map(o => ({ ...o, c: o.x - cx }));
  wallPlane(right - left, cx, 0, 0, room, bo);
  const skM = new THREE.MeshStandardMaterial({ color: S.room.skirtColor || '#ffffff', roughness: 0.6 });
  // skirting runs along u (local x of a wall frame), cut at doors
  const skirt = (parent, u0, u1, cuts, place) => { let segs = [[u0, u1]]; cuts.forEach(([a, b]) => { segs = segs.flatMap(([s, e]) => b <= s || a >= e ? [[s, e]] : [[s, a], [b, e]].filter(([p, q]) => q - p > 0.01)); });
    segs.forEach(([s, e]) => { const g = new THREE.Group(); place(g); [[0.016, 0.08, 0.04, 0.008], [0.022, 0.012, 0.074, 0.011]].forEach(([d, h, y, z]) => { const m = box(e - s, h, d, (s + e) / 2, y, z, skM); m.castShadow = false; g.add(m); }); parent.add(g); }); };
  const doorCuts = (list, key) => list.filter(o => o.kind === 'door').map(o => [o[key] - o.w / 2 - 0.08, o[key] + o.w / 2 + 0.08]);
  const cmM = new THREE.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 0.7 });
  const cornice = (len, place, parent) => { const g = new THREE.Group(); place(g); [[0.012, 0.09, 0.006], [0.03, 0.05, 0.02], [0.05, 0.022, 0.04]].forEach(([d, hh, zz]) => { const m = box(len, hh, d, 0, CH - hh / 2, zz - d / 2 + 0.006, cmM); m.castShadow = false; g.add(m); }); parent.add(g); };
  const dA = ((S.room.angle || 90) - 90) * Math.PI / 180, k = 0.16;
  const side = L => { const x = L ? left : right, pv = new THREE.Group(); pv.position.set(x, 0, 0); pv.rotation.y = L ? -dA : dA; room.add(pv);
    // side frame: u runs from the corner into the room along +z
    const so = ops.filter(o => o.wall === (L ? 'L' : 'R')).map(o => ({ ...o, c: L ? sideLen / 2 - o.z : o.z - sideLen / 2 }));
    wallPlane(sideLen, 0, sideLen / 2, L ? Math.PI / 2 : -Math.PI / 2, pv, so);
    if (ST) return;
    const fr = new THREE.Group(); fr.rotation.y = L ? Math.PI / 2 : -Math.PI / 2; if (L) fr.scale.x = -1; pv.add(fr); // local x = u (z in room), local z into the room
    if (S.room.skirting !== false) skirt(fr, 0, sideLen, doorCuts(ops.filter(o => o.wall === (L ? 'L' : 'R')), 'z'), () => {});
    if (S.room.ceiling && S.room.cornice) cornice(sideLen, g => g.position.x = sideLen / 2, fr);
    aoStrip(fr, CH, 0.5, k, m => { m.position.set(0.25, CH / 2, 0.002); });
    aoStrip(fr, sideLen, 0.35, k, m => { m.rotation.z = Math.PI / 2; m.position.set(sideLen / 2, 0.175, 0.002); });
    aoStrip(fr, sideLen, 0.45, k * 0.9, m => { m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI / 2; m.scale.x = -1; m.position.set(sideLen / 2, 0.002, 0.225); });
    if (S.room.ceiling) aoStrip(fr, sideLen, 0.35, k * 0.7, m => { m.rotation.z = -Math.PI / 2; m.position.set(sideLen / 2, CH - 0.175, 0.002); });
    if (S.room.ceiling) aoStrip(fr, sideLen, 0.4, k * 0.55, m => { m.rotation.x = Math.PI / 2; m.rotation.z = Math.PI / 2; m.scale.x = -1; m.position.set(sideLen / 2, CH - 0.002, 0.2); });
    // corner shade on the back wall next to this side wall
    aoStrip(room, CH, 0.5, k, m => { m.position.set(L ? x + 0.25 : x - 0.25, CH / 2, 0.002); if (!L) m.scale.x = -1; });
  };
  if (cl) side(true); if (cr) side(false);
  if (!ST) { const W = right - left;
    aoStrip(room, W, 0.35, k, m => { m.position.set(cx, 0.175, 0.002); m.rotation.z = Math.PI / 2; });
    aoStrip(room, W, 0.45, k * 0.9, m => { m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI / 2; m.position.set(cx, 0.002, 0.225); m.scale.x = -1; });
    if (S.room.ceiling) { aoStrip(room, W, 0.3, k * 0.7, m => { m.rotation.z = -Math.PI / 2; m.position.set(cx, CH - 0.15, 0.002); }); aoStrip(room, W, 0.4, k * 0.55, m => { m.rotation.x = Math.PI / 2; m.rotation.z = Math.PI / 2; m.scale.x = -1; m.position.set(cx, CH - 0.002, 0.2); }); } }
  if (ST) return;
  if (S.room.skirting !== false) skirt(room, left, right, doorCuts(bo.map(o => ({ ...o, x: o.c + cx })), 'x'), () => {});
  // ceiling: one solid plane over the whole room, seen only from below
  if (S.room.ceiling) { const ce = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: 0xfbfbf9, toneMapped: false })); ce.rotation.x = Math.PI / 2; ce.position.set(cx, CH, 25); room.add(ce);
    if (S.room.cornice) cornice(right - left, g => g.position.x = cx, room); }
  if (S.room.lamps) { const n = Math.max(2, Math.round((right - left) / 1.2)); for (let i = 0; i < n; i++) { const x = left + (right - left) * (i + 0.5) / n; const d = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.008, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2dc, emissiveIntensity: 1.5 })); d.position.set(x, CH - 0.004, 0.9); room.add(d); const pl = new THREE.PointLight(0xffe9cc, 1.0, 0, 2); pl.position.set(x, CH - 0.12, 0.9); room.add(pl); } }
}

// ---------- decor: rug, plants, window light ----------
const decor = new THREE.Group(); scene.add(decor);
const RUGT = {};
function rugTex(fluffy) {
  const k = fluffy ? 'f' : 'p'; if (RUGT[k]) return RUGT[k];
  let sd = fluffy ? 21 : 33; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  const n = document.createElement('canvas'); n.width = n.height = 512; const q = n.getContext('2d'); q.fillStyle = 'rgb(128,128,255)'; q.fillRect(0, 0, 512, 512);
  if (fluffy) { g.fillStyle = '#b3a285'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 70000; i++) { const x = rnd() * 512, y = rnd() * 512, a = rnd() * 6.3, L = 3 + rnd() * 7, l = 170 + rnd() * 55; g.strokeStyle = `rgba(${l},${l - 8},${l - 22},0.55)`; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); q.strokeStyle = `rgb(${128 + Math.cos(a) * 70},${128 + Math.sin(a) * 70},230)`; q.lineWidth = 1.5; q.beginPath(); q.moveTo(x, y); q.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); q.stroke(); } }
  else { g.fillStyle = '#b9ab94'; g.fillRect(0, 0, 512, 512); for (let y = 0; y < 512; y += 6) for (let x = 0; x < 512; x += 6) { const l = 140 + rnd() * 45, o = ((x + y) / 6) % 2; g.fillStyle = `rgba(${l + 30},${l + 20},${l},0.95)`; if (o) g.fillRect(x, y, 6, 4); else g.fillRect(x, y, 4, 6); q.fillStyle = o ? 'rgb(128,150,255)' : 'rgb(150,128,255)'; if (o) q.fillRect(x, y, 6, 2); else q.fillRect(x, y, 2, 6); }
    g.fillStyle = 'rgba(80,72,62,0.55)'; for (let k2 = 0; k2 < 3; k2++) { g.fillRect(0, 60 + k2 * 10, 512, 4); g.fillRect(0, 448 - k2 * 10, 512, 4); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  const tn = new THREE.CanvasTexture(n); tn.wrapS = tn.wrapT = THREE.RepeatWrapping;
  RUGT[k] = [t, tn]; return RUGT[k];
}
function rugSpot() { const F = frame(), act = wallsActive(); if (S.layout === 'L') return [F.xL + 1.05, Math.max(1.0, Math.min(1.4, (act.includes(1) ? effGap(1) / 100 + wallWidth(1) * MM : 1) * 0.5 + 0.55))]; if (S.layout === 'Lr') return [F.xR - 1.05, 1.1]; return [F.x0 + F.backW / 2, S.layout === 'U' ? 1.2 : 1.05]; }
function buildRug() {
  const R = S.rug; if (!R || S.floor === 'carpet') return;
  const round = R.shape === 'round', fluffy = R.pile === 'fluffy', th = fluffy ? 0.024 : 0.006, w = round ? 1.5 : 1.8, d = round ? 1.5 : 1.2, [t, tn] = rugTex(fluffy);
  const mt = t.clone(), mn = tn.clone(); mt.needsUpdate = mn.needsUpdate = true; mt.repeat.set(fluffy ? 2.5 : 1, fluffy ? 2.5 : (round ? 1 : 1)); mn.repeat.copy(mt.repeat);
  const mat = new THREE.MeshStandardMaterial({ color: 0xd8cfc0, map: mt, normalMap: mn, normalScale: new THREE.Vector2(fluffy ? 0.9 : 0.5, fluffy ? 0.9 : 0.5), roughness: 1, envMapIntensity: 0.25 });
  const geo = round ? new THREE.CylinderGeometry(w / 2, w / 2 - (fluffy ? 0.012 : 0.002), th, 96) : new RoundedBoxGeometry(w, th, d, 3, fluffy ? 0.011 : 0.0028);
  if (round) { const uv = geo.attributes.uv, p = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getZ(i) / w + 0.5); }
  else { const uv = geo.attributes.uv, p = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getZ(i) / d + 0.5); }
  const m = new THREE.Mesh(geo, mat), [x, z] = rugSpot(); m.position.set(x, th / 2 + 0.001, z); m.receiveShadow = true; m.castShadow = false; decor.add(m);
}
// ---- plants: procedural potted plants, draggable on the floor ----
const PLANTS = { fig: 'Фикус лировидный', monstera: 'Монстера', olive: 'Оливковое дерево' };
let PSEED = 1; const prnd = () => (PSEED = (PSEED * 16807) % 2147483647) / 2147483647;
function potMesh(rt, rb, h, col, gloss) {
  const pts = [V(0, 0, 0), V(rb - 0.01, 0, 0), V(rb, 0.012, 0), V(rt, h - 0.012, 0), V(rt + 0.006, h, 0), V(rt - 0.012, h, 0), V(rt - 0.016, h - 0.03, 0), V(0, h - 0.03, 0)].map(p => new THREE.Vector2(p.x, p.y));
  const g = new THREE.Group(), pot = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), new THREE.MeshPhysicalMaterial({ color: col, roughness: gloss ? 0.32 : 0.75, clearcoat: gloss ? 0.7 : 0.05, clearcoatRoughness: 0.2, sheen: gloss ? 0 : 0.3 }));
  pot.castShadow = pot.receiveShadow = true; g.add(pot);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(rt - 0.016, 40), new THREE.MeshStandardMaterial({ color: 0x3b2c22, roughness: 1 })); soil.rotation.x = -Math.PI / 2; soil.position.y = h - 0.035; g.add(soil);
  return g;
}
// leaf blade along +z from the origin, normal ~ +y; width profile f(u), droop and cup
function bladeGeo(len, wid, f, droop, cup, segU = 10, segV = 6) {
  const pos = [], idx = [], uv = [];
  for (let i = 0; i <= segU; i++) { const u = i / segU, ww = wid * f(u); for (let j = 0; j <= segV; j++) { const v = j / segV * 2 - 1; pos.push(v * ww / 2, -droop * u * u * len + cup * v * v * ww, u * len); uv.push(j / segV, u); } }
  for (let i = 0; i < segU; i++) for (let j = 0; j < segV; j++) { const a = i * (segV + 1) + j, b = a + segV + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function monsteraGeo(sz) {
  const sh = new THREE.Shape(), N = 90, slits = [0.5, 0.85, 1.2, 1.55, 1.95, 2.35], pts = [];
  for (let i = 0; i <= N; i++) { const t = i / N * Math.PI * 2, x = 16 * Math.pow(Math.sin(t), 3), y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); pts.push([x, y + 5, t]); }
  const out = []; pts.forEach(([x, y, t], i) => { const tt = t > Math.PI ? 2 * Math.PI - t : t; out.push([x, y]); slits.forEach(s => { if (Math.abs(tt - s) < Math.PI / N) { const ix = x * 0.38, iy = y * 0.85 + 2; out.push([ix, iy], [x * 1.0 + (t > Math.PI ? 0.6 : -0.6), y + 0.6]); } }); });
  out.forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y));
  const g = new THREE.ShapeGeometry(sh, 2), p = g.attributes.position, k = sz / 22;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) * k, y = p.getY(i) * k; p.setXYZ(i, x, -0.35 * y * y / sz + 0.12 * x * x / sz, y); }
  g.computeVertexNormals(); return g;
}
function leafMat(c, gloss) { return new THREE.MeshPhysicalMaterial({ color: c, roughness: gloss, side: THREE.DoubleSide, sheen: 0.4, sheenColor: new THREE.Color(0xc9e6b0), clearcoat: gloss < 0.4 ? 0.4 : 0, clearcoatRoughness: 0.3 }); }
function tube(pts, r, mat, rr = r) { const cv = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(cv, 24, r, 10, false); if (rr !== r) { const p = g.attributes.position; /* taper */ for (let i = 0; i < p.count; i++) { const seg = Math.floor(i / 11) / 24, c0 = cv.getPointAt(Math.min(1, seg)), v = V(p.getX(i), p.getY(i), p.getZ(i)).sub(c0), k = (r + (rr - r) * seg) / r; p.setXYZ(i, c0.x + v.x * k, c0.y + v.y * k, c0.z + v.z * k); } g.computeVertexNormals(); } const m = new THREE.Mesh(g, mat); m.castShadow = true; return m; }
function plantModel(k) {
  PSEED = { fig: 7, monstera: 13, olive: 29 }[k]; const g = new THREE.Group();
  if (k === 'fig') {
    const ph = 0.34; g.add(potMesh(0.17, 0.13, ph, 0xf1efea, false));
    const bark = new THREE.MeshStandardMaterial({ color: 0x6e5a48, roughness: 0.9 }), trunkPts = [V(0, ph - 0.03, 0), V(0.01, 0.7, 0.005), V(-0.01, 1.05, 0.01), V(0.02, 1.42, 0)];
    g.add(tube(trunkPts, 0.02, bark, 0.011)); const cv = new THREE.CatmullRomCurve3(trunkPts);
    const geo = bladeGeo(0.27, 0.19, u => Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.02)), 0.6) * (0.62 + 0.38 * u) * (u > 0.92 ? (1 - u) / 0.08 * 0.6 + 0.4 : 1), 0.25, 0.12);
    const mats = [leafMat(0x2d5a2a, 0.35), leafMat(0x37692f, 0.35), leafMat(0x264f25, 0.38)];
    for (let i = 0; i < 38; i++) { const t = 0.35 + 0.65 * (i / 37), p = cv.getPointAt(t), a = i * 2.4 + prnd() * 0.4, up = 0.25 + prnd() * 0.5 + (t > 0.9 ? 0.6 : 0), s = 0.75 + prnd() * 0.45 * (1.1 - t * 0.3);
      const l = new THREE.Mesh(geo, mats[i % 3]); l.position.copy(p).add(V(Math.cos(a) * 0.02, 0, Math.sin(a) * 0.02)); l.lookAt(p.clone().add(V(Math.cos(a), up, Math.sin(a)))); l.rotateZ((prnd() - 0.5) * 0.8); l.scale.setScalar(s); l.castShadow = true; g.add(l); }
  } else if (k === 'monstera') {
    const ph = 0.3; g.add(potMesh(0.21, 0.16, ph, 0xc58a6a, false));
    const stem = new THREE.MeshStandardMaterial({ color: 0x5a7d3c, roughness: 0.6 }), lm = [leafMat(0x1f4a24, 0.34), leafMat(0x285a2b, 0.34)];
    for (let i = 0; i < 10; i++) { const a = i * 2.4 + prnd() * 0.5, r = 0.18 + prnd() * 0.3, hh = ph + 0.25 + prnd() * 0.5, sz = 0.3 + prnd() * 0.16, base = V(Math.cos(a) * 0.04, ph - 0.03, Math.sin(a) * 0.04), end = V(Math.cos(a) * r, hh, Math.sin(a) * r);
      g.add(tube([base, V(Math.cos(a) * r * 0.3, (ph + hh) / 2 + 0.1, Math.sin(a) * r * 0.3), end], 0.007, stem, 0.005));
      const l = new THREE.Mesh(monsteraGeo(sz), lm[i % 2]); l.position.copy(end); l.lookAt(end.clone().add(V(Math.cos(a), -0.15 + prnd() * 0.3, Math.sin(a)))); l.rotateZ((prnd() - 0.5) * 0.5); l.castShadow = true; g.add(l); }
  } else {
    const ph = 0.36; g.add(potMesh(0.16, 0.12, ph, 0x3b3a38, true));
    const bark = new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: 0.95 }), tp = [V(0, ph - 0.03, 0), V(0.03, 0.62, 0.01), V(-0.02, 0.9, -0.01), V(0.01, 1.08, 0.02)];
    g.add(tube(tp, 0.024, bark, 0.014));
    const tips = [], top = tp[3];
    for (let b = 0; b < 7; b++) { const a = b * 0.9 + prnd() * 0.5, e = V(Math.cos(a) * (0.18 + prnd() * 0.12), top.y + 0.12 + prnd() * 0.3, Math.sin(a) * (0.18 + prnd() * 0.12)); g.add(tube([top.clone(), top.clone().lerp(e, 0.5).add(V(0, 0.05, 0)), e], 0.008, bark, 0.004)); tips.push(e); }
    const geo = bladeGeo(0.07, 0.014, u => Math.sin(Math.PI * Math.pow(u, 0.8)), 0.1, 0.05, 4, 2), lm = leafMat(0x7a8c62, 0.55);
    const n = 420, im = new THREE.InstancedMesh(geo, lm, n), o = new THREE.Object3D(), C = V(0, top.y + 0.28, 0);
    for (let i = 0; i < n; i++) { const tpt = tips[i % tips.length], p = top.clone().lerp(tpt, 0.25 + prnd() * 0.85).add(V((prnd() - 0.5) * 0.22, (prnd() - 0.4) * 0.2, (prnd() - 0.5) * 0.22)); o.position.copy(p); const d = p.clone().sub(C).normalize().add(V((prnd() - 0.5), (prnd() - 0.3), (prnd() - 0.5))); o.lookAt(p.clone().add(d)); o.scale.setScalar(0.8 + prnd() * 0.5); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, new THREE.Color().setHSL(0.24 + prnd() * 0.04, 0.18 + prnd() * 0.12, 0.38 + prnd() * 0.16)); }
    im.castShadow = true; g.add(im);
  }
  return g;
}
const PLC = {};
function plantSpot(i) { const F = frame(), cl = F.xL != null, cr = F.xR != null; const spots = []; if (S.layout === 'Lr' || S.layout === 'straight') spots.push([F.x0 - 0.45, 0.4]); if (!cr) spots.push([F.x0 + F.backW + 0.45, 0.4]); else spots.push([F.xR - 0.4, 2.2]); if (cl) spots.push([F.xL + 0.4, 2.4]); spots.push([F.x0 + F.backW / 2 + 0.9, 1.6]); return spots[i % spots.length]; }
function buildPlants() {
  (S.plants || []).forEach((p, i) => { if (!PLC[p.k]) PLC[p.k] = plantModel(p.k); const g = PLC[p.k].clone(); g.position.set(p.x, 0, p.z); g.rotation.y = p.r || 0; g.scale.setScalar(p.s || 1); g.userData.plant = i; g.traverse(o => { o.userData.plant = i; }); decor.add(g); });
}
// window light: soft window-shaped patch with mullions on the wall and / or floor (additive, works on the unlit walls)
let WLT = null;
function winLightTex() { if (!WLT) { const c = document.createElement('canvas'); c.width = 256; c.height = 320; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 320); g.filter = 'blur(7px)'; g.fillStyle = '#fff'; const m = 12; [[24, 24], [134, 24], [24, 128], [134, 128]].forEach(([x, y], i) => g.fillRect(x, y, 98, i < 2 ? 96 - m / 2 : 168)); g.filter = 'none'; WLT = new THREE.CanvasTexture(c); WLT.colorSpace = THREE.SRGBColorSpace; } return WLT; }
const winDL = new THREE.DirectionalLight(0xfff0dc, 0); scene.add(winDL, winDL.target);
function buildWinLight(c) {
  const mode = S.room.winL || 'off'; winDL.intensity = 0; if (mode === 'off' || S.studio || photo) return;
  const mk = (w, h, op) => { const geo = new THREE.PlaneGeometry(w, h); return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: winLightTex(), color: 0xfff2dc, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); };
  const F = frame(), from = S.layout === 'Lr' ? 1 : -1; // light comes from the open side
  if (mode === 'wall' || mode === 'both') { const p = mk(1.15, 1.45, 0.26); p.geometry.applyMatrix4(new THREE.Matrix4().makeShear(0, 0, -0.32 * from, 0, 0, 0)); p.position.set(c.x - from * 0.15, 1.25, 0.004); decor.add(p); }
  if (mode === 'floor' || mode === 'both') { const p = mk(1.0, 1.7, 0.2); p.geometry.applyMatrix4(new THREE.Matrix4().makeShear(0, 0, 0.45 * from, 0, 0, 0)); p.rotation.x = -Math.PI / 2; p.rotation.z = from * 0.5; p.position.set(c.x - from * 0.3, 0.0035, Math.max(1.0, c.z + 0.8)); decor.add(p); }
  winDL.intensity = 0.9; winDL.position.set(c.x + from * 3.5, c.y + 2.5, 3.5); winDL.target.position.copy(c);
}
function buildDecor(c) {
  decor.clear(); decor.visible = !photo && !S.studio; if (!decor.visible) { winDL.intensity = 0; return; }
  buildRug(); buildPlants(); buildWinLight(c);
}

// ---------- dimensions ----------
const dimCol = () => S.dimC === 'black' ? '#1e1e1e' : '#ffffff';
function labelSprite(text, mode) {
  const bold = S.dimStyle !== 'thin', white = S.dimC !== 'black';
  const c = document.createElement('canvas'), g = c.getContext('2d'), fs = 40, font = `${bold ? 700 : 600} ${fs}px Manrope,Arial,sans-serif`;
  g.font = font; const w = Math.ceil(g.measureText(text).width) + 30; c.width = w; c.height = 60; g.font = font;
  g.fillStyle = white ? `rgba(24,24,26,${bold ? 0.62 : 0.42})` : `rgba(255,255,255,${bold ? 0.94 : 0.8})`; g.beginPath(); g.roundRect(0, 0, w, 60, 16); g.fill();
  g.fillStyle = white ? '#ffffff' : '#1e1e1e'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, toneMapped: false, sizeAttenuation: false }));
  /* about 17 css px tall at any zoom */ const h = 2 * Math.tan(camera.fov * Math.PI / 360) * ((view.clientHeight || 600) < 700 ? 14 : 16) / Math.max(300, view.clientHeight || 600); sp.scale.set(h * w / 60, h, 1); sp.renderOrder = 10;
  // h: above the line; vL / vR: vertical text left / right of a vertical line; tL / tR: tag anchored at its left / right bottom corner
  if (mode === 'vL') { sp.center.set(0.5, 0); sp.material.rotation = Math.PI / 2; } else if (mode === 'vR') { sp.center.set(0.5, 1); sp.material.rotation = Math.PI / 2; } else if (mode === 'tL') sp.center.set(0, 0); else if (mode === 'tR') sp.center.set(1, 0); else sp.center.set(0.5, 0);
  return sp;
}
let DM = null, DTH = 0.003;
function segs(g, pts) {
  const bold = S.dimStyle !== 'thin';
  if (!DM || DM.k !== S.dimC + S.dimStyle) DM = { k: S.dimC + S.dimStyle, m: bold ? new THREE.MeshBasicMaterial({ color: dimCol(), depthTest: false, transparent: true, toneMapped: false }) : new THREE.LineDashedMaterial({ color: dimCol(), dashSize: 0.018, gapSize: 0.012, transparent: true, opacity: 0.8, depthTest: false, toneMapped: false }) };
  if (!bold) { const geo = new THREE.BufferGeometry().setFromPoints(pts); const l = new THREE.LineSegments(geo, DM.m); l.computeLineDistances(); l.renderOrder = 9; g.add(l); return; }
  const th = DTH, q = new THREE.Quaternion(), X = V(1, 0, 0);
  for (let i = 0; i < pts.length; i += 2) { const a = pts[i], b = pts[i + 1], d = b.clone().sub(a), L = d.length(); if (L < 1e-5) continue; const m = new THREE.Mesh(BOX, DM.m); m.scale.set(L + th, th, th); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.copy(q.setFromUnitVectors(X, d.normalize())); m.renderOrder = 9; g.add(m); }
}
function dimH(g, labels, xa, xb, y, z, text, yPart) {
  const t = 0.012, gap = 0.015, p = [V(xa, y, z), V(xb, y, z)];
  [xa, xb].forEach(x => p.push(V(x, yPart + gap, z), V(x, y + 0.012, z), V(x - t * 0.7, y - t * 0.7, z), V(x + t * 0.7, y + t * 0.7, z)));
  segs(g, p); labels.push({ p: V((xa + xb) / 2, y + 0.012, z), t: text, k: 'h' });
}
function dimV(g, labels, x, ya, yb, z, text, xPart, side) {
  const t = 0.012, gap = 0.015, sg = Math.sign(x - xPart) || 1, p = [V(x, ya, z), V(x, yb, z)];
  [ya, yb].forEach(y => p.push(V(xPart + sg * gap, y, z), V(x + sg * 0.012, y, z), V(x - t * 0.7, y - t * 0.7, z), V(x + t * 0.7, y + t * 0.7, z)));
  segs(g, p); const sd = side || (sg > 0 ? 'vR' : 'vL'); labels.push({ p: V(x + (sd === 'vR' ? 0.012 : -0.012), (ya + yb) / 2, z), t: text, k: sd });
}
const cm = mm => String(Math.round(mm / 10 * 10) / 10).replace('.', ',');
function itemTop(o) { return o.y * 10 * MM + (o.t === 'rail' ? 0.017 : 0); }
function itemBot(o) { const y = o.y * 10 * MM; return o.t === 'basket' || o.t === 'pull' ? y - (o.h || 85) * MM : o.t === 'trouser' ? y - 0.045 : o.t === 'shoe' ? y - 0.11 : o.t === 'rail' ? y - 0.017 : y - 0.042; }
function buildDims(g, wi) {
  const labels = [], W = S.walls[wi], z = 0.006, railY = S.railTop * 10 * MM, D = S.dm || {};
  let xs = [0]; W.sections.forEach(s => xs.push(xs[xs.length - 1] + s.w * 10 * MM));
  const tot = xs[xs.length - 1];
  if (D.s) W.sections.forEach((s, i) => dimH(g, labels, xs[i], xs[i + 1], railY + 0.08, z, cm(s.w * 10), railY));
  if (D.o) dimH(g, labels, -0.0125, tot + 0.0125, railY + (D.s ? 0.19 : 0.08), z, cm(tot / MM + 25), railY);
  if (D.s) { const eg = effGap(wi), lr = wi === 0 && S.layout === 'Lr', gr = wi === 0 && S.layout === 'U' ? effGapR() : 0;
    if (eg > 0 && S.layout !== 'straight') { if (lr) dimH(g, labels, tot + 0.0125, tot + eg / 100 + 0.02, railY + 0.08, z, cm(eg * 10 - 12.5), railY); else dimH(g, labels, -eg / 100 - (wi === 0 ? 0.02 : 0), -0.0125, railY + 0.08, z, cm(eg * 10 - 12.5), railY); }
    if (gr > 0) dimH(g, labels, tot + 0.0125, tot + gr / 100 + 0.02, railY + 0.08, z, cm(gr * 10 - 12.5), railY); }
  if (D.o) {
    const left = wi === 0 && S.layout === 'Lr', sg = left ? -1 : 1, xb = left ? -0.0125 : tot + 0.0125;
    const pb = postBottom() * MM, pt = (S.railTop * 10 - 10) * MM;
    dimV(g, labels, xb + sg * 0.1, pb, pt, z, cm(S.postH), xb);
    dimV(g, labels, xb + sg * 0.24, 0, railY, z, cm(railY / MM), xb);
  }
  W.sections.forEach((s, i) => {
    const its = s.items.slice().sort((a, b) => itemBot(a) - itemBot(b)); if (!its.length) return;
    if (D.g) { // distances between shelves: at the side of the section, by the left upright
      const x = xs[i] + 0.035, zz = 0.07, p = [], t = 0.01, pts = [0]; its.forEach(o => pts.push(itemBot(o), itemTop(o)));
      for (let k = 0; k < pts.length - 1; k += 2) { const ya = pts[k], yb = pts[k + 1]; if (yb - ya < 0.03) continue;
        p.push(V(x, ya, zz), V(x, yb, zz), V(x - t, ya, zz), V(x + t, ya, zz), V(x - t, yb, zz), V(x + t, yb, zz));
        if (yb - ya > 0.1) labels.push({ p: V(x + 0.01, (ya + yb) / 2, zz), t: cm((yb - ya) / MM), k: 'vR' }); }
      segs(g, p);
    }
    its.forEach(o => {
      if (o.t === 'rail') return;
      const zf = ZI + (REAL_DEPTH[o.t][o.d] || 400) * MM, yt = itemTop(o);
      if (D.h) labels.push({ p: V(xs[i] + 0.03, yt + 0.012, zf), t: `↑${Math.round(o.y)}`, k: 'tL' });
      if (D.sd) {
        const xa = xs[i] + 0.016, xb2 = xs[i + 1] - 0.016, y = yt + 0.008;
        segs(g, [V(xa, y, zf + 0.01), V(xb2, y, zf + 0.01), V(xa, y - 0.01, zf + 0.01), V(xa, y + 0.01, zf + 0.01), V(xb2, y - 0.01, zf + 0.01), V(xb2, y + 0.01, zf + 0.01),
          V(xb2, y, 0.06), V(xb2, y, zf), V(xb2, y - 0.01, 0.06), V(xb2, y + 0.01, 0.06)]);
        labels.push({ p: V((xa + xb2) / 2 - (D.h ? 0 : 0), y + 0.01, zf + 0.01), t: `${s.w}`, k: 'h' });
        labels.push({ p: V(xb2, y + 0.01, (0.06 + zf) / 2), t: `${o.d}`, k: 'h' });
      }
    });
  });
  return labels;
}
const WG = [];
function dimsOn() { const d = S.dm || {}; return !!(d.o || d.s || d.h || d.g || d.sd); }
function rebuildDims() {
  dimsG.clear(); const on = dimsOn() && S.dims !== false; dimsG.visible = on; if (!on) return;
  { const d = camera.position.distanceTo(bbox.getCenter(new THREE.Vector3())); DTH = Math.max(0.0025, d * 2 * Math.tan(camera.fov * Math.PI / 360) * 1.7 / Math.max(300, view.clientHeight || 600)); }
  model.updateMatrixWorld(true); const inv = model.matrixWorld.clone().invert(), camR = V(1, 0, 0).applyQuaternion(camera.quaternion);
  wallsBuilt().forEach(wi => { const g = WG[wi]; if (!g) return;
    const dg = new THREE.Group(); dg.matrixAutoUpdate = false; dg.matrix.multiplyMatrices(inv, g.matrixWorld); dimsG.add(dg);
    const labels = buildDims(dg, wi), flip = V(1, 0, 0).transformDirection(g.matrixWorld).dot(camR) < 0, SW = { vL: 'vR', vR: 'vL', tL: 'tR', tR: 'tL' };
    labels.forEach(L => { const sp = labelSprite(L.t, flip ? (SW[L.k] || L.k) : L.k); sp.position.copy(L.p).applyMatrix4(dg.matrix); dimsG.add(sp); });
  });
}
// ---------- rebuild ----------
let bbox = new THREE.Box3();
const HIST = [], RED = []; let histT = 0, histLock = false;
function pushHist() { if (histLock) return; clearTimeout(histT); histT = setTimeout(() => { const j = JSON.stringify(S); if (HIST[HIST.length - 1] !== j) { HIST.push(j); if (HIST.length > 80) HIST.shift(); RED.length = 0; } }, 250); }
function restoreHist(j) { histLock = true; setTimeout(() => { renderDeco(); setBg(); }); selPost = null; $('postPop').classList.add('hide'); closeMenus(); cur.it = -1; S = migrate(JSON.parse(j)); fillGeneral(); rebuild(); renderSec(); cardUI(); histLock = false; }
function undo() { clearTimeout(histT); if (HIST.length < 2) return; RED.push(HIST.pop()); restoreHist(HIST[HIST.length - 1]); }
function redo() { if (!RED.length) return; const j = RED.pop(); HIST.push(j); restoreHist(j); }
function rebuild() {
  S.walls.forEach(w => w.sections.forEach(syncLinks));
  S.walls.forEach((w, wi) => { if (w.postL) Object.keys(w.postL).forEach(k => { if (+k > w.sections.length) delete w.postL[k]; }); w.sections.forEach((sc, si) => { const lo = secLo(wi, si); sc.items.forEach(o => { const drop = o.y - itemBot(o) * 100; if (o.y - drop < lo - 3 + 0.01) o.y = Math.min(S.railTop - 4, Math.ceil(lo - 3 + drop)); }); }); });
  makeMats();
  const keep = catcher; model.clear(); if (keep) model.add(keep); dimsG.clear(); WG.length = 0;
  const F = frame();
  buildRoom();
  wallsBuilt().forEach(wi => {
    const g = buildWall(wi); placeWall(g, wi);
    if (wi > 0) { const d = ((S.room.angle || 90) - 90) * Math.PI / 180, cx = wi === 1 ? F.xL : F.xR, pv = new THREE.Group(); pv.position.set(cx, 0, 0); pv.rotation.y = wi === 1 ? -d : d; g.position.x -= cx; pv.add(g); model.add(pv); pv.updateMatrixWorld(true); } else model.add(g);
    WG[wi] = g;
  });
  model.traverse(o => { if (o.isMesh && o !== catcher && !o.userData.dims && !o.userData.keep) { const f = !!o.userData.frame; o.visible = S.view === 'all' || (S.view === 'frame' ? f : !f); } });
  applyModelXf();
  bbox = new THREE.Box3();
  model.children.forEach(c => { if (c !== catcher) bbox.expandByObject(c); }); if (bbox.isEmpty()) bbox.set(V(F.x0, 0, 0), V(F.x0 + Math.max(0.6, F.backW), S.railTop / 100, 0.45)); { const cc = bbox.getCenter(new THREE.Vector3()); bbox.expandByPoint(V(cc.x, 0, Math.max(bbox.max.z, 0.5))); }
  buildDecor(bbox.getCenter(new THREE.Vector3()));
  rebuildDims();
  if (cur.it >= 0) model.traverse(o => { const r = o.userData.ref; if (r && r.wi === cur.w && r.si === cur.s && r.ii === cur.it) o.traverse(m => { if (m.isMesh && m.material && m.material.emissive && !m.userData.contact) { m.material = m.material.clone(); m.material.emissive.set(0x2f7bff); m.material.emissiveIntensity = 0.5; } }); });
  const c = bbox.getCenter(new THREE.Vector3());
  sun.position.set(c.x + 2.5, 4.5, 5); sun.target.position.copy(c); applyLights(); applyGlareShadow(); pushHist();
  catcher.visible = !!photo && !$('showRoom').checked;
  room.visible = !photo || $('showRoom').checked;
  summary(); fillDims(); localStorage.setItem('gs_auto', JSON.stringify(S));
  $('delBtn').classList.toggle('hide', !(cur.it >= 0 && S.walls[cur.w].sections[cur.s] && S.walls[cur.w].sections[cur.s].items[cur.it]));
}
function setDims(on) { dimsG.visible = !!on && dimsOn(); }
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
  if (ROOMB) { cam.position.x = Math.max(ROOMB.l + 0.3, Math.min(ROOMB.r - 0.3, cam.position.x)); cam.position.z = Math.max(0.4, cam.position.z); if (ROOMB.ch < 1e8) { o.h = Math.min(o.h, ROOMB.ch - 0.12); cam.position.y = o.h; } }
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
  const sg = S.layout === 'Lr' ? -1 : 1, flat = kind === 'nice' && (S.layout === 'straight' || S.layout === 'U'), dir = kind === 'front' || flat ? V(0, 0, 1) : kind === 'iso' ? V(sg, 0.25, 1.1) : kind === 'nice' ? V(sg * 0.85, 0.14, 1) : V(0, 1, 0.35);
  dir.normalize();
  camera.fov = kind === 'top' ? 35 : 28; const asp = camera.aspect, fov = camera.fov * Math.PI / 180;
  const span = Math.max(sz.x, sz.z * (kind === 'front' ? 0 : 1), 1), hgt = kind === 'top' ? Math.max(sz.z, 1) : sz.y;
  const dist = flat ? (Math.max(hgt * 1.3 / (2 * Math.tan(fov / 2)), (sz.x * 1.22 + 0.7) / (2 * Math.tan(fov / 2) * asp)) + sz.z * 0.5) * (S.layout === 'U' ? 1.22 : 1) : Math.max(hgt / (2 * Math.tan(fov / 2)), span / (2 * Math.tan(fov / 2) * asp)) * (view.clientWidth < 800 ? 1.55 : 1.75) * (kind === 'nice' ? 1.12 : 1) + sz.z * 0.35;
  if (kind === 'card') { const f = fitCard(camera.aspect, 0.13, 0.05); camera.fov = f.fov; camera.updateProjectionMatrix(); camera.position.copy(f.pos); controls.target.copy(f.tg); controls.update(); syncFromCam('card'); document.querySelectorAll('[data-cam]').forEach(b => b.classList.toggle('on', b.dataset.cam === kind)); return; }
  camera.fov = kind === 'top' ? 35 : 28; camera.updateProjectionMatrix();
  camera.position.copy(c).addScaledVector(dir, dist); controls.target.copy(c); camera.up.set(0, 1, 0); controls.update(); syncFromCam(kind);
  document.querySelectorAll('[data-cam]').forEach(b => b.classList.toggle('on', b.dataset.cam === kind));
  if (WG.length) rebuildDims();
}
function resize() { const w = view.clientWidth, h = view.clientHeight; renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px'; camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(view);
let fpsT = performance.now(), fpsN = 0, lowCnt = 0, hiCnt = 0;
function adapt() { fpsN++; const t = performance.now(); if (t - fpsT < 1500) return; const fps = fpsN * 1000 / (t - fpsT); fpsN = 0; fpsT = t; if (document.hidden) return;
  if (fps < 32) { hiCnt = 0; if (++lowCnt >= 2 && PR > 1) { PR = Math.max(1, PR - 0.25); renderer.setPixelRatio(PR); resize(); lowCnt = 0; } else if (lowCnt >= 2 && sun.shadow.mapSize.x > 1024) { sun.shadow.mapSize.set(1024, 1024); sun.shadow.map && (sun.shadow.map.dispose(), sun.shadow.map = null); lowCnt = 0; } }
  else if (fps > 55) { lowCnt = 0; if (++hiCnt >= 4 && PR < PR_MAX) { PR = Math.min(PR_MAX, PR + 0.25); renderer.setPixelRatio(PR); resize(); hiCnt = 0; } } }
renderer.setAnimationLoop(() => { if (orb.on) applyCam(); else controls.update(); tickFlash(); tickSpec(); renderer.render(scene, camera); adapt(); });

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
const rim = new THREE.DirectionalLight(0xdfe7ff, 0); scene.add(rim, rim.target); // edge light so black RAL 9005 reads in detail
// shadow presets: sun direction (deg), blur radius, shadow strength on the walls
const SHP = { soft: { az: 12, el: 16, r: 9, k: 0.4 }, left: { az: -38, el: 24, r: 2.2, k: 0.5 }, right: { az: 38, el: 24, r: 2.2, k: 0.5 }, top: { az: 4, el: 38, r: 6, k: 0.4 }, none: { k: 0 } };
const specL = new THREE.DirectionalLight(0xffffff, 0); scene.add(specL, specL.target);
const _sc = new THREE.OrthographicCamera();
// the highlight light rides with the camera (up and to the right), so edge highlights travel as the view turns
const _cr = new THREE.Vector3(), _cu = new THREE.Vector3();
function tickSpec() { if (!specL.intensity) return; _cr.set(1, 0, 0).applyQuaternion(camera.quaternion); _cu.set(0, 1, 0).applyQuaternion(camera.quaternion); specL.position.copy(camera.position).addScaledVector(_cr, 1.6).addScaledVector(_cu, 1.4); }
function applyGlareShadow() {
  const R = S.room || {}, c = bbox.getCenter(new THREE.Vector3()), P = SHP[R.shP] || SHP.soft, ST = !!S.studio && !photo, gmode = R.glareM || 'soft';
  if (R.glow === 'left' || R.glow === 'right') { const sx = R.glow === 'left' ? -1 : 1; glow.intensity = 1.6; glow.position.set(c.x + sx * 3, 2.4, 2.6); glow.target.position.set(c.x + sx * 0.6, 1.5, 0); } else glow.intensity = 0;
  const on = !ST && R.shP !== 'none' && !S.sun;
  sun.castShadow = on || (!!photo && !$('showRoom').checked);
  if (P.el != null && !S.sun) {
    const az = P.az * Math.PI / 180, el = P.el * Math.PI / 180, D = 7;
    sun.position.set(c.x + D * Math.sin(az) * Math.cos(el), c.y + D * Math.sin(el), c.z + D * Math.cos(az) * Math.cos(el)); sun.target.position.copy(c);
    // tight light-space frustum around the construction and plants: crisp, attached shadows without acne
    const b = bbox.clone(); decor.children.forEach(o => { if (o.userData.plant != null) b.expandByObject(o); }); b.expandByScalar(0.2); b.min.y = 0; b.min.z = Math.min(b.min.z, 0);
    _sc.position.copy(sun.position); _sc.lookAt(sun.target.position); _sc.updateMatrixWorld(true); const inv = _sc.matrixWorldInverse;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let i = 0; i < 8; i++) { const p = V(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(inv); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
    Object.assign(sc, { left: x0, right: x1, bottom: y0, top: y1, near: Math.max(0.05, -z1 - 0.5), far: -z0 + 0.5 }); sc.updateProjectionMatrix();
    sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.012; sun.shadow.radius = P.r; sun.shadow.blurSamples = 16;
  }
  rim.intensity = S.metal === 'black' ? 1.4 : S.metal === 'silver' ? 0.4 : 0; rim.position.set(c.x - 2.5, c.y + 3, 1.2); rim.target.position.copy(c); if (catcher) catcher.material.opacity = 0.3;
  // metal highlights: a key light from the front right that the powder coat and chrome catch as the view turns
  specL.intensity = gmode === 'bright' ? 4.5 : gmode === 'soft' ? 0.5 : 0; specL.target.position.copy(c); tickSpec();
  const gm = { soft: 1, bright: 1.8, off: 0.35 }[gmode];
  scene.traverse(o => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial && !o.material.isMeshPhysicalMaterial && o.material !== M.chrome && !o.material.userData.wall) o.material.envMapIntensity = (o.material.metalness > 0.6 ? 1.0 : 0.9) * gm; });
}
function setBg() { scene.background = photo && !$('showRoom').checked ? null : new THREE.Color(S.studio ? (S.bg || '#e2ded7') : S.room && S.room.ceiling ? '#fbfbf9' : '#e9e6e0'); }

// ---------- export ----------
$('pngBtn').onclick = () => cleanShot(pngShot);
function pngShot() {
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
  wallsBuilt().forEach(wi => {
    const W = S.walls[wi], tot = wallWidth(wi), [ra, rb] = railSpan(wi), rails = railCombo(Math.round((rb - ra) / MM) + 10);
    rails.forEach(r => add(frame, `Рельс несущий ${r} мм`)); for (let i = 0; i <= W.sections.length; i++) add(frame, `Стойка ${postLen(wi, i)} мм`);
    W.sections.forEach((s, si) => s.items.forEach(o => {
      const w = s.w * 10, d = REAL_DEPTH[o.t][o.d], br = { 306: 335, 327: 335, 330: 335, 340: 335, 406: 435, 427: 435, 430: 435, 440: 435, 506: 535 }[d] || 435;
      const nom = `${s.w}×${o.d} см`;
      if (o.t === 'mesh') { add(fill, `Полка сетчатая ${nearest([463, 603, 903, 1203], w)}x${d}`); add(card, `Полка ${nom}`); }
      if (o.t === 'metal') { add(fill, `Полка металлическая 597x${d}`); add(card, `Полка металлическая ${nom}`); }
      if (o.t === 'ldsp') { add(fill, `Полка ЛДСП ${nearest([446, 587, 887], w)}x${d}`); add(card, `Полка ЛДСП ${nom}`); }
      const bk = perfOf(o) ? 'перфорированная' : fineOf(o) ? 'мелкосетчатая' : 'сетчатая';
      if (o.t === 'basket') { add(fill, `Корзина ${bk} стационарная ${nearest([603, 903], w)}x${d}x${o.h || 85}`); add(card, `Корзина ${nom}`); }
      if (o.t === 'pull') { add(fill, `Корзина ${bk} выдвижная ${nearest([563, 863], w)}x${d}x${o.h || 85}`); add(card, `Корзина выдвижная ${nom}`); }
      if (o.t === 'trouser') { add(fill, `Брючница выдвижная ${nearest([463, 603], w)}x440x45`); add(card, `Брючница ${nom}`); }
      if (o.t === 'shoe') { add(fill, `Полка обувная сетчатая ${nearest([604, 904], w)}x${o.d === 30 ? 306 : 406}`); add(card, `Полка для обуви ${nom}`); }
      if (o.t === 'rail') { add(fill, `Перекладина ${nearest([520, 640, 940, 1240, 2000], w)} мм`); add(fill, 'Кронштейн для перекладины 30×30×100', 2); add(fill, 'Заглушка перекладины 15×23×23', 2); add(card, 'Штанга'); const ry = s.items.some(p => p !== o && p.t !== 'rail' && p.t !== 'shoe' && p.y > o.y && p.y - o.y <= 25) ? null : o.y + 9; if (ry != null) [si, si + 1].forEach(p => { const k = `${wi}:${p}:${ry}`; if (!brk.has(k)) { brk.add(k); add(fill, 'Кронштейн 335 мм'); add(card, 'Кронштейн для полки'); } }); }
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
  const MC = { white: 'белый RAL 9016', black: 'черный RAL 9005', silver: 'серебристый RAL 9006' }[S.metal], RC = { chrome: 'хром', white: 'белый' }[S.rod || 'chrome'];
  const parts = [...Object.entries(d.frame), ...Object.entries(d.fill)].map(([k, v]) => `<tr><td><span class="tbd">—</span></td><td>${k}</td><td>${/Перекладина|Штанга/.test(k) ? RC : MC}</td><td>${v} шт</td></tr>`).join('');
  const W = [];
  wallsBuilt().forEach(wi => S.walls[wi].sections.forEach((sc, si) => {
    const nm = `${WALLNAMES[wi]}, секция ${si + 1}`;
    if (sc.items.length && ![45, 60, 90, 120].includes(sc.w)) W.push(`${nm}: ширина ${sc.w} см не совпадает с каталогом (45/60/90/120). Ближайшая: ${nearest([45, 60, 90, 120], sc.w)} см`);
    if (collisions(sc).size) W.push(`${nm}: элементы пересекаются`);
    sc.items.forEach(o => { if (itemTop(o) > S.railTop * 10 * MM - 0.04) W.push(`${nm}: ${TYPES[o.t]} выше стоек`); if (itemBot(o) < postBottom() * MM - 0.005) W.push(`${nm}: ${TYPES[o.t]} ниже стоек`); });
  }));
  if (S.walls.some(w => w.sections.some(sc => sc.items.some(o => o.t === 'pull' && (o.h || 85) === 285)))) W.push('Выдвижной корзины высотой 285 мм нет в крупной сетке (есть 85 и 181); 285 мм бывает у мелкосетчатой 535');
  if (S.room.ceiling && S.railTop > (S.room.ceilH || 275)) W.push(`Гардеробная (${S.railTop} см) выше потолка (${S.room.ceilH} см)`);
  if (!['512', '1025', '1156', '1536', '1920', '2304'].includes(String(S.postH))) W.push(`Стоек ${S.postH} мм нет в каталоге. Стандартные: 512, 1025, 1156, 1536, 1920, 2304 мм`);
  wallsBuilt().forEach(wi => { const [ra, rb] = railSpan(wi), L = Math.round((rb - ra) / MM) + 10, c = railCombo(L); if (c.length > 1) W.push(`${WALLNAMES[wi]}: рельс ${L} мм собирается из ${c.length} частей (${c.join(' + ')} мм), нужен стык`); });
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
$('metal').onchange = e => { S.metal = e.target.value; const c = new THREE.Color(S.wall), l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11; if (S.metal === 'white' && l > 0.55) S.wall = '#a9a49c'; else if (S.metal === 'silver' && l > 0.2 && l < 0.5) S.wall = '#e4e0d9'; else if (S.metal === 'black' && l < 0.35) S.wall = '#e6e2dc'; $('wall').value = S.wall; rebuild(); renderDeco(); };
$('postH').onchange = e => { if (e.target.value !== 'custom') { S.postH = +e.target.value; $('postHc').value = S.postH; fix(); } };
$('postHc').onchange = e => { S.postH = Math.max(300, Math.min(3000, +e.target.value || 1920)); $('postH').value = 'custom'; fix(); };
$('railTop').onchange = e => { S.railTop = Math.max(60, Math.min(350, +e.target.value || 210)); fix(); };
$('nSec').onchange = e => { const n = Math.max(1, Math.min(6, +e.target.value || 1)), secs = S.walls[cur.w].sections; while (secs.length < n) secs.push(JSON.parse(JSON.stringify(secs[secs.length - 1]))); secs.length = n; cur.s = Math.min(cur.s, n - 1); rebuild(); renderSec(); };
$('allW').onchange = e => { if (e.target.value) { S.walls[cur.w].sections.forEach(s => s.w = +e.target.value); e.target.value = ''; rebuild(); renderSec(); } };
function fix() { if (S.postH > S.railTop * 10) S.railTop = Math.ceil(S.postH / 10) + 2; $('railTop').value = S.railTop; fillDims(); S.walls.forEach(w => w.sections.forEach(s => s.items.forEach(o => o.y = clampY(o.y)))); rebuild(); renderSec(); }

const ICO = {
  shelf: '<svg viewBox="0 0 48 32"><rect x="4" y="12" width="40" height="4" rx="1"/><path d="M6 16v6M42 16v6" stroke-width="3"/><path d="M8 12v-2M14 12v-2M20 12v-2M26 12v-2M32 12v-2M38 12v-2" stroke-width="1.5"/></svg>',
  rod: '<svg viewBox="0 0 48 32"><path d="M6 6v12M42 6v12" stroke-width="3"/><rect x="5" y="15" width="38" height="4" rx="2"/><path d="M16 19l-6 9h12zM32 19l-6 9h12z" stroke-width="1.5" fill="none"/></svg>',
  combo: '<svg viewBox="0 0 48 32"><rect x="4" y="5" width="40" height="4" rx="1"/><path d="M6 9v4M42 9v4" stroke-width="3"/><path d="M10 9v8M38 9v8" stroke-width="2"/><rect x="8" y="16" width="32" height="3.5" rx="1.7"/><path d="M18 20l-5 8h10zM30 20l-5 8h10z" stroke-width="1.3" fill="none"/></svg>',
  basket: '<svg viewBox="0 0 48 32"><path d="M6 8h36v18H6z" fill="none" stroke-width="2.5"/><path d="M12 8v18M18 8v18M24 8v18M30 8v18M36 8v18M6 14h36M6 20h36" stroke-width="1.2"/></svg>',
  trouser: '<svg viewBox="0 0 48 32"><path d="M4 8h40" stroke-width="3"/><path d="M8 8v4h32V8" fill="none" stroke-width="1.5"/><path d="M12 12v14M18 12v14M24 12v14M30 12v14M36 12v14" stroke-width="2.5"/></svg>'
};
const BK = [['pull|mesh', 'Сетчатая выдвижная', '<path d="M4 6h40v20H4z" fill="none" stroke-width="2.5"/><path d="M12 6v20M20 6v20M28 6v20M36 6v20M4 16h40" stroke-width="1.3"/><path d="M18 29h12" stroke-width="3"/>'],
  ['basket|mesh', 'Стационарная', '<path d="M4 6h40v20H4z" fill="none" stroke-width="2.5"/><path d="M12 6v20M20 6v20M28 6v20M36 6v20M4 16h40" stroke-width="1.3"/>'],
  ['pull|fine', 'Мелкосетчатая', '<path d="M4 6h40v20H4z" fill="none" stroke-width="2.5"/><path d="M8 6v20M12 6v20M16 6v20M20 6v20M24 6v20M28 6v20M32 6v20M36 6v20M40 6v20M4 10h40M4 14h40M4 18h40M4 22h40" stroke-width="0.8"/>'],
  ['pull|perf', 'Перфорированная', '<rect x="4" y="6" width="40" height="20" rx="2" fill="none" stroke-width="2.5"/><g stroke-width="2.6" stroke-linecap="round"><path d="M10 11v4M16 11v4M22 11v4M28 11v4M34 11v4M40 11v4M10 18v4M16 18v4M22 18v4M28 18v4M34 18v4M40 18v4"/></g>']];
function presetItems(t) {
  const top = S.railTop - 18, lo = Math.ceil(postBottom() / 10) + 10, mid = Math.round((top + lo) / 2), M_ = y => it('mesh', S.depth || 40, y), R_ = y => it('rail', 30, y), C_ = y => { const [a, b] = newItem('combo'); a.y = y; return [a, b]; }, B_ = y => Object.assign(it('pull', 40, y, 181), { v: 'mesh' });
  const T = { shelves: () => { const a = []; for (let y = top; y >= lo; y -= 36) a.push(M_(y)); return a; }, rod: () => [...C_(top), M_(lo + 20)], two: () => [...C_(top), ...C_(mid)], baskets: () => [M_(top), M_(top - 38), M_(top - 76), B_(lo + 70), B_(lo + 45), B_(lo + 20)], shoes: () => [M_(top), M_(top - 38), M_(top - 76), it('shoe', 40, lo + 50), it('shoe', 40, lo + 25)] };
  const r = { items: T[t]().map(o => (o.y = clampY(o.y), o)) }; syncLinks(r); return r.items;
}
function syncLinks(sec) { sec.items = sec.items.filter(o => !o.lk || sec.items.some(p => p.g === o.lk)); sec.items.forEach(o => { if (o.lk) { const p = sec.items.find(q => q.g === o.lk); o.y = clampY(p.y - 9); } }); }
function newItem(c) {
  S.q = (S.q || 0) + 1;
  if (c === 'combo') { const g = 'g' + S.q, sh = it('mesh', S.depth || 40, 100), r = it('rail', 30, 91); sh.g = g; sh.q = S.q; r.lk = g; return [sh, r]; }
  const [t, v] = (c === 'basket' ? (S.bKind || 'pull|mesh') : VARS[c][0][0]).split('|'); const o = it(t, 40, 100); o.q = S.q; o.d = DEPTHS[t].includes(S.depth) ? S.depth : DEPTHS[t].includes(40) ? 40 : DEPTHS[t][0]; if (isBasket(t)) { o.h = 85; o.v = v; } return [o];
}
// new item always strictly below the current lowest item
function appendItem(sec, c) {
  const os = newItem(c), main = os[0], lowY = sec.items.length ? Math.min(...sec.items.map(p => p.y)) : null, lowBot = sec.items.length ? Math.min(...sec.items.map(p => itemBot(p) * 100)) : null;
  const top = c === 'rod' ? 2 : 1, step = c === 'rod' ? 14 : c === 'basket' ? 6 : c === 'trouser' ? 6 : c === 'combo' ? 30 : 32;
  let y = lowY == null ? S.railTop - 18 - (c === 'rod' ? 12 : 0) : Math.floor(Math.min(lowY - step, lowBot - top - (c === 'shelf' || c === 'combo' ? 26 : 2)));
  if (!placeFree(sec, os, y)) { msg('В секции нет свободного места для нового элемента'); return -1; }
  sec.items.push(...os); syncLinks(sec);
  return sec.items.indexOf(main);
}
// find the nearest height (first downward, then upward) where the new items do not overlap anything
function placeFree(sec, os, y0) {
  const main = os[0], si = S.walls[cur.w].sections.indexOf(sec), lo = Math.max(Math.ceil(postBottom() / 10) + 3, si >= 0 ? secLo(cur.w, si) : 0), hi = S.railTop - 4;
  const ok = y => { if (y < lo - 20 || y > hi) return false; main.y = y; os.forEach(o => { if (o.lk) o.y = y - 9; }); if (os.some(o => o.y > hi || itemBot(o) * 100 < lo - 3 - 0.01)) return false;
    const m = 0.1; return !os.some(o => { const a0 = itemBot(o) - m, a1 = itemTop(o) + m; return sec.items.some(p => !(o.lk && p === main) && itemBot(p) < a1 && a0 < itemTop(p)); }); };
  y0 = Math.round(Math.min(hi, y0));
  for (let y = y0; y >= lo - 20; y--) if (ok(y)) return true;
  for (let y = y0 + 1; y <= hi; y++) if (ok(y)) return true;
  return false;
}
function removeItem(sec, i) { const o = sec.items[i]; sec.items.splice(i, 1); if (o && o.g) sec.items = sec.items.filter(p => p.lk !== o.g); }
function secHint(wi) { const sc = S.walls[wi].sections, g = {}; sc.forEach(x => g[x.w] = (g[x.w] || 0) + 1); const word = n => n % 10 === 1 && n % 100 !== 11 ? 'секция' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'секции' : 'секций'; return Object.entries(g).map(([w, n]) => `${n} ${word(n)} по ${w} см`).join(' + ') + ` = ${Math.round(wallWidth(wi) / 10)} см`; }
function renderSizes() {
  const W = S.walls[cur.w], tot = Math.round(wallWidth(cur.w) / 10), n = W.sections.length, sw = W.sections[0] ? W.sections[0].w : 90, same = W.sections.every(x => x.w === sw);
  const btn = (v, on, attr, label) => `<button ${attr}="${v}" class="${on ? 'on' : ''}">${label ?? v}</button>`;
  const WS = [60, 90, 120, 150, 180, 240, 270, 300, 360];
  const AW = wallsActive(), tabs = AW.length > 1 ? '<div class="wtabs">' + AW.map(wi => `<button data-wt="${wi}" class="${wi === cur.w ? 'on' : ''}">${wi === 0 ? 'Основная стена' : AW.length > 2 ? (wi === 1 ? 'Левая стена' : 'Правая стена') : 'Вторая стена'}</button>`).join('') + '</div>' : '';
  $('wallSz').innerHTML = tabs + [cur.w].map(wi => { const t = Math.round(wallWidth(wi) / 10), nn = S.walls[wi].sections.length, nm = AW.length > 1 ? '' : 'Стена';
    return `<div class="wallblk"><div class="szlab">Ширина конструкции (верхний рельс), см</div><div class="sz">${WS.map(v => `<button data-ww="${wi}:${v}" class="${v === t ? 'on' : ''}">${v}</button>`).join('')}<button data-wown="${wi}" class="${WS.includes(t) ? '' : 'on'}">Свой размер${WS.includes(t) ? '' : ': ' + t}</button></div>
    <div class="own hide" id="wown${wi}"><input type="range" data-wr="${wi}" min="40" max="720" step="1" value="${t}"><input type="number" data-wf="${wi}" min="40" max="720" step="1" value="${t}"></div>
    <div class="szlab">Количество секций</div><div class="sz cnt6">${[1, 2, 3, 4, 5, 6].map(v => `<button data-wn="${wi}:${v}" class="${v === nn ? 'on' : ''}">${v}</button>`).join('')}</div><p class="foot">${secHint(wi)}</p></div>`; }).join('');
  const setW = (wi, v, live) => { const sc = S.walls[wi].sections, n = sc.length || 1, w = Math.max(20, Math.min(200, Math.round(v / n))), ws = live ? w : nearest([45, 60, 90, 120], w); sc.forEach(x => x.w = ws); clearTimeout(dimT); dimT = setTimeout(() => { rebuild(); if (!live) renderSec(); }, live ? 40 : 0); };
  const setN = (wi, n) => { const sc = S.walls[wi].sections, tot = wallWidth(wi) / 10, base = sc[sc.length - 1] || { w: 90, items: [] }; while (sc.length < n) sc.push(JSON.parse(JSON.stringify(base))); sc.length = n; const w = nearest([45, 60, 90, 120], tot / n); sc.forEach(x => x.w = w); cur.w = wi; cur.s = Math.min(cur.s, n - 1); rebuild(); renderSec(); };
  document.querySelectorAll('[data-ww]').forEach(b => b.onclick = () => { const [wi, v] = b.dataset.ww.split(':').map(Number); setW(wi, v); });
  document.querySelectorAll('[data-wn]').forEach(b => b.onclick = () => { const [wi, v] = b.dataset.wn.split(':').map(Number); setN(wi, v); });
  document.querySelectorAll('[data-wt]').forEach(b => b.onclick = () => { cur = { w: +b.dataset.wt, s: 0, it: -1 }; renderSec(); rebuild(); flashWall(cur.w); });
  document.querySelectorAll('[data-wown]').forEach(b => b.onclick = () => $('wown' + b.dataset.wown).classList.toggle('hide'));
  document.querySelectorAll('[data-wr]').forEach(el => { el.oninput = () => { el.nextElementSibling.value = el.value; setW(+el.dataset.wr, +el.value, true); }; el.onchange = () => setW(+el.dataset.wr, +el.value); });
  document.querySelectorAll('[data-wf]').forEach(el => el.onchange = () => setW(+el.dataset.wf, +el.value || 90));
  const SS = [[45, '463'], [60, '603'], [90, '903'], [120, '1203']];
  $('szS').innerHTML = SS.map(([v, m]) => btn(v, same && v === sw, 'data-zs', `${v}<small>${m} мм</small>`)).join('') + `<button data-own="ownS" class="${same && SS.some(p => p[0] === sw) ? '' : 'on'}">Свой размер</button>`;
  const HS = [512, 1025, 1156, 1536, 1920, 2304];
  $('szH').innerHTML = HS.map(v => btn(v, v === S.postH, 'data-zh', `${cm(v)}<small>${v} мм</small>`)).join('') + `<button data-own="ownH" class="${HS.includes(S.postH) ? '' : 'on'}">Свой размер</button>`;
  $('szD').innerHTML = [30, 40, 50].map(v => btn(v, v === (S.depth || 40), 'data-zd')).join('');
  $('szV').innerHTML = [['all', 'Все'], ['frame', 'Каркас'], ['fill', 'Наполнение']].map(([k, t]) => btn(k, (S.view || 'all') === k, 'data-zv', t)).join('');
  $('rS').value = $('fS').value = sw;
  const Q = (sel, f) => document.querySelectorAll(sel).forEach(b => b.onclick = () => f(b));
  Q('[data-zs]', b => { W.sections.forEach(x => x.w = +b.dataset.zs); rebuild(); renderSec(); });
  Q('[data-zh]', b => { const lift = liftCm(); S.walls.forEach(w => delete w.postL); S.postH = +b.dataset.zh; S.railTop = Math.round(lift + S.postH / 10 + 1); fix(); });
  Q('[data-zd]', b => setDepth(+b.dataset.zd));
  Q('[data-zv]', b => { S.view = b.dataset.zv; $('viewMode').value = S.view; rebuild(); renderSizes(); });
  Q('[data-own]', b => $(b.dataset.own).classList.toggle('hide'));
}
function renderSec() {
  const act = wallsActive(); if (!act.includes(cur.w)) cur.w = act[0];
  const W = S.walls[cur.w]; $('nSec').value = W.sections.length; if (cur.s >= W.sections.length) cur.s = 0; if (cur.it == null) cur.it = -1;
  let h = '';
  if (act.length > 1) h += '<div class="tabs">' + act.map(wi => `<button data-w="${wi}" class="${wi === cur.w ? 'on' : ''}">${WALLNAMES[wi]}</button>`).join('') + '</div>';
  h += '<div class="tabs secchips">' + W.sections.map((s, i) => `<button data-s="${i}" class="${i === cur.s ? 'on' : ''}">Секция ${i + 1}<small>${s.w} см · ${s.items.length} эл.</small></button>`).join('') + '</div>';
  $('secTabs').innerHTML = h;
  $('secTabs').querySelectorAll('[data-w]').forEach(b => b.onclick = () => { cur = { w: +b.dataset.w, s: 0, it: -1 }; renderSec(); rebuild(); flashWall(cur.w); });
  $('secTabs').querySelectorAll('[data-s]').forEach(b => b.onclick = () => { cur.s = +b.dataset.s; cur.it = -1; renderSec(); rebuild(); });
  renderGaps();
  renderSizes();
  if (W.off) { $('secEdit').innerHTML = `<div class="offbox"><b>${act.length > 2 ? ['Основная стена', 'Левая стена', 'Правая стена'][cur.w] : WALLNAMES[cur.w]}: конструкция убрана</b><p class="foot">Стена комнаты осталась. Стойки, рельс и наполнение можно вернуть.</p><button class="acc" data-restore="${cur.w}">Вернуть конструкцию</button></div>`; $('secEdit').querySelector('[data-restore]').onclick = () => { W.off = false; rebuild(); renderSec(); renderWallsPop(); }; return; }
  const s = W.sections[cur.s], lo = Math.ceil(postBottom() / 10) + 3, hi = S.railTop - 4;
  const cnt = c => s.items.filter(o => !o.lk && rowCat(o) === c).length;
  const wname = act.length > 2 ? (cur.w === 0 ? 'Основная стена' : cur.w === 1 ? 'Левая стена' : 'Правая стена') : WALLNAMES[cur.w];
  let e = `<div class="sechead"><div class="t1">${wname} · Секция ${cur.s + 1}</div><div class="t2">Наполнение секции</div></div>`;
  e += `<div class="wrow"><span>Ширина секции</span><div class="sz wbtn">${[45, 60, 90, 120].map(v => `<button data-pw="${v}" class="${s.w === v ? 'on' : ''}">${v}</button>`).join('')}</div></div>`;
  if (s.items.length && ![45, 60, 90, 120].includes(s.w)) e += `<div class="wtxt">Ширины ${s.w} см нет в каталоге. Подходят: 45, 60, 90, 120 см</div>`;
  e += '<div class="szlab">Готовые наборы</div><div class="chips">' + [['shelves', 'Только полки'], ['rod', 'Штанга + полки'], ['two', 'Две штанги'], ['baskets', 'Полки + корзины'], ['shoes', 'Полки + обувь']].map(([k, t]) => `<button data-pre="${k}">${t}</button>`).join('') + '<button data-empty="1">Очистить</button></div>';
  const icoBtn = c => `<div class="ico"><button class="big" data-app="${c}" title="Добавить ниже последнего">${ICO[c]}<span class="${c === 'combo' ? 'two' : ''}">${c === 'combo' ? 'Штанга<br>с полкой' : CATS[c]}</span></button><div class="cnt"><button data-dec="${c}">−</button><b>${cnt(c)}</b><button data-inc="${c}">+</button></div></div>`;
  e += '<div class="szlab">Элементы</div><div class="icons">' + ['shelf', 'rod', 'combo', 'trouser'].map(icoBtn).join('') + '</div>';
  e += '<div class="bgroup"><div class="icons">' + icoBtn('basket') + '<div class="bnote">Тип корзины: нажмите на картинку, чтобы выбрать тип и добавить корзину</div></div><div class="btiles">' + BK.map(([k, t, svg]) => `<button data-bk="${k}" class="${(S.bKind || 'pull|mesh') === k ? 'on' : ''}"><svg viewBox="0 0 48 32">${svg}</svg><span>${t}</span></button>`).join('') + '</div></div>';
  const ord = s.items.map((o, i) => [o, i]).filter(p => !p[0].lk).sort((a, b) => b[0].y - a[0].y), coll = collisions(s);
  if (!s.items.length) e += '<p class="sum">Секция пустая. Нажимайте на значки выше: каждый новый элемент встает ниже предыдущего.</p>';
  ord.forEach(([o, i], k) => {
    const c = rowCat(o), vv = c === 'basket' ? o.t + '|' + (o.v || 'mesh') : o.t;
    e += `<div class="item${coll.has(i) ? ' warn' : ''}${cur.it === i ? ' sel' : ''}" data-row="${i}"><div class="top"><b class="num">${k + 1}</b><span class="mico">${ICO[c]}</span><select data-i="${i}" data-k="var">${VARS[c].map(([kk, v]) => `<option value="${kk}" ${kk === vv ? 'selected' : ''}>${v}</option>`).join('')}</select>
    ${isBasket(o.t) ? `<select data-i="${i}" data-k="h" class="dsel">${[85, 181, 285].map(v => `<option value="${v}" ${v === (o.h || 85) ? 'selected' : ''}>${v} мм</option>`).join('')}</select>` : ''}
    <button class="mini" data-sw="${i}" data-dir="-1" ${k === 0 ? 'disabled' : ''}>↑</button><button class="mini" data-sw="${i}" data-dir="1" ${k === ord.length - 1 ? 'disabled' : ''}>↓</button><button class="mini danger" data-del="${i}">✕</button></div>
    <div class="ld"><span>Длина</span><div class="sz">${lensOf(o).map(mm => `<button data-len="${i}:${mm}" class="${secW(mm) === s.w ? 'on' : ''}" title="${mm} мм">${Math.round(mm / 10)}</button>`).join('')}</div></div>${o.t === 'rail' ? '' : `<div class="ld"><span>Глубина</span><div class="sz">${depthsOf(o).map(d => `<button data-dep="${i}:${d}" class="${d === o.d ? 'on' : ''}" title="${REAL_DEPTH[o.t][d]} мм">${d}</button>`).join('')}</div></div>`}
    <div class="yrow"><input type="range" data-i="${i}" data-k="yr" min="${lo}" max="${hi}" step="1" value="${o.y}"><label class="yn"><input type="number" data-i="${i}" data-k="y" value="${o.y}" min="${lo}" max="${hi}"> см</label></div>
    ${coll.has(i) ? '<div class="wtxt">Пересекается с соседним элементом</div>' : ''}</div>`;
  });
  $('secEdit').innerHTML = e;
  const E = $('secEdit'), go = () => { rebuild(); renderSec(); };
  E.querySelectorAll('[data-pw]').forEach(b => b.onclick = () => { s.w = +b.dataset.pw; go(); });
  E.querySelectorAll('[data-app]').forEach(b => b.onclick = () => { cur.it = appendItem(s, b.dataset.app); go(); });
  E.querySelectorAll('[data-bkadd]').forEach(b => b.onclick = () => { S.bKind = b.dataset.bkadd; cur.it = appendItem(s, 'basket'); go(); });
  E.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => { cur.it = appendItem(s, b.dataset.inc); go(); });
  E.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => { const c = b.dataset.dec, l = s.items.map((o, i) => [o, i]).filter(p => !p[0].lk && rowCat(p[0]) === c).sort((a, b) => ((b[0].q || 0) - (a[0].q || 0)) || (a[0].y - b[0].y))[0]; if (!l) return; removeItem(s, l[1]); cur.it = -1; go(); });
  E.querySelectorAll('[data-bk]').forEach(b => b.onclick = () => { S.bKind = b.dataset.bk; const o = s.items[cur.it]; if (o && isBasket(o.t)) { const [t, v] = S.bKind.split('|'); o.t = t; o.v = v; } else cur.it = appendItem(s, 'basket'); go(); });
  E.querySelectorAll('[data-pre]').forEach(b => b.onclick = () => { s.items = presetItems(b.dataset.pre); cur.it = -1; go(); });
  E.querySelector('[data-empty]').onclick = () => { s.items = []; cur.it = -1; go(); };
  E.querySelectorAll('[data-row]').forEach(r => r.onclick = ev => { if (ev.target.closest('select,input,button')) return; cur.it = +r.dataset.row; go(); });
  let yt;
  E.querySelectorAll('[data-k]').forEach(el => {
    if (el.dataset.k === 'yr') { el.oninput = () => { const o = s.items[+el.dataset.i]; cur.it = +el.dataset.i; o.y = clampY(+el.value); el.closest('.yrow').querySelector('[data-k=y]').value = o.y; clearTimeout(yt); yt = setTimeout(rebuild, 30); }; el.onchange = go; return; }
    el.onchange = () => {
      const i = +el.dataset.i, o = s.items[i], k = el.dataset.k; cur.it = i;
      if (k === 'var') { const [t, v] = el.value.split('|'); o.t = t; if (v) o.v = v; if (!depthsOf(o).includes(o.d)) o.d = depthsOf(o).includes(40) ? 40 : depthsOf(o)[0]; if (isBasket(o.t)) o.h = o.h || 85; }
      else if (k === 'y') o.y = clampY(+el.value || o.y); else o[k] = +el.value;
      go();
    };
  });
  E.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { const i = +b.dataset.sw, k = ord.findIndex(p => p[1] === i), j = ord[k + +b.dataset.dir]; if (!j) return; const o = s.items[i], p = j[0], t = o.y; o.y = p.y; p.y = t; cur.it = i; go(); });
  E.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { removeItem(s, +b.dataset.del); cur.it = -1; go(); });
  E.querySelectorAll('[data-len]').forEach(b => b.onclick = () => { const [i, mm] = b.dataset.len.split(':').map(Number); cur.it = i; s.w = secW(mm); go(); });
  E.querySelectorAll('[data-dep]').forEach(b => b.onclick = () => { const [i, d] = b.dataset.dep.split(':').map(Number), o = s.items[i]; cur.it = i; o.d = d; s.items.forEach(p => { if (o.g && p.lk === o.g && DEPTHS[p.t].includes(d)) p.d = d; }); go(); });
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
function setWidth(v, live) { const secs = S.walls[cur.w].sections, n = secs.length, w = Math.max(20, Math.min(200, Math.round(Math.max(40, Math.min(720, v)) / n))), ws = live ? w : nearest([45, 60, 90, 120], w); secs.forEach(s => s.w = ws);  $('fW').value = $('rW').value = (live ? w : ws) * n; later(() => { rebuild(); if (!live) renderSec(); }, live); }
function setHeight(v, live) { const lift = liftCm(); S.postH = Math.max(500, Math.min(3000, Math.round(v) * 10)); S.railTop = lift + S.postH / 10 + 1; S.walls.forEach(w => w.sections.forEach(s => s.items.forEach(o => o.y = clampY(o.y)))); $('fH').value = $('rH').value = Math.round(S.postH / 10); later(() => { fillDims(); rebuild(); if (!live) renderSec(); }, live); }
function setDepth(v, live) { const d = [30, 40, 50].reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a); S.depth = d; S.walls.forEach(w => w.sections.forEach(s => s.items.forEach(o => { const D = DEPTHS[o.t]; o.d = D.reduce((a, b) => Math.abs(b - d) < Math.abs(a - d) ? b : a); }))); $('fD').value = $('rD').value = d; later(() => { rebuild(); if (!live) renderSec(); }, live); }
function setLift(v, live) { const d = Math.round(v) - liftCm(); if (!d) return; S.railTop += d; S.walls.forEach(w => w.sections.forEach(s => s.items.forEach(o => o.y += d))); $('liftV').textContent = liftCm(); $('railTop').value = S.railTop; later(() => { rebuild(); if (!live) renderSec(); }, live); }
[['W', setWidth], ['H', setHeight], ['D', setDepth]].forEach(([k, f]) => { $('r' + k).oninput = e => f(+e.target.value, true); $('r' + k).onchange = e => f(+e.target.value); $('f' + k).onchange = e => f(+e.target.value || 0); });
$('lift').oninput = e => setLift(+e.target.value, true); $('lift').onchange = e => setLift(+e.target.value);
$('layout').innerHTML = Object.entries(LAYOUTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
$('layout').onchange = e => { S.layout = e.target.value; cur = { w: 0, s: 0 }; rebuild(); renderSec(); fillDims(); };
function mirror() {
  // every wall keeps its own shift from its corner; the left and right walls swap places
  const W0 = S.walls[0]; W0.sections.reverse(); if (W0.postL) { const n = W0.sections.length, nl = {}; Object.entries(W0.postL).forEach(([k, v]) => nl[n - +k] = v); W0.postL = nl; }
  if (S.layout !== 'straight') { const t = S.walls[1]; S.walls[1] = S.walls[2]; S.walls[2] = t; S.walls[1].gap = S.walls[1].gap || 0; S.walls[2].gap = S.walls[2].gap || 0; }
  if (S.layout === 'U') { const t = W0.gap || 0; W0.gap = W0.gapR || 0; W0.gapR = t; }
  if (S.layout === 'L') S.layout = 'Lr'; else if (S.layout === 'Lr') S.layout = 'L';
  if (S.layout === 'Lr' && cur.w === 1) cur.w = 2; else if (S.layout === 'L' && cur.w === 2) cur.w = 1;
  cur.s = Math.max(0, S.walls[cur.w].sections.length - 1 - cur.s);
  rebuild(); renderSec(); fillDims();
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
$('tplBtn').onclick = () => $('tplPop').classList.toggle('hide');
$('tplSave').onclick = () => { const n = prompt('Название шаблона', 'Мой шаблон ' + (tpls().length + 1)); if (!n || !n.trim()) return; const a = tpls(); a.push({ name: n.trim(), cfg: JSON.parse(JSON.stringify(S)) }); saveT(a); renderTpl(); msg('Шаблон сохранен'); };
renderTpl();
// ---------- snap guide ----------
const snapLine = new THREE.Mesh(new THREE.BoxGeometry(1, 0.004, 0.004), new THREE.MeshBasicMaterial({ color: 0xe0242b, depthTest: false, transparent: true, opacity: 0.9, toneMapped: false })); snapLine.renderOrder = 20; snapLine.visible = false; scene.add(snapLine);
let snapT = 0;
// brief thin line across the sections of the dragged wall
function showSnap(y, wi) { const g = WG[wi]; if (!g) return; const tot = wallWidth(wi) * MM; g.updateMatrixWorld(true); snapLine.matrixAutoUpdate = false; const m = new THREE.Matrix4().compose(V(tot / 2, y / 100 + 0.002, 0.07), new THREE.Quaternion(), V(tot + 0.1, 0.6, 0.6)); snapLine.matrix.multiplyMatrices(g.matrixWorld, m); snapLine.visible = true; clearTimeout(snapT); snapT = setTimeout(() => { snapLine.visible = false; }, 700); }
function hideSnap() { snapLine.visible = false; }
// tiny haptic tick: Android vibrate, iOS 17.4+ Safari via hidden switch checkbox
const hapEl = (() => { const l = document.createElement('label'); l.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px;overflow:hidden;opacity:0'; l.innerHTML = '<input type="checkbox" switch>'; document.body.appendChild(l); return l; })();
function haptic() { try { if (navigator.vibrate) { navigator.vibrate(10); return; } hapEl.click(); } catch (er) {} }
// ---------- pick, tap and drag ----------
const RC = new THREE.Raycaster(); RC.params.Line.threshold = 0; RC.params.Points.threshold = 0;
const findRef = o => { while (o) { if (o.userData && o.userData.ref) return o; o = o.parent; } return null; };
const visDeep = o => { while (o) { if (o.visible === false) return false; o = o.parent; } return true; };
// combo rail belongs to its shelf: always act on the main item
function mainIdx(wi, si, ii) { const sc = S.walls[wi].sections[si], o = sc && sc.items[ii]; if (o && o.lk) { const p = sc.items.findIndex(q => q.g === o.lk); if (p >= 0) return p; } return ii; }
function pickHits(e) { const el = renderer.domElement, r = el.getBoundingClientRect(); RC.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  return RC.intersectObjects(model.children, true).filter(h => h.object.isMesh && h.object !== catcher && !h.object.userData.contact && visDeep(h.object)); }
function itemGroups(wi, si, idxs) { const out = []; model.traverse(o => { const r = o.userData.ref; if (r && r.wi === wi && r.si === si && idxs.includes(r.ii)) out.push(o); }); return out; }
{
  const el = renderer.domElement, tip = $('dragTip');
  window.__gsDrag = { start: null };
  el.addEventListener('pointerdown', e => {
    if (!orb.on || e.button !== 0 || cur.it < 0) return;
    // the selected item can be grabbed even if another item overlaps it
    const hit = pickHits(e).find(h => { const g = findRef(h.object); if (!g) return false; const { wi, si, ii } = g.userData.ref; return wi === cur.w && si === cur.s && mainIdx(wi, si, ii) === cur.it; });
    if (!hit) return; const sc = S.walls[cur.w].sections[cur.s], o = sc.items[cur.it]; if (!o) return;
    const linked = sc.items.map((p, i) => [p, i]).filter(([p]) => o.g && p.lk === o.g), r = el.getBoundingClientRect();
    drag = { cx: e.clientX, cy: e.clientY, t0: performance.now(), drop: o.y - itemBot(o) * 100, o, linked: linked.map(p => p[0]), gs: itemGroups(cur.w, cur.s, [cur.it, ...linked.map(p => p[1])]), y0: o.y, ly0: linked.map(p => p[0].y), py: e.clientY, unit: hit.distance * Math.tan(camera.fov * Math.PI / 360) * 2 / (el.clientHeight || 600) * 100, wi: cur.w, si: cur.s };
    e.stopImmediatePropagation(); el.setPointerCapture(e.pointerId);
    tip.classList.remove('hide'); tip.textContent = `от пола ${o.y} см`; tip.style.left = (e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top - 34) + 'px';
  }, true);
  el.addEventListener('pointermove', e => {
    if (!drag) return; e.stopImmediatePropagation(); const r = el.getBoundingClientRect();
    if (!drag.moved && Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) < 6) return; drag.moved = true;
    const lo = Math.max(Math.ceil(postBottom() / 10) + 3, Math.ceil(secLo(drag.wi, drag.si) - 3 + drag.drop));
    let ny = Math.max(lo, Math.min(S.railTop - 4, Math.round(drag.y0 + (drag.py - e.clientY) * drag.unit)));
    // alignment with a shelf in another section: haptic tick + brief guide line, no snapping
    { let best = null; wallsBuilt().forEach(wi => S.walls[wi].sections.forEach((sc, si) => { if (wi === drag.wi && si === drag.si) return; sc.items.forEach(p => { if (!p.lk && p.t !== 'rail' && p.y === ny) best = p.y; }); }));
      if (best != null) { if (drag.snap !== best) { drag.snap = best; haptic(); showSnap(best, drag.wi); } } else drag.snap = null; }
    const dy = ny - drag.y0; drag.o.y = ny; drag.linked.forEach((p, k) => p.y = drag.ly0[k] + dy);
    drag.gs.forEach(g => g.position.y = dy / 100);
    if (dimsOn() && !drag.t) drag.t = setTimeout(() => { if (drag) { drag.t = 0; rebuildDims(); } }, 60);
    tip.textContent = `от пола ${ny} см${drag.snap === ny ? ' · вровень' : ''}`; tip.style.left = (e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top - 34) + 'px'; nbTip(drag, e, r);
  }, true);
  const up = e => { if (!drag) return; e.stopImmediatePropagation(); clearTimeout(drag.t); const tap = !drag.moved && performance.now() - drag.t0 < 600; drag = null; tip.classList.add('hide'); $('dragTipL').classList.add('hide'); if (tap && e.type === 'pointerup') return handleTap(e); rebuild(); renderSec(); };
  el.addEventListener('pointerup', up, true); el.addEventListener('pointercancel', up, true);
}
document.querySelectorAll('[data-cam]').forEach(b => b.onclick = () => { lastCam = b.dataset.cam; camTo(lastCam); });
const msg = t => { $('msg').textContent = t; setTimeout(() => $('msg').textContent = '', 3000); };
$('shareBtn').onclick = async () => { const u = location.origin + location.pathname + '?cfg=' + btoa(unescape(encodeURIComponent(JSON.stringify(S)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); try { await navigator.clipboard.writeText(u); msg('Ссылка скопирована'); } catch (e) { prompt('Ссылка на конфигурацию', u); } };
$('saveBtn').onclick = () => { localStorage.setItem('gs_saved', JSON.stringify(S)); msg('Конфигурация сохранена'); };
$('loadBtn').onclick = () => { const v = load('gs_saved'); if (!v) return msg('Сохраненной конфигурации нет'); S = migrate(v); cur = { w: 0, s: 0 }; fillGeneral(); rebuild(); renderSec(); renderDeco(); setBg(); camTo(lastCam); msg('Конфигурация загружена'); };
$('resetBtn').onclick = () => { if (!confirm('Сбросить все настройки?')) return; S = migrate(defaults()); cur = { w: 0, s: 0, it: -1 }; lastCam = 'nice'; fillGeneral(); cardUI(); rebuild(); renderSec(); setBg(); renderDeco(); camTo('nice'); if (window.goStep) goStep(0); };

async function fontsFor(C) { const f = { montserrat: 'Montserrat', inter: 'Inter', playfair: 'Playfair Display' }[C.font] || 'Manrope'; await Promise.all([document.fonts.load(`700 60px "${f}"`, 'Наполнение КАРКАС 0123'), document.fonts.load('500 30px Manrope', 'Наполнение КАРКАС 0123'), document.fonts.load('800 48px Manrope', 'Наполнение КАРКАС 0123'), document.fonts.load(`800 48px "${f}"`, 'Наполнение КАРКАС 0123'), document.fonts.load(`500 30px "${f}"`, 'Наполнение КАРКАС 0123')]).catch(() => {}); }
$('cardBtn').onclick = async () => { cardRead(); await fontsFor(S.card); const o = cleanShot(makeCard); o.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'kartochka-900x1200.png'; a.click(); }, 'image/png'); };
$('cAuto').onclick = () => { S.card.size = overall(); S.card.panel = specData().cardLines.join('\n'); cardUI(); cardRead(); };
['cPX', 'cPY', 'cPW', 'cSSize', 'cSColor', 'cTSize', 'cTColor', 'cTY', 'cPColor', 'cPOp', 'cPScale', 'cPFit', 'cFont', 'cTitle', 'cTOn', 'cSize', 'cSOn', 'cPanel', 'cPOn', 'cPos', 'cNote', 'cNOn', 'cDims'].forEach(id => $(id).onchange = cardRead);
$('sunT').onchange = e => { S.sun = e.target.checked; rebuild(); };
$('setTpl').onchange = e => { if (e.target.value) setTemplate(e.target.value); e.target.value = ''; };
$('bStyle').onchange = e => { S.basketStyle = e.target.value; rebuild(); };
[['ceilT', 'ceiling'], ['skirtT', 'skirting'], ['lampT', 'lamps'], ['shOnT', 'shOn']].forEach(([id, k]) => $(id).onchange = e => { S.room[k] = e.target.checked; rebuild(); });
[['angR', 'angle', 'angV', v => v + '°'], ['shAng', 'shAng', 'shAngV', v => v + '°'], ['shBlur', 'shBlur', 'shBlurV', v => v], ['shDist', 'shDist', 'shDistV', v => Math.round(v * 100) + '%'], ['glare', 'glare', 'glareV', v => Math.round(v * 100) + '%'], ['shadow', 'shadow', 'shadowV', v => Math.round(v * 100) + '%'], ['roomX', 'extra', 'roomV', v => v], ['ceilH', 'ceilH', 'ceilV', v => v]].forEach(([id, k, lab, f]) => { let t; $(id).oninput = e => { S.room[k] = +e.target.value; $(lab).textContent = f(S.room[k]); clearTimeout(t); t = setTimeout(rebuild, 40); }; });
const SW = ['#b3b1ad', '#c9c7c2', '#ecdcc8', '#e8d3bd', '#f2efe9', '#ffffff', '#dcd9d3', '#c9d3cf', '#d8c3b0', '#bfc7d1'];
$('skirtC').oninput = e => { S.room.skirtColor = e.target.value; rebuild(); }; $('glowS').onchange = e => { S.room.glow = e.target.value; rebuild(); };
$('undoBtn').onclick = undo; $('redoBtn').onclick = redo;
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) { e.preventDefault(); redo(); } } });
$('viewMode').onchange = e => { S.view = e.target.value; rebuild(); };
$('preset').onchange = e => { S.preset = e.target.value; if (S.preset === 'warm') { S.wall = '#ecdcc8'; S.floor = 'oak'; } fillGeneral(); rebuild(); };
fillGeneral(); setBg(); resize(); rebuild(); renderSec(); cardUI(); if (S._cam) { lastCam = S._cam; delete S._cam; } camTo(lastCam === 'card' ? 'card' : 'nice');
const _x=0;window.__gs = { proj: (wi, si, ii) => { let g = null; model.traverse(o => { const r = o.userData.ref; if (r && r.wi === wi && r.si === si && r.ii === ii) g = o; }); const b = new THREE.Box3().setFromObject(g), p = b.getCenter(new THREE.Vector3()); p.z = b.max.z - 0.02; p.y = b.max.y - 0.005; p.project(camera); const r = renderer.domElement.getBoundingClientRect(); return [r.left + (p.x + 1) / 2 * r.width, r.top + (1 - p.y) / 2 * r.height]; }, get cur() { return cur; }, get orb() { return orb; }, get S() { return S; }, set S(v) { S = v; }, rebuild, renderSec, fillGeneral, cardUI, makeCard, makeCardAsync: async () => { cardRead(); await fontsFor(S.card); return makeCard(); }, camTo, setOrb: (az, h, R, tx, ty, tz) => { orb.on = true; controls.enabled = false; orb.az = az; orb.h = h; orb.R = R; orb.T.set(tx, ty, tz); }, dimsG, projP: i => { const p = S.plants[i], v = V(p.x, 0.15, p.z).project(camera), r = renderer.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; }, setLayout: l => { $('layout').value = l; $('layout').onchange({ target: $('layout') }); }, setDims };
document.fonts.ready.then(() => rebuild());
// ---------- v4 extra controls ----------
$('rS').oninput = e => { $('fS').value = e.target.value; S.walls[cur.w].sections.forEach(x => x.w = +e.target.value); clearTimeout(dimT); dimT = setTimeout(rebuild, 40); };
$('rS').onchange = $('fS').onchange = e => { const v = Math.max(20, Math.min(200, +e.target.value || 90)); S.walls[cur.w].sections.forEach(x => x.w = v); rebuild(); renderSec(); };
// tap: item -> select (then it can be dragged), upright -> its popup, wall -> section, empty -> deselect everything
function deselectAll() { const had = cur.it >= 0 || selPost; selPost = null; $('postPop').classList.add('hide'); closeMenus(); cur.it = -1; if (had) { rebuild(); renderSec(); } }
{ const el = renderer.domElement; let d0 = null, multi = 0;
  el.addEventListener('pointerdown', e => { multi++; d0 = multi === 1 ? [e.clientX, e.clientY, performance.now()] : null; }, true);
  const end = () => { multi = Math.max(0, multi - 1); };
  el.addEventListener('pointercancel', () => { end(); d0 = null; }, true);
  el.addEventListener('pointerup', e => {
    end(); if (!d0 || Math.hypot(e.clientX - d0[0], e.clientY - d0[1]) > 8 || performance.now() - d0[2] > 600) { d0 = null; return; } d0 = null;
    handleTap(e);
  }, true); }
function handleTap(e) {
    if (window.__plantTap) { window.__plantTap = false; return; }
    const hits = pickHits(e); closeMenus();
    if (!hits.length) return deselectAll();
    const h0 = hits[0];
    if (h0.object.userData.post) { selPost = h0.object.userData.post; cur.it = -1; rebuild(); renderSec(); showPostPop(); return; }
    if (selPost) { selPost = null; $('postPop').classList.add('hide'); }
    if (findRef(h0.object)) {
      // overlapping items: a second tap on the same spot selects the item behind
      const refs = []; hits.forEach(h => { const g = findRef(h.object); if (!g || h.distance > h0.distance + 0.25) return; const { wi, si, ii } = g.userData.ref, k = [wi, si, mainIdx(wi, si, ii)]; if (!refs.some(r => r.join() === k.join())) refs.push(k); });
      let k = refs[0]; const ci = refs.findIndex(r => r[0] === cur.w && r[1] === cur.s && r[2] === cur.it); if (ci >= 0 && refs.length > 1) k = refs[(ci + 1) % refs.length];
      cur = { w: k[0], s: k[1], it: k[2] }; rebuild(); renderSec(); if (window.goStep) goStep(1); return;
    }
    let o = h0.object; while (o && o.userData.wi == null) o = o.parent;
    if (!o) return deselectAll();
    const wi = o.userData.wi, x = o.worldToLocal(h0.point.clone()).x; let acc = 0, si = -1;
    S.walls[wi].sections.forEach((sc, i) => { if (x >= acc - 0.02 && x <= acc + sc.w / 100 + 0.02 && si < 0) si = i; acc += sc.w / 100; });
    cur = { w: wi, s: si < 0 ? cur.s : si, it: -1 }; rebuild(); renderSec();
}
// WB 3:4 snapshot with side air for plaques
$('wbBtn').onclick = () => cleanShot(wbShot);
function wbShot() {
  const CW = 1800, CH = 2400, sv = { pos: camera.position.clone(), pr: renderer.getPixelRatio(), q: camera.quaternion.clone() }, sm = sun.shadow.mapSize.x;
  sun.shadow.mapSize.set(4096, 4096); sun.shadow.map && (sun.shadow.map.dispose(), sun.shadow.map = null);
  renderer.setPixelRatio(1); renderer.setSize(CW, CH, false); camera.aspect = CW / CH; camera.updateProjectionMatrix(); if (orb.on) applyCam();
  // the work canvas is already 3:4, so the shot is exactly the visible frame
  renderer.render(scene, camera);
  renderer.domElement.toBlob(bl => { const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = 'garderob-wb-1800x2400.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, 'image/png');
  sun.shadow.mapSize.set(sm, sm); sun.shadow.map && (sun.shadow.map.dispose(), sun.shadow.map = null);
  renderer.setPixelRatio(sv.pr); resize(); camera.position.copy(sv.pos); camera.quaternion.copy(sv.q);
};

$('niceBtn').onclick = () => { lastCam = 'nice'; camTo('nice'); rebuildDims(); };

{ const o = $('ceilT').onchange; $('ceilT').onchange = e => { o(e); setBg(); }; }
// ---------- stepper ----------
{
  const P = $('panel'), G = [...P.querySelectorAll(':scope > .grp')], names = ['Каркас', 'Наполнение', 'Оформление', 'Готово'];
  const stepOf = g => Math.min(3, G.indexOf(g)); // card and photo blocks belong to step 4
  const bar = document.createElement('div'); bar.id = 'stepper'; bar.innerHTML = names.map((n, i) => `<button data-step="${i}"><b>${i + 1}</b> ${n}</button>`).join(''); P.prepend(bar);
  G.forEach(g => { const i = stepOf(g); g.dataset.st = i; g.querySelector('h3').textContent = g.querySelector('h3').textContent.replace(/^\d\.\s*/, ''); });
  [0, 1, 2].forEach(i => { const nb = document.createElement('div'); nb.className = 'btns next'; nb.innerHTML = `<button class="acc" data-go="${i + 1}">Далее: ${names[i + 1]} →</button>`; G[i].appendChild(nb); });
  const foot = P.querySelector(':scope > p.foot'); if (foot) foot.dataset.st = 3;
  window.goStep = i => { P.querySelectorAll('[data-st]').forEach(e => e.classList.toggle('hide', +e.dataset.st !== i)); bar.querySelectorAll('[data-step]').forEach(b => b.classList.toggle('on', +b.dataset.step === i)); P.scrollTop = 0; bar.scrollIntoView({ block: 'nearest' }); };
  bar.querySelectorAll('[data-step]').forEach(b => b.onclick = () => goStep(+b.dataset.step));
  P.querySelectorAll('[data-go]').forEach(b => b.onclick = () => goStep(+b.dataset.go));
  goStep(0);
  // tapping a section in 3D opens step 2
  const sv = Element.prototype.scrollIntoView; $('secEdit').scrollIntoView = function (o) { goStep(1); sv.call(this, o); };
}

const dimBtnUI = () => $('dimBtn').classList.toggle('on', dimsOn());


function showPostPop() {
  const p = $('postPop'), { wi, i } = selPost, L = postLen(wi, i), n = S.walls[wi].sections.length, edge = i === 0 || i === n;
  p.innerHTML = `<b>Стойка ${i + 1}${wallsActive().length > 1 ? ' · ' + (wi === 0 ? 'основная стена' : 'вторая стена') : ''}</b> <span class="foot">длина, мм</span><div class="sz">${[512, 1025, 1156, 1536, 1920, 2304].map(v => `<button data-pl="${v}" class="${v === L ? 'on' : ''}">${v}</button>`).join('')}</div><div class="btns"><button class="mini danger" id="postDel" ${edge ? 'disabled' : ''}>Убрать стойку</button><button class="mini" id="postClose">Готово</button></div>${edge ? '<div class="foot">Крайнюю стойку убрать нельзя</div>' : '<div class="foot">Соседние секции объединятся, полки на этой стойке удалятся</div>'}`;
  p.classList.remove('hide');
  $('postDel').onclick = () => { if (edge) return; const W = S.walls[wi], a = W.sections[i - 1], b = W.sections[i];
    W.sections.splice(i - 1, 2, { w: a.w + b.w, items: [] });
    if (W.postL) { const nl = {}; Object.entries(W.postL).forEach(([k, v]) => { k = +k; if (k < i) nl[k] = v; else if (k > i) nl[k - 1] = v; }); W.postL = nl; }
    cur = { w: wi, s: i - 1, it: -1 }; selPost = null; p.classList.add('hide'); rebuild(); renderSec(); msg('Стойка убрана, секции объединены'); };
  p.querySelectorAll('[data-pl]').forEach(b => b.onclick = () => { const W = S.walls[wi]; W.postL = W.postL || {}; W.postL[i] = +b.dataset.pl; if (W.postL[i] === S.postH) delete W.postL[i]; rebuild(); renderSec(); showPostPop(); });
  $('postClose').onclick = () => { selPost = null; p.classList.add('hide'); rebuild(); };
}

$('cornT').checked = !!S.room.cornice; $('cornT').onchange = e => { S.room.cornice = e.target.checked; rebuild(); };

// ================= v7 =================
function closeMenus() { ['dimPop', 'morePop'].forEach(id => $(id) && $(id).classList.add('hide')); }
function cleanShot(fn) {
  const sv = { it: cur.it, sp: selPost }, need = sv.it >= 0 || !!sv.sp; flashG.visible = false; snapLine.visible = false;
  if (need) { cur.it = -1; selPost = null; histLock = true; rebuild(); histLock = false; }
  try { return fn(); } finally { flashG.visible = true; if (need) { cur.it = sv.it; selPost = sv.sp; histLock = true; rebuild(); histLock = false; } }
}
// wall outline flash (never in snapshots: cleanShot hides it)
const flashG = new THREE.Group(); scene.add(flashG); let flashT0 = 0, flashMat = null;
function flashWall(wi) {
  const g = WG[wi]; if (!g) return; flashG.clear(); g.updateMatrixWorld(true);
  const tot = wallWidth(wi) * MM, top = S.railTop * 10 * MM + 0.035, xs = [0]; S.walls[wi].sections.forEach(s => xs.push(xs[xs.length - 1] + s.w / 100));
  const bot = Math.min(...xs.map((x, i) => (S.railTop * 10 - 10 - postLen(wi, i)) * MM)) - 0.035, x0 = -0.05, x1 = tot + 0.05, th = 0.007, z = 0.012;
  flashMat = new THREE.MeshBasicMaterial({ color: 0x2f7bff, transparent: true, opacity: 0, depthTest: false, toneMapped: false });
  const h = new THREE.Group(); h.matrixAutoUpdate = false; h.matrix.copy(g.matrixWorld); flashG.add(h);
  [[x1 - x0, th, (x0 + x1) / 2, top], [x1 - x0, th, (x0 + x1) / 2, bot], [th, top - bot, x0, (top + bot) / 2], [th, top - bot, x1, (top + bot) / 2]].forEach(([w, hh, x, y]) => { const m = new THREE.Mesh(BOX, flashMat); m.scale.set(w, hh, th); m.position.set(x, y, z); m.renderOrder = 30; h.add(m); });
  flashT0 = performance.now();
}
function tickFlash() { if (!flashMat) return; const t = (performance.now() - flashT0) / 1000; if (t > 1.3) { flashG.clear(); flashMat = null; return; } flashMat.opacity = 0.9 * Math.abs(Math.sin(t * Math.PI * 1.55)) * (1 - t / 1.3); }
// raise-from-floor: standard mark at 20 cm with haptic tick
{ let prev = liftCm(); $('lift').addEventListener('input', e => { const v = +e.target.value; if (v !== prev && (v === 20 || Math.sign(prev - 20) * Math.sign(v - 20) < 0)) haptic(); prev = v; }); }
// delete selected item from the bottom strip
$('delBtn').onclick = () => { const sc = S.walls[cur.w].sections[cur.s]; if (!sc || cur.it < 0 || !sc.items[cur.it]) return; removeItem(sc, cur.it); cur.it = -1; rebuild(); renderSec(); };
// top bar: view switch, mirror, more menu
$('mirrorBtn').onclick = mirror;
$('moreBtn').onclick = e => { e.stopPropagation(); $('dimPop').classList.add('hide'); $('morePop').classList.toggle('hide'); };
$('tplBtn').onclick = () => $('tplPop').classList.toggle('hide');
$('pngTop').onclick = () => { closeMenus(); $('pngBtn').click(); }; $('wbTop').onclick = () => { closeMenus(); $('wbBtn').click(); };
['saveBtn', 'loadBtn', 'shareBtn'].forEach(id => $(id).addEventListener('click', () => $('morePop').classList.add('hide')));
document.addEventListener('pointerdown', e => { if (!e.target.closest('#morePop,#moreBtn,#dimPop,#dimBtn')) closeMenus(); });
// dimensions menu
function renderDimPop() {
  const D = S.dm, all = ['o', 's', 'h', 'g', 'sd'].every(k => D[k]);
  const ck = (k, t) => `<label class="chk"><input type="checkbox" data-dk="${k}" ${(k === 'all' ? all : D[k]) ? 'checked' : ''}> ${t}</label>`;
  $('dimPop').innerHTML = `<b>Размеры</b>${ck('all', 'Все')}${ck('o', 'Общая высота и ширина')}${ck('s', 'Ширина секций')}${ck('h', 'Высота полок от пола (↑)')}${ck('g', 'Расстояние между полками')}${ck('sd', 'Ширина × глубина полок')}
  <div class="szlab">Линии</div><div class="sz"><button data-ds="bold" class="${S.dimStyle !== 'thin' ? 'on' : ''}">Жирные</button><button data-ds="thin" class="${S.dimStyle === 'thin' ? 'on' : ''}">Тонкие</button></div>
  <div class="szlab">Цвет</div><div class="sz"><button data-dcl="white" class="${S.dimC !== 'black' ? 'on' : ''}">Белый</button><button data-dcl="black" class="${S.dimC === 'black' ? 'on' : ''}">Черный</button></div>
  <div class="btns"><button class="mini danger" id="dimOff">Выключить размеры</button></div>`;
  const P = $('dimPop'), upd = () => { rebuildDims(); dimBtnUI(); renderDimPop(); localStorage.setItem('gs_auto', JSON.stringify(S)); pushHist(); };
  P.querySelectorAll('[data-dk]').forEach(c => c.onchange = () => { const k = c.dataset.dk; if (k === 'all') ['o', 's', 'h', 'g', 'sd'].forEach(x => D[x] = c.checked); else D[k] = c.checked; upd(); });
  P.querySelectorAll('[data-ds]').forEach(b => b.onclick = () => { S.dimStyle = b.dataset.ds; upd(); });
  P.querySelectorAll('[data-dcl]').forEach(b => b.onclick = () => { S.dimC = b.dataset.dcl; upd(); });
  $('dimOff').onclick = () => { ['o', 's', 'h', 'g', 'sd'].forEach(x => D[x] = false); upd(); P.classList.add('hide'); };
}
$('dimBtn').onclick = e => { e.stopPropagation(); $('morePop').classList.add('hide'); const P = $('dimPop'); if (P.classList.contains('hide') && !dimsOn()) { S.dm.o = S.dm.s = true; rebuildDims(); dimBtnUI(); } renderDimPop(); P.classList.toggle('hide'); };
dimBtnUI();
// ---- color picker: curated interior tones + HSV field with draggable marker, hue and brightness strips; applies live
const TONES = ['#a9a49c', '#b3b1ad', '#9e9b96', '#c9c6c0', '#dcd9d3', '#ecebe7', '#f4f1ea', '#e9e2d6', '#ddd0bf', '#ecdcc8', '#d8c3b0', '#c7b39c', '#b9a58f', '#cfd3cc', '#b8c2b5', '#9fab9c', '#c9d3cf', '#bfc7d1', '#a9b4bf', '#d9cfc7', '#cdb9ae', '#b79f93', '#8f8b86', '#6f6c69', '#4d4c4b'];
const hex2hsv = h => rgb2hsv(...hexRgb(h));
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
function rgb2hsv(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; return [h, mx ? d / mx : 0, mx]; }
function hsv2hex(h, s, v) { const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return '#' + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); }
function colorPicker(box, get, set, tones) {
  let tab = 'ready', hsv = hex2hsv(get());
  const draw = () => {
    box.innerHTML = `<div class="cpk"><div class="cphead"><span class="cpsw" style="background:${get()}"></span><div class="seg2"><button data-ct="ready" class="${tab === 'ready' ? 'on' : ''}">Готовые тона</button><button data-ct="own" class="${tab === 'own' ? 'on' : ''}">Свой цвет</button></div></div>` +
      (tab === 'ready' ? `<div class="cpgrid">${tones.map(c => `<button style="background:${c}" data-c="${c}" class="${c === get() ? 'on' : ''}" title="${c}"></button>`).join('')}</div>`
        : `<div class="cpfield"><canvas width="240" height="150"></canvas><i class="cpdot"></i></div><div class="cpstrip hue"><i></i></div><div class="cpstrip val"><i></i></div>`) + '</div>';
    box.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => { tab = b.dataset.ct; hsv = hex2hsv(get()); draw(); });
    box.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { set(b.dataset.c, true); draw(); });
    if (tab !== 'own') return;
    const fld = box.querySelector('.cpfield'), cv = fld.querySelector('canvas'), dot = fld.querySelector('.cpdot'), hue = box.querySelector('.hue'), val = box.querySelector('.val'), sw = box.querySelector('.cpsw');
    const paint = () => { const g = cv.getContext('2d'), W = cv.width, H = cv.height; g.fillStyle = hsv2hex(hsv[0], 1, 1); g.fillRect(0, 0, W, H); let gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      dot.style.left = hsv[1] * 100 + '%'; dot.style.top = (1 - hsv[2]) * 100 + '%'; dot.style.background = hsv2hex(...hsv);
      hue.querySelector('i').style.left = hsv[0] / 360 * 100 + '%'; val.style.background = `linear-gradient(90deg,#000,${hsv2hex(hsv[0], hsv[1], 1)})`; val.querySelector('i').style.left = hsv[2] * 100 + '%'; sw.style.background = hsv2hex(...hsv); };
    const apply = fin => { set(hsv2hex(...hsv), fin); paint(); };
    const drag = (el, f) => { const mv = e => { const r = el.getBoundingClientRect(); f(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))); apply(false); };
      el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); mv(e); el.onpointermove = mv; e.preventDefault(); });
      el.addEventListener('pointerup', () => { el.onpointermove = null; apply(true); }); el.style.touchAction = 'none'; };
    drag(fld, (x, y) => { hsv[1] = x; hsv[2] = 1 - y; }); drag(hue, x => { hsv[0] = x * 359.9; }); drag(val, x => { hsv[2] = x; });
    paint();
  };
  draw(); return draw;
}
let wallT = 0;
function liveWall(c, fin) { S.wall = c; $('wall').value = c; room.traverse(o => { if (o.material && o.material.userData && o.material.userData.wall) o.material.color.set(c); }); clearTimeout(wallT); if (fin) wallT = setTimeout(() => { localStorage.setItem('gs_auto', JSON.stringify(S)); pushHist(); }, 200); }
const drawWallPick = colorPicker($('wallPick'), () => S.wall, liveWall, TONES);
const BGT = ['#ffffff', '#f6f4f0', '#efece7', '#e9e6e0', '#e4e7ea', '#ddd8cf', '#d4d9d2', '#cfd6de', '#e8ded3', '#c9c6c0', '#8f8b86', '#2b2b2b'];
const drawBgPick = colorPicker($('bgPick'), () => S.bg || '#e2ded7', (c, fin) => { S.bg = c; setBg(); if (fin) { localStorage.setItem('gs_auto', JSON.stringify(S)); pushHist(); } }, BGT);
function renderDeco() {
  const st = !!S.studio, R = S.room; $('dRoom').classList.toggle('hide', st); $('dStudio').classList.toggle('hide', !st);
  document.querySelectorAll('[data-dt]').forEach(b => b.classList.toggle('on', (b.dataset.dt === 'studio') === st));
  const fin = S.wallFin || 'paint', fv = finVar();
  $('finBtns').innerHTML = [['paint', 'Краска'], ['plaster', 'Штукатурка'], ['paper', 'Обои']].map(([k, t]) => `<button data-fin="${k}" class="${fin === k ? 'on' : ''}">${t}</button>`).join('');
  $('finVars').innerHTML = FINS[fin].map(([k, t]) => `<button data-fv="${k}" class="${fv === k ? 'on' : ''}"><i style="background-image:url(${finSwatch(k)})"></i><span>${t}</span></button>`).join('');
  const FL = [['oak', 'Паркет', 'herringbone_parquet', ''], ['lam', 'Светлый ламинат', 'laminate_floor_02', ''], ['lamD', 'Темный ламинат', 'wood_floor_worn', 'filter:brightness(.62) saturate(1.1)'], ['conc', 'Керамогранит бетон', 'concrete_floor_worn_001', 'filter:brightness(1.08) grayscale(.4)'], ['marble', 'Керамогранит мрамор', 'marble_01', ''], ['carpet', 'Ковролин', '', '']];
  $('floorBtns').innerHTML = FL.map(([k, t, tx, f]) => `<button data-fl="${k}" class="${S.floor === k ? 'on' : ''}"><i style="${tx ? `background-image:url(tex/${tx}_diff.jpg);background-size:${k === 'oak' ? 160 : 120}%;${f}` : 'background:#b9ab98'}"></i><span>${t}</span></button>`).join('');
  $('finBtns').querySelectorAll('[data-fin]').forEach(b => b.onclick = () => { S.wallFin = b.dataset.fin; $('wallFin').value = S.wallFin; rebuild(); renderDeco(); });
  $('finVars').querySelectorAll('[data-fv]').forEach(b => b.onclick = () => { S.wallVar = Object.assign({}, S.wallVar, { [fin]: b.dataset.fv }); rebuild(); renderDeco(); });
  $('floorBtns').querySelectorAll('[data-fl]').forEach(b => b.onclick = () => { S.floor = b.dataset.fl; $('floor').value = S.floor; rebuild(); renderDeco(); });
  // rug: shape x pile
  const rg = S.rug, carpet = S.floor === 'carpet';
  $('rugBox').innerHTML = carpet ? '' : `<div class="sz"><button data-rs="round" class="${rg && rg.shape === 'round' ? 'on' : ''}">Круглый</button><button data-rs="rect" class="${rg && rg.shape === 'rect' ? 'on' : ''}">Прямоугольный</button></div><div class="sz"><button data-rp="fluffy" class="${rg && rg.pile === 'fluffy' ? 'on' : ''}">Пушистый</button><button data-rp="flat" class="${rg && rg.pile === 'flat' ? 'on' : ''}">Плоский</button><button data-rugoff="1" class="${rg ? '' : 'on'}">Убрать ковер</button></div>`;
  $('rugNote').textContent = carpet ? 'На ковролин ковер не кладется: выберите другой пол.' : '';
  $('rugBox').querySelectorAll('[data-rs]').forEach(b => b.onclick = () => { S.rug = { shape: b.dataset.rs, pile: (S.rug && S.rug.pile) || 'flat' }; rebuild(); renderDeco(); });
  $('rugBox').querySelectorAll('[data-rp]').forEach(b => b.onclick = () => { S.rug = { shape: (S.rug && S.rug.shape) || 'rect', pile: b.dataset.rp }; rebuild(); renderDeco(); });
  $('rugBox').querySelectorAll('[data-rugoff]').forEach(b => b.onclick = () => { S.rug = null; rebuild(); renderDeco(); });
  // openings
  $('openBtns').innerHTML = `<button data-op="win" class="${R.win ? 'on' : ''}">Окно</button><button data-op="door" class="${R.door ? 'on' : ''}">Дверной проем</button>`;
  $('openBtns').querySelectorAll('[data-op]').forEach(b => b.onclick = () => { R[b.dataset.op] = !R[b.dataset.op]; rebuild(); renderDeco(); });
  $('winXL').classList.toggle('hide', !R.win); $('winX').value = R.winX || 0; $('winXV').textContent = R.winX || 0;
  // plants
  $('plantBtns').innerHTML = Object.entries(PLANTS).map(([k, t]) => `<button data-pa="${k}">+ ${t}</button>`).join('');
  $('plantList').innerHTML = (S.plants || []).map((p, i) => `<div class="plrow${plantSel === i ? ' sel' : ''}"><span>${PLANTS[p.k]}</span><input type="range" data-ps="${i}" min="0.6" max="1.5" step="0.05" value="${p.s || 1}" title="Размер"><button class="mini danger" data-pd="${i}">✕</button></div>`).join('');
  $('plantBtns').querySelectorAll('[data-pa]').forEach(b => b.onclick = () => { const n = (S.plants || []).length, [x, z] = plantSpot(n); S.plants = [...(S.plants || []), { k: b.dataset.pa, x, z, s: 1, r: n * 1.7 }]; plantSel = n; rebuild(); renderDeco(); });
  $('plantList').querySelectorAll('[data-ps]').forEach(el => { el.oninput = () => { const i = +el.dataset.ps; S.plants[i].s = +el.value; plantSel = i; const g = decor.children.find(c => c.userData.plant === i); if (g) g.scale.setScalar(+el.value); }; el.onchange = () => { rebuild(); }; });
  $('plantList').querySelectorAll('[data-pd]').forEach(b => b.onclick = () => { S.plants.splice(+b.dataset.pd, 1); plantSel = -1; rebuild(); renderDeco(); });
  $('ceilT2').checked = !!R.ceiling; $('cornT').checked = !!R.cornice; $('skirtT').checked = R.skirting !== false;
  renderLight(); renderSwatches(); renderAng();
  drawWallPick(); drawBgPick();
}
let plantSel = -1;
function renderLight() {
  const R = S.room;
  $('shPBtns').innerHTML = [['soft', 'Мягкая рядом'], ['left', 'Четкая слева'], ['right', 'Четкая справа'], ['top', 'Сверху'], ['none', 'Без тени']].map(([k, t]) => `<button data-shp="${k}" class="${(R.shP || 'soft') === k ? 'on' : ''}">${t}</button>`).join('');
  $('glMBtns').innerHTML = [['soft', 'Мягкие'], ['bright', 'Яркие'], ['off', 'Выкл']].map(([k, t]) => `<button data-glm="${k}" class="${(R.glareM || 'soft') === k ? 'on' : ''}">${t}</button>`).join('');
  $('winL').value = R.winL || 'off'; $('winL').disabled = !!S.studio;
  $('shPBtns').querySelectorAll('[data-shp]').forEach(b => b.onclick = () => { R.shP = b.dataset.shp; R.shOn = R.shP !== 'none'; rebuild(); renderLight(); });
  $('glMBtns').querySelectorAll('[data-glm]').forEach(b => b.onclick = () => { R.glareM = b.dataset.glm; rebuild(); renderLight(); });
}
$('winL').onchange = e => { S.room.winL = e.target.value; rebuild(); };
{ let t; $('winX').oninput = e => { S.room.winX = +e.target.value; $('winXV').textContent = S.room.winX; clearTimeout(t); t = setTimeout(rebuild, 40); }; }
function renderSwatches() {
  $('metalSw').innerHTML = [['white', 'Белый', '#f7f9fc'], ['silver', 'Серебро', 'linear-gradient(135deg,#eceef0,#a7abaf 55%,#d9dcdf)'], ['black', 'Черный', '#202124']].map(([k, t, c]) => `<button data-msw="${k}" class="${S.metal === k ? 'on' : ''}" title="${t}"><i style="background:${c}"></i><span>${t}</span></button>`).join('');
  $('rodSw').innerHTML = [['white', 'Белый', '#f7f9fc'], ['chrome', 'Хром', 'linear-gradient(135deg,#ffffff,#9aa0a6 45%,#f4f6f8 62%,#7d838a)']].map(([k, t, c]) => `<button data-rsw="${k}" class="${(S.rod || 'chrome') === k ? 'on' : ''}" title="${t}"><i style="background:${c}"></i><span>${t}</span></button>`).join('');
  $('metalSw').querySelectorAll('[data-msw]').forEach(b => b.onclick = () => { $('metal').value = b.dataset.msw; $('metal').onchange({ target: $('metal') }); });
  $('rodSw').querySelectorAll('[data-rsw]').forEach(b => b.onclick = () => { S.rod = b.dataset.rsw; $('rodC').value = S.rod; rebuild(); renderSwatches(); });
}
// «Раскрыть угол стен»: the same slider in Каркас and Оформление
function renderAng() {
  const on = S.layout !== 'straight', a = S.room.angle || 90;
  const h = on ? `<label>Раскрыть угол стен: <b class="angv">${a}°</b><input type="range" class="angr" min="90" max="115" step="1" value="${a}"></label>` : '';
  ['angBox1', 'angBox2'].forEach(id => $(id).innerHTML = h);
  let t; document.querySelectorAll('.angr').forEach(el => el.oninput = () => { S.room.angle = +el.value; $('angR').value = S.room.angle; document.querySelectorAll('.angr').forEach(o => { if (o !== el) o.value = el.value; }); document.querySelectorAll('.angv').forEach(o => o.textContent = el.value + '°'); clearTimeout(t); t = setTimeout(rebuild, 30); });
}
// corner shift: one slider per wall and corner, in Каркас and at the top of Наполнение (synced)
function gapKeys() { const L = S.layout; return L === 'L' ? [['0', 'Основная стена от угла'], ['1', 'Вторая стена от угла']] : L === 'Lr' ? [['0', 'Основная стена от угла'], ['2', 'Вторая стена от угла']] : L === 'U' ? [['0', 'Основная стена от левого угла'], ['0r', 'Основная стена от правого угла'], ['1', 'Левая стена от угла'], ['2', 'Правая стена от угла']] : []; }
function gapGet(k) { return k === '0r' ? effGapR() : effGap(+k); }
function gapSet(k, v) { if (k === '0r') S.walls[0].gapR = v; else S.walls[+k].gap = v; }
let gapTmr;
function renderGaps() {
  const ks = gapKeys();
  const html = ks.length ? '<div class="szlab">Сдвиг от угла, см</div>' + ks.map(([k, t]) => { const eg = gapGet(k), og = Math.min(300, optGap(k)); return `<label class="gapl">${t}: <b data-gv="${k}">${eg}</b> см<span class="own"><span class="rng"><input type="range" data-gr="${k}" min="0" max="300" step="1" value="${eg}"><i class="opt" style="left:calc(${og / 300} * (100% - 18px) + 9px)" title="Без пересечения полок: ${og} см"></i></span><input type="number" data-gf="${k}" min="0" max="300" step="1" value="${eg}"></span></label>`; }).join('') + '<p class="foot"><i class="opt inl"></i> красная точка — положение, при котором полки двух стен не пересекаются</p>' : '';
  ['posGap', 'posGap2'].forEach(id => $(id).innerHTML = html);
  const set = (k, v, live, src) => { const prev = gapGet(k), nv = Math.max(0, Math.min(300, Math.round(v))); gapSet(k, nv); const og = Math.min(300, optGap(k)); if (prev !== nv && (nv === og || Math.sign(prev - og) !== Math.sign(nv - og))) haptic();
    document.querySelectorAll(`[data-gv="${k}"]`).forEach(e => e.textContent = nv); document.querySelectorAll(`[data-gr="${k}"],[data-gf="${k}"]`).forEach(e => { if (e !== src) e.value = nv; }); clearTimeout(gapTmr); gapTmr = setTimeout(rebuild, live ? 30 : 0); };
  document.querySelectorAll('[data-gr]').forEach(el => { el.oninput = () => set(el.dataset.gr, +el.value, true, el); el.onchange = () => set(el.dataset.gr, +el.value, false, el); });
  document.querySelectorAll('[data-gf]').forEach(el => el.onchange = () => set(el.dataset.gf, +el.value || 0, false, el));
}
document.querySelectorAll('[data-dt]').forEach(b => b.onclick = () => { S.studio = b.dataset.dt === 'studio'; setBg(); rebuild(); renderDeco(); });
$('ceilT2').onchange = e => { S.room.ceiling = e.target.checked; $('ceilT').checked = S.room.ceiling; setBg(); rebuild(); };
{ const o = $('ceilT').onchange; $('ceilT').onchange = e => { o(e); renderDeco(); }; }
{ const o = $('layout').onchange; $('layout').onchange = e => { o(e); renderAng(); renderWallsPop(); }; }
// neighbour distances while dragging: left of the finger, «от пола» on the right
function nbTip(d, e, r) {
  const L = $('dragTipL'), sc = S.walls[d.wi].sections[d.si], o = d.o, me = new Set([o, ...d.linked]); let up = null, dn = null; const t = itemTop(o), b0 = itemBot(o);
  sc.items.forEach(p => { if (me.has(p)) return; const pb = itemBot(p), pt = itemTop(p); if (pb >= t - 0.005) up = up == null ? pb - t : Math.min(up, pb - t); else if (pt <= b0 + 0.005) dn = dn == null ? b0 - pt : Math.min(dn, b0 - pt); });
  L.innerHTML = (up != null ? `<div>↑ ${Math.round(up * 100)} см</div>` : '') + (dn != null ? `<div>↓ ${Math.round(dn * 100)} см</div>` : '');
  L.classList.toggle('hide', up == null && dn == null); L.style.right = (r.width - (e.clientX - r.left) + 22) + 'px'; L.style.top = (e.clientY - r.top - 34) + 'px';
}
// ---- «Стены ▾»: clear or restore the construction on each wall (the room wall stays)
function renderWallsPop() {
  const act = wallsActive(), nm = wi => act.length > 2 ? ['Основная стена', 'Левая стена', 'Правая стена'][wi] : wi === 0 ? 'Основная стена' : 'Вторая стена';
  $('wallsPop').innerHTML = '<b>Стены</b>' + act.map(wi => S.walls[wi].off ? `<button data-won="${wi}" class="acc">${nm(wi)} · Вернуть конструкцию</button>` : `<button data-woff="${wi}">${nm(wi)} · Очистить</button>`).join('') + '<p class="foot">Очистить: убрать стойки, рельс и наполнение с этой стены. Стена комнаты остается, отмена ↶ тоже работает.</p>';
  $('wallsPop').querySelectorAll('[data-woff]').forEach(b => b.onclick = () => { const wi = +b.dataset.woff; S.walls[wi].off = true; if (cur.w === wi) cur.it = -1; selPost = null; $('postPop').classList.add('hide'); rebuild(); renderSec(); renderWallsPop(); msg('Конструкция убрана: ' + nm(wi).toLowerCase()); });
  $('wallsPop').querySelectorAll('[data-won]').forEach(b => b.onclick = () => { const wi = +b.dataset.won; S.walls[wi].off = false; cur = { w: wi, s: 0, it: -1 }; rebuild(); renderSec(); renderWallsPop(); flashWall(wi); });
}
$('wallsBtn').onclick = e => { e.stopPropagation(); ['dimPop', 'morePop'].forEach(id => $(id).classList.add('hide')); renderWallsPop(); $('wallsPop').classList.toggle('hide'); };
document.addEventListener('pointerdown', e => { if (!e.target.closest('#wallsPop,#wallsBtn')) $('wallsPop').classList.add('hide'); });
// ---- 📷: one tap 3:4 snapshot 1800 x 2400 of the current view, without highlights
function snap34() {
  const CW = 1800, CH = 2400, sv = { pos: camera.position.clone(), q: camera.quaternion.clone(), pr: renderer.getPixelRatio() }, sm = sun.shadow.mapSize.x;
  sun.shadow.mapSize.set(4096, 4096); sun.shadow.map && (sun.shadow.map.dispose(), sun.shadow.map = null);
  renderer.setPixelRatio(1); renderer.setSize(CW, CH, false); camera.aspect = CW / CH; camera.updateProjectionMatrix(); if (orb.on) applyCam();
  renderer.render(scene, camera);
  const out = document.createElement('canvas'); out.width = CW; out.height = CH; const g = out.getContext('2d');
  if (photoImg && !$('showRoom').checked) { const s = Math.max(CW / photoImg.width, CH / photoImg.height), iw = photoImg.width * s, ih = photoImg.height * s; g.drawImage(photoImg, (CW - iw) / 2, (CH - ih) / 2, iw, ih); }
  g.drawImage(renderer.domElement, 0, 0, CW, CH);
  sun.shadow.mapSize.set(sm, sm); sun.shadow.map && (sun.shadow.map.dispose(), sun.shadow.map = null);
  renderer.setPixelRatio(sv.pr); resize(); camera.position.copy(sv.pos); camera.quaternion.copy(sv.q); if (orb.on) applyCam();
  return out;
}
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
$('camBtn').onclick = () => {
  const out = cleanShot(snap34), name = 'garderob-' + new Date().toISOString().slice(0, 10) + '-1800x2400.png';
  if (isIOS() && navigator.canShare) { try { const bin = atob(out.toDataURL('image/png').split(',')[1]), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); const file = new File([u8], name, { type: 'image/png' }); if (navigator.canShare({ files: [file] })) { navigator.share({ files: [file] }).catch(() => {}); return; } } catch (er) {} }
  out.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); msg('Снимок сохранен'); }, 'image/png');
};
// ---- plants: drag with a finger on the floor
{ const el = renderer.domElement, fp = new THREE.Plane(V(0, 1, 0), 0); let pd = null;
  const ray = e => { const r = el.getBoundingClientRect(); RC.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera); };
  el.addEventListener('pointerdown', e => { if (!orb.on || e.button !== 0 || !decor.visible || !(S.plants || []).length || pd) return; ray(e);
    const h = RC.intersectObjects(decor.children, true).find(x => x.object.userData.plant != null); if (!h) return; const mh = pickHits(e)[0]; if (mh && mh.distance < h.distance) return;
    const i = h.object.userData.plant, p = S.plants[i], q = new THREE.Vector3(); if (!RC.ray.intersectPlane(fp, q)) return;
    pd = { i, dx: p.x - q.x, dz: p.z - q.z, g: decor.children.find(c => c.userData.plant === i), id: e.pointerId }; plantSel = i; window.__plantTap = true;
    e.stopImmediatePropagation(); el.setPointerCapture(e.pointerId); }, true);
  el.addEventListener('pointermove', e => { if (!pd || e.pointerId !== pd.id) return; e.stopImmediatePropagation(); ray(e); const q = new THREE.Vector3(); if (!RC.ray.intersectPlane(fp, q)) return;
    const p = S.plants[pd.i]; p.x = q.x + pd.dx; p.z = Math.max(0.2, Math.min(9, q.z + pd.dz)); if (ROOMB) p.x = Math.max(ROOMB.l + 0.2, Math.min(ROOMB.r - 0.2, p.x)); if (pd.g) pd.g.position.set(p.x, 0, p.z); }, true);
  const up = e => { if (!pd || e.pointerId !== pd.id) return; e.stopImmediatePropagation(); pd = null; setTimeout(() => { window.__plantTap = false; }, 0); localStorage.setItem('gs_auto', JSON.stringify(S)); pushHist(); applyGlareShadow(); renderDeco(); };
  el.addEventListener('pointerup', up, true); el.addEventListener('pointercancel', up, true); }
// ---- sound: soft synthesized clicks + light haptics; toggle in the top bar
const SND = { on: localStorage.getItem('gs_snd') !== '0', ctx: null };
function tick(kind) {
  if (!SND.on) return;
  try { const C = SND.ctx || (SND.ctx = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume();
    const t = C.currentTime + 0.002, P = { soft: [1500, 0.05, 0.03, 'sine', 5000], bright: [2400, 0.065, 0.045, 'triangle', 7000], muted: [430, 0.07, 0.06, 'sine', 900] }[kind] || [1500, 0.05, 0.03, 'sine', 5000];
    const o = C.createOscillator(), g = C.createGain(), f = C.createBiquadFilter(); o.type = P[3]; o.frequency.setValueAtTime(P[0], t); o.frequency.exponentialRampToValueAtTime(P[0] * 0.55, t + P[2]);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(P[1], t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + P[2]); f.type = 'lowpass'; f.frequency.value = P[4];
    o.connect(f); f.connect(g); g.connect(C.destination); o.start(t); o.stop(t + P[2] + 0.02);
    if (kind === 'bright') { const o2 = C.createOscillator(), g2 = C.createGain(); o2.type = 'sine'; o2.frequency.setValueAtTime(P[0] * 1.5, t + 0.012); g2.gain.setValueAtTime(0.0001, t + 0.012); g2.gain.exponentialRampToValueAtTime(0.03, t + 0.016); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); o2.connect(g2); g2.connect(C.destination); o2.start(t + 0.012); o2.stop(t + 0.07); }
  } catch (er) {}
}
function lightHaptic() { try { if (navigator.vibrate) { navigator.vibrate(6); return; } hapEl.click(); } catch (er) {} }
function sndUI() { $('sndBtn').classList.toggle('off', !SND.on); $('sndBtn').title = SND.on ? 'Звук включен' : 'Звук выключен'; }
$('sndBtn').onclick = () => { SND.on = !SND.on; localStorage.setItem('gs_snd', SND.on ? '1' : '0'); sndUI(); if (SND.on) tick('soft'); };
sndUI();
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (!b || b.disabled || b.id === 'sndBtn') return;
  const muted = ['delBtn', 'undoBtn', 'redoBtn'].includes(b.id), bright = !muted && !!b.closest('.sz,.sws,.tiles,.cpgrid,.ld,.wbtn,.btiles');
  tick(muted ? 'muted' : bright ? 'bright' : 'soft'); if (muted || bright) lightHaptic(); }, true);
renderDeco(); setBg(); rebuild(); renderSec();
