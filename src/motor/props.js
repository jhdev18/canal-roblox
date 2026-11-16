// Objetos de cenário reutilizáveis. Todos com a base em y=0 e de frente para +Z.
// Uso no roteiro: props: [{tipo: carro, x: 4, z: -6, vira: 90, cor: vermelho}]
import * as THREE from 'three';
import { caixa, cilindro, esfera, plano, grupo, mat, cor } from './util.js';

const janelaMat = (noite) => mat('#a8dcff', noite ? { emissive: '#ffd27a', emissiveIntensity: 1.2 } : { rough: 0.15, metal: 0.1 });

export const PROPS = {
  arvore: (o = {}) => { const h = o.altura || 3.6; return grupo([cilindro(0.45, 0.55, h, '#7b5230', { pos: [0, h / 2, 0] }),
    esfera(2.6 * (o.tam || 1), o.cor || '#2f9e3a', { pos: [0, h + 1.4, 0] }), esfera(1.8 * (o.tam || 1), o.cor || '#38ad42', { pos: [1.2, h + 0.6, 0.6] })]); },
  pinheiro: (o = {}) => grupo([cilindro(0.35, 0.4, 2, '#6b4426', { pos: [0, 1, 0] }), cilindro(0, 2.4, 3.2, o.cor || '#22803a', { pos: [0, 3.2, 0], seg: 10 }),
    cilindro(0, 1.8, 2.6, o.cor || '#2a9443', { pos: [0, 4.6, 0], seg: 10 })]),
  arbusto: (o = {}) => grupo([esfera(1.1, o.cor || '#2f9e3a', { pos: [0, 0.7, 0] }), esfera(0.8, o.cor || '#38ad42', { pos: [0.9, 0.5, 0.2] })]),
  casa: (o = {}) => { const w = o.largura || 10, h = o.altura || 8, d = 8, n = o.noite;
    const g = grupo([caixa(w, h, d, o.cor || '#e9e6dc', { pos: [0, h / 2, 0] }), caixa(w + 1, 1.2, d + 1, o.telhado || '#3d8f3d', { pos: [0, h + 0.6, 0] }),
      caixa(2, 3.6, 0.15, o.porta || '#7a4b2a', { pos: [-w / 4, 1.8, d / 2 + 0.05] })]);
    for (const x of [w / 5, w / 2.6]) g.add(caixa(1.8, 1.8, 0.15, janelaMat(n), { pos: [x, h * 0.55, d / 2 + 0.05] }));
    g.add(caixa(1.8, 1.8, 0.15, janelaMat(n), { pos: [-w / 4, h * 0.78, d / 2 + 0.05] })); return g; },
  predio: (o = {}) => { const w = o.largura || 10, h = o.altura || 22, n = o.noite; const g = grupo([caixa(w, h, 8, o.cor || '#9fb3c8', { pos: [0, h / 2, 0] })]);
    for (let y = 3; y < h - 1; y += 3.2) for (let x = -w / 2 + 1.6; x < w / 2 - 1; x += 2.4) g.add(caixa(1.4, 1.8, 0.1, janelaMat(n && ((x * 7 + y) % 3 > 1)), { pos: [x, y, 4.05], sombra: false }));
    return g; },
  poste: (o = {}) => { const g = grupo([cilindro(0.15, 0.2, 9, '#5a5d66', { pos: [0, 4.5, 0] }), caixa(2.2, 0.2, 0.2, '#5a5d66', { pos: [0.9, 8.9, 0] }),
    caixa(0.7, 0.25, 0.5, '#eee', { pos: [1.8, 8.75, 0], mat: o.noite ? { emissive: '#ffe2a0', emissiveIntensity: 2 } : {} })]);
    if (o.noite) { const l = new THREE.PointLight(0xffd59a, 40, 22, 1.6); l.position.set(1.8, 8.2, 0); g.add(l); } return g; },
  carro: (o = {}) => { const c = o.cor || '#c4281c'; const g = grupo([caixa(6, 1.4, 3, c, { pos: [0, 1.2, 0], round: 0.3 }), caixa(3.4, 1.2, 2.8, c, { pos: [-0.3, 2.4, 0], round: 0.3 }),
    caixa(3.2, 1.0, 2.86, mat('#9fd8ff', { rough: 0.1 }), { pos: [-0.3, 2.4, 0] })]);
    for (const [x, z] of [[-1.9, 1.5], [1.9, 1.5], [-1.9, -1.5], [1.9, -1.5]]) g.add(cilindro(0.65, 0.65, 0.5, '#1b1b1b', { pos: [x, 0.65, z], rot: [90, 0, 0] }));
    return g; },
  banco: (o = {}) => grupo([caixa(4, 0.25, 1.2, o.cor || '#8a5a33', { pos: [0, 1.0, 0] }), caixa(4, 1.0, 0.2, o.cor || '#8a5a33', { pos: [0, 1.7, -0.55] }),
    caixa(0.25, 1.0, 1.0, '#333', { pos: [-1.7, 0.5, 0] }), caixa(0.25, 1.0, 1.0, '#333', { pos: [1.7, 0.5, 0] })]),
  mesa: (o = {}) => { const g = grupo([caixa(o.largura || 4, 0.25, 2.4, o.cor || '#a8754a', { pos: [0, 2.2, 0] })]);
    for (const x of [-1, 1]) for (const z of [-1, 1]) g.add(caixa(0.25, 2.1, 0.25, o.cor || '#a8754a', { pos: [x * ((o.largura || 4) / 2 - 0.3), 1.05, z * 0.9] })); return g; },
  carteira: (o = {}) => grupo([caixa(2.4, 0.2, 1.6, '#c9a26b', { pos: [0, 2.0, 0] }), caixa(2.2, 1.9, 0.15, '#6b6f78', { pos: [0, 1.0, -0.6] })]),
  cadeira: (o = {}) => grupo([caixa(1.6, 0.2, 1.6, o.cor || '#8a5a33', { pos: [0, 0.9, 0] }), caixa(1.6, 1.8, 0.2, o.cor || '#8a5a33', { pos: [0, 1.8, -0.7] }),
    caixa(0.2, 0.9, 0.2, '#333', { pos: [-0.6, 0.45, 0.6] }), caixa(0.2, 0.9, 0.2, '#333', { pos: [0.6, 0.45, 0.6] }),
    caixa(0.2, 0.9, 0.2, '#333', { pos: [-0.6, 0.45, -0.6] }), caixa(0.2, 0.9, 0.2, '#333', { pos: [0.6, 0.45, -0.6] })]),
  cama: (o = {}) => grupo([caixa(3.4, 1.0, 7, '#7c5c46', { pos: [0, 0.5, 0] }), caixa(3.2, 0.5, 6.6, o.lencol || '#f2f3f3', { pos: [0, 1.2, 0] }),
    caixa(2.4, 0.4, 1.2, '#ffffff', { pos: [0, 1.6, -2.7], round: 0.15 }), caixa(3.3, 0.55, 4, o.cor || '#3b6fd8', { pos: [0, 1.3, 1.2] }), caixa(3.4, 2.6, 0.3, '#7c5c46', { pos: [0, 1.3, -3.5] })]),
  sofa: (o = {}) => { const c = o.cor || '#6b4fa0'; return grupo([caixa(6, 1.0, 2.4, c, { pos: [0, 0.5, 0], round: 0.15 }), caixa(6, 2.0, 0.7, c, { pos: [0, 1.5, -0.9], round: 0.15 }),
    caixa(0.7, 1.6, 2.4, c, { pos: [-2.9, 1.0, 0], round: 0.15 }), caixa(0.7, 1.6, 2.4, c, { pos: [2.9, 1.0, 0], round: 0.15 })]); },
  tv: (o = {}) => grupo([caixa(4, 0.8, 1.4, '#3a3a40', { pos: [0, 0.4, 0] }), caixa(4.6, 2.7, 0.2, '#111', { pos: [0, 2.3, 0] }),
    plano(4.3, 2.4, mat('#3c7dd9', { emissive: '#2a6fd0', emissiveIntensity: 0.8 }), { pos: [0, 2.3, 0.11] })]),
  computador: (o = {}) => grupo([caixa(2.2, 1.4, 0.15, '#111', { pos: [0, 3.2, 0] }), plano(2.0, 1.2, mat('#5fb0ff', { emissive: '#3a8fd8', emissiveIntensity: 0.9 }), { pos: [0, 3.2, 0.08] }),
    caixa(0.2, 0.6, 0.2, '#222', { pos: [0, 2.6, 0] }), caixa(1.6, 0.08, 0.6, '#222', { pos: [0, 2.36, 0.7] })]),
  planta: (o = {}) => grupo([cilindro(0.5, 0.4, 1.0, '#b5653b', { pos: [0, 0.5, 0] }), esfera(0.9, '#2f9e3a', { pos: [0, 1.6, 0] })]),
  presente: (o = {}) => grupo([caixa(1.2, 1.2, 1.2, o.cor || '#c4281c', { pos: [0, 0.6, 0] }), caixa(1.25, 1.22, 0.22, '#f5cd30', { pos: [0, 0.6, 0] }), caixa(0.22, 1.22, 1.25, '#f5cd30', { pos: [0, 0.6, 0] })]),
  caixa_correio: () => grupo([caixa(0.3, 1.8, 0.3, '#888', { pos: [0, 0.9, 0] }), caixa(0.9, 0.6, 0.6, '#d33', { pos: [0, 2.0, 0], round: 0.1 })]),
  cerca: (o = {}) => { const n = o.n || 8, g = grupo([caixa(n * 1.2, 0.2, 0.15, o.cor || '#f2f3f3', { pos: [n * 0.6 - 0.6, 1.4, 0] })]);
    for (let i = 0; i < n; i++) g.add(caixa(0.25, 2, 0.15, o.cor || '#f2f3f3', { pos: [i * 1.2, 1, 0] })); return g; },
  porta: (o = {}) => grupo([caixa(2.4, 4.2, 0.3, '#5a3a22', { pos: [0, 2.1, 0] }), caixa(2, 3.8, 0.12, o.cor || '#8a5a33', { pos: [0, 2.0, 0.15] }), esfera(0.12, '#e0b040', { pos: [0.7, 2, 0.3] })]),
  caixao: () => grupo([caixa(2.2, 1.0, 6, '#4a2c1a', { pos: [0, 0.5, 0] }), caixa(2.3, 0.15, 6.1, '#6b4426', { pos: [0, 1.05, 0] })]),
  bolo: () => grupo([cilindro(1, 1, 0.8, '#f7d6e0', { pos: [0, 0.4, 0], seg: 24 }), cilindro(0.7, 0.7, 0.6, '#ffffff', { pos: [0, 1.1, 0], seg: 24 }), cilindro(0.05, 0.05, 0.5, '#4fb4ff', { pos: [0, 1.65, 0] })]),
};
export const NOMES_PROPS = Object.keys(PROPS);

export function criarProp(spec) {
  const fn = PROPS[spec.tipo]; if (!fn) return null;
  const o = fn(spec);
  o.position.set(spec.x || 0, spec.y || 0, spec.z || 0);
  o.rotation.y = THREE.MathUtils.degToRad(spec.vira || 0);
  if (spec.escala) o.scale.setScalar(spec.escala);
  o.traverse(m => { if (m.isMesh) { m.castShadow ??= true; m.receiveShadow = true; } });
  return o;
}
