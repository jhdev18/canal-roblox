// MUNDO INTEGRADO: um mapa único e contínuo (como um "place" do Roblox).
// Praça no centro, prédios ocos em volta (por fora E por dentro, no mesmo lugar), portas que abrem sozinhas,
// rua de bairro com a casa do protagonista (térrea, 5 cômodos ligados por portas).
// Paredes/teto marcados como "unidade de corte" somem automaticamente quando ficam entre a câmera e o ator.
// Roteiro: `onde: mundo` + `local: farmacia` (+ `dentro: true`) · `local: casa` + `comodo: quarto` · `local: vista`.
import * as THREE from 'three';
import { caixa, cilindro, esfera, plano, grupo, mat, rng } from './util.js';
import { PROPS, placaTexto } from './props.js';

const RAD = Math.PI / 180;
const VIDRO = (n) => new THREE.MeshStandardMaterial({ color: n ? 0xffe3a3 : 0xcfeaff, transparent: true, opacity: n ? 0.6 : 0.28, roughness: 0.05,
  emissive: n ? 0xffc870 : 0x000000, emissiveIntensity: n ? 0.5 : 0, depthWrite: false });
const rot = (x, z, th) => [x * Math.cos(th) + z * Math.sin(th), -x * Math.sin(th) + z * Math.cos(th)];   // igual à rotation.y do three

/** Marca um grupo como unidade de corte (some inteiro quando bloqueia a visão do ator). */
function unidade(g, lista) { g.userData.corte = true; g.traverse(m => { if (m.isMesh) m.userData.unidade = g; }); lista.push(g); return g; }

/** Parede ao longo do eixo X local (centrada), com vãos de porta/janela: [{ x, w, y0, y1, vidro }]. */
function parede(len, h, cor, vaos = [], n, e = 0.4) {
  const g = new THREE.Group(); let x0 = -len / 2;
  const seg = (a, b, y0, y1) => { if (b - a > 0.02 && y1 - y0 > 0.02) g.add(caixa(+(b - a).toFixed(3), +(y1 - y0).toFixed(3), e, cor, { pos: [(a + b) / 2, (y0 + y1) / 2, 0] })); };
  for (const v of [...vaos].sort((a, b) => a.x - b.x)) {
    const a = v.x - v.w / 2, b = v.x + v.w / 2; seg(x0, a, 0, h); seg(a, b, 0, v.y0); seg(a, b, v.y1, h);
    if (v.vidro) g.add(caixa(v.w, v.y1 - v.y0, 0.06, VIDRO(n), { pos: [v.x, (v.y0 + v.y1) / 2, 0], sombra: false }));
    x0 = b;
  }
  seg(x0, len / 2, 0, h); return g;
}
/** Porta com dobradiça (abre para dentro quando alguém chega perto). */
function porta(w, h, cor, vidro, portas) {
  const piv = new THREE.Group(); piv.add(caixa(w, h, 0.14, vidro ? VIDRO(false) : mat(cor), { pos: [w / 2, h / 2, 0] }));
  if (vidro) piv.add(caixa(w, 0.15, 0.16, '#9aa0aa', { pos: [w / 2, h - 0.08, 0] }));
  piv.add(esfera(0.1, '#e0b040', { pos: [w - 0.3, h / 2, 0.12] })); portas.push(piv); return piv;
}
function luzInterna(g, x, z, h, n, forca = 1) { const l = new THREE.PointLight(0xfff2dd, (n ? 70 : 45) * forca, 30, 1.4); l.position.set(x, h - 1.0, z); g.add(l);
  g.add(caixa(2.2, 0.12, 2.2, mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 1.3 }), { pos: [x, h - 0.08, z], sombra: false })); }
const por = (g, tipo, o, pos, vira = 0, esc) => { const p = PROPS[tipo](o); p.position.set(...pos); p.rotation.y = vira * RAD; if (esc) p.scale.setScalar(esc); g.add(p); return p; };

/**
 * Prédio oco. Fachada em z=0 olhando +Z, fundo em z=-d. Retorna o grupo com userData { ancoras, d, w }.
 * o = { w, d, h, cor, faixa, piso, letreiro:{texto,fundo,cor}, porta:{x,w,vidro,cor}, vitrines:[{x,w}], janelas:{fundo:[],esq:[],dir:[]}, interior(gi, ctx) }
 */
function predioOco(o, ctx) {
  const { n, unidades, portas, foco } = ctx, { w, d, h } = o, g = new THREE.Group();
  g.add(caixa(w - 0.2, 0.2, d - 0.2, o.piso || '#d9d4c8', { pos: [0, 0.1, -d / 2] }));                                  // piso (topo em 0.2)
  const P = o.porta || { x: 0, w: 2.4 };
  const fr = parede(w, h, o.cor, [{ x: P.x, w: P.w + 0.2, y0: 0, y1: 4.4 }, ...(o.vitrines || []).map(v => ({ x: v.x, w: v.w, y0: 1.2, y1: 3.9, vidro: true }))], n);
  fr.position.set(0, 0, -0.2); const dp = porta(P.w, 4.3, P.cor || '#7a4b2a', P.vidro, portas); dp.position.set(P.x - P.w / 2, 0.2, 0); fr.add(dp);
  dp.position.z = 0.0;
  if (o.faixa) fr.add(caixa(w + 0.06, 0.5, 0.12, o.faixa, { pos: [0, h - 1.1, 0.25] }));
  fr.add(caixa(w + 0.3, 1.2, 0.3, o.cor, { pos: [0, h + 0.6, 0.0] }));                                                   // platibanda
  if (o.letreiro) { const p = placaTexto(o.letreiro.texto, Math.min(w - 1.2, o.letreiro.largura || w - 1.2), 1.1, { fundo: o.letreiro.fundo, corTexto: o.letreiro.cor || '#fff', emissivo: n }); p.position.set(0, h - 0.2, 0.42); fr.add(p); }
  g.add(unidade(fr, unidades));
  const fu = parede(w, h, o.cor, (o.janelas?.fundo || []).map(x => ({ x, w: 2.4, y0: 2.4, y1: 4.6, vidro: true })), n); fu.position.set(0, 0, -d + 0.2); g.add(unidade(fu, unidades));
  for (const [s, k] of [[-1, 'esq'], [1, 'dir']]) { const la = parede(d, h, o.cor, (o.janelas?.[k] || []).map(z => ({ x: s < 0 ? z + d / 2 : -(z + d / 2), w: 2.4, y0: 2.4, y1: 4.6, vidro: true })), n);
    la.rotation.y = Math.PI / 2; la.position.set(s * (w / 2 - 0.2), 0, -d / 2); g.add(unidade(la, unidades)); }
  const teto = grupo([caixa(w, 0.3, d, '#d8d8d8', { pos: [0, h + 0.15, -d / 2] })]);
  if (o.telhado) { const inc = 30 * RAD, lado = (w / 2 + 0.6) / Math.cos(inc);                                                      // duas águas (ex.: igreja)
    for (const sx of [-1, 1]) teto.add(caixa(lado, 0.4, d + 0.8, o.telhado, { pos: [sx * (w / 4 + 0.15), h + 0.3 + Math.tan(inc) * w / 4, -d / 2], rot: [0, 0, -sx * 30] }));
    const sh = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, Math.tan(inc) * w / 2)]);
    for (const z of [0, -d + 0.3]) { const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }), mat(o.cor)); fr.position.set(0, h + 0.3, z - 0.3); fr.castShadow = true; teto.add(fr); } }
  else teto.add(caixa(w - 0.6, 0.05, d - 0.6, '#8f939c', { pos: [0, h + 0.33, -d / 2] }));
  g.add(unidade(teto, unidades));
  const gi = new THREE.Group(); g.add(gi); g.userData.ancoras = o.interior?.(gi, { w, d, h, n }) || {};
  if (foco) luzInterna(gi, 0, -d / 2, h, n, o.luz || 1);
  g.userData.d = d; g.userData.w = w; g.userData.h = h; return g;
}

