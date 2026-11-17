// MUNDO INTEGRADO: um mapa único e contínuo (como um "place" do Roblox).
// Praça no centro, prédios ocos em volta (por fora E por dentro, no mesmo lugar), portas que abrem sozinhas,
// rua de bairro com a casa do protagonista (térrea, 5 cômodos ligados por portas).
// Paredes/teto marcados como "unidade de corte" somem automaticamente quando ficam entre a câmera e o ator.
// Roteiro: `onde: mundo` + `local: farmacia` (+ `dentro: true`) · `local: casa` + `comodo: quarto` · `local: escola` + `comodo: biblioteca` · `local: vista`.
// Escola e posto de saúde têm vários cômodos (paredes internas com portas), como a casa.
import * as THREE from 'three';
import { caixa, cilindro, esfera, plano, grupo, mat, rng } from './util.js';
import { PROPS, placaTexto, assentosDe } from './props.js';

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
function luzInterna(g, x, z, h, n, forca = 1, alc = 30) { const l = new THREE.PointLight(0xfff2dd, (n ? 70 : 45) * forca, alc, 1.4); l.position.set(x, h - 1.0, z); g.add(l);
  g.add(caixa(2.2, 0.12, 2.2, mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 1.3 }), { pos: [x, h - 0.08, z], sombra: false })); }
const por = (g, tipo, o, pos, vira = 0, esc) => { const p = PROPS[tipo](o); p.position.set(...pos); p.rotation.y = vira * RAD; if (esc) p.scale.setScalar(esc); g.add(p); return p; };

/** `sentar` (e `rezar`) passam a ser a lista de assentos reais, do mais perto do ponto principal ao mais longe: cada pessoa pega um livre. */
function usarAssentos(anc, lista, zc) {
  if (!lista.length) return;
  for (const k of ['sentar', 'rezar']) { if (k === 'rezar' && !anc.rezar) continue; const ref = anc[k] || [0, 0, zc];
    anc[k] = lista.slice().sort((a, b) => Math.hypot(a[0] - ref[0], a[2] - ref[2]) - Math.hypot(b[0] - ref[0], b[2] - ref[2])); }
}

/**
 * Interiores foram desenhados num tamanho menor (w0,d0,h0); aqui vão para o tamanho novo (w,d,h) sem esticar os móveis:
 * o que está encostado numa parede continua encostado nela, o resto se espalha proporcionalmente, e o que fica no teto sobe junto.
 */
function mapaInterior(w0, d0, h0, w, d, h) {
  const B = 1.0, faixa = (v, a0, a) => { const s = Math.sign(v), m = Math.abs(v); return s * (m > a0 - B ? a - (a0 - m) : m * (a - B) / (a0 - B)); };
  const x = (v) => faixa(v, w0 / 2, w / 2);
  const z = (v) => v > -B ? v : v < -d0 + B ? -d + (v + d0) : -B + (v + B) * (d - 2 * B) / (d0 - 2 * B);
  const y = (v) => v >= h0 - 2.0 ? v + (h - h0) : v;
  const mover = (obj) => { if (obj.isGroup && !obj.userData.tipo && obj.position.lengthSq() < 1e-9 && obj.rotation.y === 0) { obj.children.forEach(mover); return; }
    obj.position.set(x(obj.position.x), y(obj.position.y), z(obj.position.z)); };
  return { x, z, objetos: (gi) => gi.children.forEach(mover),
    ancoras: (a) => { const r = {}; for (const [k, v] of Object.entries(a)) r[k] = k === 'fila' ? { ...v, inicio: [x(v.inicio[0]), z(v.inicio[1])] } : [x(v[0]), v[1], z(v[2]), v[3]]; return r; } };
}

/**
 * Prédio oco. Fachada em z=0 olhando +Z, fundo em z=-d. Retorna o grupo com userData { ancoras, d, w }.
 * o = { w, d, h, cor, faixa, piso, letreiro:{texto,fundo,cor}, porta:{x,w,vidro,cor}, vitrines:[{x,w}], janelas:{fundo:[],esq:[],dir:[]}, interior(gi, ctx) }
 */
function predioOco(o0, ctx) {
  const { n, unidades, portas, foco } = ctx, g = new THREE.Group();
  const [w, d, h] = o0.tam || [o0.w, o0.d, o0.h], M = mapaInterior(o0.w, o0.d, o0.h, w, d, h);
  const o = { ...o0, porta: o0.porta && { ...o0.porta, x: M.x(o0.porta.x) }, vitrines: (o0.vitrines || []).map(v => ({ x: M.x(v.x), w: v.w * Math.min(1.5, w / o0.w) })),
    janelas: o0.janelas && { fundo: (o0.janelas.fundo || []).map(M.x), esq: (o0.janelas.esq || []).map(M.z), dir: (o0.janelas.dir || []).map(M.z) } };
  g.add(caixa(w - 0.2, 0.2, d - 0.2, o.piso || '#d9d4c8', { pos: [0, 0.1, -d / 2] }));                                  // piso (topo em 0.2)
  const P = o.porta || { x: 0, w: 2.4 };
  const fr = parede(w, h, o.cor, [{ x: P.x, w: P.w + 0.2, y0: 0, y1: 6.3 }, ...(o.vitrines || []).map(v => ({ x: v.x, w: v.w, y0: 1.2, y1: 3.9, vidro: true }))], n);
  fr.position.set(0, 0, -0.2); const dp = porta(P.w, 6.2, P.cor || '#7a4b2a', P.vidro, portas); dp.position.set(P.x - P.w / 2, 0.2, 0); fr.add(dp);
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
  const gi = new THREE.Group(); g.add(gi);
  if (o0.comodos) { const r = montarComodos(gi, o0, { ...ctx, h }); g.userData.ancoras = r.ancoras; g.userData.comodo = r.alvo; }   // prédio com cômodos (escola, posto de saúde)
  else {
    g.userData.ancoras = M.ancoras(o.interior?.(gi, { w: o0.w, d: o0.d, h: o0.h, n }) || {}); M.objetos(gi);   // desenhado no tamanho antigo, espalhado no novo
    usarAssentos(g.userData.ancoras, assentosDe(gi), -d / 2);
    if (foco) { const grande = Math.max(w, d) > 26; luzInterna(gi, 0, -d / 2, h, n, (o.luz || 1) * (grande ? 1.1 : 1.25), Math.max(30, Math.max(w, d) * 1.3));
      if (grande) luzInterna(gi, 0, -d * (w > d ? 0.5 : 0.22), h, n, 0.8, Math.max(w, d)); }
  }
  g.userData.d = d; g.userData.w = w; g.userData.h = h; return g;
}

/**
 * Prédio com vários cômodos (como a casa do protagonista): paredes internas com portas, piso por cômodo,
 * móveis marcados com o cômodo onde estão. Na cena de um cômodo, os móveis dos cômodos que ficam na frente dele
 * (entre ele e a câmera) somem, e as âncoras/assentos são só os do cômodo.
 * o.comodos = { nome: { r: [[x0, x1, z0, z1], ...] (z0 > z1), ponto: [x, z], piso } } · o.paredes = [{ z | x, de, ate, vaos: [{ em, w, porta, aberto, y1, placa: [texto, lado] }] }]
 * o.mobilia({ por, solto, n }) -> { nome_do_comodo: { âncoras } }
 */
function montarComodos(gi, o, ctx) {
  const { n, unidades, portas, h } = ctx, C = o.comodos;
  const alvo = ctx.foco ? (C[ctx.comodo] ? ctx.comodo : o.comodo_padrao) : null;
  const em = (x, z, [x0, x1, z0, z1]) => x >= x0 - 0.01 && x <= x1 + 0.01 && z <= z0 + 0.01 && z >= z1 - 0.01;
  const qual = (x, z) => Object.keys(C).find(k => C[k].r.some(r => em(x, z, r))) || null;
  const fundoDe = (k) => Math.min(...C[k].r.map(r => r[3]));
  let frente = Infinity;
  if (alvo) { const [px, pz] = C[alvo].ponto; frente = (C[alvo].r.find(r => em(px, pz, r)) || C[alvo].r[0])[2]; }
  const esconder = (k) => !!(alvo && k && k !== alvo && fundoDe(k) >= frente - 0.01);   // cômodo inteiro na frente do cômodo da cena
  const VAZADOS = new Set(['cela']);   // grades: dá para ver através, então nunca entram no corte
  const marcar = (p, k, tipo) => { p.userData.movel = true; p.userData.comodo = k; if (!VAZADOS.has(tipo)) unidade(p, unidades); if (esconder(k)) p.userData.oculto = true; return p; };
  // pisos de cada cômodo
  for (const c of Object.values(C)) if (c.piso) for (const [x0, x1, z0, z1] of c.r) gi.add(caixa(x1 - x0, 0.02, z0 - z1, c.piso, { pos: [(x0 + x1) / 2, 0.21, (z0 + z1) / 2], sombra: false }));
  // paredes internas (ao longo de X com `z:`, ao longo de Z com `x:`)
  for (const pw of o.paredes || []) {
    const len = Math.abs(pw.ate - pw.de), meio = (pw.de + pw.ate) / 2, emX = pw.z !== undefined, loc = (v) => emX ? v - meio : meio - v;
    const vaos = (pw.vaos || []).map(v => ({ x: loc(v.em), w: v.w + (v.porta ? 0.2 : 0), y0: 0, y1: v.aberto ? h + 1 : v.y1 || 6.3 }));
    const pa = parede(len, h, o.parede_interna || '#f4ecd8', vaos, n, 0.25);
    for (const v of pw.vaos || []) {
      if (v.porta) { const p = porta(v.w, 6.2, o.cor_porta || '#e9e6dc', false, portas); p.position.set(loc(v.em) - v.w / 2, 0.2, 0); pa.add(p); }
      if (v.placa) { const [t, lado] = v.placa, pl = placaTexto(t, Math.max(2.4, t.length * 0.32), 0.8, { fundo: o.cor_placa || '#1d3b72', corTexto: '#ffffff' });
        pl.position.set(loc(v.em), (v.y1 || 6.3) + 0.7, lado * 0.15); if (lado < 0) pl.rotation.y = Math.PI; pa.add(pl); }
    }
    if (emX) pa.position.set(meio, 0, pw.z); else { pa.rotation.y = Math.PI / 2; pa.position.set(pw.x, 0, meio); }
    gi.add(unidade(pa, unidades));
  }
  // móveis
  const por = (tipo, op, pos, vira = 0, esc) => { const p = PROPS[tipo](op); p.position.set(...pos); p.rotation.y = vira * RAD; if (esc) p.scale.setScalar(esc); gi.add(p); return marcar(p, qual(pos[0], pos[2]), tipo); };
  const solto = (obj) => { gi.add(obj); return marcar(obj, qual(obj.position.x, obj.position.z)); };
  const todas = o.mobilia({ por, solto, n }) || {};
  if (!alvo) return { ancoras: {}, alvo };
  const anc = { ...(todas[alvo] || {}) }, [px, pz] = C[alvo].ponto;
  const assentos = assentosDe(gi).filter(([x, , z]) => qual(x, z) === alvo);
  if (assentos.length) { anc.sentar ??= [px, 0.2, pz, 0]; usarAssentos(anc, assentos, pz); }
  luzInterna(gi, px, pz, h, n, o.luz || 1.2, 34);
  for (const [lx, lz, f] of C[alvo].luzes || []) luzInterna(gi, lx, lz, h, n, f ?? 0.7, 30);
  return { ancoras: anc, alvo };
}

