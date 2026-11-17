// Personagem R6 (bloco) reutilizável: corpo, rosto, roupas e acessórios a partir de um spec simples.
// spec = { pele, camisa, calca, rosto, extras:[barba,...], acessorios:[cabelo_curto,...], roupa, cabelo_cor, escala }
import * as THREE from 'three';
import { caixa, cilindro, esfera, plano, grupo, mat, cor, canvas, texturaCanvas, rad } from './util.js';
import { texturaRosto } from './rostos.js';
import { ACOES, ROSTO_DA_ACAO, PROP_DA_ACAO, LOCOMOCAO, percorrer } from './acoes.js';

// ---------- Roupas (estampa na frente do torso / peças extras) ----------
function estampaTorso(tipo, base) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = cor(base).getStyle(); g.fillRect(0, 0, 256, 256);
  if (tipo === 'terno' || tipo === 'jaleco') {
    g.fillStyle = tipo === 'terno' ? '#ffffff' : '#9fd0ff';
    g.beginPath(); g.moveTo(88, 0); g.lineTo(168, 0); g.lineTo(128, 120); g.fill();
    if (tipo === 'terno') { g.fillStyle = '#111'; g.beginPath(); g.moveTo(120, 8); g.lineTo(136, 8); g.lineTo(142, 96); g.lineTo(128, 112); g.lineTo(114, 96); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 5; g.beginPath(); g.moveTo(88, 0); g.lineTo(128, 120); g.lineTo(168, 0); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.4)'; for (const y of [150, 200]) { g.beginPath(); g.arc(128, y, 6, 0, 7); g.fill(); }
    if (tipo === 'jaleco') { g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(150, 150, 60, 8); }
  } else if (tipo === 'listrada') {
    g.fillStyle = 'rgba(255,255,255,.85)'; for (let y = 0; y < 256; y += 48) g.fillRect(0, y, 256, 22);
  } else if (tipo === 'uniforme') {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 40); g.fillStyle = '#c4281c'; g.beginPath(); g.arc(70, 90, 18, 0, 7); g.fill();
  } else if (tipo === 'regata') {
    g.clearRect(0, 0, 256, 256); g.fillStyle = cor(base).getStyle(); g.fillRect(40, 0, 176, 256);
  }
  return texturaCanvas(c);
}

