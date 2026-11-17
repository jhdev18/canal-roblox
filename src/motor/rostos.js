// Rostos desenhados proceduralmente (canvas 2D) no estilo clássico do Roblox.
// Para usar um rosto próprio: coloque assets/rostos/<nome>.png (fundo transparente, quadrado) e use `rosto: <nome>`.
import { canvas, texturaCanvas } from './util.js';
import * as THREE from 'three';

const T = 256;               // resolução do canvas
const P = '#151515';         // tinta preta
const BRANCO = '#ffffff';

function oval(g, x, y, rx, ry, cor = P) { g.fillStyle = cor; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); }
function traco(g, pts, w = 9, cor = P) {
  g.strokeStyle = cor; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) p.length === 4 ? g.quadraticCurveTo(...p) : g.lineTo(...p); g.stroke();
}
function arco(g, x, y, r, a0, a1, w = 9, cor = P) { g.strokeStyle = cor; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke(); }
const OE = 95, OD = 161, OY = 105; // posição base dos olhos (esq/dir/altura)

function olhos(g, { rx = 11, ry = 20, dy = 0, dx = 0 } = {}) { oval(g, OE + dx, OY + dy, rx, ry); oval(g, OD + dx, OY + dy, rx, ry); }
function olhosPalpebra(g, corte = 0.45) { // olhos semicerrados (ar "malandro/desconfiado")
  for (const x of [OE, OD]) {
    g.save(); g.beginPath(); g.rect(x - 20, OY - 20 + 40 * corte, 40, 40); g.clip(); oval(g, x, OY, 12, 20); g.restore();
    traco(g, [[x - 16, OY - 20 + 40 * corte], [x + 16, OY - 20 + 40 * corte - 2]], 6);
  }
}
function olhosGrandes(g, { pup = 7, dy = 0, px = 0, py = 0 } = {}) { // olhos brancos redondos com pupila (assustado)
  for (const x of [OE, OD]) {
    oval(g, x, OY + dy, 24, 26, P); oval(g, x, OY + dy, 19, 21, BRANCO); oval(g, x + px, OY + dy + py, pup, pup, P);
  }
}
function olhosFechados(g, cima = true) { for (const x of [OE, OD]) arco(g, x, OY + (cima ? 8 : -6), 15, cima ? Math.PI * 1.1 : 0.15 * Math.PI, cima ? Math.PI * 1.9 : 0.85 * Math.PI, 8); }
function sobrancelhas(g, tipo) {
  const d = { bravo: [[-22, -40, 14, -26], [22, -40, -14, -26]], triste: [[-20, -28, 14, -40], [20, -28, -14, -40]], surpreso: [[-16, -44, 16, -46], [16, -44, -16, -46]] }[tipo];
  if (!d) return;
  traco(g, [[OE + d[0][0], OY + d[0][1]], [OE + d[0][2], OY + d[0][3]]], 9);
  traco(g, [[OD + d[1][0], OY + d[1][1]], [OD + d[1][2], OY + d[1][3]]], 9);
}
function bocaAberta(g, pts, dentes = true) { // polígono preenchido + faixa branca de dentes
  g.fillStyle = P; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) p.length === 4 ? g.quadraticCurveTo(...p) : g.lineTo(...p); g.closePath(); g.fill();
  if (dentes) { g.save(); g.clip(); g.fillStyle = BRANCO; g.fillRect(0, 0, T, pts[0][1] + 9); g.restore(); }
}
function lagrima(g, x, y, h = 60) { g.fillStyle = '#4fb4ff'; g.fillRect(x - 6, y, 12, h); oval(g, x, y + h, 8, 10, '#4fb4ff'); }
function coracao(g, x, y, s, c = '#e8265e') {
  g.fillStyle = c; g.beginPath(); g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s * 1.4, y, x - s * 0.7, y - s * 1.0, x, y - s * 0.3);
  g.bezierCurveTo(x + s * 0.7, y - s * 1.0, x + s * 1.4, y, x, y + s * 0.9); g.fill();
}

