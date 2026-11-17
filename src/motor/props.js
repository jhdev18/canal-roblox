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
  m.polygonOffset = true; m.polygonOffsetFactor = -4; m.polygonOffsetUnits = -4;   // placa sempre na frente da parede (evita listras de z-fighting)
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
    for (let y = 3; y < h - 1; y += 3.2) for (let x = -w / 2 + 1.6; x < w / 2 - 1; x += 2.4) for (const zz of [4.05, -4.05]) g.add(caixa(1.4, 1.8, 0.1, janelaMat(n && ((x * 7 + y + zz) % 3 > 1)), { pos: [x, y, zz], sombra: false }));
    for (let y = 3; y < h - 1; y += 3.2) for (const zz of [-1.6, 1.6]) for (const sx of [-1, 1]) g.add(caixa(0.1, 1.8, 1.4, janelaMat(n && ((zz * 5 + y) % 3 > 1)), { pos: [sx * (w / 2 + 0.05), y, zz], sombra: false }));
    g.add(caixa(w - 0.4, 0.2, 7.6, '#8f939c', { pos: [0, h + 0.1, 0] }));
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
    const p = placaTexto(o.texto || 'LOJA', w - 1, 1.2, { fundo: c, corTexto: '#ffffff', emissivo: n }); p.position.set(0, 5.9, 3.02); g.add(p);
    g.add(caixa(w - 0.4, 0.15, 5.6, '#8f939c', { pos: [0, 7.05, 0] })); g.add(caixa(w + 0.2, 0.8, 0.25, o.parede || '#f1e7c9', { pos: [0, 7.3, 2.9] }));   // laje + platibanda
    const cx = PROPS.caixa_dagua(); cx.position.set(w / 2 - 1.6, 7.1, -1.4); g.add(cx);
    g.add(caixa(1.6, 3.4, 0.12, '#7a4b2a', { pos: [-w / 4, 1.7, -3.02] })); g.add(caixa(1.8, 1.4, 0.12, janelaMat(n), { pos: [w / 4, 4.2, -3.02] }));        // porta e janela dos fundos
    for (const sx of [-1, 1]) g.add(caixa(0.12, 1.4, 1.8, janelaMat(n), { pos: [sx * (w / 2 + 0.02), 4.2, -0.5] }));
    return g; },
  arranha_ceu: (o = {}) => PROPS.predio({ altura: o.altura || 45, largura: o.largura || 12, cor: o.cor || '#6f8fb3', noite: o.noite }),
  fonte: () => { // bacia com borda (água abaixo da borda, sem superfícies coincidentes), coluna, tacinha, jato e cortina d'água
    const pedra = mat('#c9ccd5', { rough: 0.85 }), agua = new THREE.MeshStandardMaterial({ color: 0x4fa8e8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85 });
    const jato = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x9fd8ff, emissiveIntensity: 0.35, transparent: true, opacity: 0.45, roughness: 0.05, depthWrite: false });
    const g = grupo([]);
    const parede = new THREE.Mesh(new THREE.CylinderGeometry(4.1, 4.3, 1.2, 36, 1, true), new THREE.MeshStandardMaterial({ color: 0xc9ccd5, roughness: 0.85, side: THREE.DoubleSide }));
    parede.position.y = 0.6; parede.castShadow = parede.receiveShadow = true; g.add(parede);
    const borda = new THREE.Mesh(new THREE.RingGeometry(3.75, 4.35, 36), new THREE.MeshStandardMaterial({ color: 0xd8dbe2, roughness: 0.8, side: THREE.DoubleSide }));
    borda.rotation.x = -Math.PI / 2; borda.position.y = 1.2; borda.receiveShadow = true; g.add(borda);
    g.add(cilindro(4.0, 4.0, 0.3, pedra, { pos: [0, 0.15, 0], seg: 36 }));                        // fundo da bacia (topo em 0.3)
    g.add(cilindro(3.95, 3.95, 0.06, agua, { pos: [0, 0.92, 0], seg: 36, sombra: false }));       // água (topo em 0.95, abaixo da borda 1.2)
    g.add(cilindro(0.45, 0.7, 2.5, pedra, { pos: [0, 1.55, 0], seg: 18 }));                       // coluna
    g.add(cilindro(1.6, 0.6, 0.55, pedra, { pos: [0, 3.05, 0], seg: 24 }));                       // tacinha
    g.add(cilindro(1.45, 1.45, 0.04, agua, { pos: [0, 3.28, 0], seg: 24, sombra: false }));
    g.add(cilindro(0.07, 0.12, 1.5, jato, { pos: [0, 4.0, 0], seg: 10, sombra: false }));          // jato
    g.add(esfera(0.32, jato, { pos: [0, 4.8, 0], sombra: false }));
    const cortina = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.9, 2.25, 28, 1, true), jato); cortina.position.y = 2.1; g.add(cortina);   // água caindo da tacinha
    return g; },
  estatua: (o = {}) => { // pedestal + boneco R6 de pedra com o braço erguido
    const pedra = mat('#9ea3ad', { rough: 0.9 }), g = grupo([caixa(3.2, 2.4, 3.2, '#c9ccd5', { pos: [0, 1.2, 0] }), caixa(3.7, 0.3, 3.7, '#b8bcc6', { pos: [0, 2.55, 0] })]);
    const y0 = 2.7;
    g.add(caixa(1, 2, 1, pedra, { pos: [-0.5, y0 + 1, 0] })); g.add(caixa(1, 2, 1, pedra, { pos: [0.5, y0 + 1, 0] }));          // pernas
    g.add(caixa(2, 2, 1, pedra, { pos: [0, y0 + 3, 0] }));                                                                     // tronco
    g.add(caixa(1, 2, 1, pedra, { pos: [1.5, y0 + 3, 0] }));                                                                   // braço esquerdo, para baixo
    const ombro = grupo([caixa(1, 2, 1, pedra, { pos: [0, -0.6, 0] })]); ombro.position.set(-1.5, y0 + 3.6, 0); ombro.rotation.set(-0.35, 0, -150 * Math.PI / 180); g.add(ombro);   // braço direito erguido
    g.add(caixa(1.25, 1.2, 1.2, pedra, { pos: [0, y0 + 4.62, 0], round: 0.28 }));                                              // cabeça
    const p = placaTexto(o.texto || 'FUNDADOR', 2.6, 0.55, { fundo: '#7c6a4a', corTexto: '#f5e6b8' }); p.position.set(0, 1.5, 1.62); g.add(p); return g; },
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
  prefeitura_predio: (o = {}) => { const n = o.noite, g = grupo([]);
    const B = '#f4f1ea';
    g.add(caixa(40, 15, 10, B, { pos: [0, 7.5, 0] })); g.add(caixa(41, 1.2, 11, '#e3ddd0', { pos: [0, 15.6, 0] }));
    g.add(caixa(14, 18.5, 10.5, B, { pos: [0, 9.25, 0.2] }));
    { const sh = new THREE.Shape([new THREE.Vector2(-7.6, 0), new THREE.Vector2(7.6, 0), new THREE.Vector2(0, 3.6)]);   // frontão triangular
      const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 1.6, bevelEnabled: false }), mat('#e3ddd0')); fr.position.set(0, 14.6, 5.2); fr.castShadow = fr.receiveShadow = true; g.add(fr); }
    for (let i = 0; i < 6; i++) g.add(cilindro(0.55, 0.6, 12.5, '#ffffff', { pos: [-6.25 + i * 2.5, 7.6, 6.4], seg: 16 }));
    g.add(caixa(15, 0.8, 2.4, '#e3ddd0', { pos: [0, 14.2, 6.4] }));
    for (let i = 0; i < 4; i++) g.add(caixa(16 - i * 0.6, 0.4, 2.2, '#dcd5c6', { pos: [0, 0.2 + i * 0.4, -10.2 - i * 1.0 + 20] }));
    const pl = placaTexto(o.texto || 'PREFEITURA MUNICIPAL', 12, 1.2, { fundo: '#e3ddd0', corTexto: '#1d3b72' }); pl.position.set(0, 14.2, 7.62); g.add(pl);
    { const pt = PROPS.porta({ cor: '#5a3a22' }); pt.position.set(0, 1.6, 5.4); g.add(pt); }
    for (const x of [-15, -10, 10, 15]) for (const y of [4, 10]) g.add(caixa(3, 3.6, 0.2, mat(n ? '#ffe3a3' : '#bfe6ff', { emissive: n ? '#ffd27a' : '#bfe6ff', emissiveIntensity: n ? 1.1 : 0.3, rough: 0.1 }), { pos: [x, y, 5.1] }));
    return g; },
  placa_lateral: (o = {}) => { const c = o.cor || '#c4281c'; const g = grupo([caixa(0.12, 0.12, 2.2, '#3a3d44', { pos: [0, 0, 1.1] })]);
    for (const s of [1, -1]) { const p = placaTexto(o.texto || 'LOJA', 2.0, 0.9, { fundo: c, corTexto: '#ffffff', emissivo: o.noite }); p.position.set(s * 0.06, -0.6, 1.3); p.rotation.y = s * Math.PI / 2; g.add(p); }
    g.add(caixa(0.1, 0.95, 2.05, c, { pos: [0, -0.6, 1.3] })); return g; },
  // --- bairro (casas brasileiras) ---
  casa_br: (o = {}) => casaBR(o, 1),
  sobrado: (o = {}) => casaBR(o, 2),
  muro: (o = {}) => { const w = o.largura || 10, c = o.cor || '#e9e6dc', h = o.altura || 2.2; const g = grupo([]);
    const vao = o.portao === false ? 0 : 3.2, px = o.portao_x ?? 0;
    const lados = vao ? [[-w / 2, px - vao / 2], [px + vao / 2, w / 2]] : [[-w / 2, w / 2]];
    for (const [a, b] of lados) if (b - a > 0.05) { g.add(caixa(b - a, h, 0.4, c, { pos: [(a + b) / 2, h / 2, 0] })); g.add(caixa(b - a + 0.04, 0.15, 0.5, '#d8d4cc', { pos: [(a + b) / 2, h + 0.07, 0] })); }
    if (vao) { const pt = PROPS.portao({ largura: vao, cor: o.portao_cor }); pt.position.x = px; g.add(pt); }
    return g; },
  portao: (o = {}) => { const w = o.largura || 3.2, c = o.cor || '#3a3d44'; const g = grupo([caixa(w, 0.12, 0.12, c, { pos: [0, 2.3, 0] }), caixa(w, 0.12, 0.12, c, { pos: [0, 0.15, 0] })]);
    for (let x = -w / 2 + 0.1; x <= w / 2 - 0.05; x += 0.28) g.add(caixa(0.07, 2.2, 0.07, c, { pos: [x, 1.22, 0] })); return g; },
  cerca_viva: (o = {}) => { const g = grupo([]); for (let i = 0; i < (o.n || 5); i++) g.add(caixa(1.6, 1.4, 1.2, i % 2 ? '#2f8a3c' : '#38a047', { pos: [i * 1.55, 0.7, 0], round: 0.4 })); return g; },
  caixa_dagua: () => grupo([cilindro(1.0, 0.9, 1.3, '#1e6fd9', { pos: [0, 0.65, 0], seg: 20 }), cilindro(1.05, 1.05, 0.2, '#1a5fc0', { pos: [0, 1.4, 0], seg: 20 })]),
  churrasqueira: () => grupo([caixa(3, 2.6, 1.6, '#b5653b', { pos: [0, 1.3, 0] }), caixa(2.2, 1.0, 0.3, '#1b1b1b', { pos: [0, 2.0, 0.7] }),
    caixa(1.2, 3, 1.0, '#a85a33', { pos: [0, 4.1, -0.2] }), caixa(2.0, 0.08, 0.8, '#777', { pos: [0, 2.0, 0.4] })]),
  piscina: (o = {}) => { const w = o.largura || 8, d = o.prof || 5; return grupo([caixa(w + 1, 0.3, d + 1, '#e8e2d2', { pos: [0, 0.15, 0] }),
    caixa(w, 0.32, d, mat('#3fb6e8', { rough: 0.05, metal: 0.1, emissive: '#1a7fb0', emissiveIntensity: 0.25 }), { pos: [0, 0.17, 0], sombra: false })]); },
  varal: () => { const g = grupo([cilindro(0.06, 0.06, 3.5, '#888', { pos: [-3, 1.75, 0] }), cilindro(0.06, 0.06, 3.5, '#888', { pos: [3, 1.75, 0] }), cilindro(0.02, 0.02, 6, '#ddd', { pos: [0, 3.4, 0], rot: [0, 0, 90] })]);
    [['#e53935', -2.2, 1.2], ['#1e88e5', -0.9, 1.0], ['#fdd835', 0.3, 1.3], ['#ffffff', 1.6, 0.9]].forEach(([c, x, h]) => g.add(caixa(1.0, h, 0.04, c, { pos: [x, 3.35 - h / 2, 0] }))); return g; },
  casinha_cachorro: (o = {}) => { const g = grupo([caixa(2.4, 1.8, 2.4, o.cor || '#b5653b', { pos: [0, 0.9, 0] }), caixa(0.9, 1.1, 0.1, '#2a1a12', { pos: [0, 0.6, 1.21] })]);
    for (const s of [-1, 1]) g.add(caixa(1.6, 0.15, 2.7, '#7a2e1f', { pos: [s * 0.62, 2.2, 0], rot: [0, 0, -s * 38] })); return g; },
  cachorro: (o = {}) => { const c = o.cor || '#c58a4a', esc = '#2a1a12'; const g = grupo([caixa(1.0, 0.9, 2.0, c, { pos: [0, 1.0, 0], round: 0.2 }), caixa(0.9, 0.85, 0.9, c, { pos: [0, 1.7, 1.15], round: 0.25 }),
    caixa(0.5, 0.35, 0.4, o.focinho || '#e8c9a0', { pos: [0, 1.55, 1.7], round: 0.1 }), caixa(0.18, 0.14, 0.1, esc, { pos: [0, 1.68, 1.92] }),
    caixa(0.25, 0.5, 0.15, o.orelha || '#8a5a33', { pos: [-0.42, 2.0, 1.1], rot: [0, 0, 20] }), caixa(0.25, 0.5, 0.15, o.orelha || '#8a5a33', { pos: [0.42, 2.0, 1.1], rot: [0, 0, -20] }),
    caixa(0.12, 0.12, 0.05, esc, { pos: [-0.22, 1.85, 1.61] }), caixa(0.12, 0.12, 0.05, esc, { pos: [0.22, 1.85, 1.61] }), caixa(0.2, 0.2, 0.9, c, { pos: [0, 1.5, -1.3], rot: [-35, 0, 0] })]);
    for (const [x, z] of [[-0.3, 0.7], [0.3, 0.7], [-0.3, -0.7], [0.3, -0.7]]) g.add(caixa(0.3, 0.6, 0.3, c, { pos: [x, 0.3, z] })); g.scale.setScalar(o.tam || 1); return g; },
  gato: (o = {}) => { const c = o.cor || '#7c7f88'; const g = grupo([caixa(0.6, 0.6, 1.2, c, { pos: [0, 0.6, 0], round: 0.15 }), caixa(0.65, 0.6, 0.6, c, { pos: [0, 1.15, 0.6], round: 0.15 }),
    cilindro(0, 0.13, 0.3, c, { pos: [-0.2, 1.55, 0.6], seg: 4 }), cilindro(0, 0.13, 0.3, c, { pos: [0.2, 1.55, 0.6], seg: 4 }), caixa(0.12, 0.12, 0.8, c, { pos: [0, 1.0, -0.8], rot: [-50, 0, 0] }),
    caixa(0.1, 0.12, 0.04, '#9be36b', { pos: [-0.14, 1.2, 0.91] }), caixa(0.1, 0.12, 0.04, '#9be36b', { pos: [0.14, 1.2, 0.91] })]);
    for (const [x, z] of [[-0.18, 0.4], [0.18, 0.4], [-0.18, -0.4], [0.18, -0.4]]) g.add(caixa(0.18, 0.4, 0.18, c, { pos: [x, 0.2, z] })); return g; },
  bicicleta: (o = {}) => { const c = o.cor || '#c4281c'; const g = grupo([]);
    for (const z of [-1.1, 1.1]) { const roda = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 8, 24), mat('#1b1b1b')); roda.position.set(0, 0.75, z); roda.rotation.y = Math.PI / 2; roda.castShadow = true; g.add(roda); }
    g.add(caixa(0.12, 0.12, 2.0, c, { pos: [0, 1.25, 0], rot: [-12, 0, 0] })); g.add(caixa(0.12, 1.0, 0.12, c, { pos: [0, 1.2, -0.5] })); g.add(caixa(0.4, 0.12, 0.7, '#222', { pos: [0, 1.75, -0.55] }));
    g.add(caixa(0.12, 0.9, 0.12, c, { pos: [0, 1.4, 1.0] })); g.add(caixa(1.0, 0.1, 0.1, '#222', { pos: [0, 1.9, 1.0] })); return g; },
  moto: (o = {}) => { const c = o.cor || '#1d3b72'; const g = grupo([caixa(0.7, 0.9, 2.4, c, { pos: [0, 1.2, 0], round: 0.25 }), caixa(0.6, 0.25, 1.1, '#111', { pos: [0, 1.75, -0.4] }),
    caixa(1.2, 0.1, 0.1, '#222', { pos: [0, 2.1, 1.05] }), caixa(0.5, 0.4, 0.2, mat('#ffe9a8', { emissive: '#ffe9a8', emissiveIntensity: 0.8 }), { pos: [0, 1.6, 1.25] })]);
    for (const z of [-1.0, 1.05]) g.add(cilindro(0.6, 0.6, 0.3, '#1b1b1b', { pos: [0, 0.6, z], rot: [0, 0, 90] })); if (o.bau) g.add(caixa(1.0, 0.9, 0.9, '#c4281c', { pos: [0, 2.1, -1.1] })); return g; },
  balanco: () => { const g = grupo([caixa(5, 0.25, 0.25, '#c4281c', { pos: [0, 5, 0] })]);
    for (const x of [-2.4, 2.4]) for (const z of [-1, 1]) g.add(caixa(0.22, 5.2, 0.22, '#c4281c', { pos: [x, 2.5, z * 0.8], rot: [z * 12, 0, 0] }));
    for (const x of [-1, 1]) { g.add(cilindro(0.03, 0.03, 3.2, '#999', { pos: [x - 0.4, 3.4, 0] })); g.add(cilindro(0.03, 0.03, 3.2, '#999', { pos: [x + 0.4, 3.4, 0] })); g.add(caixa(1.0, 0.12, 0.5, '#f5cd30', { pos: [x, 1.8, 0] })); }
    return g; },
  escorregador: () => grupo([caixa(1.6, 0.2, 5, '#1e88e5', { pos: [0, 1.9, 1.6], rot: [38, 0, 0] }), caixa(1.8, 3.6, 1.8, '#f5cd30', { pos: [0, 1.8, -1.6] }), caixa(1.9, 0.2, 1.9, '#e53935', { pos: [0, 3.7, -1.6] })]),
  trave: () => { const b = '#f2f3f3'; return grupo([caixa(0.25, 4.2, 0.25, b, { pos: [-4, 2.1, 0] }), caixa(0.25, 4.2, 0.25, b, { pos: [4, 2.1, 0] }), caixa(8.25, 0.25, 0.25, b, { pos: [0, 4.2, 0] }),
    caixa(8, 4.2, 0.04, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 1 }), { pos: [0, 2.1, -1.5], sombra: false })]); },
  bola: (o = {}) => { const g = grupo([esfera(0.45, o.cor || '#ffffff', { pos: [0, 0.45, 0] })]); for (const [x, y, z] of [[0, 0.88, 0], [0.4, 0.5, 0.15], [-0.3, 0.55, 0.32], [0.05, 0.2, -0.38]]) g.add(esfera(0.13, '#111', { pos: [x, y, z] })); return g; },
  geladeira: () => grupo([caixa(2.0, 5.2, 1.8, '#f2f3f3', { pos: [0, 2.6, 0], round: 0.12 }), caixa(2.02, 0.05, 1.82, '#bbb', { pos: [0, 3.6, 0] }), caixa(0.1, 1.0, 0.1, '#999', { pos: [0.75, 4.3, 0.95] }), caixa(0.1, 1.4, 0.1, '#999', { pos: [0.75, 2.6, 0.95] })]),
  fogao: () => { const g = grupo([caixa(2.2, 2.3, 1.8, '#f2f3f3', { pos: [0, 1.15, 0] }), caixa(1.8, 1.1, 0.06, '#222', { pos: [0, 1.0, 0.92] }), caixa(2.2, 0.08, 1.8, '#222', { pos: [0, 2.34, 0] })]);
    for (const x of [-0.5, 0.5]) for (const z of [-0.4, 0.4]) g.add(cilindro(0.3, 0.3, 0.06, '#444', { pos: [x, 2.4, z], seg: 14 })); return g; },
  pia: () => grupo([caixa(4, 2.3, 1.8, '#f2f3f3', { pos: [0, 1.15, 0] }), caixa(4.1, 0.15, 1.9, '#8c8f99', { pos: [0, 2.35, 0] }), caixa(1.6, 0.1, 1.1, '#5a5d66', { pos: [-0.8, 2.43, 0] }),
    cilindro(0.06, 0.06, 0.8, '#ccc', { pos: [-0.8, 2.8, -0.6] }), caixa(0.1, 0.1, 0.5, '#ccc', { pos: [-0.8, 3.15, -0.4] })]),
  armario: (o = {}) => { const w = o.largura || 6, g = grupo([caixa(w, 2.2, 1.2, o.cor || '#a8754a', { pos: [0, 0, 0] })]);
    for (let x = -w / 2 + 1; x < w / 2; x += 2) { g.add(caixa(1.85, 2.0, 0.05, o.cor2 || '#c9945e', { pos: [x, 0, 0.62] })); g.add(caixa(0.1, 0.4, 0.08, '#555', { pos: [x + 0.7, 0, 0.66] })); } return g; },
  mesa_jantar: (o = {}) => { const g = PROPS.mesa({ largura: o.largura || 5, cor: o.cor || '#8a5a33' });
    for (const [x, z, v] of [[-1.3, 2.0, 180], [1.3, 2.0, 180], [-1.3, -2.0, 0], [1.3, -2.0, 0]]) { const c = PROPS.cadeira({ cor: o.cadeira || '#a8754a' }); c.position.set(x, 0, z); c.rotation.y = v * Math.PI / 180; g.add(c); }
    return g; },
  cadeira_plastico: (o = {}) => grupo([caixa(1.5, 0.2, 1.5, o.cor || '#f2f3f3', { pos: [0, 1.0, 0], round: 0.08 }), caixa(1.5, 1.4, 0.15, o.cor || '#f2f3f3', { pos: [0, 1.8, -0.7], rot: [-8, 0, 0], round: 0.05 }),
    ...[[-0.6, 0.6], [0.6, 0.6], [-0.6, -0.6], [0.6, -0.6]].map(([x, z]) => caixa(0.15, 1.0, 0.15, o.cor || '#f2f3f3', { pos: [x, 0.5, z] }))]),
  saco_lixo: () => grupo([esfera(0.6, '#1b1b1b', { pos: [0, 0.55, 0], mat: { rough: 0.3 } }), esfera(0.5, '#1b1b1b', { pos: [0.8, 0.45, 0.2], mat: { rough: 0.3 } })]),
  vaso_flor: (o = {}) => grupo([cilindro(0.45, 0.35, 0.8, '#b5653b', { pos: [0, 0.4, 0] }), ...[0, 1, 2, 3].map(i => esfera(0.22, o.cor || ['#ff4f8b', '#ffd23f', '#e53935', '#b06bff'][i], { pos: [Math.sin(i * 1.6) * 0.25, 1.05, Math.cos(i * 1.6) * 0.25] }))]),
  poste_fios: (o = {}) => { const g = grupo([cilindro(0.22, 0.28, 11, '#9a9a9a', { pos: [0, 5.5, 0] }), caixa(2.6, 0.25, 0.25, '#7a7a7a', { pos: [0, 10, 0] }),
    cilindro(0.35, 0.35, 0.9, '#6d6f75', { pos: [0.6, 8.6, 0] })]);
    if (o.noite) { g.add(caixa(0.7, 0.25, 0.5, mat('#eee', { emissive: '#ffe2a0', emissiveIntensity: 2 }), { pos: [0, 8.0, 0.7] })); const l = new THREE.PointLight(0xffd59a, 35, 22, 1.6); l.position.set(0, 7.6, 1); g.add(l); }
    return g; },
  lombada: () => grupo([caixa(8, 0.25, 1.6, '#f5cd30', { pos: [0, 0.1, 0], round: 0.1 })]),
};
export const NOMES_PROPS = Object.keys(PROPS);
/** Outros módulos (ex.: cidade.js) registram props aqui; a lista de nomes acompanha. */
export function registrarProps(obj) {
  for (const k of Object.keys(obj)) if (PROPS[k]) throw new Error(`prop "${k}" já existe: escolha outro nome`);
  Object.assign(PROPS, obj); NOMES_PROPS.splice(0, NOMES_PROPS.length, ...Object.keys(PROPS)); }

