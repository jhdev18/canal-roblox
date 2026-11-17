// Cidade pequena: prédios próprios de cada local + o modelo da cidade que junta todos.
// Convenção dos prédios: a FACHADA fica em z = 0, olhando para +Z; o corpo do prédio vai para -Z.
import * as THREE from 'three';
import { caixa, cilindro, esfera, plano, grupo, mat, rng } from './util.js';
import { PROPS, placaTexto, registrarProps } from './props.js';

const RAD = Math.PI / 180;
const vidro = (n, quente = true) => mat(n ? (quente ? '#ffe3a3' : '#cfe8ff') : '#a8dcff', n ? { emissive: quente ? '#ffd27a' : '#bfe0ff', emissiveIntensity: 1.1 } : { rough: 0.12, metal: 0.15 });

/** Bloco base: corpo + barrado + platibanda (o "muro" no alto da fachada, típico de comércio de cidade pequena). */
function corpo(g, w, h, d, cor, { faixa, barrado = '#d8d4cc', platibanda = true } = {}) {
  g.add(caixa(w, h, d, cor, { pos: [0, h / 2, -d / 2] }));
  g.add(caixa(w + 0.06, 0.6, 0.1, barrado, { pos: [0, 0.3, 0.03] }));
  if (faixa) g.add(caixa(w + 0.06, 0.45, 0.12, faixa, { pos: [0, h - 1.2, 0.04] }));
  g.add(caixa(w - 0.2, 0.2, d - 0.2, '#8f939c', { pos: [0, h + 0.05, -d / 2] }));                          // laje
  if (platibanda) { g.add(caixa(w + 0.3, 1.0, 0.3, cor, { pos: [0, h + 0.5, 0.0] }));                         // platibanda na fachada
    for (const x of [-w / 2, w / 2]) g.add(caixa(0.3, 0.6, d, cor, { pos: [x, h + 0.3, -d / 2] })); g.add(caixa(w + 0.3, 0.15, 0.4, '#ece8de', { pos: [0, h + 1.05, 0] })); }
  const cx = PROPS.caixa_dagua(); cx.position.set(w / 2 - 1.6, h + 0.15, -d + 1.6); g.add(cx);
}
function letreiro(g, texto, w, y, { fundo, cor = '#ffffff', n, h = 1.2 } = {}) { const p = placaTexto(texto, w, h, { fundo, corTexto: cor, emissivo: n }); p.position.set(0, y, 0.2); g.add(p); return p; }
function vitrine(g, x, w, h, n, quente) { g.add(caixa(w + 0.3, h + 0.3, 0.12, '#ffffff', { pos: [x, 0.6 + h / 2, 0.03] })); g.add(caixa(w, h, 0.14, vidro(n, quente), { pos: [x, 0.6 + h / 2, 0.05], sombra: false })); }
function portaVidro(g, x, w = 2.4, n) { g.add(caixa(w + 0.3, 3.4, 0.12, '#cfd3da', { pos: [x, 1.7, 0.03] })); g.add(caixa(w, 3.2, 0.14, vidro(n, false), { pos: [x, 1.6, 0.05], sombra: false })); g.add(caixa(0.06, 3.2, 0.16, '#9aa0aa', { pos: [x, 1.6, 0.06] })); }
function janelaPredio(g, x, y, n, grade = false) { g.add(caixa(2.0, 1.8, 0.12, '#ffffff', { pos: [x, y, 0.03] })); g.add(caixa(1.7, 1.5, 0.14, vidro(n), { pos: [x, y, 0.05], sombra: false }));
  if (grade) for (let k = -0.6; k <= 0.61; k += 0.4) g.add(caixa(0.05, 1.6, 0.05, '#2b2b2b', { pos: [x + k, y, 0.18] })); }
function toldo(g, w, y, c1, c2 = '#ffffff') { for (let i = 0; i < Math.round(w / 1.2); i++) g.add(caixa(1.2, 0.3, 2.0, i % 2 ? c2 : c1, { pos: [-w / 2 + 0.6 + i * 1.2, y, 1.0], rot: [-15, 0, 0], sombra: i % 2 === 0 })); }
function cruz(c, n) { const m = mat(c, { emissive: c, emissiveIntensity: n ? 2 : 0.6 }); return grupo([caixa(0.5, 1.5, 0.25, m), caixa(1.5, 0.5, 0.25, m)]); }