// ---------- Acessórios 3D (presos na cabeça ou no corpo) ----------
// Cada um recebe (spec) e devolve { obj, onde: 'cabeca'|'torso' }. Cabeça local: centro em (0,0,0), tamanho 1.25 x 1.2 x 1.2.
export const ACESSORIOS = {
  cabelo_curto: s => ({ onde: 'cabeca', obj: grupo([caixa(1.36, 0.42, 1.3, s.cabelo_cor, { pos: [0, 0.48, -0.02], round: 0.15 }),
    caixa(1.36, 0.9, 0.3, s.cabelo_cor, { pos: [0, 0.12, -0.55], round: 0.1 })]) }),
  cabelo_espetado: s => { const g = grupo([caixa(1.38, 0.4, 1.32, s.cabelo_cor, { pos: [0, 0.45, 0], round: 0.1 })]);
    [[-0.45, 0.75, 0.2, 25], [0, 0.85, 0.15, 0], [0.45, 0.75, 0.2, -25], [-0.3, 0.7, -0.35, 15], [0.3, 0.7, -0.35, -15], [-0.55, 0.15, 0.62, 10], [0.2, 0.2, 0.66, -10]]
      .forEach(([x, y, z, r]) => g.add(caixa(0.32, 0.6, 0.32, s.cabelo_cor, { pos: [x, y, z], rot: [z > 0.5 ? 70 : 0, 0, r] })));
    return { onde: 'cabeca', obj: g }; },
  cabelo_baguncado: s => { const g = grupo([caixa(1.5, 0.55, 1.45, s.cabelo_cor, { pos: [0, 0.4, 0], round: 0.2 }), caixa(1.5, 1.1, 0.35, s.cabelo_cor, { pos: [0, 0.0, -0.6], round: 0.1 })]);
    for (let i = 0; i < 9; i++) g.add(caixa(0.35, 0.7, 0.18, s.cabelo_cor, { pos: [-0.7 + i * 0.175, 0.35 - (i % 2) * 0.15, 0.64], rot: [8, 0, (i - 4) * 9] }));
    return { onde: 'cabeca', obj: g }; },
  cabelo_longo: s => ({ onde: 'cabeca', obj: grupo([caixa(1.38, 0.45, 1.32, s.cabelo_cor, { pos: [0, 0.46, 0], round: 0.18 }),
    caixa(1.4, 2.0, 0.4, s.cabelo_cor, { pos: [0, -0.45, -0.52], round: 0.12 }),
    caixa(0.22, 1.5, 1.0, s.cabelo_cor, { pos: [-0.7, -0.15, -0.1], round: 0.08 }), caixa(0.22, 1.5, 1.0, s.cabelo_cor, { pos: [0.7, -0.15, -0.1], round: 0.08 })]) }),
  rabo_de_cavalo: s => ({ onde: 'cabeca', obj: grupo([caixa(1.36, 0.42, 1.3, s.cabelo_cor, { pos: [0, 0.48, 0], round: 0.18 }),
    caixa(0.45, 1.3, 0.45, s.cabelo_cor, { pos: [0, -0.1, -0.85], rot: [-20, 0, 0], round: 0.18 })]) }),
  coque: s => ({ onde: 'cabeca', obj: grupo([caixa(1.36, 0.42, 1.3, s.cabelo_cor, { pos: [0, 0.48, 0], round: 0.18 }), esfera(0.38, s.cabelo_cor, { pos: [0, 0.95, -0.2] })]) }),
  careca_lados: s => ({ onde: 'cabeca', obj: grupo([caixa(0.18, 0.5, 1.0, s.cabelo_cor, { pos: [-0.66, 0.05, -0.1] }), caixa(0.18, 0.5, 1.0, s.cabelo_cor, { pos: [0.66, 0.05, -0.1] })]) }),
  bone: s => ({ onde: 'cabeca', obj: grupo([caixa(1.38, 0.5, 1.32, s.bone_cor || '#c4281c', { pos: [0, 0.5, 0], round: 0.2 }),
    caixa(1.2, 0.08, 0.7, s.bone_cor || '#c4281c', { pos: [0, 0.3, 0.85] })]) }),
  cartola: s => ({ onde: 'cabeca', obj: grupo([cilindro(1.0, 1.0, 0.08, '#151515', { pos: [0, 0.62, 0], seg: 28 }), cilindro(0.62, 0.62, 1.1, '#151515', { pos: [0, 1.15, 0], seg: 28 }),
    cilindro(0.63, 0.63, 0.16, '#c4281c', { pos: [0, 0.72, 0], seg: 28 })]) }),
  coroa: s => { const g = grupo([cilindro(0.62, 0.62, 0.3, '#e0b040', { pos: [0, 0.75, 0], seg: 24, mat: { metal: 0.6, rough: 0.35 } })]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(cilindro(0, 0.16, 0.4, '#e0b040', { pos: [Math.sin(a) * 0.55, 1.08, Math.cos(a) * 0.55], seg: 4, mat: { metal: 0.6, rough: 0.35 } })); }
    return { onde: 'cabeca', obj: g }; },
  laco: s => ({ onde: 'cabeca', obj: grupo([caixa(0.5, 0.4, 0.15, s.laco_cor || '#ff66cc', { pos: [0.35, 0.72, 0.1], rot: [0, 0, 25], round: 0.08 }),
    caixa(0.5, 0.4, 0.15, s.laco_cor || '#ff66cc', { pos: [0.85, 0.72, 0.1], rot: [0, 0, -25], round: 0.08 }), esfera(0.14, s.laco_cor || '#ff66cc', { pos: [0.6, 0.72, 0.12] })]) }),
  chifres: s => ({ onde: 'cabeca', obj: grupo([cilindro(0, 0.18, 0.6, s.chifre_cor || '#e0207a', { pos: [-0.4, 0.9, 0], rot: [0, 0, 18], seg: 10 }),
    cilindro(0, 0.18, 0.6, s.chifre_cor || '#e0207a', { pos: [0.4, 0.9, 0], rot: [0, 0, -18], seg: 10 })]) }),
  veu: s => ({ onde: 'cabeca', obj: grupo([caixa(1.5, 0.25, 1.4, '#ffffff', { pos: [0, 0.55, -0.05], round: 0.1 }),
    caixa(1.7, 2.6, 0.12, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.9 }), { pos: [0, -0.6, -0.75] })]) }),
  capacete: s => ({ onde: 'cabeca', obj: grupo([caixa(1.45, 0.75, 1.4, s.capacete_cor || '#e8862f', { pos: [0, 0.38, 0], round: 0.3 })]) }),
  fone: s => ({ onde: 'cabeca', obj: grupo([caixa(1.5, 0.12, 0.25, '#222', { pos: [0, 0.68, 0] }), caixa(0.2, 0.5, 0.5, '#222', { pos: [-0.72, 0, 0], round: 0.08 }),
    caixa(0.2, 0.5, 0.5, '#222', { pos: [0.72, 0, 0], round: 0.08 })]) }),
  gravata: s => ({ onde: 'torso', obj: caixa(0.3, 1.1, 0.06, s.gravata_cor || '#c4281c', { pos: [0, 0.35, 0.53] }) }),
  mochila: s => ({ onde: 'torso', obj: caixa(1.5, 1.6, 0.6, s.mochila_cor || '#c4281c', { pos: [0, 0, -0.8], round: 0.15 }) }),
  capa: s => ({ onde: 'torso', obj: caixa(2.0, 3.4, 0.1, s.capa_cor || '#c4281c', { pos: [0, -0.6, -0.58], rot: [-6, 0, 0] }) }),
  asas: s => ({ onde: 'torso', obj: grupo([caixa(1.8, 1.2, 0.1, '#ffffff', { pos: [-1.1, 0.4, -0.7], rot: [0, 20, 20], round: 0.05 }),
    caixa(1.8, 1.2, 0.1, '#ffffff', { pos: [1.1, 0.4, -0.7], rot: [0, -20, -20], round: 0.05 })]) }),
  faixa_prefeito: s => { const g = grupo([caixa(0.5, 2.9, 0.08, s.faixa_cor || '#1f9d48', { pos: [0, 0, 0.53], rot: [0, 0, 38] }),
    caixa(0.18, 2.9, 0.09, s.faixa_cor2 || '#f5cd30', { pos: [0, 0, 0.54], rot: [0, 0, 38] }), esfera(0.2, '#e0b040', { pos: [0.55, -0.6, 0.6], mat: { metal: 0.6, rough: 0.3 } })]);
    return { onde: 'torso', obj: g }; },
  capacete_bombeiro: s => ({ onde: 'cabeca', obj: grupo([caixa(1.45, 0.7, 1.4, '#c4281c', { pos: [0, 0.42, 0], round: 0.3 }),
    caixa(1.8, 0.08, 1.9, '#c4281c', { pos: [0, 0.12, -0.15] }), caixa(0.5, 0.45, 0.06, '#e0b040', { pos: [0, 0.55, 0.72] })]) }),
  colete: s => ({ onde: 'torso', obj: grupo([caixa(2.06, 2.0, 1.06, s.colete_cor || '#ff7a00', { pos: [0, 0, 0] }),
    caixa(2.08, 0.18, 1.08, '#e8e8e8', { pos: [0, -0.35, 0], mat: { emissive: '#ffffff', emissiveIntensity: 0.3 } }),
    caixa(2.08, 0.18, 1.08, '#e8e8e8', { pos: [0, 0.25, 0], mat: { emissive: '#ffffff', emissiveIntensity: 0.3 } })]) }),
  boina: s => ({ onde: 'cabeca', obj: caixa(1.45, 0.3, 1.4, s.boina_cor || '#c4281c', { pos: [0.1, 0.65, 0], rot: [0, 0, -8], round: 0.14 }) }),
  touca: s => ({ onde: 'cabeca', obj: grupo([caixa(1.4, 0.65, 1.35, s.touca_cor || '#222', { pos: [0, 0.38, 0], round: 0.28 }), esfera(0.2, s.touca_cor || '#222', { pos: [0, 0.8, 0] })]) }),
  cabelo_grisalho: s => ({ onde: 'cabeca', obj: grupo([caixa(1.36, 0.3, 1.3, '#c9c9c9', { pos: [0, 0.5, -0.05], round: 0.12 }),
    caixa(1.36, 0.8, 0.28, '#c9c9c9', { pos: [0, 0.1, -0.55], round: 0.1 })]) }),
  broche: s => ({ onde: 'torso', obj: esfera(0.14, '#e0b040', { pos: [0.55, 0.55, 0.55], mat: { metal: 0.7, rough: 0.3 } }) }),
  aureola: s => ({ onde: 'cabeca', obj: new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 8, 32), mat('#ffe066', { emissive: '#ffe066', emissiveIntensity: 0.8 })) }),
};
const POS_EXTRA = { aureola: o => { o.position.set(0, 1.15, 0); o.rotation.x = Math.PI / 2; } };