// ---------------- prédios do mundo (interiores compactos, coordenadas locais do prédio) ----------------
const PREDIOS_MUNDO = {
  farmacia: { w: 12, d: 12, h: 7, cor: '#f4f6f4', faixa: '#16a05d', piso: '#e8ece8', letreiro: { texto: 'FARMÁCIA', fundo: '#16a05d' }, porta: { x: -3, w: 2.6, vidro: true }, vitrines: [{ x: 2.5, w: 5 }],
    janelas: { dir: [-6] },
    interior(gi) { por(gi, 'prateleira', { largura: 10.5, altura: 6, cores: ['#ffffff', '#e53935', '#1e88e5', '#43a047', '#fdd835'] }, [0, 0.2, -11]);
      por(gi, 'balcao', { largura: 7, cor: '#16a05d', tampo: '#f2f3f3' }, [0, 0.2, -7]); por(gi, 'caixa_registradora', {}, [2, 3.4, -7], 180);
      por(gi, 'prateleira', { largura: 4, altura: 5 }, [-5.3, 0.2, -3.5], 90);
      return { atender: [0, 0.2, -8.8, 0], fila: { inicio: [0, -5.4], vira: 180, cresce: [-0.5, 1] } }; } },
  loterica: { w: 10, d: 11, h: 6.5, cor: '#1d4fa0', faixa: '#f39c12', piso: '#cfd6e4', letreiro: { texto: 'LOTÉRICA', fundo: '#f5b800', cor: '#1d3b72' }, porta: { x: 0, w: 2.8, vidro: true }, vitrines: [{ x: -3.3, w: 2.2 }, { x: 3.3, w: 2.2 }],
    interior(gi) { for (const [i, x] of [-2.4, 2.4].entries()) por(gi, 'guiche', { largura: 4.4, cor: '#1d4fa0', numero: i + 1 }, [x, 0.2, -7]);
      const m = PROPS.mural({ texto: 'PRÊMIO R$ 50 MI', largura: 5, altura: 1.6, cor: '#1d3b72', cor_texto: '#ffd23f' }); m.position.set(0, 5.3, -10.6); gi.add(m);
      return { atender: [-2.4, 0.2, -8.7, 0], fila: { inicio: [-2.4, -4.9], vira: 180, cresce: [0.35, 1] } }; } },
  padaria: { w: 12, d: 12, h: 7, cor: '#f3d9a4', faixa: '#8a4a1f', piso: '#b98b5e', letreiro: { texto: 'PADARIA', fundo: '#8a4a1f', cor: '#ffe9b0' }, porta: { x: -3, w: 2.6, vidro: true }, vitrines: [{ x: 2.6, w: 5 }],
    interior(gi) { por(gi, 'estufa_paes', { largura: 6 }, [-1.5, 0.2, -7]); por(gi, 'balcao', { largura: 3.5, cor: '#8a4a1f' }, [3.8, 0.2, -7]); por(gi, 'caixa_registradora', {}, [3.8, 3.4, -7], 180);
      por(gi, 'prateleira', { largura: 10, altura: 6, cores: ['#d9a25a', '#b87a35', '#f2d6a0', '#8a4a1f'] }, [0, 0.2, -11]);
      por(gi, 'mesa', { largura: 2.6, cor: '#f2f3f3' }, [3.5, 0.2, -2.6], 0, 0.8); por(gi, 'cadeira_plastico', {}, [1.6, 0.2, -2.6], 90, 0.8);
      return { atender: [3.8, 0.2, -8.7, 0], fila: { inicio: [3.8, -5.2], vira: 180, cresce: [-0.6, 1] }, sentar: [1.7, 0.2, -2.6, 90] }; } },
  mercado: { w: 16, d: 16, h: 7.5, cor: '#f2f3f3', faixa: '#c4281c', piso: '#dfe2e6', letreiro: { texto: 'MERCADO', fundo: '#c4281c' }, porta: { x: -5, w: 3.2, vidro: true }, vitrines: [{ x: 2.5, w: 8 }],
    janelas: { esq: [-8] },
    interior(gi) { for (const x of [-3.5, 3.5]) por(gi, 'gondola', { largura: 8, seed: x }, [x, 0.2, -10], 90);
      por(gi, 'geladeira_vitrine', { largura: 12 }, [0, 0.2, -15]); por(gi, 'balcao', { largura: 3.5, cor: '#c4281c' }, [5, 0.2, -3], 90); por(gi, 'caixa_registradora', {}, [5, 3.4, -3.4], 90);
      por(gi, 'carrinho_compras', {}, [-5.5, 0.2, -4], 20);
      return { atender: [6.6, 0.2, -3, -90], fila: { inicio: [3.4, -3.0], vira: 90, cresce: [-1, 0.3] } }; } },
  banco: { w: 12, d: 12, h: 8, cor: '#b8bcc6', piso: '#b8bcc6', letreiro: { texto: 'BANCO', fundo: '#1d3b72', largura: 6 }, porta: { x: 0, w: 3, vidro: true }, vitrines: [{ x: -4, w: 2.4 }, { x: 4, w: 2.4 }],
    interior(gi) { for (const [i, x] of [-2.6, 2.6].entries()) por(gi, 'guiche', { largura: 4.6, cor: '#8c909a', numero: i + 1 }, [x, 0.2, -7.5]);
      const atm = grupo([caixa(1.4, 3.4, 1.2, '#5a5d66', { pos: [0, 1.7, 0] }), plano(0.9, 0.7, mat('#5fb0ff', { emissive: '#3a8fd8', emissiveIntensity: 0.9 }), { pos: [0, 2.7, 0.61] })]);
      atm.position.set(-5.2, 0.2, -3); atm.rotation.y = Math.PI / 2; gi.add(atm); por(gi, 'fila_cordao', { n: 2 }, [-1.5, 0.2, -4]);
      return { atender: [-2.6, 0.2, -9.2, 0], fila: { inicio: [-2.6, -5.4], vira: 180, cresce: [0.4, 1] } }; } },
  prefeitura: { w: 22, d: 14, h: 9, cor: '#f4f1ea', faixa: '#1d3b72', piso: '#9b7b5a', letreiro: { texto: 'PREFEITURA MUNICIPAL', fundo: '#f4f1ea', cor: '#1d3b72', largura: 14 },
    porta: { x: 0, w: 3.2, cor: '#5a3a22' }, vitrines: [{ x: -7, w: 3 }, { x: 7, w: 3 }], janelas: { fundo: [-7] },
    interior(gi) { gi.add(caixa(4, 0.05, 12, '#7b1f2b', { pos: [0, 0.23, -7], sombra: false }));
      por(gi, 'balcao', { largura: 6, cor: '#5a3a22', tampo: '#c9a24a' }, [-5, 0.2, -6]);
      const q = PROPS.quadro_parede({ texto: 'PREFEITO', cor: '#1d3b72' }); q.position.set(6, 6, -13.6); gi.add(q);
      por(gi, 'mesa_escritorio', {}, [6, 0.2, -10.2], 180); por(gi, 'poltrona', {}, [6, 0.2, -12.6], 0, 0.9); por(gi, 'bandeira', {}, [2.5, 0.2, -12.8], 0, 0.6); por(gi, 'bandeira', { cores: ['#fff', '#c4281c', '#fff'] }, [9.5, 0.2, -12.8], 0, 0.6);
      por(gi, 'cadeiras_espera', { n: 3, cor: '#7b1f2b' }, [-8.5, 0.2, -2.5], 90);
      return { atender: [-5, 0.2, -7.7, 0], sentar: [6, 0.2, -12.3, 0], assinar: [6, 0.2, -12.0, 0], discursar: [0, 0.2, 2.5, 0] }; } },
  igreja: { w: 14, d: 26, h: 11, cor: '#f6f2e6', piso: '#b5895a', telhado: '#b5533a', porta: { x: 0, w: 3.4, cor: '#6b4426' }, janelas: { esq: [-6, -12, -18], dir: [-6, -12, -18] },
    interior(gi, { d }) { gi.add(caixa(3, 0.05, d - 2, '#7b1f2b', { pos: [0, 0.23, -d / 2], sombra: false }));
      for (let z = -18; z <= -4; z += 3) for (const s of [-1, 1]) por(gi, 'banco_igreja', { largura: 4.4 }, [s * 3.6, 0.2, z]);
      por(gi, 'altar', {}, [0, 0.2, -23], 0, 0.8); const cr = PROPS.cruz_parede({ cor: '#c9a24a' }); cr.position.set(0, 7.5, -25.6); gi.add(cr);
      return { rezar: [-3.6, 0.2, -6.6, 0], sentar: [-3.6, 0.2, -6.6, 0], atender: [0, 1.2, -21.6, 0] }; } },
  escola: { w: 20, d: 12, h: 8, cor: '#f5e6b8', faixa: '#1e6fd9', piso: '#b99a72', letreiro: { texto: 'ESCOLA MUNICIPAL', fundo: '#1e6fd9', largura: 12 }, porta: { x: -7, w: 2.6 },
    vitrines: [{ x: -2, w: 2.6 }, { x: 3, w: 2.6 }, { x: 8, w: 2.6 }],
    interior(gi) { gi.add(caixa(10, 3.5, 0.2, '#24553b', { pos: [0, 4.5, -11.6] })); gi.add(caixa(10.4, 3.9, 0.15, '#7c5c46', { pos: [0, 4.5, -11.7] }));
      por(gi, 'mesa', { largura: 4, cor: '#7c5c46' }, [-5, 0.2, -9]);
      for (const z of [-6, -2.8]) for (const x of [-4, 0, 4, 8]) { por(gi, 'carteira', {}, [x, 0.2, z], 0, 0.8); por(gi, 'cadeira', { cor: '#2a5bd7' }, [x, 0.2, z + 1.3], 180, 0.8); }
      return { falar: [-2, 0.2, -9.5, 0], sentar: [0, 0.2, -1.6, 180] }; } },
  posto_saude: { w: 14, d: 12, h: 7, cor: '#ffffff', faixa: '#1e88e5', piso: '#d6e2ea', letreiro: { texto: 'POSTO DE SAÚDE', fundo: '#1e88e5' }, porta: { x: 0, w: 2.8, vidro: true }, vitrines: [{ x: -4.5, w: 2.6 }, { x: 4.5, w: 2.6 }],
    interior(gi) { por(gi, 'balcao', { largura: 5, cor: '#1e88e5', tampo: '#f2f3f3' }, [-3.5, 0.2, -7]); por(gi, 'cadeiras_espera', { n: 3 }, [5.5, 0.2, -4], -90);
      por(gi, 'maca', {}, [4, 0.2, -9.5], 90); const cz = grupo([caixa(0.5, 1.5, 0.2, '#e53935'), caixa(1.5, 0.5, 0.2, '#e53935')]); cz.position.set(-3.5, 5, -11.6); gi.add(cz);
      return { atender: [-3.5, 0.2, -8.8, 0], sentar: [5.2, 0.2, -4.6, -90], deitar: [4, 2.55, -7.0, 0], fila: { inicio: [-3.5, -5.2], vira: 180, cresce: [0.3, 1] } }; } },
  delegacia: { w: 12, d: 12, h: 7, cor: '#e9ebef', faixa: '#1d3b72', piso: '#9aa0aa', letreiro: { texto: 'DELEGACIA', fundo: '#1d3b72' }, porta: { x: 2.5, w: 2.6, vidro: true }, vitrines: [{ x: -3, w: 2.4 }],
    interior(gi) { por(gi, 'balcao', { largura: 4, cor: '#5a5d66' }, [2.5, 0.2, -5.5]); por(gi, 'cela', { largura: 5 }, [-3.2, 0.2, -7.4]); gi.add(caixa(0.3, 7, 4.4, '#cfd3da', { pos: [-0.6, 3.6, -9.6] }));
      por(gi, 'mesa_trabalho', {}, [3.5, 0.2, -9.6], 0, 0.8);
      return { atender: [2.5, 0.2, -7, 0], segurar_grade: [-3.2, 0.2, -8.4, 0] }; } },
  bar: { w: 10, d: 10, h: 5.5, cor: '#f5cd30', faixa: '#c4281c', piso: '#8a6a4a', letreiro: { texto: 'BAR DO ZÉ', fundo: '#c4281c' }, porta: { x: -2, w: 3.4, cor: '#3a3d44' }, vitrines: [{ x: 2.8, w: 3 }],
    interior(gi) { por(gi, 'prateleira_garrafas', { largura: 8 }, [0, -1.2, -9.4]); por(gi, 'balcao', { largura: 7, cor: '#7a4a2a', tampo: '#5a3a22' }, [0, 0.2, -6.8]);
      for (let i = 0; i < 3; i++) por(gi, 'banqueta', {}, [-2.4 + i * 2.4, 0.2, -5.0]); const tv = PROPS.tv_parede({ tela: 'futebol' }); tv.position.set(3.8, 4.2, -9.6); tv.scale.setScalar(0.6); gi.add(tv);
      return { atender: [0, 0.2, -8.5, 0], sentar: [-2.4, 1.15, -4.7, 180] }; } },
};
// casa do protagonista: térrea, 5 cômodos. Frente (z=0) olha +Z.
const CASA = { w: 26, d: 20, h: 7.5 };
const COMODOS_MUNDO = { sala: [-6, -5], cozinha: [7, -5], quarto: [-8.5, -15], banheiro: [-0.5, -15], quarto_pais: [8, -15] };
function casaProtagonista(ctx) {
  const { n, unidades, portas, foco } = ctx, { w, d, h } = CASA, g = new THREE.Group(), cor = '#f2c46d', inte = '#f4ecd8';
  const qual = (x, z) => z > -10 ? (x < 1 ? 'sala' : 'cozinha') : (x < -4 ? 'quarto' : x < 3 ? 'banheiro' : 'quarto_pais');
  const por = (gg, tipo, o, pos, vira = 0, esc) => { const p = PROPS[tipo](o); p.position.set(...pos); p.rotation.y = vira * RAD; if (esc) p.scale.setScalar(esc); gg.add(p);
    p.userData.movel = true; p.userData.comodo = qual(pos[0], pos[2]); unidade(p, unidades); if (ctx.comodo && p.userData.comodo !== ctx.comodo) p.userData.oculto = true; return p; };
  g.add(caixa(w, 0.2, d, '#a8805a', { pos: [0, 0.1, -d / 2] }));
  for (const [x0, x1, z0, z1, c] of [[1, 13, 0, -10, '#c9c2b3'], [-4, 3, -10, -20, '#e8ece8']]) g.add(caixa(x1 - x0, 0.02, Math.abs(z1 - z0), c, { pos: [(x0 + x1) / 2, 0.21, (z0 + z1) / 2], sombra: false }));
  const ext = (len, vaos) => parede(len, h, cor, vaos, n);
  const fr = ext(w, [{ x: -6, w: 2.4, y0: 0, y1: 4.4 }, { x: -11, w: 3, y0: 2.2, y1: 4.8, vidro: true }, { x: 7, w: 3.5, y0: 2.2, y1: 4.8, vidro: true }]); fr.position.set(0, 0, -0.2);
  const pf = porta(2.4, 4.3, '#7a4b2a', false, portas); pf.position.set(-7.2, 0.2, 0); fr.add(pf); g.add(unidade(fr, unidades));
  const fu = ext(w, [{ x: -8.5, w: 2.6, y0: 2.4, y1: 4.8, vidro: true }, { x: -0.5, w: 1.4, y0: 3.6, y1: 4.8, vidro: true }, { x: 8, w: 2.6, y0: 2.4, y1: 4.8, vidro: true }]);
  fu.position.set(0, 0, -d + 0.2); g.add(unidade(fu, unidades));
  for (const s of [-1, 1]) { const la = ext(d, [{ x: 0, w: 2.6, y0: 2.4, y1: 4.8, vidro: true }]); la.rotation.y = Math.PI / 2; la.position.set(s * (w / 2 - 0.2), 0, -d / 2); g.add(unidade(la, unidades)); }
  // paredes internas com portas
  const pi = (len, vaos) => parede(len, h, inte, vaos, n, 0.25);
  const meio = pi(w - 0.8, [{ x: -8.5, w: 2.4, y0: 0, y1: 4.4 }, { x: -0.5, w: 2.2, y0: 0, y1: 4.4 }, { x: 7.5, w: 2.4, y0: 0, y1: 4.4 }]); meio.position.set(0, 0, -10);
  for (const [x, pw] of [[-8.5, 2.2], [-0.5, 2.0], [7.5, 2.2]]) { const p = porta(pw, 4.3, '#e9e6dc', false, portas); p.position.set(x - pw / 2, 0.2, 0); meio.add(p); }
  g.add(unidade(meio, unidades));
  const sc = pi(10, [{ x: 0, w: 3.2, y0: 0, y1: 5 }]); sc.rotation.y = Math.PI / 2; sc.position.set(1, 0, -5); g.add(unidade(sc, unidades));
  for (const x of [-4, 3]) { const pq = pi(10, []); pq.rotation.y = Math.PI / 2; pq.position.set(x, 0, -15); g.add(unidade(pq, unidades)); }
  // forro + telhado de telha
  g.add(unidade(grupo([caixa(w, 0.25, d, '#f4f4f4', { pos: [0, h + 0.12, -d / 2] })]), unidades));
  const tel = grupo([]); for (const sx of [-1, 1]) tel.add(caixa(w + 1.4, 0.4, d / 2 / Math.cos(24 * RAD) + 1, '#c8643b', { pos: [0, h + 0.25 + Math.tan(24 * RAD) * d / 4, -d / 2 + sx * d / 4], rot: [sx * 24, 0, 0] }));
  tel.add(caixa(w + 1.4, 0.3, 0.6, '#9a4a2b', { pos: [0, h + 0.3 + Math.tan(24 * RAD) * d / 2, -d / 2] })); g.add(unidade(tel, unidades));
  // móveis
  por(g, 'sofa', { cor: '#4f6f8f' }, [-6.5, 0.2, -8.8], 0, 0.9); por(g, 'mesa_centro', {}, [-6.5, 0.2, -5.8]); por(g, 'tapete', { cor: '#c76b5a', largura: 7, prof: 4.5 }, [-6.5, 0.2, -6]);
  por(g, 'tv', {}, [-12.4, 0.2, -5], 90, 0.8); por(g, 'poltrona', { cor: '#8a5a33' }, [-2.5, 0.2, -3], -120, 0.8); por(g, 'planta', {}, [-12, 0.2, -1.2]);
  por(g, 'geladeira', {}, [12, 0.2, -1.6], -90); por(g, 'fogao', {}, [12, 0.2, -5], -90); por(g, 'pia', {}, [11.8, 0.2, -8.2], -90, 0.8); por(g, 'mesa_jantar', { largura: 3.6 }, [5.5, 0.2, -5], 0, 0.75);
  por(g, 'cama', { cor: '#1e88e5' }, [-11.1, 0.2, -16.3]); por(g, 'mesa', { largura: 3.6, cor: '#f2f3f3' }, [-5.0, 0.2, -14], -90, 0.85); por(g, 'computador', {}, [-4.8, 0.2, -14], -90, 0.85);
  por(g, 'cadeira_gamer', {}, [-7.0, 0.2, -14], 90, 0.9); por(g, 'guarda_roupa', { largura: 3.6 }, [-12.2, 0.2, -11.6], 90, 0.85);
  for (const [t, c, x] of [['GAMER', '#6b32a8', -10], ['GOOOL!', '#1f9d48', -6.8]]) { const p = PROPS.poster({ texto: t, cor: c }); p.position.set(x, 5.2, -19.55); p.scale.setScalar(0.8); g.add(p); }
  por(g, 'vaso_sanitario', {}, [-2.6, 0.2, -18.8]); por(g, 'pia_banheiro', {}, [-3.2, 0.2, -12.2], 90, 0.9); por(g, 'box_chuveiro', {}, [1.0, 0.2, -18], 0, 0.95);
  por(g, 'cama_casal', { cor: '#b84a5a' }, [8.2, 0.2, -16.3], 0, 0.95); por(g, 'criado_mudo', {}, [4.3, 0.2, -19]); por(g, 'criado_mudo', {}, [12.1, 0.2, -19]); por(g, 'guarda_roupa', { largura: 3.6, cor: '#e9e6dc' }, [12.3, 0.2, -11.6], -90, 0.85);
  if (foco) { const [x, z] = COMODOS_MUNDO[ctx.comodo || 'sala']; luzInterna(g, x, z, h, n, 1.1); }   // só a luz do cômodo da cena (cada luz pesa no render)
  g.userData.ancoras = { sentar: [-7.4, 0.2, -8.4, 0], cozinhar: [10.4, 0.2, -5, 90], lavar_louca: [10.4, 0.2, -8.2, 90], deitar: [-11.1, 1.65, -13.2, 0], dormir: [-11.1, 1.65, -13.2, 0],
    jogar_pc: [-6.7, 0.7, -14, 90], deitar_pais: [6.8, 1.65, -13.4, 0] };
  return g;
}