export const PREDIOS = {
  farmacia: (o = {}) => { const g = grupo([]), n = o.noite; corpo(g, 10, 6, 10, '#f4f6f4', { faixa: '#16a05d' });
    letreiro(g, o.texto || 'FARMÁCIA', 8.5, 4.9, { fundo: '#16a05d', n }); portaVidro(g, -2.2, 2.6, n); vitrine(g, 2.4, 4, 2.6, n, false);
    const br = grupo([caixa(0.15, 0.15, 1.6, '#555', { pos: [0, 0, 0.8] })]); const cz = cruz('#1fd16f', n); cz.position.set(0, -0.2, 1.7); br.add(cz); br.position.set(4.6, 4.8, 0); g.add(br);
    return g; },
  loterica: (o = {}) => { const g = grupo([]), n = o.noite; corpo(g, 8, 5.5, 9, '#1d4fa0', { faixa: '#f39c12', barrado: '#173f80' });
    letreiro(g, o.texto || 'LOTÉRICA', 7, 4.5, { fundo: '#f5b800', cor: '#1d3b72', n }); portaVidro(g, 0, 3.2, n);
    for (const x of [-2.9, 2.9]) vitrine(g, x, 1.6, 2.4, n, false);
    const cart = placaTexto('SORTE', 1.4, 0.7, { fundo: '#ffffff', corTexto: '#c4281c' }); cart.position.set(2.9, 2.3, 0.2); g.add(cart); return g; },
  padaria: (o = {}) => { const g = grupo([]), n = o.noite; corpo(g, 10, 6, 10, '#f3d9a4', { faixa: '#8a4a1f' });
    letreiro(g, o.texto || 'PADARIA', 8.5, 5.0, { fundo: '#8a4a1f', cor: '#ffe9b0', n }); toldo(g, 10, 3.9, '#c4281c');
    portaVidro(g, -2.5, 2.4, n); vitrine(g, 2.3, 4.2, 2.4, n, true);
    for (let i = 0; i < 6; i++) g.add(caixa(0.55, 0.3, 0.3, '#d9a25a', { pos: [0.9 + i * 0.6, 1.5, 0.25], round: 0.12 }));   // pães na vitrine
    const lousa = grupo([caixa(1.2, 1.6, 0.1, '#2b2b2b', { pos: [0, 0.9, 0] }), caixa(0.1, 1.8, 0.1, '#8a5a33', { pos: [-0.55, 0.9, -0.2] })]); lousa.position.set(4, 0, 2.4); lousa.rotation.y = -0.4; g.add(lousa);
    return g; },
  mercado: (o = {}) => { const g = grupo([]), n = o.noite; corpo(g, 16, 7, 14, '#f2f3f3', { faixa: '#c4281c' });
    letreiro(g, o.texto || 'MERCADO', 12, 5.8, { fundo: '#c4281c', n, h: 1.4 }); portaVidro(g, -4.5, 3.4, n); vitrine(g, 2.5, 9, 3.0, n, false);
    const b = PROPS.barraca({ cor: '#2e9e5b' }); b.position.set(4.5, 0, 3.0); b.scale.setScalar(0.8); g.add(b);
    for (let i = 0; i < 3; i++) g.add(caixa(1.2, 0.8, 0.8, '#b8875a', { pos: [-7.4, 0.4 + i * 0.82, 1.2] }));
    return g; },
  agencia_bancaria: (o = {}) => { const g = grupo([]), n = o.noite; corpo(g, 10, 7, 10, '#b8bcc6', { barrado: '#8c909a' });
    letreiro(g, o.texto || 'BANCO', 7, 6.0, { fundo: '#1d3b72', n }); portaVidro(g, 0, 3.0, n);
    for (const x of [-3.8, -1.9, 1.9, 3.8]) g.add(cilindro(0.35, 0.4, 5.2, '#e3e5ea', { pos: [x, 2.6, 0.5], seg: 12 }));
    const atm = grupo([caixa(1.0, 2.0, 0.6, '#5a5d66', { pos: [0, 1.0, 0] }), plano(0.6, 0.5, mat('#5fb0ff', { emissive: '#3a8fd8', emissiveIntensity: 0.9 }), { pos: [0, 1.5, 0.31] })]);
    atm.position.set(3.0, 0, 0.35); g.add(atm); return g; },
  prefeitura: (o = {}) => { const p = PROPS.prefeitura_predio({ noite: o.noite, texto: o.texto }); p.scale.setScalar(0.6); p.position.z = -9.8 * 0.6; return grupo([p]); },
  igreja: (o = {}) => { const g = grupo([]), n = o.noite, B = o.cor || '#f6f2e6', A = '#e8c25a', w = 12, h = 11, d = 22;
    g.add(caixa(w, h, d, B, { pos: [0, h / 2, -d / 2 - 1] }));
    for (const x of [-w / 2, w / 2]) g.add(caixa(0.4, h, 0.4, A, { pos: [x, h / 2, -1] }));
    const sub = 4.5, sh = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.4, 0), new THREE.Vector2(w / 2 + 0.4, 0), new THREE.Vector2(0, sub)]);
    const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }), mat(B)); fr.position.set(0, h, -d - 1); fr.castShadow = fr.receiveShadow = true; g.add(fr);
    const inc = Math.atan2(sub, w / 2); for (const s of [-1, 1]) g.add(caixa(Math.hypot(w / 2, sub) + 0.8, 0.35, d + 0.6, '#b5533a', { pos: [s * w / 4, h + sub / 2 + 0.15, -d / 2 - 1], rot: [0, 0, -s * inc / RAD] }));
    g.add(caixa(5, 22, 5, B, { pos: [0, 11, -1.5] })); g.add(caixa(5.4, 0.5, 5.4, A, { pos: [0, 22.2, -1.5] }));
    const telhadoTorre = cilindro(0, 3.8, 5, '#b5533a', { pos: [0, 25, -1.5], seg: 4 }); telhadoTorre.rotation.y = Math.PI / 4; g.add(telhadoTorre);
    g.add(caixa(0.3, 2.4, 0.3, A, { pos: [0, 28.6, -1.5] })); g.add(caixa(1.4, 0.3, 0.3, A, { pos: [0, 29.1, -1.5] }));
    g.add(caixa(2.2, 2.6, 0.2, '#5a3a22', { pos: [0, 17.5, 1.05] })); esferaSino(g);
    g.add(caixa(3.2, 5.2, 0.2, '#6b4426', { pos: [0, 2.6, 1.05] })); g.add(cilindro(1.6, 1.6, 0.2, '#6b4426', { pos: [0, 5.2, 1.05], rot: [90, 0, 0], seg: 20 }));
    g.add(cilindro(1.1, 1.1, 0.25, vidro(n), { pos: [0, 9.5, 1.08], rot: [90, 0, 0], seg: 20, sombra: false }));
    for (const x of [-4.2, 4.2]) { g.add(caixa(1.4, 3.2, 0.12, vidro(n), { pos: [x, 6, 0.0], sombra: false })); g.add(cilindro(0.7, 0.7, 0.12, vidro(n), { pos: [x, 7.6, 0.0], rot: [90, 0, 0], seg: 14, sombra: false })); }
    for (let i = 0; i < 3; i++) g.add(caixa(8 - i, 0.35, 1.2, '#dcd5c6', { pos: [0, 0.17 + i * 0.35, 2.4 - i * 0.9] }));
    return g; },
  escola: (o = {}) => { const g = grupo([]), n = o.noite; const b = grupo([]); corpo(b, 20, 8.4, 10, '#f5e6b8', { faixa: '#1e6fd9' });
    for (const x of [-7.5, -4.5, 4.5, 7.5]) { janelaPredio(b, x, 2.6, n); janelaPredio(b, x, 6.2, n); }
    portaVidro(b, 0, 3, n); letreiro(b, o.texto || 'ESCOLA MUNICIPAL', 12, 7.3, { fundo: '#1e6fd9', n }); b.position.z = -4; g.add(b);
    const m = PROPS.muro({ largura: 24, cor: '#f5e6b8', portao_x: 0, portao_cor: '#1e6fd9', altura: 1.8 }); g.add(m);
    const ban = PROPS.bandeira({}); ban.position.set(-9, 0, -2); ban.scale.setScalar(0.8); g.add(ban); return g; },
  posto_saude: (o = {}) => { const g = grupo([]), n = o.noite; corpo(g, 14, 5.2, 10, '#ffffff', { faixa: '#1e88e5' });
    letreiro(g, o.texto || 'POSTO DE SAÚDE', 10, 4.2, { fundo: '#1e88e5', n }); portaVidro(g, 0, 3, n);
    for (const x of [-4.6, 4.6]) janelaPredio(g, x, 2.2, n, true);
    const cz = cruz('#e53935', n); cz.position.set(-6, 4.2, 0.2); g.add(cz);
    const bc = PROPS.banco({}); bc.position.set(4.8, 0, 1.6); bc.scale.setScalar(0.8); g.add(bc); return g; },
  delegacia: (o = {}) => { const g = grupo([]), n = o.noite; corpo(g, 12, 6, 10, '#e9ebef', { faixa: '#1d3b72', barrado: '#5a5d66' });
    letreiro(g, o.texto || 'DELEGACIA', 9, 4.9, { fundo: '#1d3b72', n }); portaVidro(g, 0, 2.6, n);
    for (const x of [-4, 4]) janelaPredio(g, x, 2.3, n, true);
    const ban = PROPS.bandeira({}); ban.position.set(5.5, 0, 1.5); ban.scale.setScalar(0.7); g.add(ban); return g; },
  bar: (o = {}) => { const g = grupo([]), n = o.noite; corpo(g, 9, 4.6, 8, '#f5cd30', { faixa: '#c4281c', platibanda: false });
    letreiro(g, o.texto || 'BAR DO ZÉ', 7.5, 3.8, { fundo: '#c4281c', n, h: 1.0 });
    g.add(caixa(5.5, 2.9, 0.14, mat(n ? '#7a5a2a' : '#2a2018', n ? { emissive: '#ffb84a', emissiveIntensity: 0.6 } : {}), { pos: [-0.8, 1.45, 0.04], sombra: false }));
    g.add(caixa(5.7, 0.3, 0.3, '#9aa0aa', { pos: [-0.8, 3.0, 0.1] }));
    for (const [x, z] of [[-2.8, 2.6], [1.8, 2.8]]) { const m = PROPS.mesa({ largura: 2.2, cor: '#f2f3f3' }); m.position.set(x, 0, z); m.scale.setScalar(0.75); g.add(m);
      for (const s of [-1, 1]) { const c = PROPS.cadeira_plastico({}); c.position.set(x + s * 1.6, 0, z); c.rotation.y = -s * Math.PI / 2; c.scale.setScalar(0.8); g.add(c); } }
    for (let i = 0; i < 2; i++) g.add(caixa(1.0, 0.7, 0.7, '#e53935', { pos: [3.6, 0.35 + i * 0.72, 0.6] })); return g; },
  posto_gasolina: (o = {}) => { const g = grupo([]), n = o.noite;
    const loja = grupo([]); corpo(loja, 8, 4, 6, '#ffffff', { faixa: '#e53935' }); letreiro(loja, 'CONVENIÊNCIA', 6, 3.2, { fundo: '#e53935', n, h: 0.8 }); portaVidro(loja, 0, 2.4, n);
    loja.position.set(0, 0, -10); g.add(loja);
    g.add(caixa(16, 0.9, 10, '#f2f3f3', { pos: [0, 5.8, -2] })); g.add(caixa(16.1, 0.4, 10.1, '#e53935', { pos: [0, 5.5, -2] }));
    for (const x of [-6.5, 6.5]) for (const z of [-5.5, 1.5]) g.add(caixa(0.6, 5.4, 0.6, '#d8dde3', { pos: [x, 2.7, z] }));
    for (const x of [-3, 3]) { g.add(caixa(1.4, 0.3, 3.4, '#bfc2ca', { pos: [x, 0.15, -2] })); g.add(caixa(0.9, 2.2, 0.6, '#e53935', { pos: [x, 1.4, -2] }));
      g.add(plano(0.6, 0.4, mat('#111', { emissive: '#2dff6a', emissiveIntensity: 0.6 }), { pos: [x, 1.9, -1.69] })); }
    const tot = grupo([caixa(0.4, 7, 0.4, '#888', { pos: [0, 3.5, 0] }), caixa(2.6, 3.6, 0.4, '#e53935', { pos: [0, 7.4, 0] })]);
    const preco = placaTexto('POSTO', 2.3, 0.8, { fundo: '#ffffff', corTexto: '#e53935', emissivo: n }); preco.position.set(0, 8.4, 0.21); tot.add(preco);
    const p2 = placaTexto('R$ 5,99', 2.3, 0.7, { fundo: '#111', corTexto: '#ffd23f', emissivo: true }); p2.position.set(0, 7.2, 0.21); tot.add(p2);
    tot.position.set(9.5, 0, 2); g.add(tot); return g; },
  coreto: (o = {}) => { const g = grupo([cilindro(5, 5.2, 1.2, '#e9e6dc', { pos: [0, 0.6, 0], seg: 8 }), cilindro(5.3, 5.3, 0.2, '#d8d4cc', { pos: [0, 1.25, 0], seg: 8 })]);
    for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; g.add(cilindro(0.18, 0.18, 4.5, '#ffffff', { pos: [Math.sin(a) * 4.5, 3.5, Math.cos(a) * 4.5] })); }   // colunas (sem cercas)
    const tel = cilindro(0, 6.2, 3.2, o.cor || '#2e7d5b', { pos: [0, 7.3, 0], seg: 8 }); g.add(tel); g.add(esfera(0.35, '#e0b040', { pos: [0, 9.0, 0] }));
    for (let i = 0; i < 3; i++) g.add(caixa(3, 0.3, 0.9, '#dcd5c6', { pos: [0, 0.15 + i * 0.3, 5.9 - i * 0.6] })); return g; },
};
function esferaSino(g) { g.add(cilindro(0.5, 0.9, 1.2, '#c9a24a', { pos: [0, 17.4, 0.4], seg: 14, mat: { metal: 0.7, rough: 0.3 } })); }
registrarProps(PREDIOS);
export const NOMES_PREDIOS = Object.keys(PREDIOS);