// ---------------- prédios do mundo (interiores compactos, coordenadas locais do prédio) ----------------
const PREDIOS_MUNDO = {
  farmacia: { tam: [18, 18, 10], w: 12, d: 12, h: 7, cor: '#f4f6f4', faixa: '#16a05d', piso: '#e8ece8', letreiro: { texto: 'FARMÁCIA', fundo: '#16a05d' }, porta: { x: -3, w: 2.6, vidro: true }, vitrines: [{ x: 2.5, w: 5 }],
    janelas: { dir: [-6] },
    interior(gi) { por(gi, 'prateleira', { largura: 10.5, altura: 6, cores: ['#ffffff', '#e53935', '#1e88e5', '#43a047', '#fdd835'] }, [0, 0.2, -11]);
      por(gi, 'balcao', { largura: 7, cor: '#16a05d', tampo: '#f2f3f3' }, [0, 0.2, -7]); por(gi, 'caixa_registradora', {}, [2, 3.4, -7], 180);
      por(gi, 'prateleira', { largura: 4, altura: 5 }, [-5.3, 0.2, -3.5], 90);
      por(gi, 'gondola', { largura: 3, seed: 4 }, [2.6, 0.2, -3.6], 0); por(gi, 'prateleira', { largura: 3.2, altura: 5, seed: 9 }, [5.4, 0.2, -2.4], -90);
      por(gi, 'placa_suspensa', { texto: 'CAIXA', cor: '#16a05d', largura: 2 }, [2, 5.6, -7]); por(gi, 'relogio_parede', {}, [-5.75, 6.0, -8.5], 90); por(gi, 'ventilador_teto', {}, [-2.5, 7.2, -3.5]);
      por(gi, 'extintor', {}, [-5.5, 0.2, -0.8], 90); por(gi, 'lixeira', { cor: '#9aa0aa' }, [4.7, 0.2, -5.6], 0, 0.7); por(gi, 'planta', {}, [5, 0.2, -9.8]); por(gi, 'tapete', { largura: 2.6, prof: 1.4, cor: '#5a5d66' }, [-3, 0.2, -1.1]);
      por(gi, 'pilha_caixas', { n: 2, seed: 5 }, [-4.6, 0.2, -10.0]);
      return { atender: [0, 0.2, -8.8, 0], fila: { inicio: [0, -5.4], vira: 180, cresce: [-0.5, 1] } }; } },
  loterica: { tam: [16, 16, 9.5], w: 10, d: 11, h: 6.5, cor: '#1d4fa0', faixa: '#f39c12', piso: '#cfd6e4', letreiro: { texto: 'LOTÉRICA', fundo: '#f5b800', cor: '#1d3b72' }, porta: { x: 0, w: 2.8, vidro: true }, vitrines: [{ x: -3.3, w: 2.2 }, { x: 3.3, w: 2.2 }],
    interior(gi) { for (const [i, x] of [-2.4, 2.4].entries()) por(gi, 'guiche', { largura: 4.4, cor: '#1d4fa0', numero: i + 1 }, [x, 0.2, -7]);
      const m = PROPS.mural({ texto: 'PRÊMIO R$ 50 MI', largura: 5, altura: 1.6, cor: '#1d3b72', cor_texto: '#ffd23f' }); m.position.set(0, 5.3, -10.6); gi.add(m);
      por(gi, 'balcao', { largura: 3, cor: '#f5b800', tampo: '#f2f3f3' }, [-4.0, 0.2, -2.2], 90); por(gi, 'cadeiras_espera', { n: 2, cor: '#f5b800' }, [4.2, 0.2, -3.0], -90);
      for (const [t, c, z] of [['MEGA', '#16a05d', -2.2], ['QUINA', '#8e24aa', -4.4]]) por(gi, 'poster', { texto: t, cor: c, cor_texto: '#ffffff' }, [4.85, 4.7, z], -90, 0.6);
      por(gi, 'relogio_parede', {}, [-4.75, 5.0, -9], 90); por(gi, 'ventilador_teto', {}, [0, 6.7, -3]); por(gi, 'lixeira', { cor: '#1d4fa0' }, [4.0, 0.2, -5.6], 0, 0.7);
      por(gi, 'arquivo', {}, [-3.8, 0.2, -10.0], 0); por(gi, 'pilha_caixas', { n: 2, seed: 2 }, [3.6, 0.2, -10.0]); por(gi, 'tapete', { largura: 2.8, prof: 1.4, cor: '#1d3b72' }, [0, 0.2, -1.1]);
      return { atender: [-2.4, 0.2, -8.7, 0], fila: { inicio: [-2.4, -4.9], vira: 180, cresce: [0.35, 1] } }; } },
  padaria: { tam: [18, 18, 10], w: 12, d: 12, h: 7, cor: '#f3d9a4', faixa: '#8a4a1f', piso: '#b98b5e', letreiro: { texto: 'PADARIA', fundo: '#8a4a1f', cor: '#ffe9b0' }, porta: { x: -3, w: 2.6, vidro: true }, vitrines: [{ x: 2.6, w: 5 }],
    interior(gi) { por(gi, 'estufa_paes', { largura: 6 }, [-1.5, 0.2, -7]); por(gi, 'balcao', { largura: 3.5, cor: '#8a4a1f' }, [3.8, 0.2, -7]); por(gi, 'caixa_registradora', {}, [3.8, 3.4, -7], 180);
      por(gi, 'prateleira', { largura: 10, altura: 6, cores: ['#d9a25a', '#b87a35', '#f2d6a0', '#8a4a1f'] }, [0, 0.2, -11]);
      por(gi, 'mesa', { largura: 2.6, cor: '#f2f3f3' }, [3.5, 0.2, -2.6], 0); por(gi, 'cadeira_plastico', {}, [1.3, 0.2, -2.6], 90);
      por(gi, 'geladeira_vitrine', { largura: 3 }, [-5.0, 0.2, -2.6], 90); por(gi, 'mural', { texto: 'CAFÉ R$ 3 · PÃO R$ 0,80', largura: 3.6, altura: 1.8, cor: '#3a2a1a', cor_texto: '#ffe9b0' }, [-5.75, 4.6, -5.6], 90);
      por(gi, 'pilha_caixas', { n: 3, cor: '#efe6d0', seed: 7 }, [-4.8, 0.2, -9.8]); por(gi, 'fogao', {}, [-2, 0.2, -9.6], 180); por(gi, 'relogio_parede', {}, [5.75, 5.6, -9], -90);
      por(gi, 'ventilador_teto', {}, [2.5, 7.2, -3.5]); por(gi, 'lixeira', { cor: '#8a4a1f' }, [5.3, 0.2, -1.0], 0, 0.7); por(gi, 'planta', {}, [-5.2, 0.2, -0.9]);
      por(gi, 'placa_suspensa', { texto: 'PÃES', cor: '#8a4a1f', cor_texto: '#ffe9b0', largura: 2 }, [-1.5, 5.6, -7]);
      return { atender: [3.8, 0.2, -8.7, 0], fila: { inicio: [3.8, -5.2], vira: 180, cresce: [-0.6, 1] }, sentar: [1.3, 0.2, -2.6, 90] }; } },
  mercado: { tam: [26, 24, 11], w: 16, d: 16, h: 7.5, cor: '#f2f3f3', faixa: '#c4281c', piso: '#dfe2e6', letreiro: { texto: 'MERCADO', fundo: '#c4281c' }, porta: { x: -5, w: 3.2, vidro: true }, vitrines: [{ x: 2.5, w: 8 }],
    janelas: { esq: [-8] },
    interior(gi) { for (const x of [-3.5, 3.5]) por(gi, 'gondola', { largura: 8, seed: x }, [x, 0.2, -10], 90);
      por(gi, 'geladeira_vitrine', { largura: 12 }, [0, 0.2, -15]); por(gi, 'balcao', { largura: 3.5, cor: '#c4281c' }, [5, 0.2, -3], 90); por(gi, 'caixa_registradora', {}, [5, 3.4, -3.4], 90);
      por(gi, 'carrinho_compras', {}, [-7, 0.2, -1.6], 20);
      por(gi, 'prateleira', { largura: 4, altura: 6, seed: 12 }, [-7.3, 0.2, -12], 90); por(gi, 'banca_frutas', { largura: 3 }, [-6.9, 0.2, -5.2], 90); por(gi, 'banca_frutas', { largura: 3, seed: 2 }, [0, 0.2, -4.2], 0);
      por(gi, 'pilha_caixas', { n: 3, seed: 9 }, [6.8, 0.2, -14.3]); por(gi, 'pilha_caixas', { n: 2, seed: 4 }, [-6.8, 0.2, -14.3]);
      for (const [t, x, z, c] of [['HORTIFRUTI', -4.5, -5.2, '#43a047'], ['BEBIDAS', 0, -14, '#1e88e5'], ['CAIXA', 5, -3, '#c4281c']]) por(gi, 'placa_suspensa', { texto: t, cor: c, largura: 3 }, [x, 6.2, z]);
      por(gi, 'extintor', {}, [7.4, 0.2, -0.8], -90); por(gi, 'ventilador_teto', {}, [-4, 7.7, -9]); por(gi, 'ventilador_teto', {}, [4, 7.7, -6]); por(gi, 'lixeira', { cor: '#c4281c' }, [3.4, 0.2, -0.9], 0, 0.7);
      return { atender: [6.6, 0.2, -3, -90], fila: { inicio: [3.4, -3.0], vira: 90, cresce: [-1, 0.3] } }; } },
  banco: { tam: [18, 18, 11], w: 12, d: 12, h: 8, cor: '#b8bcc6', piso: '#b8bcc6', letreiro: { texto: 'BANCO', fundo: '#1d3b72', largura: 6 }, porta: { x: 0, w: 3, vidro: true }, vitrines: [{ x: -4, w: 2.4 }, { x: 4, w: 2.4 }],
    interior(gi) { for (const [i, x] of [-2.6, 2.6].entries()) por(gi, 'guiche', { largura: 4.6, cor: '#8c909a', numero: i + 1 }, [x, 0.2, -7.5]);
      const atm = grupo([caixa(1.4, 3.4, 1.2, '#5a5d66', { pos: [0, 1.7, 0] }), plano(0.9, 0.7, mat('#5fb0ff', { emissive: '#3a8fd8', emissiveIntensity: 0.9 }), { pos: [0, 2.7, 0.61] })]);
      atm.position.set(-5.2, 0.2, -3); atm.rotation.y = Math.PI / 2; gi.add(atm); por(gi, 'fila_cordao', { n: 2 }, [-1.5, 0.2, -4]);
      por(gi, 'cadeiras_espera', { n: 3, cor: '#1d3b72' }, [5.0, 0.2, -3.5], -90); por(gi, 'planta', {}, [5.2, 0.2, -0.9]); por(gi, 'planta', {}, [-5.2, 0.2, -5.2]);
      por(gi, 'extintor', {}, [-5.6, 0.2, -0.6], 90); por(gi, 'lixeira', { cor: '#5a5d66' }, [-3.6, 0.2, -1.0], 0, 0.7); por(gi, 'relogio_parede', {}, [5.75, 6.4, -6.5], -90);
      por(gi, 'arquivo', {}, [-4.8, 0.2, -10.6], 0); por(gi, 'cofre', {}, [4.4, 0.2, -10.6]); por(gi, 'mesa_trabalho', {}, [0, 0.2, -10.4], 0);
      por(gi, 'mural', { texto: 'ABRA SUA CONTA', largura: 3.4, altura: 1.6, cor: '#1d3b72', cor_texto: '#ffd23f' }, [-5.75, 5.2, -4.2], 90);
      return { atender: [-2.6, 0.2, -9.2, 0], fila: { inicio: [-2.6, -5.4], vira: 180, cresce: [0.4, 1] } }; } },
  prefeitura: { tam: [32, 22, 12], w: 22, d: 14, h: 9, cor: '#f4f1ea', faixa: '#1d3b72', piso: '#9b7b5a', letreiro: { texto: 'PREFEITURA MUNICIPAL', fundo: '#f4f1ea', cor: '#1d3b72', largura: 14 },
    porta: { x: 0, w: 3.2, cor: '#5a3a22' }, vitrines: [{ x: -7, w: 3 }, { x: 7, w: 3 }], janelas: { fundo: [-7] },
    interior(gi) { gi.add(caixa(4, 0.05, 12, '#7b1f2b', { pos: [0, 0.23, -7], sombra: false }));
      por(gi, 'balcao', { largura: 6, cor: '#5a3a22', tampo: '#c9a24a' }, [-5, 0.2, -6]);
      const q = PROPS.quadro_parede({ texto: 'PREFEITO', cor: '#1d3b72' }); q.position.set(6, 6, -13.6); gi.add(q);
      por(gi, 'mesa_escritorio', {}, [6, 0.2, -10.2], 180); por(gi, 'poltrona', {}, [6, 0.2, -12.6], 0); por(gi, 'bandeira', {}, [2.5, 0.2, -12.8], 0, 0.6); por(gi, 'bandeira', { cores: ['#fff', '#c4281c', '#fff'] }, [9.5, 0.2, -12.8], 0, 0.6);
      por(gi, 'cadeiras_espera', { n: 3, cor: '#7b1f2b' }, [-8.5, 0.2, -2.5], 90);
      por(gi, 'estante', {}, [-10.4, 0.2, -6.4], 90); por(gi, 'arquivo', {}, [-10.0, 0.2, -10.4], 90); por(gi, 'arquivo', {}, [-10.0, 0.2, -12.5], 90);
      for (const x of [4.8, 7.2]) por(gi, 'cadeira', { cor: '#7b1f2b' }, [x, 0.2, -8.0], 180);
      por(gi, 'planta', {}, [10.2, 0.2, -1.0]); por(gi, 'planta', {}, [10.2, 0.2, -9.0]); por(gi, 'planta', {}, [-2.6, 0.2, -13.0]); por(gi, 'relogio_parede', {}, [0, 7.4, -13.75]);
      por(gi, 'mural', { texto: 'COMUNICADOS', largura: 4, altura: 2.4 }, [-5, 5.2, -13.75]); por(gi, 'placa_suspensa', { texto: 'GABINETE DO PREFEITO', largura: 5 }, [6, 7.6, -7.0]);
      por(gi, 'placa_suspensa', { texto: 'PROTOCOLO', largura: 3 }, [-5, 7.6, -6]); por(gi, 'lixeira', { cor: '#5a5d66' }, [3.0, 0.2, -10.6], 0, 0.7);
      por(gi, 'ventilador_teto', {}, [-5, 9.2, -9]); por(gi, 'ventilador_teto', {}, [6, 9.2, -4]); por(gi, 'computador', {}, [-6.3, 1.2, -6.2], 180);
      return { atender: [-5, 0.2, -7.7, 0], sentar: [6, 0.2, -12.3, 0], assinar: [6, 0.2, -12.0, 0], discursar: [0, 0.2, 2.5, 0] }; } },
  igreja: { tam: [20, 32, 15], w: 14, d: 26, h: 11, cor: '#f6f2e6', piso: '#b5895a', telhado: '#b5533a', porta: { x: 0, w: 3.4, cor: '#6b4426' }, janelas: { esq: [-6, -12, -18], dir: [-6, -12, -18] },
    interior(gi, { d }) { gi.add(caixa(3, 0.05, d - 2, '#7b1f2b', { pos: [0, 0.23, -d / 2], sombra: false }));
      for (let z = -18; z <= -4; z += 3) for (const s of [-1, 1]) por(gi, 'banco_igreja', { largura: 4.4 }, [s * 3.6, 0.2, z]);
      por(gi, 'altar', {}, [0, 0.2, -23], 0); const cr = PROPS.cruz_parede({ cor: '#c9a24a' }); cr.position.set(0, 7.5, -25.6); gi.add(cr);
      for (const x of [-4.5, 4.5]) por(gi, 'vitral', {}, [x, 6.5, -25.7]); for (const x of [-4.2, 4.2]) por(gi, 'castical', {}, [x, 0.2, -20.2]);
      for (const x of [-3.3, 3.3]) por(gi, 'vaso_flor', { cor: '#ffffff' }, [x, 1.16, -21.2]); por(gi, 'balcao', { largura: 1.6, cor: '#7a4a2a', tampo: '#c9a24a' }, [-5.4, 0.2, -19.6], 30);
      for (const x of [-2.6, 2.6]) gi.add(grupo([cilindro(0.12, 0.2, 2.8, '#d8d4cc', { pos: [x, 1.6, -1.6] }), cilindro(0.55, 0.35, 0.35, '#e9e6dc', { pos: [x, 3.1, -1.6], seg: 14 })]));   // pias de água benta
      for (const z of [-9, -15]) for (const s of [-1, 1]) por(gi, 'castical', {}, [s * 6.4, 0.2, z], 0, 0.8);
      return { rezar: [-3.6, 0.2, -6.6, 0], sentar: [-3.6, 0.2, -6.6, 0], atender: [0, 1.2, -21.6, 0] }; } },
  // ESCOLA (vários cômodos): entrada -> hall/corredor; diretoria e cantina na frente; sala de aula e biblioteca no fundo
  escola: { tam: [30, 40, 10], w: 30, d: 40, h: 10, cor: '#f5e6b8', faixa: '#1e6fd9', piso: '#c9c2b3', letreiro: { texto: 'ESCOLA MUNICIPAL', fundo: '#1e6fd9', largura: 12 },
    porta: { x: -1, w: 3.0, cor: '#7a4b2a' }, vitrines: [{ x: -9.5, w: 3.5 }, { x: 8.5, w: 4 }], janelas: { esq: [-6, -31.5], dir: [-6, -31.5] },
    parede_interna: '#f7efd8', cor_placa: '#1e6fd9', comodo_padrao: 'sala_aula',
    comodos: {
      diretoria: { r: [[-15, -4, 0, -16]], ponto: [-9.5, -5.5], piso: '#9b7b5a' },
      cantina: { r: [[2, 15, 0, -16]], ponto: [8.6, -10.0], piso: '#e3ddd0', luzes: [[8.6, -3, 0.6]] },
      corredor: { r: [[-4, 2, 0, -16], [-15, 15, -16, -23]], ponto: [-1, -19.5], piso: '#c9c2b3' },
      sala_aula: { r: [[-15, 3, -23, -40]], ponto: [-6, -34.5], piso: '#b99a72' },
      biblioteca: { r: [[3, 15, -23, -40]], ponto: [9, -28.5], piso: '#a8805a' },
    },
    paredes: [
      { z: -16, de: -15, ate: 15, vaos: [{ em: -6.5, w: 2.4, porta: true, placa: ['DIRETORIA', -1] }, { em: -1, w: 6, aberto: true }, { em: 13, w: 3, placa: ['CANTINA', -1] }] },
      { x: -4, de: 0, ate: -16 }, { x: 2, de: 0, ate: -16 },
      { z: -23, de: -15, ate: 15, vaos: [{ em: -6, w: 2.4, porta: true, placa: ['SALA 1', 1] }, { em: 9, w: 2.4, porta: true, placa: ['BIBLIOTECA', 1] }] },
      { x: 3, de: -23, ate: -40 },
    ],
    mobilia({ por, solto }) {
      // hall e corredor: armários, bebedouro, avisos
      por('mural', { texto: 'BEM-VINDOS!', largura: 4, altura: 1.8, cor: '#fdd835', cor_texto: '#1d3b72' }, [-3.8, 5.4, -8], 90); por('planta', {}, [1.2, 0.2, -1.2]); por('extintor', {}, [-3.6, 0.2, -1.2], 90);
      por('mural', { texto: 'NOSSOS CAMPEÕES', largura: 3.6, altura: 1.6, cor: '#1e6fd9', cor_texto: '#ffffff' }, [1.8, 5.4, -8], -90);
      por('armario_escolar', { n: 5 }, [-11, 0.2, -22.2]); por('armario_escolar', { n: 4, cor: ['#2e9d4a', '#f5b800'] }, [0.5, 0.2, -22.2]); por('armario_escolar', { n: 3, cor: '#c4281c' }, [12.8, 0.2, -22.2]);
      por('bebedouro', {}, [5.4, 0.2, -22.3]); por('mural', { texto: 'FEIRA DE CIÊNCIAS SEXTA!', largura: 5, altura: 1.5, cor: '#ffffff', cor_texto: '#c4281c' }, [0.5, 7.6, -22.8]);
      por('lixeira', { cor: '#1e6fd9' }, [-14.2, 0.2, -17.0], 0, 0.7); por('relogio_parede', {}, [-14.55, 7.0, -19.5], 90);
      // diretoria
      por('mesa_escritorio', {}, [-9.5, 0.2, -11.5], 180); por('poltrona', { cor: '#1d3b72' }, [-9.5, 0.2, -13.8]); por('computador', {}, [-11.3, 0.35, -12.1], 180);
      for (const x of [-10.8, -8.2]) por('cadeira', { cor: '#7c5c46' }, [x, 0.2, -8.8], 180);
      por('bandeira', {}, [-13.6, 0.2, -15.0], 0, 0.55); por('bandeira', { cores: ['#fff', '#1e6fd9', '#fff'] }, [-5.4, 0.2, -15.0], 0, 0.55);
      por('quadro_parede', { texto: 'DIRETORIA', cor: '#1e6fd9' }, [-9.5, 6.6, -15.7]); por('arquivo', {}, [-13.7, 0.2, -3.0], 90); por('estante', {}, [-14.1, 0.2, -10.0], 90);
      por('sofa', { cor: '#7b1f2b' }, [-5.3, 0.2, -8.0], -90); por('tapete', { cor: '#1d3b72', cor2: '#2e5fa8', largura: 5, prof: 4 }, [-9.5, 0.2, -6.0]);
      por('relogio_parede', {}, [-4.15, 7.0, -13.5], -90); por('planta', {}, [-5.2, 0.2, -14.6]);
      // cantina
      por('estufa_paes', { largura: 7 }, [7.5, 0.2, -13.6]); por('placa_suspensa', { texto: 'CANTINA', cor: '#e8862f', largura: 3 }, [7.5, 7.6, -13.6]);
      por('mural', { texto: 'HOJE: PÃO DE QUEIJO · SUCO · FRUTA', largura: 6, altura: 1.6, cor: '#3a2a1a', cor_texto: '#ffe9b0' }, [7.5, 6.0, -15.75]);
      por('geladeira_vitrine', { largura: 3 }, [3.05, 0.2, -11.0], 90);
      por('mesa_refeitorio', { largura: 6, seed: 3 }, [5.5, 0.2, -4.8], 90); por('mesa_refeitorio', { largura: 6, seed: 8 }, [11.8, 0.2, -4.8], 90);
      por('poster', { texto: 'COMA FRUTAS!', cor: '#43a047', cor_texto: '#ffffff' }, [14.55, 5.2, -10.5], -90, 0.6); por('lixeira', { cor: '#e8862f' }, [14.0, 0.2, -14.6], 0, 0.7);
      por('ventilador_teto', {}, [8.6, 10.2, -4]); por('ventilador_teto', {}, [8.6, 10.2, -11]);
      // sala de aula
      por('quadro_negro', { largura: 9, texto: '2 + 2 = 4' }, [-6, 5.0, -39.45]); por('relogio_parede', {}, [-6, 8.2, -39.5]);
      por('mesa', { largura: 4, cor: '#7c5c46' }, [-11.5, 0.2, -36.0]); por('cadeira', { cor: '#7c5c46' }, [-11.5, 0.2, -37.7]); por('globo', {}, [-12.8, 2.45, -36.0]);
      solto(grupo([caixa(1.2, 0.3, 0.9, '#c4281c', { pos: [-10.6, 2.6, -35.8] }), caixa(1.1, 0.3, 0.85, '#1e6fd9', { pos: [-10.6, 2.9, -35.8] })]));   // livros na mesa
      for (const z of [-30.5, -26.0]) for (const x of [-12, -8, -4, 0]) { por('carteira', {}, [x, 0.2, z]); por('cadeira', { cor: '#2a5bd7' }, [x, 0.2, z + 1.5], 180); }
      por('mural', { texto: 'A B C D E', largura: 3, altura: 1.6, cor: '#ffffff', cor_texto: '#e53935' }, [-14.55, 5.6, -27.5], 90);
      por('mural', { texto: 'MAPA DO BRASIL', largura: 4, altura: 2.6, cor: '#43a047', cor_texto: '#ffd23f' }, [2.75, 5.2, -31], -90);
      por('estante_livros', { largura: 3, altura: 5, seed: 2 }, [1.2, 0.2, -39.1]); por('lixeira', { cor: '#1e6fd9' }, [-14.0, 0.2, -38.8], 0, 0.7);
      por('ventilador_teto', {}, [-10, 10.2, -31]); por('ventilador_teto', {}, [-2, 10.2, -31]);
      // biblioteca
      por('estante_livros', { largura: 5, seed: 7 }, [6.0, 0.2, -39.1]); por('estante_livros', { largura: 5, seed: 11 }, [11.6, 0.2, -39.1]); por('estante_livros', { largura: 4.5, seed: 4 }, [3.75, 0.2, -34], 90);
      por('placa_suspensa', { texto: 'SILÊNCIO', cor: '#6b32a8', largura: 3 }, [9, 7.8, -37.5]);
      por('mesa', { largura: 5, cor: '#8a5a33' }, [9.5, 0.2, -33.5]); for (const x of [8.2, 10.8]) por('cadeira', { cor: '#6b32a8' }, [x, 0.2, -35.2]); por('cadeira', { cor: '#6b32a8' }, [6.0, 0.2, -33.5], 90); por('cadeira', { cor: '#6b32a8' }, [13.0, 0.2, -33.5], -90);
      solto(grupo([caixa(1.0, 0.25, 0.8, '#43a047', { pos: [8.4, 2.55, -33.4], rot: [0, 15, 0] }), caixa(1.0, 0.25, 0.8, '#e8862f', { pos: [8.5, 2.8, -33.4], rot: [0, -8, 0] })]));
      por('poltrona', { cor: '#c4281c' }, [13.3, 0.2, -26.3], -120); por('luminaria', {}, [14.0, 0.2, -24.2]); por('tapete', { cor: '#6b32a8', cor2: '#8e5bd0', largura: 5, prof: 3.5 }, [9, 0.2, -28.5]);
      por('poster', { texto: 'LEIA!', cor: '#e8862f', cor_texto: '#ffffff' }, [14.55, 5.5, -36], -90, 0.7); por('planta', {}, [4.0, 0.2, -24.0]);
      return {
        diretoria: { sentar: [-9.5, 0.2, -13.5, 0], assinar: [-9.5, 0.2, -13.5, 0] },
        cantina: { atender: [7.5, 0.2, -15.0, 0], fila: { inicio: [7.5, -11.8], vira: 180, cresce: [0.2, 1] }, sentar: [7.4, 0.2, -4.8, 0] },
        sala_aula: { falar: [-6, 0.2, -36.5, 0], sentar: [-4, 0.2, -27.5, 180] },
        biblioteca: { sentar: [9.5, 0.2, -35.0, 0] },
      }; } },
  // POSTO DE SAÚDE (vários cômodos): recepção na frente, corredor no meio (consultório à esquerda, exames à direita), enfermaria no fundo
  posto_saude: { tam: [24, 40, 10], w: 24, d: 40, h: 10, cor: '#ffffff', faixa: '#1e88e5', piso: '#d6e2ea', letreiro: { texto: 'POSTO DE SAÚDE', fundo: '#1e88e5' },
    porta: { x: 0, w: 3.0, vidro: true }, vitrines: [{ x: -7, w: 3.5 }, { x: 7, w: 3.5 }], janelas: { esq: [-18.5, -34], dir: [-18.5, -34], fundo: [-4, 4] },
    parede_interna: '#eef4f7', cor_porta: '#cfe3ee', cor_placa: '#1e88e5', comodo_padrao: 'recepcao',
    comodos: {
      recepcao: { r: [[-12, 12, 0, -12]], ponto: [0, -5], piso: '#d6e2ea' },
      corredor: { r: [[-3, 3, -12, -28]], ponto: [0, -18.5], piso: '#e6edf1' },
      consultorio: { r: [[-12, -3, -12, -28]], ponto: [-7.5, -20.8], piso: '#dfe9ef' },
      sala_exames: { r: [[3, 12, -12, -28]], ponto: [7.4, -20.0], piso: '#dfe9ef' },
      enfermaria: { r: [[-12, 12, -28, -40]], ponto: [0, -31.2], piso: '#e3ecf0' },
    },
    paredes: [
      { z: -12, de: -12, ate: 12, vaos: [{ em: 0, w: 6, aberto: true }] },
      { x: -3, de: -12, ate: -28, vaos: [{ em: -23.5, w: 2.4, porta: true, placa: ['CONSULTÓRIO', 1] }] },
      { x: 3, de: -12, ate: -28, vaos: [{ em: -23.5, w: 2.4, porta: true, placa: ['EXAMES', -1] }] },
      { z: -28, de: -12, ate: 12, vaos: [{ em: 0, w: 4, y1: 8.4, placa: ['ENFERMARIA', 1] }] },
    ],
    mobilia({ por, solto }) {
      const cruz = (pos) => { const c = grupo([caixa(0.5, 1.5, 0.2, '#e53935'), caixa(1.5, 0.5, 0.2, '#e53935')]); c.position.set(...pos); return solto(c); };
      // recepção
      por('balcao', { largura: 6, cor: '#1e88e5', tampo: '#f2f3f3' }, [-6.5, 0.2, -8.2]); por('computador', {}, [-7.6, 1.2, -8.4], 180); por('placa_suspensa', { texto: 'RECEPÇÃO', cor: '#1e88e5', largura: 3 }, [-6.5, 7.8, -8.2]);
      cruz([-10, 6.4, -11.7]); por('mural', { texto: 'SENHA 042', largura: 3, altura: 1.2, cor: '#111111', cor_texto: '#ff3b3b' }, [7.5, 6.6, -11.75]);
      por('cadeiras_espera', { n: 3 }, [7.5, 0.2, -10.8]); por('cadeiras_espera', { n: 3 }, [10.8, 0.2, -5.0], -90);
      por('bebedouro', {}, [-11.0, 0.2, -2.2], 90); por('mural', { texto: 'VACINE-SE!', largura: 3.4, altura: 2, cor: '#ffffff', cor_texto: '#e53935' }, [-11.55, 5.0, -5.0], 90);
      por('relogio_parede', {}, [-11.55, 6.5, -9.0], 90); por('poster', { texto: 'DENGUE NÃO!', cor: '#e53935', cor_texto: '#ffffff' }, [11.55, 5.5, -9.6], -90, 0.7);
      por('planta', {}, [-11.0, 0.2, -11.0]); por('lixeira', { cor: '#9aa0aa' }, [11.0, 0.2, -1.0], 0, 0.7); por('extintor', {}, [3.8, 0.2, -11.6]); por('cadeira_rodas', {}, [-3.8, 0.2, -2.0], 30);
      por('ventilador_teto', {}, [-6, 10.2, -5]); por('ventilador_teto', {}, [6, 10.2, -5]);
      // corredor
      por('cadeiras_espera', { n: 2, cor: '#5a9fd8' }, [-2.0, 0.2, -16.5], 90); por('cadeira_rodas', {}, [2.0, 0.2, -16.0], -90); por('extintor', {}, [-2.7, 0.2, -27.0], 90);
      por('mural', { texto: 'LAVE AS MÃOS', largura: 3, altura: 1.4, cor: '#ffffff', cor_texto: '#1e88e5' }, [2.75, 5.0, -19.5], -90); por('lixeira', { cor: '#9aa0aa' }, [2.4, 0.2, -27.0], 0, 0.7);
      // consultório: mesa do médico de lado (médico e paciente de perfil), maca encostada no fundo
      por('mesa_trabalho', { largura: 4, cor: '#f2f3f3' }, [-9.0, 0.2, -15.6], 90); por('cadeira', { cor: '#1e88e5' }, [-11.0, 0.2, -15.6], 90); por('cadeira', { cor: '#9aa0aa' }, [-6.6, 0.2, -15.6], -90);
      por('maca', {}, [-7.5, 0.2, -26.2], 90); por('suporte_soro', {}, [-11.2, 0.2, -24.0]); por('pia_banheiro', {}, [-3.9, 0.2, -19.0], -90);
      por('prateleira', { largura: 3, altura: 5, cores: ['#ffffff', '#1e88e5', '#e53935', '#f2f3f3'], seed: 6 }, [-11.4, 0.2, -21.6], 90);
      por('quadro_parede', { texto: 'CRM', cor: '#1d3b72' }, [-7.5, 6.4, -27.75], 0, 0.6); por('relogio_parede', {}, [-11.55, 7.0, -15.6], 90); por('lixeira', { cor: '#9aa0aa' }, [-4.0, 0.2, -13.0], 0, 0.7);
      por('poster', { texto: 'SAÚDE EM DIA', cor: '#1e88e5', cor_texto: '#ffffff' }, [-5.0, 5.2, -27.75], 0, 0.6);
      // sala de exames: maca no fundo com monitor e soro, raio-x e balança na parede da direita
      por('maca', {}, [8.0, 0.2, -26.0], 90); por('monitor_cardiaco', {}, [4.4, 0.2, -27.0]); por('suporte_soro', {}, [4.2, 0.2, -23.8]);
      por('negatoscopio', {}, [11.55, 5.5, -14.5], -90); por('balanca', {}, [10.8, 0.2, -13.4], -90);
      por('cadeira', { cor: '#1e88e5' }, [4.6, 0.2, -15.0], 90); cruz([8.0, 7.4, -27.75]); por('lixeira', { cor: '#9aa0aa' }, [4.0, 0.2, -12.8], 0, 0.7);
      // enfermaria com leitos
      for (const [x, cor] of [[-8, '#7fb8d8'], [0, '#8fd0a8'], [8, '#f2b8c6']]) por('leito', { cor }, [x, 0.2, -36.2]);
      por('criado_mudo', {}, [-5.4, 0.2, -38.9]); por('criado_mudo', {}, [2.6, 0.2, -38.9]); por('criado_mudo', {}, [10.6, 0.2, -38.9]);
      por('suporte_soro', {}, [-10.6, 0.2, -38.4]); por('monitor_cardiaco', {}, [-2.6, 0.2, -38.8]); por('suporte_soro', {}, [5.4, 0.2, -38.4]);
      por('biombo', {}, [-4, 0.2, -34.0], 90); por('biombo', {}, [4, 0.2, -34.0], 90); por('cadeira', { cor: '#9aa0aa' }, [-10.5, 0.2, -30.6], 135);
      por('relogio_parede', {}, [0, 7.6, -39.5]); por('ventilador_teto', {}, [-6, 10.2, -34]); por('ventilador_teto', {}, [6, 10.2, -34]);
      return {
        recepcao: { atender: [-6.5, 0.2, -10.0, 0], fila: { inicio: [-6.5, -6.2], vira: 180, cresce: [0.3, 1] }, sentar: [7.5, 0.2, -10.7, 0] },
        corredor: {},
        consultorio: { sentar: [-11.0, 0.2, -15.6, 90], atender: [-9.6, 0.2, -23.6, 0], deitar: [-4.9, 3.05, -26.2, 90] },
        sala_exames: { atender: [8.4, 0.2, -23.2, 0], deitar: [10.6, 3.05, -26.0, 90] },
        enfermaria: { sentar: [0, 1.5, -37.2, 0], deitar: [0, 3.0, -33.3, 0] },
      }; } },
  // DELEGACIA (vários cômodos): plantão na frente; sala do delegado | corredor | interrogatório no meio; corredor de trás;
  // no fundo a sala de investigação do detetive e a carceragem com 2 celas
  delegacia: { tam: [24, 44, 10], w: 24, d: 44, h: 10, cor: '#e9ebef', faixa: '#1d3b72', piso: '#9aa0aa', letreiro: { texto: 'DELEGACIA DE POLÍCIA', fundo: '#1d3b72', largura: 14 },
    porta: { x: 0, w: 3.0, vidro: true }, vitrines: [{ x: -7, w: 3.5 }, { x: 7, w: 3.5 }], janelas: { esq: [-15, -32], dir: [-15, -33] },
    parede_interna: '#dfe3ea', cor_porta: '#5a6b85', cor_placa: '#1d3b72', comodo_padrao: 'recepcao',
    comodos: {
      recepcao: { r: [[-12, 12, 0, -11]], ponto: [0, -4.5], piso: '#b8bcc6' },
      corredor: { r: [[-3, 3, -11, -23], [-12, 12, -23, -27]], ponto: [0, -18.5], piso: '#c3c7cf' },
      sala_delegado: { r: [[-12, -3, -11, -23]], ponto: [-7.5, -13.8], piso: '#8a6a4a' },
      interrogatorio: { r: [[3, 12, -11, -23]], ponto: [7.5, -14.2], piso: '#a3a6ad' },
      sala_investigacao: { r: [[-12, 0, -27, -44]], ponto: [-6, -40.3], piso: '#6f5a48', luzes: [[-6, -31, 0.5]] },
      carceragem: { r: [[0, 12, -27, -44]], ponto: [6, -34.5], piso: '#9aa0aa', luzes: [[6, -41, 0.5]] },
    },
    paredes: [
      { z: -11, de: -12, ate: 12, vaos: [{ em: 0, w: 6, aberto: true }] },
      { x: -3, de: -11, ate: -23, vaos: [{ em: -20.5, w: 2.4, porta: true, placa: ['DELEGADO', 1] }] },
      { x: 3, de: -11, ate: -23, vaos: [{ em: -20.5, w: 2.4, porta: true, placa: ['INTERROGATÓRIO', -1] }] },
      { z: -23, de: -12, ate: 12, vaos: [{ em: 0, w: 6, aberto: true }] },
      { z: -27, de: -12, ate: 12, vaos: [{ em: -6, w: 2.4, porta: true, placa: ['INVESTIGAÇÃO', 1] }, { em: 6, w: 3.2, y1: 8.4, placa: ['CARCERAGEM', 1] }] },
      { x: 0, de: -27, ate: -44 },
      { x: 6, de: -38.5, ate: -44 },   // divisória entre as celas
    ],
    mobilia({ por, solto }) {
      // recepção / plantão
      por('balcao', { largura: 7, cor: '#5a5d66', tampo: '#d8dde3' }, [-5.5, 0.2, -7.5]); por('computador', {}, [-7.0, 1.2, -7.7], 180); por('placa_suspensa', { texto: 'PLANTÃO 24H', cor: '#1d3b72', largura: 3.6 }, [-5.5, 7.8, -7.5]);
      por('quadro_parede', { texto: 'POLÍCIA', cor: '#1d3b72' }, [-9.5, 6.4, -10.8]); por('bandeira', {}, [-11.0, 0.2, -10.3], 0, 0.6);
      por('cadeiras_espera', { n: 3, cor: '#5a5d66' }, [7.5, 0.2, -9.9]); por('cadeiras_espera', { n: 2, cor: '#5a5d66' }, [10.8, 0.2, -4.0], -90);
      por('mural', { texto: 'PROCURADOS', largura: 3.4, altura: 2.2, cor: '#f5e6b8', cor_texto: '#c4281c' }, [11.55, 5.2, -8.0], -90);
      por('mural', { texto: 'DISQUE 190', largura: 3, altura: 1.4, cor: '#1d3b72', cor_texto: '#ffffff' }, [7.5, 6.2, -10.8]);
      por('bebedouro', {}, [-11.0, 0.2, -2.0], 90); por('relogio_parede', {}, [-11.55, 6.5, -6.0], 90); por('extintor', {}, [3.8, 0.2, -10.6]);
      por('planta', {}, [11.0, 0.2, -1.0]); por('lixeira', { cor: '#5a5d66' }, [-3.6, 0.2, -1.0], 0, 0.7); por('camera_seguranca', {}, [-11.5, 8.6, -10.5], 135);
      por('ventilador_teto', {}, [-6, 10.2, -5]); por('ventilador_teto', {}, [6, 10.2, -5]);
      // corredores
      por('banco', { cor: '#5a5d66' }, [-2.2, 0.2, -15.5], 90); por('extintor', {}, [2.7, 0.2, -12.0], -90); por('arquivo', {}, [2.0, 0.2, -17.5], -90);
      por('mural', { texto: 'SILÊNCIO', largura: 2.6, altura: 1.2, cor: '#ffffff', cor_texto: '#1d3b72' }, [-2.75, 5.4, -17.5], 90); por('camera_seguranca', {}, [2.8, 8.6, -12.0], -90);
      por('bebedouro', {}, [-11.2, 0.2, -25.0], 90); por('extintor', {}, [11.6, 0.2, -25.0], -90); por('mural', { texto: 'CASOS RESOLVIDOS: 128', largura: 4, altura: 1.2, cor: '#1d3b72', cor_texto: '#ffd23f' }, [0, 7.2, -26.8]);
      // sala do delegado
      por('mesa_escritorio', {}, [-7.5, 0.2, -17.8], 180); por('poltrona', { cor: '#2a1a12' }, [-7.5, 0.2, -20.4]); por('computador', {}, [-9.3, 0.35, -18.4], 180);
      por('cadeira', { cor: '#5a3a22' }, [-10.4, 0.2, -14.4], 150); por('quadro_parede', { texto: 'DELEGADO', cor: '#1d3b72' }, [-7.5, 6.4, -22.75]); por('bandeira', {}, [-11.0, 0.2, -22.2], 0, 0.55);
      por('arquivo', {}, [-11.0, 0.2, -18.6], 90); por('estante', {}, [-11.15, 0.2, -13.8], 90, 0.7); por('relogio_parede', {}, [-11.55, 7.4, -18.6], 90); por('planta', {}, [-11.0, 0.2, -16.8]);
      // interrogatório: mesa no meio, suspeito e policial frente a frente (de perfil para a câmera), luz pendente, vidro espelhado
      por('mesa', { largura: 3.2, cor: '#7a7d85' }, [7.5, 0.2, -18.0], 90); por('cadeira', { cor: '#5a5d66' }, [5.4, 0.2, -18.0], 90); por('cadeira', { cor: '#1d3b72' }, [9.6, 0.2, -18.0], -90);
      por('luminaria_pendente', {}, [7.5, 10.2, -18.0]); por('espelho_falso', { largura: 5 }, [7.5, 5.0, -22.75]); por('camera_seguranca', {}, [11.5, 8.6, -12.0], -135);
      solto(grupo([caixa(1.0, 0.05, 1.3, '#ffffff', { pos: [7.2, 2.47, -18.3], rot: [0, 12, 0], sombra: false }), caixa(0.9, 0.05, 1.2, '#f5e6b8', { pos: [7.9, 2.48, -17.6], rot: [0, -8, 0], sombra: false })]));   // papéis do depoimento
      // sala de investigação do detetive: quadro com fotos e fios vermelhos, mapa com alfinetes, mesas com computador, mesa central com pastas e café
      por('quadro_investigacao', { largura: 8, altura: 4.5, texto: 'CASO 07 · QUEM FOI?' }, [-6, 5.2, -43.5]);
      por('mapa_parede', {}, [-11.55, 5.4, -37.0], 90); por('mural', { texto: 'LINHA DO TEMPO: 20h · 21h · 23h ?', largura: 4.6, altura: 2.2, cor: '#ffffff', cor_texto: '#1d3b72' }, [-0.25, 5.2, -37.5], -90);
      por('mesa_trabalho', { largura: 4, cor: '#5a3a22' }, [-10.5, 0.2, -29.4], 90); por('cadeira', { cor: '#2a1a12' }, [-8.4, 0.2, -29.4], -90);
      por('mesa_trabalho', { largura: 4, cor: '#5a3a22' }, [-1.5, 0.2, -29.4], -90); por('cadeira', { cor: '#2a1a12' }, [-3.6, 0.2, -29.4], 90);
      por('mesa', { largura: 4, cor: '#7c5c46' }, [-6, 0.2, -34.0]); por('cadeira', { cor: '#2a1a12' }, [-6, 0.2, -35.7]);
      por('pastas_caso', { n: 4 }, [-7.0, 2.55, -33.9]); por('pastas_caso', { n: 2, seed: 9 }, [-4.9, 2.55, -34.2]); por('cafe', {}, [-5.6, 2.55, -33.3]); por('cafe', {}, [-10.2, 2.55, -28.4]);
      por('luminaria_pendente', {}, [-6, 10.2, -34.0]); por('arquivo', {}, [-11.0, 0.2, -42.6], 90); por('arquivo', {}, [-1.0, 0.2, -42.6], -90);
      por('pilha_caixas', { n: 3, cor: '#c8a06a', seed: 6 }, [-10.9, 0.2, -39.8]);
      por('relogio_parede', {}, [-6, 8.6, -43.5]); por('lixeira', { cor: '#5a5d66' }, [-4.6, 0.2, -27.9], 0, 0.7);
      // carceragem: 2 celas com grades de frente para a câmera e a mesa do carcereiro
      for (const x of [3, 9]) { por('cela', { largura: 5.8 }, [x, 0.2, -38.5]); por('banco_cela', { largura: 3.4 }, [x - 0.6, 0.2, -43.1]); por('vaso_sanitario', {}, [x + 1.8, 0.2, -43.0]); }
      solto(grupo([caixa(0.35, 1.8, 0.2, '#f5e6b8', { pos: [3, 5.5, -38.3] }), caixa(0.35, 1.8, 0.2, '#f5e6b8', { pos: [9, 5.5, -38.3] })]));   // faixa com o número das celas
      por('mesa', { largura: 3, cor: '#5a5d66' }, [10.4, 0.2, -30.0], -90); por('cadeira', { cor: '#1d3b72' }, [8.6, 0.2, -30.0], 90); por('extintor', {}, [0.5, 0.2, -28.0], 90);
      por('camera_seguranca', {}, [11.5, 8.6, -27.6], -135);
      return {
        recepcao: { atender: [-5.5, 0.2, -9.3, 0], fila: { inicio: [-5.5, -5.6], vira: 180, cresce: [0.3, 1] }, sentar: [7.5, 0.2, -9.8, 0] },
        corredor: {},
        sala_delegado: { sentar: [-7.5, 0.2, -20.1, 0], assinar: [-7.5, 0.2, -20.1, 0], atender: [-7.5, 0.2, -20.1, 0] },
        interrogatorio: { sentar: [5.4, 0.2, -18.0, 90] },
        sala_investigacao: { atender: [-6, 0.2, -42.0, 0], sentar: [-6, 0.2, -35.5, 0] },
        carceragem: { segurar_grade: [3, 0.2, -39.5, 0], atender: [7.5, 0.2, -34.0, 0], sentar: [2.4, 0.2, -43.0, 0] },
      }; } },
  bar: { tam: [16, 15, 9], w: 10, d: 10, h: 5.5, cor: '#f5cd30', faixa: '#c4281c', piso: '#8a6a4a', letreiro: { texto: 'BAR DO ZÉ', fundo: '#c4281c' }, porta: { x: -2, w: 3.4, cor: '#3a3d44' }, vitrines: [{ x: 2.8, w: 3 }],
    interior(gi) { por(gi, 'prateleira_garrafas', { largura: 8 }, [0, -1.2, -9.4]); por(gi, 'balcao', { largura: 7, cor: '#7a4a2a', tampo: '#5a3a22' }, [0, 0.2, -6.8]);
      for (let i = 0; i < 3; i++) por(gi, 'banqueta', {}, [-2.4 + i * 2.4, 0.2, -5.0]); const tv = PROPS.tv_parede({ tela: 'futebol' }); tv.position.set(3.8, 4.2, -9.6); tv.scale.setScalar(0.6); gi.add(tv);
      por(gi, 'mesa', { largura: 2.6, cor: '#f2f3f3' }, [3.0, 0.2, -2.8], 0); for (const x of [1.0, 5.0]) por(gi, 'cadeira_plastico', {}, [x, 0.2, -2.8], x < 3 ? 90 : -90);
      por(gi, 'geladeira', {}, [-4.2, 0.2, -8.6], 90); por(gi, 'pilha_caixas', { n: 3, cor: '#e53935', seed: 11 }, [4.2, 0.2, -8.6]);
      por(gi, 'poster', { texto: 'CERVEJA GELADA', cor: '#f5b800', cor_texto: '#c4281c' }, [-4.75, 3.5, -4.0], 90, 0.6); por(gi, 'poster', { texto: 'GOOOL!', cor: '#1f9d48' }, [4.75, 3.6, -5.2], -90, 0.6);
      por(gi, 'ventilador_teto', {}, [0, 5.7, -3.6]); por(gi, 'lixeira', { cor: '#c4281c' }, [-4.3, 0.2, -1.0], 0, 0.7);
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
  const fr = ext(w, [{ x: -6, w: 2.4, y0: 0, y1: 6.3 }, { x: -11, w: 3, y0: 2.2, y1: 4.8, vidro: true }, { x: 7, w: 3.5, y0: 2.2, y1: 4.8, vidro: true }]); fr.position.set(0, 0, -0.2);
  const pf = porta(2.4, 6.2, '#7a4b2a', false, portas); pf.position.set(-7.2, 0.2, 0); fr.add(pf); g.add(unidade(fr, unidades));
  const fu = ext(w, [{ x: -8.5, w: 2.6, y0: 2.4, y1: 4.8, vidro: true }, { x: -0.5, w: 1.4, y0: 3.6, y1: 4.8, vidro: true }, { x: 8, w: 2.6, y0: 2.4, y1: 4.8, vidro: true }]);
  fu.position.set(0, 0, -d + 0.2); g.add(unidade(fu, unidades));
  for (const s of [-1, 1]) { const la = ext(d, [{ x: 0, w: 2.6, y0: 2.4, y1: 4.8, vidro: true }]); la.rotation.y = Math.PI / 2; la.position.set(s * (w / 2 - 0.2), 0, -d / 2); g.add(unidade(la, unidades)); }
  // paredes internas com portas
  const pi = (len, vaos) => parede(len, h, inte, vaos, n, 0.25);
  const meio = pi(w - 0.8, [{ x: -8.5, w: 2.4, y0: 0, y1: 6.3 }, { x: -0.5, w: 2.2, y0: 0, y1: 6.3 }, { x: 7.5, w: 2.4, y0: 0, y1: 6.3 }]); meio.position.set(0, 0, -10);
  for (const [x, pw] of [[-8.5, 2.2], [-0.5, 2.0], [7.5, 2.2]]) { const p = porta(pw, 6.2, '#e9e6dc', false, portas); p.position.set(x - pw / 2, 0.2, 0); meio.add(p); }
  g.add(unidade(meio, unidades));
  const sc = pi(10, [{ x: 0, w: 3.2, y0: 0, y1: 5 }]); sc.rotation.y = Math.PI / 2; sc.position.set(1, 0, -5); g.add(unidade(sc, unidades));
  for (const x of [-4, 3]) { const pq = pi(10, []); pq.rotation.y = Math.PI / 2; pq.position.set(x, 0, -15); g.add(unidade(pq, unidades)); }
  // forro + telhado de telha
  g.add(unidade(grupo([caixa(w, 0.25, d, '#f4f4f4', { pos: [0, h + 0.12, -d / 2] })]), unidades));
  const tel = grupo([]); for (const sx of [-1, 1]) tel.add(caixa(w + 1.4, 0.4, d / 2 / Math.cos(24 * RAD) + 1, '#c8643b', { pos: [0, h + 0.25 + Math.tan(24 * RAD) * d / 4, -d / 2 + sx * d / 4], rot: [sx * 24, 0, 0] }));
  tel.add(caixa(w + 1.4, 0.3, 0.6, '#9a4a2b', { pos: [0, h + 0.3 + Math.tan(24 * RAD) * d / 2, -d / 2] })); g.add(unidade(tel, unidades));
  // móveis
  por(g, 'sofa', { cor: '#4f6f8f' }, [-6.5, 0.2, -8.8], 0); por(g, 'mesa_centro', {}, [-6.5, 0.2, -5.8]); por(g, 'tapete', { cor: '#c76b5a', largura: 7, prof: 4.5 }, [-6.5, 0.2, -6]);
  por(g, 'tv', {}, [-12.4, 0.2, -5], 90); por(g, 'poltrona', { cor: '#8a5a33' }, [-2.5, 0.2, -3], -120); por(g, 'planta', {}, [-12, 0.2, -1.2]);
  por(g, 'geladeira', {}, [12, 0.2, -1.6], -90); por(g, 'fogao', {}, [12, 0.2, -5], -90); por(g, 'pia', {}, [11.8, 0.2, -8.2], -90); por(g, 'mesa_jantar', { largura: 3.6 }, [5.5, 0.2, -5], 0);
  por(g, 'cama', { cor: '#1e88e5' }, [-11.1, 0.2, -16.3]); por(g, 'mesa', { largura: 3.6, cor: '#f2f3f3' }, [-5.0, 0.2, -14], -90); por(g, 'computador', {}, [-4.8, 0.2, -14], -90);
  por(g, 'cadeira_gamer', {}, [-7.0, 0.2, -14], 90); por(g, 'guarda_roupa', { largura: 3.6 }, [-12.2, 0.2, -11.6], 90);
  for (const [t, c, x] of [['GAMER', '#6b32a8', -10], ['GOOOL!', '#1f9d48', -6.8]]) { const p = PROPS.poster({ texto: t, cor: c }); p.position.set(x, 5.2, -19.55); p.scale.setScalar(0.8); g.add(p); }
  por(g, 'vaso_sanitario', {}, [-2.6, 0.2, -18.8]); por(g, 'pia_banheiro', {}, [-3.2, 0.2, -12.2], 90); por(g, 'box_chuveiro', {}, [1.0, 0.2, -18], 0);
  por(g, 'cama_casal', { cor: '#b84a5a' }, [8.2, 0.2, -16.3], 0); por(g, 'criado_mudo', {}, [4.3, 0.2, -19]); por(g, 'criado_mudo', {}, [12.1, 0.2, -19]); por(g, 'guarda_roupa', { largura: 3.6, cor: '#e9e6dc' }, [12.3, 0.2, -11.6], -90);
  if (foco) { const [x, z] = COMODOS_MUNDO[ctx.comodo || 'sala']; luzInterna(g, x, z, h, n, 1.1); }   // só a luz do cômodo da cena (cada luz pesa no render)
  g.userData.ancoras = { sentar: [-7.4, 0.2, -8.4, 0], cozinhar: [10.4, 0.2, -5, 90], lavar_louca: [10.4, 0.2, -8.2, 90], deitar: [-11.1, 1.65, -13.2, 0], dormir: [-11.1, 1.65, -13.2, 0],
    jogar_pc: [-6.7, 0.7, -14, 90], deitar_pais: [6.8, 1.65, -13.4, 0] };
  usarAssentos(g.userData.ancoras, assentosDe(g), -5);
  return g;
}

// ---------------- layout do mapa ----------------
const PR = 26, AN = 48.5, FR = 52, RUA = 10, BX = 30, WX = -20; // meia praça, borda externa do anel de ruas, linha das fachadas, largura da rua, deslocamento do bairro (leste) e do lado oeste
export const LOTES_MUNDO = [
  { id: 'prefeitura', f: [-28, -FR], rot: 0 }, { id: 'igreja', f: [0, -FR], rot: 0 }, { id: 'banco', f: [26, -FR], rot: 0 },
  { id: 'escola', f: [-31, FR], rot: 180 }, { id: 'posto_saude', f: [15, FR], rot: 180 },
  { id: 'padaria', f: [-FR, -29.5], rot: 90 }, { id: 'farmacia', f: [-FR, -9.5], rot: 90 }, { id: 'loterica', f: [-FR, 10], rot: 90 }, { id: 'bar', f: [-FR, 29.5], rot: 90 },
  { id: 'mercado', f: [FR, -24], rot: -90 }, { id: 'delegacia', f: [FR, 38], rot: -90 },   // mais ao sul: o fundo (x até 96) passa ao lado do posto de gasolina
];
const CASA_LOTE = { id: 'casa', f: [78 + BX, -12], rot: 0 };
const PONTOS = { praca: { f: [0, 18], rot: 0, recuo: 0, chao: 0.45 }, coreto: { f: [0, 6.5], rot: 0, recuo: 2.5, chao: 0.45 }, fonte: { f: [13.9, -13.9], rot: -45, recuo: 6.6, chao: 0.45 },
  parquinho: { f: [11.5, 15.5], rot: 0, recuo: 0, chao: 0.45 }, estatua: { f: [-13.9, -13.9], rot: 45, recuo: 5.0, chao: 0.45 }, rua_bairro: { f: [92 + BX, 0], rot: 90, recuo: 0, chao: 0.1 },
  posto_gasolina: { f: [52 + BX, 9], rot: 180, recuo: 3, chao: 0.2 }, campinho: { f: [139 + BX, 22.5], rot: 90, recuo: 0, chao: 0.2 } };
/** Centro de cada lugar no mapa (para desenhar a planta com nomes). */
export function centrosMundo() {
  const out = LOTES_MUNDO.map(l => { const d = PREDIOS_MUNDO[l.id].d, r = l.rot * RAD; return { id: l.id, x: l.f[0] - Math.sin(r) * d / 2, z: l.f[1] - Math.cos(r) * d / 2 }; });
  return [...out, { id: 'casa', x: CASA_LOTE.f[0], z: CASA_LOTE.f[1] - CASA.d / 2 }, { id: 'posto_gasolina', x: 60 + BX, z: 17 }, { id: 'coreto', x: 4, z: 4 }, { id: 'fonte', x: 14, z: -14 },
    { id: 'estatua', x: -14, z: -14 }, { id: 'parquinho', x: 15, z: 15 }, { id: 'rua_bairro', x: 125 + BX, z: 0 }, { id: 'campinho', x: 139 + BX, z: 23 }, ...EXTRAS_MAPA.map(e => ({ id: '_' + e.nome, nome: e.nome, x: e.x, z: e.z }))];
}
export const LOCAIS_MUNDO = [...LOTES_MUNDO.map(l => l.id), 'casa', ...Object.keys(PONTOS), 'vista'];
export const LOCAIS_COM_INTERIOR = [...LOTES_MUNDO.map(l => l.id), 'casa'];
/** Cômodos de cada local com vários cômodos (casa, escola, posto de saúde) e o cômodo usado com `dentro: true` sem `comodo:`. */
export const COMODOS_DO_MUNDO = { casa: Object.keys(COMODOS_MUNDO), ...Object.fromEntries(Object.entries(PREDIOS_MUNDO).filter(([, p]) => p.comodos).map(([k, p]) => [k, Object.keys(p.comodos)])) };
export const COMODO_PADRAO_MUNDO = { casa: 'sala', ...Object.fromEntries(Object.entries(PREDIOS_MUNDO).filter(([, p]) => p.comodos).map(([k, p]) => [k, p.comodo_padrao])) };

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
}

/** Faixa larga entre a praça e o anel de ruas: calçada com canteiros, árvores, bancos e postes (saídas livres nos caminhos da praça). */
function calcadao(g, n, r, RI) {
  g.add(caixa(RI * 2, 0.34, RI * 2, '#d9d4c8', { pos: [0, 0.17, 0] })); g.add(caixa(RI * 2 + 0.6, 0.3, RI * 2 + 0.6, '#b8b4aa', { pos: [0, 0.15, 0] }));   // calçada + meio-fio
  const M = (PR + RI) / 2;   // meio da faixa
  for (const s of [-1, 1]) for (let t = -RI + 5; t <= RI - 5; t += 9) { if (Math.abs(t) < 7) continue;   // não tapa a saída dos caminhos
    for (const [x, z] of [[t, s * M], [s * M, t]]) { g.add(caixa(2.6, 0.4, 2.6, '#9a8f7a', { pos: [x, 0.4, z] })); g.add(caixa(2.2, 0.05, 2.2, '#3fae3a', { pos: [x, 0.62, z], sombra: false }));
      const a = PROPS.arvore({ tam: r.entre(0.85, 1.1) }); a.position.set(x, 0.6, z); g.add(a); } }
  for (const s of [-1, 1]) for (const t of [-22, 22]) { por(g, 'banco', {}, [t, 0.34, s * (M + 2.6)], s > 0 ? 0 : 180); por(g, 'banco', {}, [s * (M + 2.6), 0.34, t], s > 0 ? 90 : -90); }
  for (const s of [-1, 1]) for (const t of [-RI + 2, -8, 8, RI - 2]) { por(g, 'poste', { noite: n }, [t, 0.34, s * (RI - 1.2)], s > 0 ? 0 : 180); }
  for (const [x, z] of [[-RI + 3, -RI + 3], [RI - 3, -RI + 3], [-RI + 3, RI - 3], [RI - 3, RI - 3]]) por(g, 'lixeira', {}, [x, 0.34, z], 0, 0.8);
}

export function construirMundo(o, g, r) {
  const n = o.hora === 'noite', unidades = [], portas = [];
  g.add(caixa(800, 0.2, 800, '#4ccd3d', { pos: [0, -0.1, 0] }));
  g.add(caixa(AN * 2 + 8, 0.2, AN * 2 + 8, '#c3c7cf', { pos: [0, 0.1, 0] }));                         // calçadas
  g.add(caixa(AN * 2, 0.2, AN * 2, '#4f5361', { pos: [0, 0.11, 0] }));                                // anel de ruas
  const RM = AN - RUA / 2, RI = AN - RUA;   // meio do anel e borda interna (calçadão da praça)
  for (const [x, z, w, d] of [[0, -RM, 2 * RM, 0.25], [0, RM, 2 * RM, 0.25], [-RM, 0, 0.25, 2 * RM], [RM, 0, 0.25, 2 * RM]]) g.add(caixa(w, 0.03, d, '#f5cd30', { pos: [x, 0.22, z], sombra: false }));
  calcadao(g, n, r, RI);
  g.add(caixa(200 + BX, 0.2, 10, '#4f5361', { pos: [AN + 100 + BX / 2, 0.11, 0] })); for (const s of [-1, 1]) g.add(caixa(200 + BX, 0.25, 3, '#c3c7cf', { pos: [AN + 100 + BX / 2, 0.12, s * 6.5] }));   // rua do bairro (leste)
  for (let x = AN + 4; x < 230 + BX; x += 7) g.add(caixa(3, 0.03, 0.3, '#f2f3f3', { pos: [x, 0.22, 0], sombra: false }));
  praca(g, n, r);
  const ctx = { n, unidades, portas };
  const focoId = o.dentro || o.comodo ? o.local : null;
  for (const l of LOTES_MUNDO) { const p = predioOco(PREDIOS_MUNDO[l.id], { ...ctx, foco: focoId === l.id, comodo: focoId === l.id ? o.comodo : null }); p.position.set(l.f[0], 0.2, l.f[1]); p.rotation.y = l.rot * RAD; p.userData.lote = l; g.add(p); }
  // torre da igreja (por fora, ao lado da porta)
  { const ig = LOTES_MUNDO.find(l => l.id === 'igreja'), t = grupo([caixa(4, 18, 4, '#f6f2e6', { pos: [0, 9, -2] }), cilindro(0, 3.2, 4.5, '#b5533a', { pos: [0, 20.2, -2], seg: 4 }),
      caixa(0.3, 2.2, 0.3, '#e8c25a', { pos: [0, 23.5, -2] }), caixa(1.3, 0.3, 0.3, '#e8c25a', { pos: [0, 23.9, -2] }), caixa(1.8, 2.2, 0.2, '#5a3a22', { pos: [0, 15, 0.05] })]);
    t.position.set(ig.f[0] + PREDIOS_MUNDO.igreja.tam[0] / 2 + 2.5, 0.2, ig.f[1]); g.add(t); }
  // casa do protagonista + rua do bairro
  const casa = casaProtagonista({ ...ctx, foco: focoId === 'casa', comodo: focoId === 'casa' ? o.comodo : null }); casa.position.set(CASA_LOTE.f[0], 0.2, CASA_LOTE.f[1]); casa.userData.lote = CASA_LOTE; g.add(casa);
  por(g, 'muro', { largura: 30, cor: '#e9e6dc', portao_x: -6, portao_cor: '#1d3b72' }, [CASA_LOTE.f[0], 0.2, -5.6]); por(g, 'carro', { cor: '#c4281c' }, [CASA_LOTE.f[0] + 7, 0.2, -8.6], 90, 0.9);
  const cores = ['#8fc1e3', '#f2a7c3', '#b7e1a1', '#e9e6dc', '#f28b5b', '#c9b2e8', '#ffe08a'];
  const LOJAS_BAIRRO = [[100 + BX, 1], [139 + BX, -1], [178 + BX, 1]];   // [x, lado] ocupados por mercadinho, oficina e borracharia
  for (let x = 84; x <= 210 + BX; x += 13) for (const lado of [-1, 1]) { if (lado < 0 && Math.abs(x - CASA_LOTE.f[0]) < 18) continue; if (lado > 0 && x < 60 + BX) continue;
    if (LOJAS_BAIRRO.some(([lx, ll]) => ll === lado && Math.abs(lx - x) < 6)) continue;
    if (lado > 0 && Math.abs(x - CAMPINHO.x) < CAMPINHO.w / 2 + 10) continue;   // campinho + folga de gramado dos dois lados
    por(g, r() < 0.3 ? 'sobrado' : 'casa_br', { cor: r.item(cores), noite: n, largura: 9 }, [x, 0, lado * 13], lado > 0 ? 180 : 0);
    por(g, 'muro', { largura: 12, cor: '#e9e6dc', portao_x: r.entre(-2, 2) }, [x, 0, lado * 8.1], lado > 0 ? 180 : 0); }
  for (let x = 82; x <= 200 + BX; x += 16) por(g, 'poste_fios', { noite: n }, [x, 0, -5.6]);
  por(g, 'posto_gasolina', { noite: n }, [52 + BX, 0.2, 9], 180);
  for (const [x, z, v, c] of [[-RM, 16, 0, '#1d3b72'], [RM, 12, 180, '#f2f3f3'], [10, RM, 90, '#f5c400']]) por(g, c === '#f5c400' ? 'taxi' : 'carro', { cor: c }, [x, 0.2, z], v);
  for (const z of [-1, 1]) for (let x = -84; x <= 84; x += 12) por(g, r() < 0.3 ? 'sobrado' : 'casa_br', { cor: r.item(cores), noite: n, largura: 8 }, [x, 0, z * 100], z > 0 ? 180 : 0);
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
export const CAMPINHO = { x: 139 + 30, z: 22.5, w: 38, d: 21 };   // entre o mercadinho (x 113) e a borracharia (x 165), lado sul da rua
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
  { nome: 'Sorveteria', x: -49, z: -FR - 3 },
  { nome: 'Açougue', x: 41, z: -FR - 3 },
  { nome: 'Papelaria', x: -51, z: FR + 3 },
  { nome: 'Salão de beleza', x: 33, z: FR + 3 },
  { nome: 'Loja de roupas', x: -10, z: FR + 3 },
  { nome: 'Ótica', x: -1.5, z: FR + 3 },
  { nome: 'Apartamentos', x: -64 + WX, z: -24 },
  { nome: 'Apartamentos', x: -64 + WX, z: 24 },
  { nome: 'Pousada', x: -63 + WX, z: 8 },
  { nome: "Caixa d'água", x: -82 + WX, z: 0 },
  { nome: 'Apartamentos', x: 66, z: -66 },
  { nome: 'Mercadinho', x: 100 + BX, z: 12 },
  { nome: 'Oficina', x: 139 + BX, z: -12 },
  { nome: 'Borracharia', x: 178 + BX, z: 12 },
  ];
function povoar(g, n, r) {
  // cantos e vãos em volta da praça
  loja(g, -49, -FR, 0, 'SORVETERIA', '#ff66cc', 8, n);
  loja(g, 41, -FR, 0, 'AÇOUGUE', '#8a1f1f', 8, n);
  loja(g, -51, FR, 180, 'PAPELARIA', '#6b32a8', 8, n);
  loja(g, 33, FR, 180, 'SALÃO DE BELEZA', '#e0207a', 9, n);
  loja(g, -10, FR, 180, 'LOJA DE ROUPAS', '#1e6fd9', 8, n);
  loja(g, -1.5, FR, 180, 'ÓTICA', '#00897b', 7, n);
  // a oeste, atrás das lojas: prédios de apartamentos, pousada e a caixa d'água da cidade
  for (const [z, a, c] of [[-24, 16, '#9fb3c8'], [-8, 12, '#e9d8b0'], [24, 18, '#c9b2e8']]) predio(g, -64 + WX, z, 90, a, c, n);
  loja(g, -59 + WX, 8, 90, 'POUSADA', '#2e7d32', 12, n, '#f6efe0');
  caixaDaguaTorre(g, -82 + WX, 0);
  for (let z = -40; z <= 40; z += 13) por(g, r() < 0.4 ? 'sobrado' : 'casa_br', { cor: r.item(['#8fc1e3', '#f2a7c3', '#b7e1a1', '#ffe08a', '#f28b5b']), noite: n, largura: 8.5 }, [-98 + WX, 0, z], 90);
  // norte e sul atrás das fileiras: mais casas e um prédio
  predio(g, -66, -66, 0, 14, '#f0b446', n); predio(g, 66, -66, 0, 12, '#8fc1e3', n);   // longe da fileira de casas de trás
  // bairro: comércio de rua, segunda fileira de casas e quadra
  loja(g, 100 + BX, 9, 180, 'MERCADINHO', '#43a047', 9, n);
  loja(g, 139 + BX, -9, 0, 'OFICINA', '#3a3d44', 11, n, '#cfd3da'); por(g, 'carro', { cor: '#1d3b72' }, [139 + BX, 0.2, -7.4], 90, 0.9);
  loja(g, 178 + BX, 9, 180, 'BORRACHARIA', '#f5b800', 8, n); for (let i = 0; i < 3; i++) g.add(cilindro(0.9, 0.9, 0.6, '#1b1b1b', { pos: [181.5 + BX, 0.5 + i * 0.62, 7.6], seg: 14 }));
  for (let x = 74 + BX; x <= 204 + BX; x += 13) for (const lado of [-1, 1]) if (r() < 0.8) por(g, r() < 0.35 ? 'sobrado' : 'casa_br', { cor: r.item(['#8fc1e3', '#f2a7c3', '#b7e1a1', '#e9e6dc', '#f28b5b', '#c9b2e8', '#ffe08a']), noite: n, largura: 8.5 }, [x, 0, lado * 52], lado > 0 ? 180 : 0);
  for (const lado of [-1, 1]) g.add(caixa(150, 0.2, 7, '#4f5361', { pos: [145 + BX, 0.11, lado * 40] }));   // ruas paralelas (longe o bastante da casa do protagonista, que é funda, e começando depois do fundo da delegacia)
  campinho(g, n, r);
  for (let i = 0; i < 10; i++) por(g, 'arvore', { tam: r.entre(0.9, 1.3) }, [r.entre(55 + BX, 200 + BX), 0, r.item([-1, 1]) * r.entre(60, 66)]);
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
    const P = PREDIOS_MUNDO[local];
    if (local === 'casa' && (comodo || dentro)) { const cz = COMODOS_MUNDO[comodo || 'sala']; lp = [cz[0], cz[1]]; chao = 0.4; }
    else if (P?.comodos && (comodo || dentro)) { lp = [...(P.comodos[comodo] || P.comodos[P.comodo_padrao]).ponto]; chao = 0.4; }
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
    const um = (p) => { const [ax, az] = rot(p[0], p[2], lote.rot * RAD); const [fx, fz] = rot(lote.f[0] + ax - S[0], lote.f[1] + az - S[1], th);
      return [fx, (p[1] ?? 0) + 0.2 - chao, fz, (p[3] ?? 0) + lote.rot - r]; };
    ancoras[k] = Array.isArray(v[0]) ? v.map(um) : um(v);
  }
  return { ancoras };
}