// ---------------- layout do mapa ----------------
const PR = 26, AN = 36, FR = 39.5; // meia praça, borda externa do anel de ruas, linha das fachadas
export const LOTES_MUNDO = [
  { id: 'prefeitura', f: [-24, -FR], rot: 0 }, { id: 'igreja', f: [2, -FR], rot: 0 }, { id: 'banco', f: [24, -FR], rot: 0 },
  { id: 'escola', f: [-22, FR], rot: 180 }, { id: 'posto_saude', f: [22, FR], rot: 180 },
  { id: 'padaria', f: [-FR, -22], rot: 90 }, { id: 'farmacia', f: [-FR, -8], rot: 90 }, { id: 'loterica', f: [-FR, 9], rot: 90 }, { id: 'bar', f: [-FR, 22], rot: 90 },
  { id: 'mercado', f: [FR, -20], rot: -90 }, { id: 'delegacia', f: [FR, 21], rot: -90 },
];
const CASA_LOTE = { id: 'casa', f: [78, -12], rot: 0 };
const PONTOS = { praca: { f: [0, 18], rot: 0, recuo: 0, chao: 0.45 }, coreto: { f: [0, 6.5], rot: 0, recuo: 2.5, chao: 0.45 }, fonte: { f: [13.9, -13.9], rot: -45, recuo: 6.6, chao: 0.45 },
  parquinho: { f: [11.5, 15.5], rot: 0, recuo: 0, chao: 0.45 }, estatua: { f: [-13.9, -13.9], rot: 45, recuo: 5.0, chao: 0.45 }, rua_bairro: { f: [92, 0], rot: 90, recuo: 0, chao: 0.1 },
  posto_gasolina: { f: [52, 9], rot: 180, recuo: 3, chao: 0.2 }, campinho: { f: [139, 22.5], rot: 90, recuo: 0, chao: 0.2 } };