// ---------------- o modelo da cidade ----------------
// Praça (com coreto) no centro, anel de ruas em volta, prédios de frente para a praça, saídas leste/oeste.
// rot = para onde a fachada olha (0 = +Z, 90 = +X, 180 = -Z, -90 = -X). f = posição da fachada (x, z).
const F = 34.5; // distância da fachada ao centro
export const LOTES = [
  { id: 'prefeitura', tipo: 'prefeitura', f: [-19, -F], rot: 0 },
  { id: 'igreja', tipo: 'igreja', f: [0, -F - 1], rot: 0 },
  { id: 'banco', tipo: 'agencia_bancaria', f: [19, -F], rot: 0 },
  { id: 'escola', tipo: 'escola', f: [-15, F], rot: 180 },
  { id: 'posto_saude', tipo: 'posto_saude', f: [15, F], rot: 180 },
  { id: 'padaria', tipo: 'padaria', f: [-F, -20], rot: 90 },
  { id: 'farmacia', tipo: 'farmacia', f: [-F, -9], rot: 90 },
  { id: 'loterica', tipo: 'loterica', f: [-F, 10], rot: 90 },
  { id: 'bar', tipo: 'bar', f: [-F, 20.5], rot: 90 },
  { id: 'mercado', tipo: 'mercado', f: [F, -16], rot: -90 },
  { id: 'delegacia', tipo: 'delegacia', f: [F, 13], rot: -90 },
  { id: 'posto_gasolina', tipo: 'posto_gasolina', f: [52, 7.5], rot: 180 },
];
/** Locais onde uma cena pode acontecer: frente de cada prédio + praça/coreto + vista geral. */
export const LOCAIS = [...LOTES.map(l => l.id), 'praca_central', 'coreto', 'vista'];
const PONTOS_EXTRA = { praca_central: { f: [0, 8], rot: 0, recuo: 2 }, coreto: { f: [0, 6], rot: 0, recuo: 3.5 } };