// ---------- Props de mão ----------
export const PROPS_MAO = {
  celular: () => { const g = grupo([caixa(0.62, 1.05, 0.12, '#151515', { round: 0.05 })]);
    const tela = plano(0.54, 0.92, mat('#6fc3ff', { emissive: '#3a8fd8', emissiveIntensity: 0.9 }), { pos: [0, 0, 0.065] }); g.add(tela); return g; },
  espada: () => grupo([caixa(0.18, 2.6, 0.06, '#d8dde3', { pos: [0, 1.5, 0], mat: { metal: 0.8, rough: 0.25 } }), caixa(0.7, 0.14, 0.2, '#7c5c46', { pos: [0, 0.2, 0] })]),
  presente: () => grupo([caixa(0.8, 0.8, 0.8, '#c4281c'), caixa(0.84, 0.82, 0.16, '#f5cd30'), caixa(0.16, 0.82, 0.84, '#f5cd30')]),
  flor: () => grupo([cilindro(0.04, 0.04, 1.0, '#2e8b3a', { pos: [0, 0.5, 0] }), esfera(0.22, '#ff4f8b', { pos: [0, 1.05, 0] })]),
  livro: () => caixa(0.8, 1.0, 0.22, '#2a5bd7'),
  dinheiro: () => caixa(0.9, 0.5, 0.08, '#4caf50'),
  microfone: () => grupo([cilindro(0.07, 0.05, 0.8, '#222', { pos: [0, 0.2, 0] }), esfera(0.17, '#555', { pos: [0, 0.65, 0], mat: { metal: 0.6, rough: 0.4 } }),
    caixa(0.32, 0.24, 0.32, '#c4281c', { pos: [0, 0.3, 0] })]),
  filmadora: () => grupo([caixa(0.6, 0.7, 1.4, '#222', { pos: [0, 0.4, 0.3], round: 0.08 }), cilindro(0.22, 0.22, 0.5, '#111', { pos: [0, 0.4, 1.2], rot: [90, 0, 0] }),
    esfera(0.08, '#e53935', { pos: [0.2, 0.8, 0.2], mat: { emissive: '#e53935' } })]),
  caixa: () => caixa(1.6, 1.2, 1.2, '#b8875a', { pos: [0.75, 0.3, 0.2] }),
  caneta: () => cilindro(0.04, 0.04, 0.6, '#1d3b72', { pos: [0, 0.2, 0] }),
  maleta: () => grupo([caixa(1.0, 0.75, 0.3, '#3b2a1e', { pos: [0, -0.5, 0], round: 0.06 }), caixa(0.4, 0.12, 0.1, '#222', { pos: [0, -0.05, 0] })]),
  prancheta: () => grupo([caixa(0.8, 1.05, 0.05, '#a8754a'), caixa(0.7, 0.85, 0.06, '#ffffff', { pos: [0, -0.05, 0.01] })]),
  vassoura: () => grupo([cilindro(0.06, 0.06, 4.2, '#a8754a', { pos: [0, 0.3, 0] }), caixa(1.2, 0.5, 0.35, '#d9b44a', { pos: [0, -1.9, 0] })]),
  regador: () => grupo([caixa(0.8, 0.7, 0.5, '#2e7d32', { pos: [0, -0.2, 0.3], round: 0.1 }), cilindro(0.05, 0.08, 0.9, '#2e7d32', { pos: [0, -0.1, 0.9], rot: [60, 0, 0] })]),
  colher: () => grupo([cilindro(0.04, 0.04, 1.0, '#a8754a', { pos: [0, 0.2, 0] }), esfera(0.12, '#a8754a', { pos: [0, 0.72, 0] })]),
  garfo: () => grupo([cilindro(0.03, 0.03, 0.6, '#ccc', { pos: [0, 0.2, 0] }), caixa(0.16, 0.18, 0.03, '#ccc', { pos: [0, 0.55, 0] })]),
  sacola: () => grupo([caixa(0.9, 1.0, 0.5, '#f2f3f3', { pos: [0, -0.7, 0] }), caixa(0.5, 0.06, 0.06, '#f2f3f3', { pos: [0, -0.1, 0] })]),
  coleira: () => cilindro(0.025, 0.025, 2.6, '#c4281c', { pos: [0, -0.9, 0.9], rot: [-55, 0, 0] }),
  bandeja_paes: () => { const g = grupo([caixa(1.8, 0.1, 1.2, mat('#b8bcc6', { metal: 0.6, rough: 0.35 }), { pos: [0, -0.4, 0.5] })]);
    for (let i = 0; i < 6; i++) g.add(caixa(0.5, 0.26, 0.32, '#d39a52', { pos: [-0.6 + (i % 3) * 0.6, -0.22, 0.25 + Math.floor(i / 3) * 0.5], round: 0.12 })); return g; },
  pao: () => grupo([caixa(0.75, 0.36, 0.44, '#d39a52', { pos: [0, 0.2, 0], round: 0.16 })]),
  bola_mao: () => grupo([esfera(0.42, '#ffffff', { pos: [0, -0.3, 0.2] })]),
  bandeirinha: (o) => grupo([cilindro(0.03, 0.03, 1.6, '#ddd', { pos: [0, 0.8, 0] }), caixa(0.9, 0.6, 0.03, o.cor || '#1f9d48', { pos: [0.47, 1.3, 0] })]),
  cartaz: (o) => { const [c, g] = canvas(256, 160); g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 160); g.strokeStyle = '#c4281c'; g.lineWidth = 10; g.strokeRect(5, 5, 246, 150);
    g.fillStyle = '#111'; g.font = '900 40px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const t = String(o.texto || 'FORA!').toUpperCase(); const ps = t.split(' '); const meio = Math.ceil(ps.length / 2);
    const ls = t.length > 11 ? [ps.slice(0, meio).join(' '), ps.slice(meio).join(' ')] : [t]; ls.forEach((l, i) => g.fillText(l, 128, 80 + (i - (ls.length - 1) / 2) * 46, 236));
    const placa = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshStandardMaterial({ map: texturaCanvas(c), roughness: 0.9, side: THREE.DoubleSide }));
    placa.position.set(0, 1.9, 0.05); return grupo([cilindro(0.05, 0.05, 2.0, '#8a5a33', { pos: [0, 0.9, 0] }), placa]); },
};