/** Centro de cada lugar no mapa (para desenhar a planta com nomes). */
export function centrosMundo() {
  const out = LOTES_MUNDO.map(l => { const d = PREDIOS_MUNDO[l.id].d, r = l.rot * RAD; return { id: l.id, x: l.f[0] - Math.sin(r) * d / 2, z: l.f[1] - Math.cos(r) * d / 2 }; });
  return [...out, { id: 'casa', x: CASA_LOTE.f[0], z: CASA_LOTE.f[1] - CASA.d / 2 }, { id: 'posto_gasolina', x: 60, z: 17 }, { id: 'coreto', x: 4, z: 4 }, { id: 'fonte', x: 14, z: -14 },
    { id: 'estatua', x: -14, z: -14 }, { id: 'parquinho', x: 15, z: 15 }, { id: 'rua_bairro', x: 125, z: 0 }, { id: 'campinho', x: 139, z: 23 }, ...EXTRAS_MAPA.map(e => ({ id: '_' + e.nome, nome: e.nome, x: e.x, z: e.z }))];
}
export const LOCAIS_MUNDO = [...LOTES_MUNDO.map(l => l.id), 'casa', ...Object.keys(PONTOS), 'vista'];
export const LOCAIS_COM_INTERIOR = [...LOTES_MUNDO.map(l => l.id), 'casa'];
export const COMODOS_DO_MUNDO = Object.keys(COMODOS_MUNDO);