export function construirCidade(o, g, r) {
  const n = o.hora === 'noite';
  g.add(caixa(600, 0.2, 600, '#4ccd3d', { pos: [0, -0.1, 0] }));
  g.add(caixa(72, 0.2, 72, '#c3c7cf', { pos: [0, 0.1, 0] }));                                    // calçadas externas
  g.add(caixa(62, 0.2, 62, '#4f5361', { pos: [0, 0.11, 0] }));                                   // anel de ruas
  for (const s of [-1, 1]) { g.add(caixa(140, 0.2, 10, '#4f5361', { pos: [s * 100, 0.11, 0] })); g.add(caixa(140, 0.2, 3, '#c3c7cf', { pos: [s * 100, 0.1, -6.5] })); g.add(caixa(140, 0.2, 3, '#c3c7cf', { pos: [s * 100, 0.1, 6.5] })); }
  for (const [x, z, w, d] of [[0, -25.5, 50, 0.25], [0, 25.5, 50, 0.25], [-25.5, 0, 0.25, 50], [25.5, 0, 0.25, 50]]) g.add(caixa(w, 0.03, d, '#f5cd30', { pos: [x, 0.22, z], sombra: false }));
  g.add(caixa(41, 0.4, 41, '#d8d4cc', { pos: [0, 0.2, 0] })); g.add(caixa(40, 0.42, 40, '#d6cdb8', { pos: [0, 0.21, 0] }));   // praça elevada com meio-fio
  for (const [x, z] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) { g.add(caixa(11, 0.5, 11, '#3fae3a', { pos: [x, 0.25, z] }));
    const a = PROPS.arvore({ tam: r.entre(1, 1.3) }); a.position.set(x + r.entre(-2, 2), 0.4, z + r.entre(-2, 2)); g.add(a); }
  const cor = PREDIOS.coreto({}); cor.position.set(0, 0.4, 0); g.add(cor);
  for (const [x, z, v] of [[-6, 9, 180], [6, 9, 180], [-6, -9, 0], [6, -9, 0], [-9, 0, 90], [9, 0, -90]]) { const b = PROPS.banco({}); b.position.set(x, 0.4, z); b.rotation.y = v * RAD; g.add(b); }
  for (const [x, z] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) { const p = PROPS.poste({ noite: n }); p.position.set(x, 0.4, z); p.rotation.y = x < 0 ? 0 : Math.PI; g.add(p); }
  for (const l of LOTES) { const p = PREDIOS[l.tipo]({ noite: n }); p.position.set(l.f[0], 0.2, l.f[1]); p.rotation.y = l.rot * RAD; g.add(p); }
  // casas nas saídas e atrás dos prédios
  const cores = ['#f0b446', '#8fc1e3', '#f2a7c3', '#b7e1a1', '#e9e6dc', '#f28b5b', '#c9b2e8', '#ffe08a'];
  for (const s of [-1, 1]) for (let x = 48; x <= 140; x += 12) for (const lado of [-1, 1]) {
    if (s > 0 && x < 70) continue; // espaço do posto de gasolina (e da câmera em frente a ele)
    const c = PROPS[r() < 0.3 ? 'sobrado' : 'casa_br']({ cor: r.item(cores), noite: n, largura: 8.5 }); c.position.set(s * x, 0, lado * 9); c.rotation.y = lado > 0 ? Math.PI : 0; g.add(c);
    const m = PROPS.muro({ largura: 11, cor: '#e9e6dc', portao_x: r.entre(-2, 2) }); m.position.set(s * x, 0, lado * 8.4); m.rotation.y = c.rotation.y; g.add(m); }
  for (const z of [-1, 1]) for (let x = -60; x <= 60; x += 11) { const c = PROPS[r() < 0.3 ? 'sobrado' : 'casa_br']({ cor: r.item(cores), noite: n, largura: 8 }); c.position.set(x + r.entre(-1, 1), 0, z * 62); c.rotation.y = z > 0 ? Math.PI : 0; g.add(c); }
  for (const sx of [-1, 1]) for (let x = 40; x <= 130; x += 15) { const p = PROPS.poste_fios({ noite: n }); p.position.set(sx * x, 0, -5.6); g.add(p); }
  for (const [x, z, v, c] of [[-27, -6, 0, '#c4281c'], [27, 22, 180, '#1d3b72'], [6, 27, 90, '#f2f3f3']]) { const k = PROPS.carro({ cor: c }); k.position.set(x, 0.2, z); k.rotation.y = v * RAD; g.add(k); }
  const vt = PROPS.viatura(); vt.position.set(31.5, 0.2, 8); vt.rotation.y = 0; g.add(vt);
  g.add(caixa(300, 14, 60, '#3fae3a', { pos: [0, 0, -150] })); g.add(caixa(300, 20, 60, '#38a034', { pos: [0, 0, 170] }));    // morros
}

/** Move a cidade para que o local escolhido fique na origem (atores) com a fachada atrás (-Z) e a câmera em +Z. */
export function enquadrarLocal(g, local) {
  if (!local || local === 'vista') return;
  const l = LOTES.find(x => x.id === local) || PONTOS_EXTRA[local]; if (!l) return;
  const rr = l.rot * RAD, recuo = l.recuo ?? 3.2;
  const sx = l.f[0] + Math.sin(rr) * recuo, sz = l.f[1] + Math.cos(rr) * recuo;   // ponto na calçada em frente à fachada
  const th = -rr; g.rotation.y = th;
  g.position.set(-(sx * Math.cos(th) + sz * Math.sin(th)), 0, -(-sx * Math.sin(th) + sz * Math.cos(th)));
}