/** Casa brasileira: telhado de telha em duas águas, grade na janela, caixa d'água opcional. andares = 1 ou 2. */
function casaBR(o, andares) {
  const w = o.largura || 9, d = 8, hA = 4.2, h = hA * andares, c = o.cor || '#f0b446', n = o.noite;
  const g = grupo([caixa(w, h, d, c, { pos: [0, h / 2, 0] }), caixa(w + 0.1, 0.5, d + 0.1, o.barrado || '#d8d4cc', { pos: [0, 0.25, 0] })]);
  const telha = o.telhado || '#c8643b', inc = 26, meio = d / 2 + 0.7, comp = meio / Math.cos(inc * Math.PI / 180);
  for (const s of [-1, 1]) g.add(caixa(w + 1.2, 0.35, comp, telha, { pos: [0, h + Math.tan(inc * Math.PI / 180) * meio / 2, s * meio / 2], rot: [s * inc, 0, 0] }));
  { // oitão (triângulo das laterais) sob as duas águas do telhado
    const sub = Math.tan(inc * Math.PI / 180) * (d / 2), sh = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, sub)]);
    const ot = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: w - 0.02, bevelEnabled: false }), mat(c)); ot.rotation.y = Math.PI / 2; ot.position.set(-w / 2 + 0.01, h, 0);
    ot.castShadow = ot.receiveShadow = true; g.add(ot); }
  const vid = () => mat(n ? '#ffe3a3' : '#a8dcff', n ? { emissive: '#ffd27a', emissiveIntensity: 1.1 } : { rough: 0.15, metal: 0.1 });
  const janela = (x, y) => { g.add(caixa(2.2, 1.9, 0.15, '#ffffff', { pos: [x, y, d / 2 + 0.04] })); g.add(caixa(1.9, 1.6, 0.16, vid(), { pos: [x, y, d / 2 + 0.06], sombra: false }));
    if (o.grade !== false) for (let k = -0.8; k <= 0.81; k += 0.4) g.add(caixa(0.06, 1.7, 0.06, '#2b2b2b', { pos: [x + k, y, d / 2 + 0.2] })); };
  g.add(caixa(1.8, 3.4, 0.15, o.porta || '#7a4b2a', { pos: [-w / 4, 1.95, d / 2 + 0.05] })); g.add(esfera(0.1, '#e0b040', { pos: [-w / 4 + 0.6, 1.9, d / 2 + 0.15] }));
  janela(w / 5, 2.4); if (andares === 2) { janela(-w / 4, hA + 2.2); janela(w / 5, hA + 2.2);
    g.add(caixa(w * 0.55, 0.25, 1.4, '#d8d4cc', { pos: [w / 5 - 0.3, hA + 0.4, d / 2 + 0.7] }));
    for (let x = -w * 0.25; x <= w * 0.25; x += 0.45) g.add(caixa(0.07, 1.1, 0.07, '#2b2b2b', { pos: [w / 5 - 0.3 + x, hA + 1.05, d / 2 + 1.35] }));
    g.add(caixa(w * 0.55, 0.1, 0.1, '#2b2b2b', { pos: [w / 5 - 0.3, hA + 1.6, d / 2 + 1.35] })); }
  if (o.caixa_dagua !== false) { const cx = PROPS.caixa_dagua(); cx.position.set(w / 2 - 1.8, h + Math.tan(inc * Math.PI / 180) * meio * 0.6, -1.5); g.add(cx); }
  return g;
}

export function criarProp(spec) {
  const fn = PROPS[spec.tipo]; if (!fn) return null;
  const o = fn(spec);
  o.position.set(spec.x || 0, spec.y || 0, spec.z || 0);
  o.rotation.y = THREE.MathUtils.degToRad(spec.vira || 0);
  if (spec.escala) o.scale.setScalar(spec.escala);
  o.traverse(m => { if (m.isMesh) { m.castShadow ??= true; m.receiveShadow = true; } });
  return o;
}