function praca(g, n, r) {
  const Y = 0.48, piso = '#e6dcc6', cam = '#d6c8a6';
  g.add(caixa(PR * 2 + 1, 0.45, PR * 2 + 1, '#d8d4cc', { pos: [0, 0.22, 0] })); g.add(caixa(PR * 2, 0.47, PR * 2, piso, { pos: [0, 0.23, 0] }));   // piso da praça (topo em 0.47)
  g.add(cilindro(8, 8, 0.03, '#d9cdb0', { pos: [0, Y, 0], seg: 40, sombra: false }));                                                       // largo redondo do coreto
  for (const [w, d] of [[7, PR * 2], [PR * 2, 7]]) g.add(caixa(w, 0.02, d, cam, { pos: [0, Y, 0], sombra: false }));                        // caminhos em cruz
  for (const s2 of [-1, 1]) { g.add(caixa(PR * 2, 0.02, 3.6, cam, { pos: [0, Y, s2 * (PR - 2)], sombra: false })); g.add(caixa(3.6, 0.02, PR * 2, cam, { pos: [s2 * (PR - 2), Y, 0], sombra: false })); }   // calçada interna em volta
  const C = 13.9, T = 16.2;   // centro e tamanho de cada quadrante (de 5.8 a 22 em x e z)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = sx * C, cz = sz * C;
    if (sz < 0) {   // quadrantes do norte: largos calçados com monumento no meio (fonte a leste, estátua a oeste), acesso livre
      g.add(cilindro(6.4, 6.4, 0.03, '#d9cdb0', { pos: [cx, Y + 0.005, cz], seg: 36, sombra: false }));
      for (const [ox, oz] of [[sx * 6.2, sz * 6.2], [sx * 6.2, -sz * 5.2], [-sx * 5.2, sz * 6.2]]) {   // canteiros redondos com árvore nos cantos
        g.add(cilindro(1.6, 1.6, 0.5, '#9a8f7a', { pos: [cx + ox, Y + 0.25, cz + oz], seg: 20 })); g.add(cilindro(1.4, 1.4, 0.05, '#3fae3a', { pos: [cx + ox, Y + 0.52, cz + oz], seg: 20, sombra: false }));
        const a = PROPS.arvore({ tam: r.entre(0.8, 1.0) }); a.position.set(cx + ox, Y + 0.5, cz + oz); g.add(a); }
      for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2; por(g, 'vaso_flor', { cor: r.item(['#ff4f8b', '#ffd23f', '#b06bff']) }, [cx + Math.sin(ang) * 5.4, Y, cz + Math.cos(ang) * 5.4], 0, 0.8); }
    } else if (sx > 0) {   // sudeste: parquinho na areia (no mesmo nível do piso)
      g.add(caixa(T - 1, 0.03, T - 1, '#e8c58c', { pos: [cx, Y + 0.005, cz], sombra: false }));
      por(g, 'balanco', {}, [cx + 1, Y, cz + 3]); por(g, 'escorregador', {}, [cx + 4, Y, cz - 3], -90); por(g, 'banco', {}, [cx - 4.5, Y, cz - 5.5], 0);
    } else {   // sudoeste: jardim baixo com árvores e flores
      g.add(caixa(T - 1, 0.25, T - 1, '#3fae3a', { pos: [cx, Y + 0.12, cz] }));
      for (let i = 0; i < 2; i++) { const a = PROPS.arvore({ tam: r.entre(1.0, 1.3) }); a.position.set(cx + r.entre(-4, 4), Y + 0.25, cz + r.entre(-4, 4)); g.add(a); }
      for (let i = 0; i < 18; i++) g.add(esfera(0.22, r.item(['#ff4f8b', '#ffd23f', '#ffffff', '#b06bff', '#ff8c1a']), { pos: [cx + r.entre(-6.5, 6.5), Y + 0.35, cz + r.entre(-6.5, 6.5)], sombra: false }));
    }
  }
  const co = PROPS.coreto({}); co.position.set(0, 0.45, 0); g.add(co);
  const fo = PROPS.fonte(); fo.position.set(C, 0.45, -C); g.add(fo);
  const es = PROPS.estatua({ texto: 'FUNDADOR' }); es.position.set(-C, 0.45, -C); es.rotation.y = 45 * RAD; g.add(es);
  // bancos: 4 em volta do coreto (nas diagonais, virados para ele) + 8 na calçada interna (virados para o centro)
  for (let k = 0; k < 4; k++) { const ang = (45 + k * 90) * RAD; por(g, 'banco', {}, [Math.sin(ang) * 7.0, 0.45, Math.cos(ang) * 7.0], ang / RAD + 180); }
  for (const s2 of [-1, 1]) for (const t of [-12, 12]) { por(g, 'banco', {}, [t, 0.45, s2 * 24.6], s2 > 0 ? 180 : 0); por(g, 'banco', {}, [s2 * 24.6, 0.45, t], s2 > 0 ? -90 : 90); }
  for (const [x, z] of [[-4.6, 25], [4.6, 25], [-4.6, -25], [4.6, -25], [25, 4.6], [25, -4.6], [-25, 4.6], [-25, -4.6]])
    por(g, 'poste', { noite: n }, [x, 0.45, z], x < 0 ? 0 : 180);
  por(g, 'barraca', { cor: '#c4281c' }, [-15, 0.45, 4.9], 0, 0.75); por(g, 'bandeira', {}, [8, 0.45, -24.8]);
  for (let i = 0; i < 8; i++) g.add(esfera(0.28, '#8d8f99', { pos: [r.entre(-2.5, 2.5), 0.75, r.entre(9, 16)] }));
}

