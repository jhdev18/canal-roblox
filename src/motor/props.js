// Objetos de cenário reutilizáveis. Todos com a base em y=0 e de frente para +Z.
// Uso no roteiro: props: [{tipo: carro, x: 4, z: -6, vira: 90, cor: vermelho}]
import * as THREE from 'three';
import { caixa, cilindro, esfera, plano, grupo, mat, cor, canvas, texturaCanvas } from './util.js';

/** Placa com texto (canvas). */
export function placaTexto(texto, w, h, { fundo = '#ffffff', corTexto = '#111111', borda = null, fonte = '900', emissivo = false } = {}) {
  const R = 128; const [c, g] = canvas(Math.round(w * R), Math.round(h * R));
  g.fillStyle = fundo; g.fillRect(0, 0, c.width, c.height); if (borda) { g.strokeStyle = borda; g.lineWidth = c.height * 0.08; g.strokeRect(0, 0, c.width, c.height); }
  g.fillStyle = corTexto; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${fonte} ${Math.round(c.height * 0.55)}px "Arial Black", Arial, sans-serif`;
  g.fillText(String(texto), c.width / 2, c.height / 2 + c.height * 0.03, c.width * 0.92);
  const m = new THREE.MeshStandardMaterial({ map: texturaCanvas(c), roughness: 0.8, emissive: emissivo ? 0xffffff : 0x000000, emissiveMap: emissivo ? texturaCanvas(c) : null, emissiveIntensity: emissivo ? 0.6 : 0 });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
}

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
  // --- cidade ---
  semaforo: (o = {}) => { const g = grupo([cilindro(0.15, 0.18, 7, '#3a3d44', { pos: [0, 3.5, 0] }), caixa(0.9, 2.4, 0.7, '#222', { pos: [0, 7.6, 0.1], round: 0.1 })]);
    const acesa = o.luz || 'vermelho';
    [['vermelho', '#ff2d2d', 8.3], ['amarelo', '#ffc400', 7.6], ['verde', '#2dff6a', 6.9]].forEach(([n, c, y]) =>
      g.add(esfera(0.26, mat(n === acesa ? c : '#333', n === acesa ? { emissive: c, emissiveIntensity: 2 } : {}), { pos: [0, y, 0.5], sombra: false })));
    return g; },
  onibus: (o = {}) => { const c = o.cor || '#f5cd30'; const g = grupo([caixa(14, 4.2, 4, c, { pos: [0, 2.6, 0], round: 0.35 }), caixa(14.05, 1.3, 4.05, mat('#9fd8ff', { rough: 0.1 }), { pos: [0, 3.4, 0] }),
    caixa(14.1, 0.25, 4.1, '#ffffff', { pos: [0, 1.6, 0] })]);
    for (const x of [-4.6, 4.6]) for (const z of [-1.9, 1.9]) g.add(cilindro(0.8, 0.8, 0.5, '#1b1b1b', { pos: [x, 0.8, z], rot: [90, 0, 0] }));
    const p = placaTexto(o.texto || 'CENTRO', 3.4, 0.6, { fundo: '#111', corTexto: '#ffb300', emissivo: true }); p.position.set(6.95, 3.9, 0); p.rotation.y = Math.PI / 2; g.add(p);
    return g; },
  taxi: (o = {}) => { const g = PROPS.carro({ cor: o.cor || '#f5c400' }); g.add(caixa(1.2, 0.4, 0.6, '#111', { pos: [-0.3, 3.2, 0] }));
    const p = placaTexto('TÁXI', 1.1, 0.3, { fundo: '#111', corTexto: '#f5c400' }); p.position.set(-0.3, 3.2, 0.31); g.add(p); return g; },
  viatura: () => { const g = PROPS.carro({ cor: '#f2f3f3' }); g.add(caixa(6.02, 0.5, 3.02, '#1d3b72', { pos: [0, 1.3, 0] }));
    g.add(caixa(0.6, 0.3, 0.6, mat('#ff2d2d', { emissive: '#ff2d2d', emissiveIntensity: 2 }), { pos: [-0.6, 3.15, 0] })); g.add(caixa(0.6, 0.3, 0.6, mat('#2d6bff', { emissive: '#2d6bff', emissiveIntensity: 2 }), { pos: [0.1, 3.15, 0] }));
    return g; },
  hidrante: () => grupo([cilindro(0.35, 0.4, 1.3, '#c4281c', { pos: [0, 0.65, 0] }), esfera(0.36, '#c4281c', { pos: [0, 1.3, 0] }), cilindro(0.15, 0.15, 1.0, '#c4281c', { pos: [0, 0.9, 0], rot: [0, 0, 90] })]),
  lixeira: (o = {}) => grupo([cilindro(0.55, 0.45, 1.6, o.cor || '#2e7d32', { pos: [0, 0.8, 0] }), cilindro(0.6, 0.6, 0.12, '#1b5e20', { pos: [0, 1.65, 0] })]),
  faixa_pedestre: (o = {}) => { const g = grupo([]); for (let i = 0; i < 7; i++) g.add(caixa(1.0, 0.03, o.comprimento || 8, '#f2f3f3', { pos: [i * 1.8 - 5.4, 0.09, 0], sombra: false })); return g; },
  loja: (o = {}) => { const w = o.largura || 9, c = o.cor || '#e85d5d', n = o.noite; const g = grupo([caixa(w, 7, 6, o.parede || '#f1e7c9', { pos: [0, 3.5, 0] }),
    caixa(w - 2, 3.4, 0.2, mat(n ? '#ffe3a3' : '#bfe6ff', { emissive: n ? '#ffd27a' : '#bfe6ff', emissiveIntensity: n ? 1.1 : 0.35, rough: 0.1 }), { pos: [0, 2.2, 3.02] }),
    caixa(w, 0.4, 2.2, c, { pos: [0, 4.4, 4.0], rot: [-18, 0, 0] })]);
    for (let i = 0; i < Math.floor(w / 1.5); i++) g.add(caixa(0.75, 0.42, 2.25, '#ffffff', { pos: [-w / 2 + 0.375 + i * 1.5, 4.41, 4.01], rot: [-18, 0, 0], sombra: false }));
    const p = placaTexto(o.texto || 'LOJA', w - 1, 1.2, { fundo: c, corTexto: '#ffffff', emissivo: n }); p.position.set(0, 5.9, 3.02); g.add(p); return g; },
  arranha_ceu: (o = {}) => PROPS.predio({ altura: o.altura || 45, largura: o.largura || 12, cor: o.cor || '#6f8fb3', noite: o.noite }),
  fonte: () => grupo([cilindro(4, 4.2, 1.0, '#c9ccd5', { pos: [0, 0.5, 0], seg: 28 }), cilindro(3.6, 3.6, 0.1, mat('#4fa8e8', { rough: 0.05, metal: 0.1 }), { pos: [0, 0.95, 0], seg: 28 }),
    cilindro(0.5, 0.7, 2.6, '#c9ccd5', { pos: [0, 2, 0] }), cilindro(1.4, 1.2, 0.4, '#c9ccd5', { pos: [0, 3.3, 0], seg: 20 }),
    cilindro(0.15, 1.2, 1.4, mat('#9fd8ff', { rough: 0.05, emissive: '#bfe6ff', emissiveIntensity: 0.3 }), { pos: [0, 4.2, 0], seg: 16, sombra: false })]),
  estatua: (o = {}) => { const pedra = '#9ea3ad'; const g = grupo([caixa(3, 2.4, 3, '#c9ccd5', { pos: [0, 1.2, 0] }), caixa(2, 2, 1, pedra, { pos: [0, 4.4, 0] }),
    caixa(1, 2, 1, pedra, { pos: [-0.5, 2.4 + 1, 0] }), caixa(1, 2, 1, pedra, { pos: [0.5, 3.4, 0] }), caixa(1, 2, 1, pedra, { pos: [-1.5, 4.4, 0] }),
    caixa(1, 2, 1, pedra, { pos: [1.5, 5.6, 0], rot: [0, 0, 160] }), caixa(1.25, 1.2, 1.2, pedra, { pos: [0, 6.0, 0], round: 0.28 })]);
    const p = placaTexto(o.texto || 'FUNDADOR', 2.6, 0.5, { fundo: '#7c6a4a', corTexto: '#f5e6b8' }); p.position.set(0, 1.4, 1.52); g.add(p); return g; },
  bandeira: (o = {}) => { const g = grupo([cilindro(0.1, 0.12, 10, '#d8dde3', { pos: [0, 5, 0], mat: { metal: 0.6, rough: 0.3 } }), esfera(0.2, '#e0b040', { pos: [0, 10.1, 0] })]);
    const cores = o.cores || ['#1f9d48', '#f5cd30', '#1d3b72'];
    cores.forEach((c, i) => g.add(caixa(3.6, 2.4 / cores.length, 0.05, c, { pos: [1.9, 9.4 - i * 2.4 / cores.length, 0] })));
    return g; },
  palanque: (o = {}) => { const g = grupo([caixa(10, 1.4, 6, '#7a1f2b', { pos: [0, 0.7, 0] }), caixa(10.2, 0.15, 6.2, '#c9a24a', { pos: [0, 1.45, 0] }),
    caixa(1.8, 2.4, 1.2, '#5a3a22', { pos: [0, 2.6, 1.6] }), cilindro(0.04, 0.04, 1.0, '#222', { pos: [0, 4.2, 1.9], rot: [-30, 0, 0] }), esfera(0.12, '#333', { pos: [0, 4.65, 2.2] })]);
    const p = placaTexto(o.texto || 'PREFEITURA', 1.7, 0.45, { fundo: '#1d3b72', corTexto: '#ffffff' }); p.position.set(0, 2.9, 2.21); g.add(p); return g; },
  barraca: (o = {}) => { const c = o.cor || '#e8862f'; const g = grupo([caixa(5, 2.2, 2.4, '#b8875a', { pos: [0, 1.1, 0] }), caixa(5.4, 0.3, 3, c, { pos: [0, 4.6, 0.3] })]);
    for (const x of [-2.4, 2.4]) g.add(cilindro(0.1, 0.1, 4.5, '#ddd', { pos: [x, 2.3, 1.4] }));
    for (let i = 0; i < 8; i++) g.add(esfera(0.3, ['#e53935', '#ffd23f', '#7fd35a', '#ff8c1a'][i % 4], { pos: [-1.9 + i * 0.55, 2.45, 0.4] })); return g; },
  outdoor: (o = {}) => { const g = grupo([cilindro(0.25, 0.25, 7, '#5a5d66', { pos: [-3, 3.5, 0] }), cilindro(0.25, 0.25, 7, '#5a5d66', { pos: [3, 3.5, 0] }), caixa(11, 5, 0.3, '#333', { pos: [0, 9, 0] })]);
    const p = placaTexto(o.texto || 'VOTE 10', 10.4, 4.4, { fundo: o.cor || '#1d3b72', corTexto: '#ffd23f', emissivo: o.noite }); p.position.set(0, 9, 0.17); g.add(p); return g; },
  mesa_escritorio: () => grupo([caixa(6, 0.3, 3, '#5a3a22', { pos: [0, 2.3, 0] }), caixa(6, 2.2, 0.2, '#4a2e1a', { pos: [0, 1.15, -1.3] }),
    caixa(0.3, 2.2, 3, '#4a2e1a', { pos: [-2.85, 1.15, 0] }), caixa(0.3, 2.2, 3, '#4a2e1a', { pos: [2.85, 1.15, 0] }), caixa(1.4, 0.1, 1.0, '#ffffff', { pos: [0.5, 2.5, 0.3], rot: [0, 12, 0] }),
    caixa(0.5, 0.7, 0.2, '#111', { pos: [-2, 2.8, -0.6] })]),
  poltrona: (o = {}) => { const c = o.cor || '#2a1a12'; return grupo([caixa(2.6, 1.0, 2.4, c, { pos: [0, 0.5, 0], round: 0.15 }), caixa(2.6, 3.6, 0.6, c, { pos: [0, 2.2, -1.0], round: 0.2 }),
    caixa(0.5, 1.5, 2.4, c, { pos: [-1.3, 1.2, 0], round: 0.15 }), caixa(0.5, 1.5, 2.4, c, { pos: [1.3, 1.2, 0], round: 0.15 })]); },
  estante: () => { const g = grupo([caixa(6, 8, 0.2, '#4a2e1a', { pos: [0, 4, -0.6] }), caixa(0.25, 8, 1.4, '#5a3a22', { pos: [-2.9, 4, 0] }),
    caixa(0.25, 8, 1.4, '#5a3a22', { pos: [2.9, 4, 0] }), caixa(6, 0.25, 1.4, '#5a3a22', { pos: [0, 8, 0] })]);
    for (let y = 1.2; y < 8; y += 1.9) { g.add(caixa(5.6, 0.12, 1.3, '#4a2e1a', { pos: [0, y - 0.6, 0.06] }));
      for (let i = 0; i < 9; i++) g.add(caixa(0.45, 1.3, 1.0, ['#c4281c', '#1d3b72', '#2e7d32', '#e0b040', '#6b32a8'][(i * 7 + Math.round(y)) % 5], { pos: [-2.4 + i * 0.6, y + 0.1, 0.1] })); }
    return g; },
  quadro_parede: (o = {}) => { const g = grupo([caixa(3.4, 4.2, 0.2, '#c9a24a', { pos: [0, 0, 0] })]); const p = placaTexto(o.texto || '★', 3.0, 1.6, { fundo: o.cor || '#3a5a8a', corTexto: '#f5e6b8' });
    p.position.set(0, 0, 0.11); g.add(p); g.add(plano(3.0, 3.8, mat(o.cor || '#3a5a8a'), { pos: [0, 0, 0.105] })); return g; },
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