/** Cria o personagem. Retorna objeto com .raiz (THREE.Group) e métodos posar()/setRosto(). */
export function criarPersonagem(spec = {}) {
  const s = { pele: 'amarelo', camisa: 'azul', calca: 'verde_noob', rosto: 'neutro', extras: [], acessorios: [], cabelo_cor: '#2b1d14', ...spec };
  const pele = mat(s.pele, { rough: 0.7 }), camisa = mat(s.camisa), calca = mat(s.calca);
  const raiz = new THREE.Group(); raiz.name = s.id || 'ator';
  const corpo = new THREE.Group(); corpo.position.y = 2; raiz.add(corpo);   // pivô no quadril

  // torso (frente = +Z, índice 4 do BoxGeometry)
  let matTorso = camisa;
  if (s.roupa && s.roupa !== 'vestido') { const fr = new THREE.MeshStandardMaterial({ map: estampaTorso(s.roupa, s.camisa), roughness: 0.75 }); matTorso = [camisa, camisa, camisa, camisa, fr, camisa]; }
  const torso = caixa(2, 2, 1, matTorso, { pos: [0, 1, 0] }); corpo.add(torso);
  const torsoAnc = new THREE.Group(); torsoAnc.position.set(0, 1, 0); corpo.add(torsoAnc);

  const cabeca = new THREE.Group(); cabeca.position.set(0, 2, 0); corpo.add(cabeca);         // pivô no pescoço
  const cab = new THREE.Group(); cab.position.set(0, 0.62, 0); cabeca.add(cab);              // centro da cabeça
  cab.add(caixa(1.25, 1.2, 1.2, pele, { round: 0.28 }));
  const rostoMat = new THREE.MeshStandardMaterial({ map: texturaRosto(s.rosto, s.extras), transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
  const rosto = plano(1.1, 1.1, rostoMat, { pos: [0, 0, 0.605] }); cab.add(rosto);

  const membro = (x, y, m, offY) => { const piv = new THREE.Group(); piv.position.set(x, y, 0); piv.add(caixa(1, 2, 1, m, { pos: [0, offY, 0] })); corpo.add(piv); return piv; };
  const corBraco = ['terno', 'jaleco'].includes(s.roupa) || s.mangas ? mat(s.mangas || s.camisa) : pele;
  const bd = membro(-1.5, 1.6, corBraco, -0.6), be = membro(1.5, 1.6, corBraco, -0.6);   // direito fica em -X
  const pd = membro(-0.5, 0, calca, -1), pe = membro(0.5, 0, calca, -1);
  if (s.mangas === undefined && !['terno', 'jaleco'].includes(s.roupa)) { /* braços na cor da pele, como o noob clássico */ }

  if (s.roupa === 'vestido') {
    const saia = cilindro(1.15, 2.1, 2.2, mat(s.vestido_cor || s.camisa, { rough: 0.85 }), { pos: [0, -0.9, 0], seg: 18 });
    corpo.add(saia);
  }
  for (const nome of s.acessorios) {
    const a = ACESSORIOS[nome]?.(s); if (!a || a === true) continue;
    POS_EXTRA[nome]?.(a.obj);
    (a.onde === 'cabeca' ? cab : torsoAnc).add(a.obj);
  }
  raiz.traverse(o => { if (o.isMesh && o !== rosto) { o.castShadow = true; o.receiveShadow = true; } });
  if (s.fantasma) {   // fantasma clássico: sem pernas, com "cauda" de lençol, levemente translúcido e brilhando
    pd.visible = false; pe.visible = false;
    corpo.add(cilindro(1.25, 0.35, 2.0, mat('#eef5ff'), { pos: [0, -0.95, 0], seg: 14 }));
    raiz.traverse(o => { if (o.isMesh && o.visible) { o.material = o.material.clone(); if (o !== rosto) o.material.color?.set('#eef5ff');
      Object.assign(o.material, { transparent: true, opacity: o === rosto ? 0.95 : 0.8 }); if (o.material.emissive) { o.material.emissive.set('#bcd8ff'); o.material.emissiveIntensity = 0.45; } o.castShadow = false; } });
  }
  raiz.scale.setScalar(s.escala || 1);

  let propAtual = null, propNome = null;
  const ator = {
    spec: s, raiz, corpo, partes: { torso, cabeca, bd, be, pd, pe },
    setRosto(expr, extras = s.extras) { rostoMat.map = texturaRosto(expr, extras); rostoMat.needsUpdate = true; },
    setProp(nome, opts = {}) {
      if (nome === propNome) return; if (propAtual) bd.remove(propAtual); propAtual = null; propNome = nome;
      if (!nome || !PROPS_MAO[nome]) return;
      propAtual = PROPS_MAO[nome](opts); propAtual.position.set(0, -1.55, 0.58); propAtual.rotation.x = -Math.PI / 2 + 0.25; bd.add(propAtual);
      propAtual.traverse(o => { if (o.isMesh) o.castShadow = true; });
    },
    /** Aplica a ação no tempo t. base = {x, z, vira, y}. */
    posar(acao, t, dur, p = {}, base = { x: 0, z: 0, vira: 0, y: 0 }) {
      const fn = ACOES[acao] || ACOES.parado; let q = fn(t, dur, p);
      let vira = rad(base.vira || 0), bx = base.x, bz = base.z;
      if (base.caminho?.length && LOCOMOCAO.has(acao)) { // anda pelo trajeto virando sozinho; ao chegar, fica parado
        const r = percorrer(base.x, base.z, base.caminho, q.frente);
        if (r.chegou) q = ACOES[p.ao_chegar || 'parado'](t, dur, p);
        bx = r.x; bz = r.z; vira = rad(r.vira); q.frente = 0;
      }
      raiz.position.set(bx + Math.sin(vira) * q.frente + q.dx * Math.cos(vira), (base.y || 0) + (s.fantasma ? 0.45 + Math.sin(t * 2.2) * 0.2 : 0), bz + Math.cos(vira) * q.frente);
      raiz.rotation.set(rad(q.raiz[0]), vira + rad(q.raiz[1]), rad(q.raiz[2]), 'YXZ');
      corpo.position.y = 2 + q.y;
      corpo.rotation.set(rad(q.tor[0]), rad(q.tor[1]), rad(q.tor[2]));
      bd.rotation.set(-rad(q.bd[0]), 0, -rad(q.bd[1])); be.rotation.set(-rad(q.be[0]), 0, rad(q.be[1]));
      pd.rotation.set(-rad(q.pd[0]), 0, -rad(q.pd[1])); pe.rotation.set(-rad(q.pe[0]), 0, rad(q.pe[1]));
      cabeca.rotation.set(rad(q.cab[0]), rad(q.cab[1]), rad(q.cab[2]));
      return q;
    },
    /** Posição da cabeça no mundo (para a câmera mirar). */
    alvo(altura = 'cabeca') { raiz.updateMatrixWorld(true); const v = new THREE.Vector3();
      (altura === 'cabeca' ? cab : altura === 'peito' ? torsoAnc : raiz).getWorldPosition(v); return v; },
  };
  ator.rostoPadrao = (acao) => ROSTO_DA_ACAO[acao] || s.rosto; // a emoção da ação vence o rosto padrão do personagem
  ator.propPadrao = (acao) => PROP_DA_ACAO[acao] || null;
  return ator;
}

export const NOMES_ACESSORIOS = Object.keys(ACESSORIOS).filter(k => typeof ACESSORIOS[k] === 'function');
export const NOMES_ROUPAS = ['terno', 'jaleco', 'listrada', 'uniforme', 'regata', 'vestido'];
export const NOMES_PROPS_MAO = Object.keys(PROPS_MAO);