export function construirMundo(o, g, r) {
  const n = o.hora === 'noite', unidades = [], portas = [];
  g.add(caixa(800, 0.2, 800, '#4ccd3d', { pos: [0, -0.1, 0] }));
  g.add(caixa(AN * 2 + 8, 0.2, AN * 2 + 8, '#c3c7cf', { pos: [0, 0.1, 0] }));                         // calçadas
  g.add(caixa(AN * 2, 0.2, AN * 2, '#4f5361', { pos: [0, 0.11, 0] }));                                // anel de ruas
  for (const [x, z, w, d] of [[0, -(PR + 5), 2 * PR, 0.25], [0, PR + 5, 2 * PR, 0.25], [-(PR + 5), 0, 0.25, 2 * PR], [PR + 5, 0, 0.25, 2 * PR]]) g.add(caixa(w, 0.03, d, '#f5cd30', { pos: [x, 0.22, z], sombra: false }));
  g.add(caixa(200, 0.2, 10, '#4f5361', { pos: [AN + 100, 0.11, 0] })); for (const s of [-1, 1]) g.add(caixa(200, 0.25, 3, '#c3c7cf', { pos: [AN + 100, 0.12, s * 6.5] }));   // rua do bairro (leste)
  for (let x = AN + 4; x < 230; x += 7) g.add(caixa(3, 0.03, 0.3, '#f2f3f3', { pos: [x, 0.22, 0], sombra: false }));
  praca(g, n, r);
  const ctx = { n, unidades, portas };
  const focoId = o.dentro || o.comodo ? o.local : null;
  for (const l of LOTES_MUNDO) { const p = predioOco(PREDIOS_MUNDO[l.id], { ...ctx, foco: focoId === l.id }); p.position.set(l.f[0], 0.2, l.f[1]); p.rotation.y = l.rot * RAD; p.userData.lote = l; g.add(p); }
  // torre da igreja (por fora, ao lado da porta)
  { const ig = LOTES_MUNDO.find(l => l.id === 'igreja'), t = grupo([caixa(4, 18, 4, '#f6f2e6', { pos: [0, 9, -2] }), cilindro(0, 3.2, 4.5, '#b5533a', { pos: [0, 20.2, -2], seg: 4 }),
      caixa(0.3, 2.2, 0.3, '#e8c25a', { pos: [0, 23.5, -2] }), caixa(1.3, 0.3, 0.3, '#e8c25a', { pos: [0, 23.9, -2] }), caixa(1.8, 2.2, 0.2, '#5a3a22', { pos: [0, 15, 0.05] })]);
    t.position.set(ig.f[0] + 9, 0.2, ig.f[1]); g.add(t); }
  // casa do protagonista + rua do bairro
  const casa = casaProtagonista({ ...ctx, foco: focoId === 'casa', comodo: o.comodo }); casa.position.set(CASA_LOTE.f[0], 0.2, CASA_LOTE.f[1]); casa.userData.lote = CASA_LOTE; g.add(casa);
  por(g, 'muro', { largura: 30, cor: '#e9e6dc', portao_x: -6, portao_cor: '#1d3b72' }, [CASA_LOTE.f[0], 0.2, -5.6]); por(g, 'carro', { cor: '#c4281c' }, [CASA_LOTE.f[0] + 7, 0.2, -8.6], 90, 0.9);
  const cores = ['#8fc1e3', '#f2a7c3', '#b7e1a1', '#e9e6dc', '#f28b5b', '#c9b2e8', '#ffe08a'];
  const LOJAS_BAIRRO = [[100, 1], [139, -1], [178, 1]];   // [x, lado] ocupados por mercadinho, oficina e borracharia
  for (let x = 48; x <= 210; x += 13) for (const lado of [-1, 1]) { if (lado < 0 && Math.abs(x - CASA_LOTE.f[0]) < 18) continue; if (lado > 0 && x < 60) continue;
    if (LOJAS_BAIRRO.some(([lx, ll]) => ll === lado && Math.abs(lx - x) < 6)) continue;
    if (lado > 0 && Math.abs(x - CAMPINHO.x) < CAMPINHO.w / 2 + 10) continue;   // campinho + folga de gramado dos dois lados
    por(g, r() < 0.3 ? 'sobrado' : 'casa_br', { cor: r.item(cores), noite: n, largura: 9 }, [x, 0, lado * 13], lado > 0 ? 180 : 0);
    por(g, 'muro', { largura: 12, cor: '#e9e6dc', portao_x: r.entre(-2, 2) }, [x, 0, lado * 8.1], lado > 0 ? 180 : 0); }
  for (let x = 46; x <= 200; x += 16) por(g, 'poste_fios', { noite: n }, [x, 0, -5.6]);
  por(g, 'posto_gasolina', { noite: n }, [52, 0.2, 9], 180);
  for (const [x, z, v, c] of [[-31, 16, 0, '#1d3b72'], [31, 12, 180, '#f2f3f3'], [10, 31, 90, '#f5c400']]) por(g, c === '#f5c400' ? 'taxi' : 'carro', { cor: c }, [x, 0.2, z], v);
  for (const z of [-1, 1]) for (let x = -70; x <= 70; x += 12) if (!(z < 0 && x > -12 && x < 20)) por(g, r() < 0.3 ? 'sobrado' : 'casa_br', { cor: r.item(cores), noite: n, largura: 8 }, [x, 0, z * 68], z > 0 ? 180 : 0);
  povoar(g, n, r);
  g.add(caixa(500, 16, 80, '#3fae3a', { pos: [0, 0, -170] }));
  g.userData.unidades = unidades; g.userData.portas = portas;
}

// ---------------- prédios extras (só por fora) para a cidade não ficar vazia ----------------
/** Loja colocada pela linha da fachada (f) e direção (rot). */
function loja(g, fx, fz, rot, texto, cor, w = 9, n, parede) { const p = PROPS.loja({ texto, cor, largura: w, noite: n, parede }); const r = rot * RAD;
  p.position.set(fx - Math.sin(r) * 3, 0.2, fz - Math.cos(r) * 3); p.rotation.y = r; g.add(p); return p; }
function predio(g, x, z, rot, alt, cor, n) { const p = PROPS.predio({ altura: alt, largura: 10, cor, noite: n }); p.position.set(x, 0, z); p.rotation.y = rot * RAD; g.add(p);
  for (let y = 3; y < alt - 1; y += 3.2) for (const xx of [-3, 0, 3]) { const v = caixa(1.6, 0.15, 0.7, '#d8d4cc', { pos: [xx, y - 0.9, 4.3] }); p.add(v); }   // sacadas
  return p; }
