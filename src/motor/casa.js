// Casa do protagonista: modelo completo (2 andares, cômodos lado a lado, frente aberta como um set de filmagem)
// + móveis de casa reutilizáveis. No roteiro: `onde: casa_protagonista` + `comodo: quarto | quarto_pais | sala | cozinha | banheiro | garagem | vista`.
import * as THREE from 'three';
import { caixa, cilindro, esfera, plano, grupo, mat, rng } from './util.js';
import { PROPS, placaTexto, registrarProps } from './props.js';

const RAD = Math.PI / 180;
function placa(g, texto, w, h, pos, o = {}) { const p = placaTexto(texto, w, h, o); p.position.set(...pos); g.add(p); return p; }
function por(g, tipo, o, pos, vira = 0) { const p = PROPS[tipo](o); p.position.set(...pos); p.rotation.y = vira * RAD; g.add(p); return p; }

// ---------------- móveis de casa ----------------
export const MOVEIS_CASA = {
  cadeira_gamer: (o = {}) => { const c = o.cor || '#c4281c', p = '#1b1b1b'; return grupo([caixa(2.4, 0.4, 2.2, p, { pos: [0, 1.4, 0], round: 0.1 }), caixa(2.4, 2.8, 0.4, p, { pos: [0, 3.0, -1.0], round: 0.12 }),
    caixa(0.6, 2.6, 0.45, c, { pos: [0, 3.0, -0.8] }), caixa(1.4, 0.5, 0.42, c, { pos: [0, 4.2, -0.82], round: 0.1 }), cilindro(0.1, 0.1, 1.1, '#888', { pos: [0, 0.7, 0] }),
    ...[0, 72, 144, 216, 288].map(a => caixa(0.12, 0.12, 1.0, '#888', { pos: [Math.sin(a * RAD) * 0.5, 0.15, Math.cos(a * RAD) * 0.5], rot: [0, a, 0] }))]); },
  guarda_roupa: (o = {}) => { const w = o.largura || 5, c = o.cor || '#c9a36b', g = grupo([caixa(w, 8, 2.2, c, { pos: [0, 4, 0] })]);
    for (let x = -w / 2 + w / 4; x < w / 2; x += w / 2) { g.add(caixa(w / 2 - 0.15, 7.6, 0.08, o.cor2 || '#d8b47c', { pos: [x, 4, 1.12] })); g.add(caixa(0.1, 0.8, 0.1, '#555', { pos: [x + (x < 0 ? 1 : -1) * (w / 4 - 0.4), 4, 1.2] })); }
    return g; },
  cortina: (o = {}) => { const w = o.largura || 6, c = o.cor || '#4f7fd1', g = grupo([cilindro(0.06, 0.06, w + 0.6, '#888', { pos: [0, 0, 0], rot: [0, 0, 90] })]);
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) g.add(caixa(0.45, 4.6, 0.12, c, { pos: [s * (w / 2 - 0.25 - i * 0.42), -2.3, 0.1 + (i % 2) * 0.12] })); return g; },
  cama_casal: (o = {}) => grupo([caixa(6, 1.0, 7, '#7c5c46', { pos: [0, 0.5, 0] }), caixa(5.8, 0.6, 6.6, '#f2f3f3', { pos: [0, 1.3, 0] }),
    caixa(2.2, 0.45, 1.1, '#ffffff', { pos: [-1.4, 1.8, -2.6], round: 0.15 }), caixa(2.2, 0.45, 1.1, '#ffffff', { pos: [1.4, 1.8, -2.6], round: 0.15 }),
    caixa(5.9, 0.6, 4.2, o.cor || '#b84a5a', { pos: [0, 1.45, 1.0] }), caixa(6.2, 3.6, 0.35, '#5a3a22', { pos: [0, 1.8, -3.5] })]),
  criado_mudo: (o = {}) => grupo([caixa(1.6, 1.8, 1.4, o.cor || '#a8754a', { pos: [0, 0.9, 0] }), caixa(1.2, 0.1, 0.08, '#555', { pos: [0, 1.2, 0.72] }),
    cilindro(0.3, 0.35, 0.3, '#ddd', { pos: [0, 1.95, 0] }), cilindro(0.05, 0.05, 0.8, '#ddd', { pos: [0, 2.4, 0] }),
    cilindro(0.35, 0.55, 0.6, mat('#fff3d6', { emissive: '#ffd27a', emissiveIntensity: 0.6 }), { pos: [0, 3.0, 0], sombra: false })]),
  comoda: (o = {}) => { const g = grupo([caixa(4.2, 3.2, 1.6, o.cor || '#a8754a', { pos: [0, 1.6, 0] })]);
    for (const y of [0.8, 1.7, 2.6]) { g.add(caixa(4.0, 0.8, 0.06, '#c9945e', { pos: [0, y, 0.82] })); g.add(caixa(0.6, 0.1, 0.1, '#555', { pos: [0, y, 0.88] })); }
    g.add(caixa(2.6, 3.0, 0.15, '#c9a24a', { pos: [0, 4.9, -0.6] })); g.add(caixa(2.3, 2.7, 0.16, mat('#dfeffa', { rough: 0.05, metal: 0.6 }), { pos: [0, 4.9, -0.55] })); return g; },
  tapete: (o = {}) => grupo([caixa(o.largura || 6, 0.05, o.prof || 4, o.cor || '#c76b5a', { pos: [0, 0.03, 0], sombra: false }),
    caixa((o.largura || 6) - 0.8, 0.06, (o.prof || 4) - 0.8, o.cor2 || '#e0a090', { pos: [0, 0.04, 0], sombra: false })]),
  mesa_centro: () => grupo([caixa(3.4, 0.25, 2.0, '#7c5c46', { pos: [0, 1.3, 0] }), ...[[-1.4, -0.8], [1.4, -0.8], [-1.4, 0.8], [1.4, 0.8]].map(([x, z]) => caixa(0.2, 1.2, 0.2, '#5a3a22', { pos: [x, 0.6, z] })),
    caixa(0.8, 0.3, 0.6, '#c4281c', { pos: [0.6, 1.57, 0.2] })]),
  escada: (o = {}) => { const n = o.degraus || 10, g = grupo([]); for (let i = 0; i < n; i++) g.add(caixa(o.largura || 3, 1.05, 1.2, o.cor || '#a8754a', { pos: [0, 0.52 + i * 1.05, -i * 1.2] }));
    g.add(caixa(0.12, 1.6, n * 1.2 * 1.05, '#5a3a22', { pos: [(o.largura || 3) / 2, n * 0.52 + 1.6, -n * 0.6], rot: [Math.atan2(1.05, 1.2) / RAD, 0, 0] })); return g; },
  vaso_sanitario: () => grupo([cilindro(0.55, 0.45, 1.3, '#f2f3f3', { pos: [0, 0.65, 0.2], seg: 16 }), caixa(1.2, 0.2, 1.5, '#f2f3f3', { pos: [0, 1.35, 0.3], round: 0.08 }),
    caixa(1.3, 1.6, 0.6, '#f2f3f3', { pos: [0, 1.9, -0.6], round: 0.08 })]),
  pia_banheiro: () => grupo([cilindro(0.3, 0.4, 2.4, '#f2f3f3', { pos: [0, 1.2, 0] }), caixa(2.0, 0.4, 1.4, '#f2f3f3', { pos: [0, 2.6, 0], round: 0.1 }),
    cilindro(0.05, 0.05, 0.6, '#ccc', { pos: [0, 3.0, -0.5] }), caixa(2.0, 2.4, 0.12, mat('#dfeffa', { rough: 0.05, metal: 0.6 }), { pos: [0, 4.9, -0.65] })]),
  box_chuveiro: () => grupo([caixa(4, 0.25, 4, '#dfe9ef', { pos: [0, 0.12, 0] }), caixa(0.06, 7.5, 4, new THREE.MeshStandardMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.25, depthWrite: false }), { pos: [2, 3.9, 0], sombra: false }),
    caixa(4, 7.5, 0.06, new THREE.MeshStandardMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.25, depthWrite: false }), { pos: [0, 3.9, 2], sombra: false }),
    cilindro(0.04, 0.04, 1.2, '#ccc', { pos: [-1.5, 7.2, -1.5] }), cilindro(0.4, 0.3, 0.12, '#ccc', { pos: [-1.5, 6.6, -1.1], seg: 14 })]),
  porta_retrato: (o = {}) => { const g = grupo([caixa(1.2, 1.5, 0.1, '#5a3a22')]); g.add(plano(0.95, 1.2, mat(o.cor || '#8fc1e3'), { pos: [0, 0, 0.06] }));
    g.add(esfera(0.22, '#f5cd30', { pos: [0, 0.1, 0.1] })); return g; },
  painel_ferramentas: () => { const g = grupo([caixa(6, 3.5, 0.15, '#c9a36b')]); [['#c4281c', -2], ['#1e88e5', -0.8], ['#555', 0.4], ['#f5cd30', 1.6]].forEach(([c, x]) =>
    g.add(caixa(0.25, 1.6, 0.25, c, { pos: [x, 0.2, 0.2] }))); g.add(caixa(1.2, 0.3, 0.3, '#555', { pos: [2.4, 0.9, 0.2] })); return g; },
  luminaria: () => grupo([cilindro(0.5, 0.5, 0.1, '#333', { pos: [0, 0.05, 0] }), cilindro(0.06, 0.06, 5, '#333', { pos: [0, 2.5, 0] }),
    cilindro(0.5, 0.9, 1.0, mat('#fff3d6', { emissive: '#ffd27a', emissiveIntensity: 0.7 }), { pos: [0, 5.2, 0], sombra: false })]),
  poster: (o = {}) => { const p = placaTexto(o.texto || 'GAMER', 2.4, 3.2, { fundo: o.cor || '#6b32a8', corTexto: o.cor_texto || '#ffd23f' }); return grupo([p]); },
};
registrarProps(MOVEIS_CASA);