// --- Expressões ---------------------------------------------------------------
export const EXPRESSOES = {
  neutro: g => { olhos(g); traco(g, [[100, 168], [128, 182, 156, 168]], 8); },
  feliz: g => { olhos(g); traco(g, [[88, 160], [128, 200, 168, 160]], 9); },
  sorriso: g => { olhos(g); bocaAberta(g, [[82, 156], [174, 156], [128, 222, 82, 156]]); },
  rindo: g => { olhosFechados(g, true); bocaAberta(g, [[78, 150], [178, 150], [128, 232, 78, 150]]); },
  malandro: g => { olhosPalpebra(g, 0.42); traco(g, [[96, 172], [140, 186, 168, 156]], 9); },
  desconfiado: g => { olhosPalpebra(g, 0.5); traco(g, [[104, 176], [152, 172]], 8); },
  triste: g => { sobrancelhas(g, 'triste'); olhos(g, { ry: 17, dy: 4 }); traco(g, [[92, 188], [128, 156, 164, 188]], 9); },
  chorando: g => { sobrancelhas(g, 'triste'); olhosFechados(g, false); lagrima(g, OE, OY + 6); lagrima(g, OD, OY + 6);
    bocaAberta(g, [[96, 194], [128, 150, 160, 194], [128, 186, 96, 194]], false); },
  assustado: g => { olhosGrandes(g, { pup: 6 }); traco(g, [[92, 186], [102, 176], [114, 186], [126, 176], [138, 186], [150, 176], [162, 186]], 7); },
  surpreso: g => { sobrancelhas(g, 'surpreso'); olhosGrandes(g, { pup: 9 }); oval(g, 128, 186, 16, 22); },
  bravo: g => { sobrancelhas(g, 'bravo'); olhos(g, { ry: 15, dy: 4 }); bocaAberta(g, [[90, 192], [128, 166, 166, 192], [128, 200, 90, 192]]); },
  bocejando: g => { for (const x of [OE, OD]) traco(g, [[x - 14, OY + 2], [x + 14, OY - 2]], 7); oval(g, 128, 192, 18, 30); },
  dormindo: g => { for (const x of [OE, OD]) traco(g, [[x - 15, OY + 4], [x + 15, OY + 4]], 7); oval(g, 128, 182, 8, 6);
    g.fillStyle = P; g.font = 'bold 34px sans-serif'; g.fillText('z', 196, 70); g.font = 'bold 24px sans-serif'; g.fillText('z', 222, 44); },
  apaixonado: g => { coracao(g, OE, OY, 20); coracao(g, OD, OY, 20); traco(g, [[88, 162], [128, 200, 168, 162]], 9); },
  nervoso: g => { olhos(g, { ry: 17 }); traco(g, [[94, 182], [106, 172], [118, 182], [130, 172], [142, 182], [154, 172], [164, 180]], 7);
    g.fillStyle = '#8fd3ff'; g.beginPath(); g.moveTo(206, 52); g.quadraticCurveTo(222, 82, 206, 90); g.quadraticCurveTo(190, 82, 206, 52); g.fill(); },
  morto: g => { for (const x of [OE, OD]) { traco(g, [[x - 14, OY - 14], [x + 14, OY + 14]], 9); traco(g, [[x + 14, OY - 14], [x - 14, OY + 14]], 9); }
    traco(g, [[100, 180], [156, 180]], 8); },
  pensativo: g => { olhosGrandes(g, { pup: 8, px: 6, py: -9 }); traco(g, [[118, 178], [150, 172]], 8); },
  confiante: g => { olhosPalpebra(g, 0.3); bocaAberta(g, [[96, 160], [170, 152], [140, 200, 96, 160]]); },
};