function caixaDaguaTorre(g, x, z) { const t = grupo([cilindro(4, 4, 5, '#d8dde3', { pos: [0, 21, 0], seg: 20 }), cilindro(4.3, 4.3, 0.6, '#9aa0aa', { pos: [0, 23.7, 0], seg: 20 }),
    ...[0, 90, 180, 270].map(a => caixa(0.6, 18.5, 0.6, '#9aa0aa', { pos: [Math.sin(a * RAD) * 3, 9.25, Math.cos(a * RAD) * 3] })), caixa(6.6, 0.4, 0.4, '#9aa0aa', { pos: [0, 9, 0] }), caixa(0.4, 0.4, 6.6, '#9aa0aa', { pos: [0, 9, 0] })]);
  const pl = placaTexto('ÁGUA', 3.2, 1.1, { fundo: '#1e6fd9', corTexto: '#fff' }); pl.position.set(0, 21, 4.05); t.add(pl); t.position.set(x, 0, z); g.add(t); }
export const CAMPINHO = { x: 139, z: 22.5, w: 38, d: 21 };   // entre o mercadinho (x 113) e a borracharia (x 165), lado sul da rua
function campinho(g, n, r) {
  const { x, z, w, d } = CAMPINHO, L = '#f2f3f3';
  g.add(caixa(w + 4, 0.16, d + 4, '#3fae3a', { pos: [x, 0.08, z] })); g.add(caixa(w, 0.18, d, '#58b947', { pos: [x, 0.09, z] }));
  for (let i = 0; i < 26; i++) g.add(caixa(r.entre(1.2, 3.5), 0.03, r.entre(1, 3), '#a08a62', { pos: [x + r.entre(-w / 2 + 2, w / 2 - 2), 0.19, z + r.entre(-d / 2 + 2, d / 2 - 2)], sombra: false }));   // terra batida
  for (const [lw, ld, dx, dz] of [[w, 0.25, 0, -d / 2], [w, 0.25, 0, d / 2], [0.25, d, -w / 2, 0], [0.25, d, w / 2, 0], [0.25, d, 0, 0],
    [0.25, 8, -w / 2 + 5, 0], [5, 0.25, -w / 2 + 2.5, -4], [5, 0.25, -w / 2 + 2.5, 4], [0.25, 8, w / 2 - 5, 0], [5, 0.25, w / 2 - 2.5, -4], [5, 0.25, w / 2 - 2.5, 4]])
    g.add(caixa(lw, 0.03, ld, L, { pos: [x + dx, 0.2, z + dz], sombra: false }));
  for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; g.add(caixa(1.0, 0.03, 0.25, L, { pos: [x + Math.cos(a) * 3.5, 0.2, z + Math.sin(a) * 3.5], rot: [0, -a / RAD + 90, 0], sombra: false })); }   // círculo central
  for (const sx of [-1, 1]) { const t = PROPS.trave(); t.position.set(x + sx * (w / 2 - 0.2), 0.18, z); t.rotation.y = -sx * 90 * RAD; t.scale.setScalar(0.75); g.add(t); }
  const bola = PROPS.bola(); bola.position.set(x + 2, 0.18, z + 1.5); g.add(bola);
  const tela = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.28, roughness: 1 });
  for (const [lw, ld, dx, dz] of [[w + 4, 0.08, 0, d / 2 + 2], [0.08, d + 4, -w / 2 - 2, 0], [0.08, d + 4, w / 2 + 2, 0]]) g.add(caixa(lw, 4.5, ld, tela, { pos: [x + dx, 2.4, z + dz], sombra: false }));   // alambrado (frente aberta para a rua)
  for (let k = -w / 2 - 2; k <= w / 2 + 2.01; k += 4) g.add(caixa(0.12, 4.6, 0.12, '#888', { pos: [x + k, 2.3, z + d / 2 + 2] }));
  for (let k = -d / 2 - 2; k <= d / 2 + 2.01; k += 4) for (const sx of [-1, 1]) g.add(caixa(0.12, 4.6, 0.12, '#888', { pos: [x + sx * (w / 2 + 2), 2.3, z + k] }));
  for (const dx of [-8, 0, 8]) { const b = PROPS.banco({}); b.position.set(x + dx, 0.18, z - d / 2 - 1.2); g.add(b); }
  for (const sx of [-1, 1]) for (const k of [0, 1]) { const a = PROPS.arvore({ tam: r.entre(0.9, 1.2) }); a.position.set(x + sx * (w / 2 + 7.5), 0, z - 4 + k * 10); g.add(a); }   // gramado com árvores entre o campinho e as lojas
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = PROPS.poste_fios({ noite: n }); p.position.set(x + sx * (w / 2 + 3), 0, z + sz * (d / 2 + 1)); g.add(p); }
}
function quadra(g, x, z) { g.add(caixa(26, 0.15, 16, '#2e8b57', { pos: [x, 0.08, z] }));
  for (const [w, d, dx, dz] of [[24, 0.2, 0, -7], [24, 0.2, 0, 7], [0.2, 14, -12, 0], [0.2, 14, 12, 0], [0.2, 14, 0, 0]]) g.add(caixa(w, 0.03, d, '#f2f3f3', { pos: [x + dx, 0.17, z + dz], sombra: false }));
  for (const s of [-1, 1]) { const t = PROPS.trave(); t.position.set(x + s * 12.5, 0.15, z); t.rotation.y = -s * 90 * RAD; t.scale.setScalar(0.6); g.add(t); }
  for (const s of [-1, 1]) g.add(caixa(26.4, 4, 0.1, new THREE.MeshStandardMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.3 }), { pos: [x, 2, z + s * 8.2], sombra: false })); }

export const EXTRAS_MAPA = [
  { nome: 'Sorveteria', x: -40, z: -FR - 3 },
  { nome: 'Açougue', x: 37, z: -FR - 3 },
  { nome: 'Papelaria', x: -40.5, z: FR + 3 },
  { nome: 'Salão de beleza', x: 38, z: FR + 3 },
  { nome: 'Loja de roupas', x: -5, z: FR + 3 },
  { nome: 'Ótica', x: 6.8, z: FR + 3 },
  { nome: 'Apartamentos', x: -64, z: -24 },
  { nome: 'Apartamentos', x: -64, z: 24 },
  { nome: 'Pousada', x: -63, z: 8 },
  { nome: "Caixa d'água", x: -82, z: 0 },
  { nome: 'Apartamentos', x: 48, z: -50 },
  { nome: 'Mercadinho', x: 100, z: 12 },
  { nome: 'Oficina', x: 139, z: -12 },
  { nome: 'Borracharia', x: 178, z: 12 },
  ];