// ---------------- os cômodos ----------------
const W = 22, D = 14, H = 10.5;          // largura, profundidade e pé-direito de cada cômodo
function comodo(g, { parede, chao, piso2, rodape = '#d8d4cc', janela = true, n }) {
  g.add(caixa(W, 0.5, D + 2, chao, { pos: [0, -0.25, -D / 2 + 1] }));
  if (piso2) for (let x = -W / 2 + 1; x < W / 2; x += 2) for (let z = -D + 1; z < 2; z += 2) if ((Math.round(x / 2) + Math.round(z / 2)) % 2) g.add(caixa(1.96, 0.02, 1.96, piso2, { pos: [x, 0.01, z], sombra: false }));
  g.add(caixa(W, H, 0.4, parede, { pos: [0, H / 2, -D] }));
  for (const s of [-1, 1]) g.add(caixa(0.4, H, D + 2, parede, { pos: [s * W / 2, H / 2, -D / 2 + 1] }));
  g.add(caixa(W, 0.4, D + 2, '#f4f4f4', { pos: [0, H + 0.2, -D / 2 + 1], sombra: false }));
  g.add(caixa(W - 0.6, 0.5, 0.2, rodape, { pos: [0, 0.25, -D + 0.3] }));
  const lz = new THREE.PointLight(0xfff2dd, n ? 70 : 40, 34, 1.4); lz.position.set(0, H - 1.2, -D / 2 + 1); g.add(lz);
  g.add(caixa(2.6, 0.15, 2.6, mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 1.4 }), { pos: [0, H - 0.1, -D / 2 + 1], sombra: false }));
  if (janela) { g.add(caixa(5.4, 4.4, 0.3, '#ffffff', { pos: [W / 4, 5.6, -D + 0.25] }));
    g.add(caixa(5, 4, 0.32, mat(n ? '#20305a' : '#bfe6ff', { emissive: n ? '#101a33' : '#bfe6ff', emissiveIntensity: n ? 0.4 : 0.9 }), { pos: [W / 4, 5.6, -D + 0.27], sombra: false })); }
}
export const COMODOS = {
  quarto(g, o, n) { // quarto do protagonista (garoto gamer)
    comodo(g, { parede: o.parede || '#9fc6ee', chao: '#a8805a', n });
    const cz = PROPS.cortina({ cor: '#ffd23f', largura: 5.4 }); cz.position.set(W / 4, 8.0, -D + 0.6); g.add(cz);
    por(g, 'cama', { cor: o.cor || '#1e88e5' }, [-7, 0, -9.7]); por(g, 'criado_mudo', {}, [-3.6, 0, -12.6]);
    por(g, 'mesa', { largura: 5, cor: '#f2f3f3' }, [9.4, 0, -8], -90); por(g, 'computador', {}, [9.8, 0, -8], -90); por(g, 'cadeira_gamer', {}, [7.0, 0, -8], -90);
    por(g, 'guarda_roupa', { largura: 4.5 }, [-9.2, 0, -2.2], 90); g.add(caixa(1.4, 0.5, 1.0, '#222', { pos: [9.2, 2.45, -6.2] }));   // videogame
    for (const [t, c, x] of [['GAMER', '#6b32a8', -2.2], ['GOOOL!', '#1f9d48', 0.8]]) { const p = PROPS.poster({ texto: t, cor: c }); p.position.set(x, 6.5, -D + 0.25); g.add(p); }
    por(g, 'tapete', { cor: '#2e5fa8', cor2: '#4f7fd1', largura: 5, prof: 3.5 }, [-1, 0, -5]); por(g, 'bola', {}, [1.5, 0, -3]); g.add(caixa(1.4, 1.6, 0.7, '#c4281c', { pos: [3.5, 0.8, -12.5], round: 0.15 }));
    return { deitar: [-7, 1.45, -6.6, 0], dormir: [-7, 1.45, -6.6, 0], sentar: [7.3, 0.5, -8, 90], jogar_pc: [7.3, 0.5, -8, 90] };
  },
  quarto_pais(g, o, n) {
    comodo(g, { parede: o.parede || '#efe0d0', chao: '#9b7b5a', n });
    por(g, 'cama_casal', { cor: '#b84a5a' }, [-3, 0, -10]); por(g, 'criado_mudo', {}, [-7.4, 0, -12.6]); por(g, 'criado_mudo', {}, [1.4, 0, -12.6]);
    por(g, 'guarda_roupa', { largura: 6, cor: '#e9e6dc', cor2: '#f4f1ea' }, [9, 0, -7], -90); por(g, 'comoda', {}, [-9.2, 0, -5], 90);
    const q = PROPS.quadro_parede({ texto: '♥', cor: '#b84a5a' }); q.position.set(-3, 7.2, -D + 0.25); g.add(q);
    const cz = PROPS.cortina({ cor: '#b84a5a', largura: 5.4 }); cz.position.set(W / 4, 8.0, -D + 0.6); g.add(cz);
    por(g, 'tapete', { cor: '#d8c49a', cor2: '#e8d8b0', largura: 7, prof: 3 }, [-3, 0, -4.8]);
    return { deitar: [-4.4, 1.45, -6.6, 0], dormir: [-4.4, 1.45, -6.6, 0] };
  },
  sala(g, o, n) {
    comodo(g, { parede: o.parede || '#f1e4c8', chao: '#a8805a', n });
    por(g, 'sofa', { cor: '#4f6f8f' }, [-2, 0, -11.5]); por(g, 'poltrona', { cor: '#8a5a33' }, [-9, 0, -8], 60);
    por(g, 'mesa_centro', {}, [-2, 0, -7.5]); por(g, 'tapete', { cor: '#c76b5a', largura: 8, prof: 5 }, [-2, 0, -8]);
    por(g, 'tv', {}, [-9.6, 0, -6.5], 90); por(g, 'planta', {}, [3.5, 0, -12.6]);
    por(g, 'escada', { degraus: 9 }, [9.2, 0, -2]);
    for (const [x, c] of [[-5, '#8fc1e3'], [-2, '#f2a7c3'], [1, '#b7e1a1']]) { const p = PROPS.porta_retrato({ cor: c }); p.position.set(x, 7.2, -D + 0.25); g.add(p); }
    const cz = PROPS.cortina({ cor: '#7a2e1f', largura: 5.4 }); cz.position.set(W / 4, 8.0, -D + 0.6); g.add(cz);
    return { sentar: [-3.1, 0, -11.1, 0] };
  },
  cozinha(g, o, n) {
    comodo(g, { parede: o.parede || '#f2efe6', chao: '#c9c2b3', piso2: '#b9b2a3', n, janela: false });
    for (let x = -10.4; x <= 10.4; x += 1.2) for (let y = 0.6; y < 6; y += 1.2) g.add(caixa(1.15, 1.15, 0.05, (Math.round(x / 1.2) + Math.round(y / 1.2)) % 2 ? '#ffffff' : '#dfe9ef', { pos: [x, y, -D + 0.22], sombra: false }));
    por(g, 'pia', {}, [-2, 0, -12.8]); por(g, 'fogao', {}, [2.4, 0, -12.8]); por(g, 'geladeira', {}, [-7, 0, -12.6]);
    const a = PROPS.armario({}); a.position.set(-1.5, 7.2, -D + 0.9); g.add(a);
    por(g, 'mesa_jantar', {}, [3, 0, -5]);
    return { sentar: [1.7, 0, -7.3, 0], cozinhar: [2.4, 0, -11.0, 180], lavar_louca: [-2.8, 0, -11.0, 180] };
  },
  banheiro(g, o, n) {
    comodo(g, { parede: o.parede || '#dff0f4', chao: '#e8ece8', piso2: '#d6dde0', n, janela: false });
    for (let x = -10.4; x <= 10.4; x += 1.2) for (let y = 0.6; y < 5; y += 1.2) g.add(caixa(1.15, 1.15, 0.05, '#ffffff', { pos: [x, y, -D + 0.22], sombra: false }));
    por(g, 'pia_banheiro', {}, [-3, 0, -12.8]); por(g, 'vaso_sanitario', {}, [1.5, 0, -12.6]); por(g, 'box_chuveiro', {}, [7.5, 0, -11]);
    g.add(caixa(1.6, 2.2, 0.1, '#4f7fd1', { pos: [4.4, 4.5, -D + 0.3] })); por(g, 'tapete', { cor: '#4f7fd1', cor2: '#6f9fe1', largura: 3, prof: 1.8 }, [-3, 0, -10.5]);
    return {};
  },
  garagem(g, o, n) {
    comodo(g, { parede: o.parede || '#cfd3da', chao: '#8f939c', n, janela: false });
    por(g, 'carro', { cor: o.cor || '#c4281c' }, [-3, 0, -7], 90); por(g, 'bicicleta', {}, [7, 0, -11], 70); por(g, 'moto', {}, [7.5, 0, -6], 90);
    const p = PROPS.painel_ferramentas(); p.position.set(4, 5.5, -D + 0.3); g.add(p);
    por(g, 'prateleira', { largura: 5, altura: 6, cores: ['#b8875a', '#a87545', '#8a5a33', '#c4281c'], seed: 3 }, [-9.6, 0, -8], 90);
    return {};
  },
};
// Layout: térreo = garagem | sala | cozinha · andar de cima = banheiro | quarto | quarto_pais (andar de cima recua um pouco)
const ANDAR = H + 0.5;
export const PLANTA = {
  garagem: [-W, 0], sala: [0, 0], cozinha: [W, 0],
  banheiro: [-W, ANDAR], quarto: [0, ANDAR], quarto_pais: [W, ANDAR],
};
export const COMODOS_CASA = [...Object.keys(PLANTA), 'vista'];

