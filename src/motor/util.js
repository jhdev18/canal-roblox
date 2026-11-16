// Utilitários compartilhados do motor 3D: cores, materiais (com cache), primitivas e RNG.
// Unidades = studs do Roblox. Eixo Y para cima. A câmera fica em +Z olhando para -Z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Paleta com nomes (pode usar o nome ou um hex "#rrggbb" em qualquer lugar).
export const PALETA = {
  amarelo: '#f5cd30', azul: '#0d69ac', azul_claro: '#6cb4ff', verde: '#4b974b', verde_noob: '#a4bd47',
  verde_claro: '#7fd35a', vermelho: '#c4281c', vinho: '#7b1f2b', preto: '#1f1f24', branco: '#f2f3f3',
  cinza: '#a3a2a5', cinza_escuro: '#4d4f57', rosa: '#ff66cc', rosa_claro: '#ffb3d9', roxo: '#6b32a8',
  laranja: '#e8862f', marrom: '#7c5c46', bege: '#e5d3b3', ciano: '#1fc7d4', dourado: '#e0b040',
  pele_clara: '#f1c9a5', pele_media: '#cc8e69', pele_escura: '#7c5040', noob: '#f5cd30',
};

export function cor(c) {
  if (c instanceof THREE.Color) return c;
  if (typeof c === 'number') return new THREE.Color(c);
  return new THREE.Color(PALETA[c] || c || '#ffffff');
}

const _mats = new Map();
export function mat(c, { rough = 0.75, metal = 0, emissive = null, emissiveIntensity = 1, map = null, transparent = false, basic = false, lambert = false, fog = true } = {}) {
  const key = [typeof c === 'object' ? c.getHexString?.() : c, rough, metal, emissive, emissiveIntensity, map?.uuid, transparent, basic, lambert, fog].join('|');
  if (_mats.has(key)) return _mats.get(key);
  let m;
  if (basic) m = new THREE.MeshBasicMaterial({ color: cor(c), map, transparent, fog });
  else if (lambert) m = new THREE.MeshLambertMaterial({ color: cor(c), map, transparent, fog, emissive: emissive ? cor(emissive) : 0x000000, emissiveIntensity });
  else m = new THREE.MeshStandardMaterial({ color: cor(c), roughness: rough, metalness: metal, map, transparent, fog,
    emissive: emissive ? cor(emissive) : 0x000000, emissiveIntensity });
  _mats.set(key, m);
  return m;
}
export function limparCacheMateriais() { _mats.clear(); }

const _geos = new Map();
function geo(key, fn) { if (!_geos.has(key)) _geos.set(key, fn()); return _geos.get(key); }

function prep(mesh, { pos, rot, sombra = true, recebe = true } = {}) {
  if (pos) mesh.position.set(pos[0], pos[1], pos[2]);
  if (rot) mesh.rotation.set(...rot.map(THREE.MathUtils.degToRad));
  mesh.castShadow = sombra; mesh.receiveShadow = recebe;
  return mesh;
}

/** Caixa. pos = centro. round > 0 = cantos arredondados. material pode ser cor, material ou array de materiais. */
export function caixa(w, h, d, material, opts = {}) {
  const r = opts.round || 0;
  const g = r ? geo(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 5, r))
              : geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
  const m = (material && (material.isMaterial || Array.isArray(material))) ? material : mat(material, opts.mat);
  return prep(new THREE.Mesh(g, m), opts);
}
export function cilindro(rTopo, rBase, h, material, opts = {}) {
  const seg = opts.seg || 20;
  const g = geo(`c${rTopo},${rBase},${h},${seg}`, () => new THREE.CylinderGeometry(rTopo, rBase, h, seg));
  return prep(new THREE.Mesh(g, material?.isMaterial ? material : mat(material, opts.mat)), opts);
}
export function esfera(r, material, opts = {}) {
  const g = geo(`s${r}`, () => new THREE.SphereGeometry(r, 24, 14));
  return prep(new THREE.Mesh(g, material?.isMaterial ? material : mat(material, opts.mat)), opts);
}
export function plano(w, h, material, opts = {}) {
  const g = geo(`p${w},${h}`, () => new THREE.PlaneGeometry(w, h));
  return prep(new THREE.Mesh(g, material?.isMaterial ? material : mat(material, opts.mat)), { sombra: false, ...opts });
}
export function grupo(filhos = [], opts = {}) {
  const g = new THREE.Group();
  filhos.forEach(f => f && g.add(f));
  if (opts.pos) g.position.set(...opts.pos);
  if (opts.rot) g.rotation.set(...opts.rot.map(THREE.MathUtils.degToRad));
  if (opts.escala) g.scale.setScalar(opts.escala);
  return g;
}

/** RNG determinístico (mesma seed = mesma cena, essencial para o cache). */
export function rng(seed = 1) {
  let a = (typeof seed === 'string' ? [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) : seed) >>> 0;
  const f = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.entre = (a, b) => a + f() * (b - a);
  f.item = (arr) => arr[Math.floor(f() * arr.length)];
  return f;
}

export const rad = THREE.MathUtils.degToRad;
export const suave = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

/** Canvas 2D (para rostos, telas de celular, estampas). Funciona só no navegador. */
export function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
export function texturaCanvas(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