function povoar(g, n, r) {
  const marca = () => {};   // posições dos nomes no mapa ficam em EXTRAS_MAPA
  // cantos e vãos em volta da praça
  loja(g, -40, -FR, 0, 'SORVETERIA', '#ff66cc', 8, n); marca('Sorveteria', -40, -FR - 3);
  loja(g, 37, -FR, 0, 'AÇOUGUE', '#8a1f1f', 8, n); marca('Açougue', 37, -FR - 3);
  loja(g, -40.5, FR, 180, 'PAPELARIA', '#6b32a8', 8, n); marca('Papelaria', -40.5, FR + 3);
  loja(g, 38, FR, 180, 'SALÃO DE BELEZA', '#e0207a', 9, n); marca('Salão de beleza', 38, FR + 3);
  loja(g, -5, FR, 180, 'LOJA DE ROUPAS', '#1e6fd9', 8, n); marca('Loja de roupas', -5, FR + 3);
  loja(g, 6.8, FR, 180, 'ÓTICA', '#00897b', 7, n); marca('Ótica', 6.8, FR + 3);
  // a oeste, atrás das lojas: prédios de apartamentos, pousada e a caixa d'água da cidade
  for (const [z, a, c] of [[-24, 16, '#9fb3c8'], [-8, 12, '#e9d8b0'], [24, 18, '#c9b2e8']]) predio(g, -64, z, 90, a, c, n);
  marca('Apartamentos', -64, -24); marca('Apartamentos', -64, 24);
  loja(g, -59, 8, 90, 'POUSADA', '#2e7d32', 12, n, '#f6efe0'); marca('Pousada', -63, 8);
  caixaDaguaTorre(g, -82, 0); marca("Caixa d'água", -82, 0);
  for (let z = -40; z <= 40; z += 13) por(g, r() < 0.4 ? 'sobrado' : 'casa_br', { cor: r.item(['#8fc1e3', '#f2a7c3', '#b7e1a1', '#ffe08a', '#f28b5b']), noite: n, largura: 8.5 }, [-98, 0, z], 90);
  // norte e sul atrás das fileiras: mais casas e um prédio
  predio(g, -48, -50, 0, 14, '#f0b446', n); predio(g, 48, -50, 0, 12, '#8fc1e3', n); marca('Apartamentos', 48, -50);   // longe da fileira de casas de trás
  // bairro: comércio de rua, segunda fileira de casas e quadra
  loja(g, 100, 9, 180, 'MERCADINHO', '#43a047', 9, n); marca('Mercadinho', 108, 12);
  loja(g, 139, -9, 0, 'OFICINA', '#3a3d44', 11, n, '#cfd3da'); por(g, 'carro', { cor: '#1d3b72' }, [139, 0.2, -7.4], 90, 0.9); marca('Oficina', 134, -12);
  loja(g, 178, 9, 180, 'BORRACHARIA', '#f5b800', 8, n); for (let i = 0; i < 3; i++) g.add(cilindro(0.9, 0.9, 0.6, '#1b1b1b', { pos: [181.5, 0.5 + i * 0.62, 7.6], seg: 14 })); marca('Borracharia', 160, 12);
  for (let x = 74; x <= 204; x += 13) for (const lado of [-1, 1]) if (r() < 0.8) por(g, r() < 0.35 ? 'sobrado' : 'casa_br', { cor: r.item(['#8fc1e3', '#f2a7c3', '#b7e1a1', '#e9e6dc', '#f28b5b', '#c9b2e8', '#ffe08a']), noite: n, largura: 8.5 }, [x, 0, lado * 52], lado > 0 ? 180 : 0);
  for (const lado of [-1, 1]) g.add(caixa(170, 0.2, 7, '#4f5361', { pos: [130, 0.11, lado * 40] }));   // ruas paralelas (longe o bastante da casa do protagonista, que é funda)
  campinho(g, n, r);
  for (let i = 0; i < 10; i++) por(g, 'arvore', { tam: r.entre(0.9, 1.3) }, [r.entre(55, 200), 0, r.item([-1, 1]) * r.entre(60, 66)]);
}

/**
 * Mantém só o pedaço do mundo em volta do local gravado (o resto deixa de existir na cena).
 * Chão, morros e ruas enormes ficam (senão vira vazio); o prédio/casa da cena sempre fica.
 */
export function recortarMundo(g, raio, manter = []) {
  if (!isFinite(raio)) return 0;
  g.updateMatrixWorld(true); const caixa3 = new THREE.Box3(), tam = new THREE.Vector3(), origem = new THREE.Vector3(0, 0, 0); let removidos = 0;
  for (const ch of [...g.children]) {
    if (manter.includes(ch)) continue;
    caixa3.setFromObject(ch); if (caixa3.isEmpty()) continue; caixa3.getSize(tam);
    if (Math.max(tam.x, tam.z) > 150) continue;
    if (caixa3.distanceToPoint(origem) > raio) { g.remove(ch); removidos++; }
  }
  const dentroDoMundo = (o) => { while (o) { if (o === g) return true; o = o.parent; } return false; };
  g.userData.unidades = (g.userData.unidades || []).filter(dentroDoMundo); g.userData.portas = (g.userData.portas || []).filter(dentroDoMundo);
  return removidos;
}

/** Leva o ponto da cena para a origem (atores), com o fundo em -Z e a câmera em +Z. Devolve as âncoras já transformadas. */
export function enquadrarMundo(g, { local, dentro, comodo }) {
  if (!local || local === 'vista') { g.position.set(0, -0.45, 0); return { ancoras: {} }; }
  const lote = LOTES_MUNDO.find(l => l.id === local) || (local === 'casa' ? CASA_LOTE : null);
  const pto = PONTOS[local];
  let S, r, chao, ancLocal = {}, ref = null;
  if (lote) {
    ref = g.children.find(c => c.userData?.lote === lote);
    const rb = lote.rot * RAD; r = lote.rot;
    let lp = [0, 2.6]; chao = 0.2;   // fora: na calçada, em frente à fachada
    if (local === 'casa' && (comodo || dentro)) { const cz = COMODOS_MUNDO[comodo || 'sala']; lp = [cz[0], cz[1]]; chao = 0.4; }
    else if (dentro) { lp = [0, -(ref?.userData.d || 12) * 0.42]; chao = 0.4; }
    const [dx, dz] = rot(lp[0], lp[1], rb); S = [lote.f[0] + dx, lote.f[1] + dz];
    if (dentro || comodo) ancLocal = ref?.userData.ancoras || {};
  } else if (pto) { const rb = pto.rot * RAD; r = pto.rot; S = [pto.f[0] + Math.sin(rb) * pto.recuo, pto.f[1] + Math.cos(rb) * pto.recuo]; chao = pto.chao; }
  else { g.position.set(0, -0.45, 0); return { ancoras: {} }; }
  const th = -r * RAD; g.rotation.y = th;
  const [px, pz] = rot(S[0], S[1], th); g.position.set(-px, -chao, -pz);
  // âncoras: local do prédio -> mapa -> enquadrado
  const ancoras = {};
  if (lote) for (const [k, v] of Object.entries(ancLocal)) {
    if (k === 'fila') { const [ix, iz] = rot(v.inicio[0], v.inicio[1], lote.rot * RAD); const [mx, mz] = [lote.f[0] + ix - S[0], lote.f[1] + iz - S[1]]; const [fx, fz] = rot(mx, mz, th);
      const [cx, cz] = rot(...rot(v.cresce[0], v.cresce[1], lote.rot * RAD), th); ancoras.fila = { inicio: [fx, fz], vira: v.vira + lote.rot - r, cresce: [cx, cz] }; continue; }
    const [ax, az] = rot(v[0], v[2], lote.rot * RAD); const [fx, fz] = rot(lote.f[0] + ax - S[0], lote.f[1] + az - S[1], th);
    ancoras[k === 'deitar_pais' ? 'deitar_pais' : k] = [fx, (v[1] ?? 0) + 0.2 - chao + 0.0, fz, (v[3] ?? 0) + lote.rot - r];
  }
  return { ancoras };
}
