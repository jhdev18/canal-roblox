// Interiores dos prédios da cidade pequena + móveis/objetos de interior reutilizáveis.
// Uso no roteiro: `onde: farmacia` + `dentro: true`  (ou direto `onde: interior_farmacia`).
// Convenção igual aos outros cenários: atores perto da origem, fundo da sala em -Z, câmera em +Z.
import * as THREE from 'three';
import { caixa, cilindro, esfera, plano, grupo, mat, rng } from './util.js';
import { PROPS, placaTexto, registrarProps } from './props.js';
import { add, sala, janela, luzTeto } from './cenarios.js';

const RAD = Math.PI / 180;
const CORES_PROD = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#fb8c00', '#8e24aa', '#00acc1', '#ffffff', '#6d4c41', '#ec407a'];

/** Placa de parede (texto) já posicionada. */
function placa(g, texto, w, h, pos, o = {}) { const p = placaTexto(texto, w, h, o); p.position.set(...pos); if (o.rotY) p.rotation.y = o.rotY; g.add(p); return p; }

// ---------------- móveis e objetos de interior ----------------
export const MOVEIS = {
  balcao: (o = {}) => { const w = o.largura || 8, c = o.cor || '#a8754a'; return grupo([caixa(w, 3.0, 1.6, c, { pos: [0, 1.5, 0] }), caixa(w + 0.3, 0.2, 1.9, o.tampo || '#e8e2d2', { pos: [0, 3.1, 0] }),
    caixa(w, 0.4, 0.1, '#5a3a22', { pos: [0, 0.2, 0.81] })]); },
  prateleira: (o = {}) => { const w = o.largura || 6, h = o.altura || 7, r = rng(o.seed ?? (w * 7 + h)), g = grupo([caixa(w, h, 0.2, o.cor || '#d8d4cc', { pos: [0, h / 2, -0.6] })]);
    for (const x of [-w / 2, w / 2]) g.add(caixa(0.2, h, 1.4, o.cor || '#d8d4cc', { pos: [x, h / 2, 0] }));
    for (let y = 0.8; y < h - 0.3; y += 1.5) { g.add(caixa(w, 0.12, 1.4, o.cor2 || '#bfbab0', { pos: [0, y - 0.06, 0] }));
      for (let x = -w / 2 + 0.4; x < w / 2 - 0.3;) { const bw = r.entre(0.35, 0.75), bh = r.entre(0.5, 1.15);
        g.add(caixa(bw, bh, r.entre(0.5, 0.9), r.item(o.cores || CORES_PROD), { pos: [x + bw / 2, y + bh / 2, 0.1] })); x += bw + 0.05; } }
    return g; },
  gondola: (o = {}) => { const g = grupo([]); for (const s of [-1, 1]) { const p = MOVEIS.prateleira({ largura: o.largura || 10, altura: 5, seed: s * 3 + (o.seed || 0) }); p.position.z = s * 0.7; p.rotation.y = s > 0 ? 0 : Math.PI; g.add(p); } return g; },
  geladeira_vitrine: (o = {}) => { const w = o.largura || 6, g = grupo([caixa(w, 7, 1.8, '#e9ebef', { pos: [0, 3.5, 0] })]);
    for (let x = -w / 2 + 1; x < w / 2; x += 2) { g.add(caixa(1.85, 6.2, 0.1, mat('#cfe8ff', { rough: 0.05, metal: 0.2, emissive: '#dff2ff', emissiveIntensity: 0.25 }), { pos: [x, 3.6, 0.92], sombra: false }));
      for (let y = 1.2; y < 6.5; y += 1.3) for (let k = -0.6; k <= 0.61; k += 0.3) g.add(cilindro(0.11, 0.11, 0.8, CORES_PROD[(Math.round(x * 3 + y * 5 + k * 10) % 10 + 10) % 10], { pos: [x + k, y + 0.4, 0.3], seg: 8 })); }
    return g; },
  caixa_registradora: () => grupo([caixa(1.4, 0.6, 1.1, '#333', { pos: [0, 0.3, 0] }), caixa(1.0, 0.7, 0.1, '#222', { pos: [0, 0.95, -0.2], rot: [-15, 0, 0] }),
    plano(0.85, 0.5, mat('#5fd17a', { emissive: '#3fae5a', emissiveIntensity: 0.9 }), { pos: [0, 0.97, -0.14], rot: [-15, 0, 0] })]),
  carrinho_compras: () => { const m = '#b0b6bf', g = grupo([caixa(1.6, 1.2, 2.4, mat(m, { metal: 0.6, rough: 0.35 }), { pos: [0, 2.0, 0] }), caixa(1.5, 0.08, 0.08, '#e53935', { pos: [0, 2.9, -1.35] })]);
    for (const x of [-0.65, 0.65]) for (const z of [-1, 1]) g.add(cilindro(0.18, 0.18, 0.14, '#222', { pos: [x, 0.2, z], rot: [0, 0, 90] }));
    for (const x of [-0.65, 0.65]) g.add(caixa(0.08, 1.3, 0.08, m, { pos: [x, 0.9, -1.0] })); return g; },
  guiche: (o = {}) => { const w = o.largura || 4, g = grupo([caixa(w, 3.0, 1.4, o.cor || '#d8d4cc', { pos: [0, 1.5, 0] }), caixa(w + 0.2, 0.15, 1.6, '#8c8f99', { pos: [0, 3.05, 0] }),
    caixa(w, 3.2, 0.08, new THREE.MeshStandardMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false }), { pos: [0, 4.7, 0.2], sombra: false }), caixa(1.2, 0.08, 0.5, '#8c8f99', { pos: [0, 3.3, 0.5] })]);
    if (o.numero) placa(g, String(o.numero), 0.9, 0.6, [0, 6.6, 0.25], { fundo: '#1d3b72', corTexto: '#fff' }); return g; },
  banco_igreja: (o = {}) => { const w = o.largura || 7, c = o.cor || '#7a4a2a'; return grupo([caixa(w, 0.25, 1.4, c, { pos: [0, 1.0, 0] }), caixa(w, 1.6, 0.2, c, { pos: [0, 1.9, -0.65] }),
    caixa(0.25, 2.6, 1.6, c, { pos: [-w / 2, 1.3, 0] }), caixa(0.25, 2.6, 1.6, c, { pos: [w / 2, 1.3, 0] }), caixa(w, 0.2, 0.4, c, { pos: [0, 0.4, 0.9] })]); },
  altar: () => grupo([caixa(10, 1.2, 6, '#c9a24a', { pos: [0, 0.6, 0] }), caixa(5, 3.0, 2.2, '#f6f2e6', { pos: [0, 2.7, -0.5] }), caixa(5.2, 0.2, 2.4, '#e8c25a', { pos: [0, 4.25, -0.5] }),
    caixa(5.3, 1.2, 0.05, '#c4281c', { pos: [0, 3.2, 0.62] }), cilindro(0.08, 0.08, 1.4, '#e8c25a', { pos: [-2, 5.0, -0.5] }), cilindro(0.08, 0.08, 1.4, '#e8c25a', { pos: [2, 5.0, -0.5] }),
    esfera(0.15, mat('#ffd27a', { emissive: '#ffb84a', emissiveIntensity: 2 }), { pos: [-2, 5.8, -0.5], sombra: false }), esfera(0.15, mat('#ffd27a', { emissive: '#ffb84a', emissiveIntensity: 2 }), { pos: [2, 5.8, -0.5], sombra: false })]),
  cruz_parede: (o = {}) => { const c = o.cor || '#6b4426'; return grupo([caixa(0.7, 6, 0.4, c), caixa(3.4, 0.7, 0.4, c, { pos: [0, 1.2, 0] })]); },
  vitral: (o = {}) => { const g = grupo([caixa(2.6, 5.6, 0.2, '#e8c25a')]); const cs = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa'];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) g.add(caixa(0.7, 0.8, 0.22, mat(cs[(i + j * 2) % 5], { emissive: cs[(i + j * 2) % 5], emissiveIntensity: 0.6 }), { pos: [-0.75 + j * 0.75, -2.2 + i * 0.88, 0], sombra: false }));
    return g; },
  cela: (o = {}) => { const w = o.largura || 8, h = 7.5, g = grupo([caixa(w, 0.3, 0.3, '#3a3d44', { pos: [0, h, 0] }), caixa(w, 0.3, 0.3, '#3a3d44', { pos: [0, 0.15, 0] })]);
    for (let x = -w / 2; x <= w / 2 + 0.01; x += 0.5) g.add(cilindro(0.06, 0.06, h, '#3a3d44', { pos: [x, h / 2, 0], seg: 8, mat: { metal: 0.7, rough: 0.35 } }));
    g.add(caixa(w, 0.2, 0.3, '#3a3d44', { pos: [0, 3.8, 0] })); return g; },
  sinuca: () => { const g = grupo([caixa(4.2, 0.5, 7.6, '#5a3a22', { pos: [0, 2.6, 0] }), caixa(3.6, 0.1, 7.0, '#1f8a4c', { pos: [0, 2.9, 0] })]);
    for (const x of [-1.8, 1.8]) for (const z of [-3.5, 3.5]) g.add(caixa(0.4, 2.4, 0.4, '#4a2e1a', { pos: [x, 1.2, z] }));
    [['#fdd835', 0.3, 1], ['#e53935', -0.4, 1.4], ['#1e88e5', 0.6, 1.6], ['#111', 0, 2.2], ['#ffffff', 0, -2.5]].forEach(([c, x, z]) => g.add(esfera(0.14, c, { pos: [x, 3.1, z] }))); return g; },
  banqueta: (o = {}) => grupo([cilindro(0.6, 0.6, 0.25, o.cor || '#c4281c', { pos: [0, 2.6, 0], seg: 16 }), cilindro(0.1, 0.1, 2.5, '#9aa0aa', { pos: [0, 1.25, 0] }), cilindro(0.6, 0.6, 0.1, '#9aa0aa', { pos: [0, 0.05, 0] })]),
  prateleira_garrafas: (o = {}) => { const w = o.largura || 8, g = grupo([caixa(w, 5, 0.3, '#5a3a22', { pos: [0, 4.5, -0.3] })]);
    for (const y of [3.0, 4.6, 6.2]) { g.add(caixa(w, 0.12, 1.0, '#4a2e1a', { pos: [0, y - 0.06, 0] }));
      for (let x = -w / 2 + 0.4; x < w / 2 - 0.2; x += 0.45) g.add(cilindro(0.13, 0.15, 1.0, ['#2e7d32', '#8d5524', '#c62828', '#f9a825', '#e0e0e0'][Math.round(x * 4 + y) % 5 < 0 ? 0 : Math.round(x * 4 + y) % 5], { pos: [x, y + 0.5, 0.1], seg: 8 })); }
    return g; },
  tv_parede: (o = {}) => { const g = grupo([caixa(4.4, 2.6, 0.2, '#111')]); const t = o.tela || 'futebol';
    if (t === 'futebol') { g.add(plano(4.1, 2.3, mat('#2e9e4f', { emissive: '#2e9e4f', emissiveIntensity: 0.6 }), { pos: [0, 0, 0.11] }));
      g.add(plano(0.08, 2.3, mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 }), { pos: [0, 0, 0.12] }));
      const pl = placaTexto('2 x 1', 1.0, 0.35, { fundo: '#111', corTexto: '#ffd23f', emissivo: true }); pl.position.set(-1.4, 0.9, 0.13); g.add(pl); }
    else g.add(plano(4.1, 2.3, mat('#3c7dd9', { emissive: '#2a6fd0', emissiveIntensity: 0.8 }), { pos: [0, 0, 0.11] }));
    return g; },
  estufa_paes: (o = {}) => { const w = o.largura || 6, g = grupo([caixa(w, 3.0, 1.8, '#8a5a33', { pos: [0, 1.5, 0] }), caixa(w, 1.8, 1.6, mat('#fff3d6', { rough: 0.05, emissive: '#ffcf7a', emissiveIntensity: 0.35 }), { pos: [0, 3.9, 0], sombra: false })]);
    for (let i = 0; i < Math.floor(w / 0.7); i++) for (const z of [-0.4, 0.3]) g.add(caixa(0.55, 0.32, 0.4, i % 3 ? '#d9a25a' : '#b87a35', { pos: [-w / 2 + 0.45 + i * 0.7, 3.25, z], round: 0.14 }));
    return g; },
  cadeiras_espera: (o = {}) => { const n = o.n || 4, g = grupo([caixa(n * 1.5, 0.15, 0.4, '#5a5d66', { pos: [0, 0.6, 0] })]);
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 1.5; g.add(caixa(1.3, 0.2, 1.3, o.cor || '#1e88e5', { pos: [x, 1.0, 0], round: 0.08 })); g.add(caixa(1.3, 1.3, 0.2, o.cor || '#1e88e5', { pos: [x, 1.8, -0.6], round: 0.08 })); }
    for (const x of [-(n * 1.5) / 2 + 0.3, (n * 1.5) / 2 - 0.3]) g.add(caixa(0.15, 0.9, 1.0, '#5a5d66', { pos: [x, 0.45, 0] })); return g; },
  maca: () => grupo([caixa(2.6, 0.3, 6, '#9fd0e8', { pos: [0, 2.2, 0] }), caixa(2.2, 0.15, 1.2, '#ffffff', { pos: [0, 2.45, -2.3], round: 0.08 }),
    ...[[-1.1, -2.6], [1.1, -2.6], [-1.1, 2.6], [1.1, 2.6]].map(([x, z]) => caixa(0.15, 2.1, 0.15, '#9aa0aa', { pos: [x, 1.05, z] }))]),
  mesa_trabalho: (o = {}) => { const g = PROPS.mesa({ largura: o.largura || 5, cor: o.cor || '#8a6a4a' }); const c = PROPS.computador(); c.position.set(-0.8, 0, -0.4); g.add(c);
    g.add(caixa(1.2, 0.3, 0.9, '#ffffff', { pos: [1.4, 2.45, 0] })); return g; },
  arquivo: () => grupo([caixa(2, 5, 2, '#8c8f99', { pos: [0, 2.5, 0] }), ...[1.2, 2.5, 3.8].map(y => caixa(1.6, 0.12, 0.1, '#5a5d66', { pos: [0, y, 1.02] }))]),
  bebedouro: () => grupo([caixa(1.2, 3.2, 1.2, '#e9ebef', { pos: [0, 1.6, 0] }), cilindro(0.5, 0.5, 1.4, mat('#9fd8ff', { rough: 0.05 }), { pos: [0, 3.9, 0], seg: 14 })]),
  fila_cordao: (o = {}) => { const n = o.n || 3, g = grupo([]); for (let i = 0; i <= n; i++) { g.add(cilindro(0.12, 0.25, 2.6, '#c9a24a', { pos: [i * 2.4, 1.3, 0], mat: { metal: 0.6, rough: 0.3 } }));
      if (i < n) g.add(cilindro(0.06, 0.06, 2.4, '#c4281c', { pos: [i * 2.4 + 1.2, 2.3, 0], rot: [0, 0, 90] })); } return g; },
  mural: (o = {}) => { const g = grupo([caixa(o.largura || 5, o.altura || 3, 0.12, '#a8754a')]); const w = o.largura || 5, h = o.altura || 3;
    placa(g, o.texto || 'AVISOS', w - 0.4, h - 0.4, [0, 0, 0.07], { fundo: o.cor || '#f5e6b8', corTexto: o.cor_texto || '#1d3b72' }); return g; },
};
registrarProps(MOVEIS);