export function construirCasa(o, g, r) {
  const n = o.hora === 'noite';
  g.add(caixa(600, 0.2, 600, '#4ccd3d', { pos: [0, -0.6, 0] }));
  g.add(caixa(3 * W + 2, 0.4, 6, '#c9ccd5', { pos: [0, -0.5, 4] }));             // calçada na frente do set
  for (const [nome, [x, y]] of Object.entries(PLANTA)) {
    const c = new THREE.Group(); c.position.set(x, y, 0); const anc = COMODOS[nome](c, o, n); c.userData = { nome, ancoras: anc }; g.add(c);
  }
  // telhado de telha sobre o andar de cima (aparece na vista)
  const larg = 3 * W + 2;
  for (const s of [-1, 1]) g.add(caixa(larg, 0.4, 9.5, '#c8643b', { pos: [0, ANDAR + H + 2.4, -D / 2 + s * 3.7], rot: [s * 28, 0, 0] }));
  g.add(caixa(larg, 0.6, 0.6, '#ffffff', { pos: [0, ANDAR - 0.2, 1.1] }));       // viga entre os andares
}

/** Coloca o cômodo escolhido na origem (piso em y=0) e devolve as âncoras/limites dele. */
export function enquadrarComodo(g, comodoNome) {
  if (!comodoNome || comodoNome === 'vista') { g.position.set(0, -ANDAR / 2, 0); return { ancoras: {}, limites: null }; }
  const [x, y] = PLANTA[comodoNome] || PLANTA.quarto;
  g.position.set(-x, -y, D / 2 - 3);
  const c = g.children.find(ch => ch.userData?.nome === comodoNome);
  const anc = Object.fromEntries(Object.entries(c?.userData.ancoras || {}).map(([k, v]) => [k, [v[0], v[1], v[2] + D / 2 - 3, v[3]]]));
  return { ancoras: anc, limites: { x: W / 2 - 0.9, y: H - 0.8, z: -D / 2 - 2 } };
}