// --- Extras de rosto (combináveis): barba, bigode, oculos, oculos_escuros, sardas, blush, cilios ------
export const EXTRAS_ROSTO = {
  barba: g => { g.fillStyle = '#141414'; g.beginPath(); g.moveTo(40, 120); g.lineTo(62, 120); g.quadraticCurveTo(70, 210, 128, 214);
    g.quadraticCurveTo(186, 210, 194, 120); g.lineTo(216, 120); g.quadraticCurveTo(222, 252, 128, 256); g.quadraticCurveTo(34, 252, 40, 120); g.fill();
    EXTRAS_ROSTO.bigode(g); },
  bigode: g => { g.fillStyle = '#141414'; g.beginPath(); g.moveTo(80, 160); g.quadraticCurveTo(128, 128, 176, 160); g.quadraticCurveTo(128, 148, 80, 160); g.fill(); },
  oculos: g => { for (const x of [OE, OD]) arco(g, x, OY, 27, 0, Math.PI * 2, 5, '#ddd'); traco(g, [[OE + 27, OY], [OD - 27, OY]], 5, '#ddd'); },
  oculos_escuros: g => { g.fillStyle = '#0b0b0b'; g.beginPath(); g.roundRect(56, OY - 24, 64, 44, 12); g.roundRect(136, OY - 24, 64, 44, 12); g.fill();
    g.fillRect(118, OY - 18, 20, 8); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(66, OY - 16, 14, 8); g.fillRect(146, OY - 16, 14, 8); },
  sardas: g => { for (const [x, y] of [[70, 140], [82, 150], [62, 152], [186, 140], [174, 150], [194, 152]]) oval(g, x, y, 3, 3, '#a0603a'); },
  blush: g => { oval(g, 66, 148, 16, 9, 'rgba(255,90,120,.45)'); oval(g, 190, 148, 16, 9, 'rgba(255,90,120,.45)'); },
  mascara: g => { g.fillStyle = '#111'; g.beginPath(); g.roundRect(30, OY - 30, 196, 58, 24); g.fill();
    g.globalCompositeOperation = 'destination-out'; for (const x of [OE, OD]) { g.beginPath(); g.ellipse(x, OY, 20, 16, 0, 0, 7); g.fill(); } g.globalCompositeOperation = 'source-over';
    for (const x of [OE, OD]) oval(g, x, OY, 9, 12); },
  cicatriz: g => { traco(g, [[168, 80], [196, 140]], 6, '#7a3020'); for (const k of [0.25, 0.5, 0.75]) traco(g, [[176 + 28 * k - 8, 80 + 60 * k], [176 + 28 * k + 8, 80 + 60 * k - 4]], 4, '#7a3020'); },
  cilios: g => { for (const x of [OE, OD]) for (const k of [-1, 0, 1]) traco(g, [[x + k * 9, OY - 18], [x + k * 14, OY - 32]], 5); },
};

const _cache = new Map();
const _imgs = new Map();

/** Pré-carrega rostos PNG personalizados (assets/rostos/<nome>.png), se existirem. */
export async function carregarRostosPersonalizados(nomes, base = '/assets/rostos/') {
  await Promise.all(nomes.filter(n => !EXPRESSOES[n] && !_imgs.has(n)).map(n => new Promise(res => {
    const im = new Image(); im.onload = () => { _imgs.set(n, im); res(); }; im.onerror = () => res(); im.src = base + n + '.png';
  })));
}

/** Textura do rosto = expressão + extras. Cacheada por combinação. */
export function texturaRosto(expr = 'neutro', extras = []) {
  const key = expr + '|' + extras.join(',');
  if (_cache.has(key)) return _cache.get(key);
  const [c, g] = canvas(T, T);
  for (const e of extras) if (e === 'barba' || e === 'bigode') continue; else if (e === 'blush' || e === 'sardas') EXTRAS_ROSTO[e]?.(g);
  if (_imgs.has(expr)) g.drawImage(_imgs.get(expr), 0, 0, T, T);
  else (EXPRESSOES[expr] || EXPRESSOES.neutro)(g);
  for (const e of extras) if (!['blush', 'sardas'].includes(e)) EXTRAS_ROSTO[e]?.(g);
  const t = texturaCanvas(c); t.minFilter = THREE.LinearMipmapLinearFilter;
  _cache.set(key, t); return t;
}