// ---------------- interiores ----------------
function piso(g, w, cor1, cor2, zIni = -12, zFim = 30) {
  for (let x = -w / 2 + 1; x < w / 2; x += 2) for (let z = zIni; z < zFim; z += 2) if ((Math.round(x / 2) + Math.round(z / 2)) % 2) g.add(caixa(1.98, 0.02, 1.98, cor2, { pos: [x, 0.01, z], sombra: false }));
}

export const INTERIORES = {
  interior_farmacia(o, g, r) { const n = o.hora === 'noite';
    sala(g, { parede: o.parede || '#f2f5f2', chao: '#e8ece8' }); piso(g, 26, '#e8ece8', '#d6ddd6');
    for (const x of [-8, 0, 8]) add(g, 'prateleira', { largura: 7.6, altura: 7.5, cores: ['#ffffff', '#e53935', '#1e88e5', '#43a047', '#fdd835', '#ec407a'], seed: x }, [x, 0, -7.2]);
    add(g, 'balcao', { largura: 10, cor: '#16a05d', tampo: '#f2f3f3' }, [0, 0, -3.2]); add(g, 'caixa_registradora', {}, [3, 3.2, -3.2], 180);
    for (const z of [2, 8]) { add(g, 'prateleira', { largura: 5, altura: 5, seed: z }, [-11.6, 0, z], 90); add(g, 'prateleira', { largura: 5, altura: 5, seed: z + 1 }, [11.6, 0, z], -90); }
    placa(g, 'FARMÁCIA', 6, 1.2, [0, 9.4, -7.7], { fundo: '#16a05d', corTexto: '#fff' });
    const cz = grupo([caixa(0.6, 1.8, 0.2, mat('#1fd16f', { emissive: '#1fd16f', emissiveIntensity: 0.8 })), caixa(1.8, 0.6, 0.2, mat('#1fd16f', { emissive: '#1fd16f', emissiveIntensity: 0.8 }))]); cz.position.set(-9, 9.4, -7.7); g.add(cz);
    luzTeto(g, -5, -1, n); luzTeto(g, 5, -1, n);
    g.userData.ancoras = { atender: [0, 0, -5.0, 0] };
  },
  interior_loterica(o, g, r) { const n = o.hora === 'noite';
    sala(g, { parede: o.parede || '#e9eef7', chao: '#cfd6e4' }); g.add(caixa(26, 1.0, 0.2, '#1d4fa0', { pos: [0, 1.0, -7.7] }));
    for (const [i, x] of [-7, 0, 7].entries()) add(g, 'guiche', { largura: 5, cor: '#1d4fa0', numero: i + 1 }, [x, 0, -4.5]);
    g.add(caixa(26, 0.6, 0.15, '#f5b800', { pos: [0, 8.4, -7.7] })); placa(g, 'LOTÉRICA', 7, 1.2, [0, 9.5, -7.7], { fundo: '#f5b800', corTexto: '#1d3b72' });
    const m = MOVEIS.mural({ texto: 'PRÊMIO R$ 50 MILHÕES', largura: 7, altura: 2.2, cor: '#1d3b72', cor_texto: '#ffd23f' }); m.position.set(-8.5, 6.4, -7.6); g.add(m);
    add(g, 'fila_cordao', { n: 3 }, [-3.6, 0, 2.5]); add(g, 'bebedouro', {}, [11.5, 0, 0]);
    luzTeto(g, -5, -1, n); luzTeto(g, 5, -1, n);
    g.userData.ancoras = { atender: [0, 0, -6.2, 0] };
  },
  interior_padaria(o, g, r) { const n = o.hora === 'noite';
    sala(g, { parede: o.parede || '#f3e2c0', chao: '#b98b5e' }); piso(g, 26, '#b98b5e', '#a67a50');
    add(g, 'estufa_paes', { largura: 9 }, [-3, 0, -3.6]); add(g, 'balcao', { largura: 5, cor: '#8a4a1f' }, [6.5, 0, -3.6]); add(g, 'caixa_registradora', {}, [6.5, 3.2, -3.6], 180);
    add(g, 'prateleira', { largura: 10, altura: 7, cores: ['#d9a25a', '#b87a35', '#f2d6a0', '#8a4a1f', '#ffffff'], seed: 5 }, [-3, 0, -7.3]);
    add(g, 'geladeira_vitrine', { largura: 4 }, [9.5, 0, -7.0]);
    for (const x of [-7, 4]) { add(g, 'mesa', { largura: 3, cor: '#f2f3f3' }, [x, 0, 5]); add(g, 'cadeira_plastico', {}, [x - 2.2, 0, 5], 90); add(g, 'cadeira_plastico', {}, [x + 2.2, 0, 5], -90); }
    placa(g, 'PÃO QUENTINHO', 7, 1.1, [-3, 9.4, -7.7], { fundo: '#8a4a1f', corTexto: '#ffe9b0' });
    luzTeto(g, -5, -1, n); luzTeto(g, 5, -1, n);
    g.userData.ancoras = { atender: [6.5, 0, -5.3, 0], sentar: [-9.0, 0, 5, 90] };
  },
  interior_mercado(o, g, r) { const n = o.hora === 'noite';
    sala(g, { largura: 34, parede: o.parede || '#f2f3f3', chao: '#dfe2e6', profundo: 16 }); piso(g, 34, '#dfe2e6', '#cfd3d9', -16, 30);
    for (const x of [-10, 0, 10]) add(g, 'gondola', { largura: 12, seed: x }, [x, 0, -8], 90);
    add(g, 'geladeira_vitrine', { largura: 14 }, [-6, 0, -15]); add(g, 'prateleira', { largura: 10, altura: 7, seed: 9 }, [10, 0, -15.3]);
    for (const x of [-9, 0, 9]) { add(g, 'balcao', { largura: 4, cor: '#c4281c' }, [x, 0, 3.5], 90); add(g, 'caixa_registradora', {}, [x, 3.2, 3.0], 90); }
    add(g, 'carrinho_compras', {}, [-4, 0, 7], 30); add(g, 'carrinho_compras', {}, [5, 0, 8], -20);
    g.add(caixa(34, 1.2, 0.2, '#c4281c', { pos: [0, 9.6, -15.7] })); placa(g, 'MERCADO', 8, 1.0, [0, 9.6, -15.6], { fundo: '#c4281c', corTexto: '#fff' });
    for (const z of [-8, 2]) for (const x of [-10, 0, 10]) luzTeto(g, x, z, n);
    g.userData.ancoras = { atender: [0, 0, 3.5, -90] };
  },
  interior_banco(o, g, r) { const n = o.hora === 'noite';
    sala(g, { parede: o.parede || '#e3e5ea', chao: '#b8bcc6', altura: 12 }); piso(g, 26, '#b8bcc6', '#a9adb7');
    for (const [i, x] of [-6.5, 0, 6.5].entries()) add(g, 'guiche', { largura: 5.5, cor: '#8c909a', numero: i + 1 }, [x, 0, -4.5]);
    for (const x of [-12, 12]) for (let k = 0; k < 2; k++) { const atm = grupo([caixa(1.4, 3.4, 1.2, '#5a5d66', { pos: [0, 1.7, 0] }), plano(0.9, 0.7, mat('#5fb0ff', { emissive: '#3a8fd8', emissiveIntensity: 0.9 }), { pos: [0, 2.7, 0.61] })]);
      atm.position.set(x * 0.93, 0, 2 + k * 3); atm.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; g.add(atm); }
    add(g, 'fila_cordao', { n: 4 }, [-4.8, 0, 3]); g.add(caixa(3.4, 5.6, 0.5, mat('#9aa0aa', { metal: 0.7, rough: 0.3 }), { pos: [9.5, 2.8, -7.6] }));
    g.add(cilindro(1.0, 1.0, 0.2, mat('#c9a24a', { metal: 0.8, rough: 0.3 }), { pos: [9.5, 3.0, -7.3], rot: [90, 0, 0], seg: 20 }));
    placa(g, 'BANCO', 5, 1.2, [-3, 10, -7.7], { fundo: '#1d3b72', corTexto: '#fff' });
    luzTeto(g, -5, -1, n); luzTeto(g, 5, -1, n);
    g.userData.ancoras = { atender: [0, 0, -6.2, 0] };
  },
  interior_prefeitura(o, g, r) { const n = o.hora === 'noite';   // salão de atendimento/recepção da prefeitura
    sala(g, { parede: o.parede || '#efe9dc', chao: '#9b7b5a', altura: 12 }); g.add(caixa(10, 0.05, 20, '#7b1f2b', { pos: [0, 0.03, 0], sombra: false }));
    add(g, 'balcao', { largura: 9, cor: '#5a3a22', tampo: '#c9a24a' }, [0, 0, -4]);
    for (const x of [-10, 10]) { add(g, 'bandeira', {}, [x, 0, -6.8]).scale.setScalar(0.6); }
    const q = PROPS.quadro_parede({ texto: 'PREFEITO', cor: '#1d3b72' }); q.position.set(0, 7.6, -7.65); g.add(q);
    placa(g, 'PREFEITURA MUNICIPAL', 9, 1.0, [0, 10.4, -7.7], { fundo: '#efe9dc', corTexto: '#1d3b72' });
    add(g, 'cadeiras_espera', { n: 4, cor: '#7b1f2b' }, [-8, 0, 4], 90); add(g, 'cadeiras_espera', { n: 4, cor: '#7b1f2b' }, [8, 0, 4], -90); add(g, 'planta', {}, [11, 0, -6]);
    luzTeto(g, -5, -1, n); luzTeto(g, 5, -1, n);
    g.userData.ancoras = { atender: [0, 0, -5.8, 0], sentar: [-7.6, 0, 1.7, 90] };
  },
  interior_igreja(o, g, r) { const n = o.hora === 'noite', B = '#f6f2e6';   // nave com bancos, altar e vitrais
    g.add(caixa(30, 0.4, 70, '#b5895a', { pos: [0, -0.2, 0] })); g.add(caixa(4, 0.05, 60, '#7b1f2b', { pos: [0, 0.03, -2], sombra: false }));
    g.add(caixa(30, 18, 0.5, B, { pos: [0, 9, -32] })); for (const x of [-15, 15]) g.add(caixa(0.5, 18, 70, B, { pos: [x, 9, 0] }));
    g.add(caixa(30, 0.4, 70, '#e8ddc7', { pos: [0, 18, 0], sombra: false }));
    for (let z = -26; z <= 26; z += 6) for (const x of [-14.6, 14.6]) { g.add(caixa(0.6, 18, 0.8, '#e8c25a', { pos: [x * 0.98, 9, z] })); }
    for (let z = -22; z <= 14; z += 9) for (const s of [-1, 1]) { const v = MOVEIS.vitral(); v.position.set(s * 14.7, 9, z); v.rotation.y = -s * Math.PI / 2; g.add(v); }
    for (let z = -20; z <= 6; z += 3.2) for (const s of [-1, 1]) add(g, 'banco_igreja', { largura: 9 }, [s * 7, 0, z]);
    add(g, 'altar', {}, [0, 0, -27]); const cr = MOVEIS.cruz_parede({ cor: '#c9a24a' }); cr.position.set(0, 11, -31.6); g.add(cr);
    for (const z of [-20, -6, 8]) { const l = new THREE.PointLight(0xfff0d0, n ? 120 : 60, 50, 1.4); l.position.set(0, 15, z); g.add(l); }
    g.userData.limites = { x: 14, y: 17, z: -31 };
    g.userData.ancoras = { rezar: [-5, 0, -0.6, 0], sentar: [-5, 0, -0.6, 0], atender: [0, 1.2, -25.5, 0] };
  },
  interior_posto_saude(o, g, r) { const n = o.hora === 'noite';   // recepção + consultório ao fundo
    sala(g, { parede: o.parede || '#e6f1f8', chao: '#d6e2ea' }); piso(g, 26, '#d6e2ea', '#c6d4de');
    add(g, 'balcao', { largura: 7, cor: '#1e88e5', tampo: '#f2f3f3' }, [-5, 0, -4]); add(g, 'computador', {}, [-6, 1.0, -4.2], 180);
    add(g, 'cadeiras_espera', { n: 5 }, [6, 0, 1], -90); add(g, 'cadeiras_espera', { n: 4 }, [-6, 0, 5]);
    add(g, 'maca', {}, [8, 0, -5], 90); g.add(caixa(0.2, 9, 6, '#cfe0ea', { pos: [4.2, 4.5, -5] }));
    const cz = grupo([caixa(0.6, 1.8, 0.2, '#e53935'), caixa(1.8, 0.6, 0.2, '#e53935')]); cz.position.set(-5, 8.5, -7.7); g.add(cz);
    placa(g, 'POSTO DE SAÚDE', 7, 1.0, [-5, 10.2, -7.7], { fundo: '#1e88e5', corTexto: '#fff' }); add(g, 'bebedouro', {}, [11.5, 0, -6]);
    const m = MOVEIS.mural({ texto: 'VACINE-SE!', largura: 4, altura: 2.4, cor: '#ffffff', cor_texto: '#e53935' }); m.position.set(0, 6, -7.6); g.add(m);
    luzTeto(g, -5, -1, n); luzTeto(g, 5, -1, n);
    g.userData.ancoras = { atender: [-5, 0, -5.6, 0], sentar: [5.7, 0, -2.0, -90], deitar: [8, 2.35, -2.2, 0] };
  },
  interior_delegacia(o, g, r) { const n = o.hora === 'noite';   // balcão, mesa do delegado e cela (grades de frente para a câmera)
    sala(g, { parede: o.parede || '#e2e5ea', chao: '#9aa0aa' }); g.add(caixa(26, 1.5, 0.2, '#1d3b72', { pos: [0, 0.75, -7.7] }));
    g.add(caixa(0.3, 11, 8, '#cfd3da', { pos: [-4.0, 5.5, -4] })); add(g, 'cela', { largura: 8.6 }, [-8.3, 0, 0]);
    g.add(caixa(3, 0.6, 1.6, '#7a7d86', { pos: [-10.5, 0.9, -6.2] }));                                     // cama da cela
    add(g, 'balcao', { largura: 6, cor: '#5a5d66' }, [3, 0, -2.8]); add(g, 'mesa_trabalho', {}, [8.5, 0, -5.4]); add(g, 'cadeira', {}, [8.5, 0, -7.2]);
    add(g, 'arquivo', {}, [11.6, 0, -2.5], -90); add(g, 'bandeira', {}, [5.5, 0, -7]).scale.setScalar(0.6);
    placa(g, 'DELEGACIA', 5, 1.0, [3, 9.4, -7.7], { fundo: '#1d3b72', corTexto: '#fff' });
    const m = MOVEIS.mural({ texto: 'PROCURADO', largura: 2.6, altura: 3.2, cor: '#f5e6b8', cor_texto: '#8a1f1f' }); m.position.set(0, 6, -7.6); g.add(m);
    luzTeto(g, -5, -1, n); luzTeto(g, 5, -1, n);
    g.userData.ancoras = { atender: [3, 0, -4.4, 0], segurar_grade: [-8.3, 0, -1.0, 0], sentar: [8.5, 0, -6.9, 0] };
  },
  interior_bar(o, g, r) { const n = o.hora === 'noite';   // boteco: balcão com banquetas, garrafas, TV no futebol, sinuca
    sala(g, { parede: o.parede || '#f2d36b', chao: '#8a6a4a' }); g.add(caixa(26, 3.0, 0.2, '#c4281c', { pos: [0, 1.5, -7.7] }));
    add(g, 'prateleira_garrafas', { largura: 12 }, [-3, 0, -7.3]); add(g, 'balcao', { largura: 12, cor: '#7a4a2a', tampo: '#5a3a22' }, [-3, 0, -4]);
    for (let i = 0; i < 5; i++) add(g, 'banqueta', {}, [-8 + i * 2.5, 0, -2]);
    const tv = MOVEIS.tv_parede({ tela: 'futebol' }); tv.position.set(8, 8, -7.6); g.add(tv);
    add(g, 'sinuca', {}, [7.5, 0, 3], 90);
    for (const x of [-8]) { add(g, 'mesa', { largura: 3, cor: '#f2f3f3' }, [x, 0, 5]); add(g, 'cadeira_plastico', {}, [x - 2.2, 0, 5], 90); add(g, 'cadeira_plastico', {}, [x + 2.2, 0, 5], -90); }
    for (let i = 0; i < 3; i++) g.add(caixa(1.0, 0.7, 0.7, '#e53935', { pos: [11.5, 0.35 + i * 0.72, -6.8] }));
    placa(g, 'BAR DO ZÉ', 5, 1.0, [-3, 9.6, -7.7], { fundo: '#c4281c', corTexto: '#fff' });
    luzTeto(g, -5, -1, n); luzTeto(g, 5, 2, n);
    g.userData.ancoras = { atender: [-3, 0, -5.6, 0], sentar: [-8, 0.95, -1.7, 180] };
  },
  interior_posto_gasolina(o, g, r) { const n = o.hora === 'noite';   // loja de conveniência
    sala(g, { parede: o.parede || '#f7f7f7', chao: '#e1e1e1' }); g.add(caixa(26, 0.6, 0.15, '#e53935', { pos: [0, 8.6, -7.7] }));
    add(g, 'geladeira_vitrine', { largura: 10 }, [-6, 0, -7.0]); add(g, 'prateleira', { largura: 6, altura: 6, seed: 4 }, [7, 0, -7.3]);
    add(g, 'gondola', { largura: 7, seed: 2 }, [-2, 0, 3], 90); add(g, 'balcao', { largura: 5, cor: '#e53935' }, [7, 0, -2.5]); add(g, 'caixa_registradora', {}, [7, 3.2, -2.5], 180);
    placa(g, 'CONVENIÊNCIA 24H', 7, 1.0, [0, 9.6, -7.7], { fundo: '#e53935', corTexto: '#fff' });
    luzTeto(g, -5, -1, n); luzTeto(g, 5, -1, n);
    g.userData.ancoras = { atender: [7, 0, -4.1, 0] };
  },
};

/** Local da cidade -> cenário interior. */
export const INTERIOR_DO_LOCAL = { ...Object.fromEntries(Object.keys(INTERIORES).map(k => [k.replace('interior_', ''), k])), escola: 'escola' }; // escola por dentro = sala de aula
