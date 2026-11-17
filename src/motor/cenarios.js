// Cenários reutilizáveis. Os atores ficam perto da origem; o fundo fica em -Z; a câmera em +Z.
// construirCenario(nome, opcoes) -> { grupo, ceu, nevoa, sol:{dir,forca,cor}, hemi, interno }
// opcoes: { hora: 'dia'|'tarde'|'noite', seed, cor, chao, parede, tela:{...} }
import * as THREE from 'three';
import { caixa, cilindro, esfera, plano, grupo, mat, cor, rng, canvas, texturaCanvas } from './util.js';
import { PROPS, placaTexto } from './props.js';
import { construirCidade, enquadrarLocal } from './cidade.js';
import { INTERIORES } from './interiores.js';
import { construirCasa, enquadrarComodo } from './casa.js';
import { construirMundo, enquadrarMundo, recortarMundo } from './mundo.js';
export { LOCAIS_MUNDO, LOCAIS_COM_INTERIOR, COMODOS_DO_MUNDO } from './mundo.js';
export { COMODOS_CASA } from './casa.js';
export { INTERIOR_DO_LOCAL } from './interiores.js';

const CEU = { dia: '#8ec9ff', tarde: '#ffb27a', noite: '#0e1a3a' };
function ambiente(hora, interno = false) {
  if (hora === 'noite') return { ceu: CEU.noite, nevoa: [40, 160], sol: { dir: [0.4, 1, 0.8], forca: interno ? 1.0 : 1.3, cor: '#aabfff' }, hemi: [interno ? '#d6deff' : '#7d90d0', '#2a3560', interno ? 1.4 : 1.2] };
  if (hora === 'tarde') return { ceu: CEU.tarde, nevoa: [60, 220], sol: { dir: [-0.9, 0.6, 0.7], forca: 3.0, cor: '#ffc08a' }, hemi: ['#ffd9b8', '#6b5a4a', 1.1] };
  return { ceu: CEU.dia, nevoa: [70, 260], sol: { dir: [-0.5, 1.1, 0.9], forca: 3.4, cor: '#fff4e0' }, hemi: ['#cfe8ff', '#6b8a5a', interno ? 1.6 : 1.3] };
}
function nuvens(g, r) {
  for (let i = 0; i < 9; i++) { const cx = r.entre(-120, 120), cy = r.entre(45, 75), cz = r.entre(-190, -130);
    for (let j = 0; j < 4; j++) { const e = esfera(r.entre(6, 10), mat('#ffffff', { lambert: true, emissive: '#c2d2e6', fog: false }), { pos: [cx + j * 8 - 12, cy + r.entre(-2, 2), cz] }); e.castShadow = false; g.add(e); } }
}
function lua(g) { g.add(esfera(6, mat('#f4f1d0', { basic: true, fog: false }), { pos: [-40, 70, -180], sombra: false })); }
export function add(g, tipo, o, pos, vira = 0) { const p = PROPS[tipo](o); p.position.set(...pos); p.rotation.y = THREE.MathUtils.degToRad(vira); g.add(p); return p; }
export function sala(g, { largura = 26, profundo = 8, altura = 11, parede = '#e8e6e1', chao = '#bfb6a8', teto = '#f4f4f4' } = {}) {
  g.userData.limites = { x: largura / 2 - 0.8, y: altura - 0.8, z: -profundo + 0.8 };
  g.add(caixa(largura, 0.4, 60, chao, { pos: [0, -0.2, 20] }));
  g.add(caixa(largura, altura, 0.5, parede, { pos: [0, altura / 2, -profundo] }));
  g.add(caixa(0.5, altura, 60, parede, { pos: [-largura / 2, altura / 2, 20] })); g.add(caixa(0.5, altura, 60, parede, { pos: [largura / 2, altura / 2, 20] }));
  g.add(caixa(largura, 0.4, 60, teto, { pos: [0, altura, 20], sombra: false }));
  g.add(caixa(largura - 0.6, 0.5, 0.2, '#d8d4cc', { pos: [0, 0.25, -profundo + 0.3] }));   // rodapé
}
export function janela(g, x, y, z, w = 5, h = 4, noite = false) {
  g.add(caixa(w + 0.4, h + 0.4, 0.3, '#ffffff', { pos: [x, y, z] }));
  g.add(caixa(w, h, 0.32, mat(noite ? '#20305a' : '#bfe6ff', { emissive: noite ? '#101a33' : '#bfe6ff', emissiveIntensity: noite ? 0.4 : 0.9 }), { pos: [x, y, z + 0.02], sombra: false }));
  g.add(caixa(0.2, h, 0.36, '#ffffff', { pos: [x, y, z + 0.04] })); g.add(caixa(w, 0.2, 0.36, '#ffffff', { pos: [x, y, z + 0.04] }));
}
export function luzTeto(g, x, z, noite) { g.add(caixa(3, 0.15, 3, mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 1.5 }), { pos: [x, 10.7, z], sombra: false }));
  const l = new THREE.PointLight(0xfff2dd, noite ? 90 : 45, 40, 1.4); l.position.set(x, 9.5, z); g.add(l); }

// ---------- Tela de celular (canvas) ----------
export function texturaTela(tela = {}) {
  const [c, g] = canvas(540, 1080);
  const grad = g.createLinearGradient(0, 0, 0, 1080); grad.addColorStop(0, tela.fundo || '#1d2b4f'); grad.addColorStop(1, tela.fundo2 || '#3b2a5e');
  g.fillStyle = grad; g.fillRect(0, 0, 540, 1080); g.fillStyle = '#fff'; g.textAlign = 'center';
  const F = (s, w = 700) => `${w} ${s}px "Segoe UI", Roboto, Arial, sans-serif`;
  g.font = F(26, 600); g.fillText(tela.relogio || '12:00', 70, 46); g.textAlign = 'right'; g.fillText('▮▮▮ 87%', 510, 46); g.textAlign = 'center';
  const tipo = tela.tipo || 'mensagem';
  if (tipo === 'alarme') {
    g.font = F(150, 300); g.fillText(tela.hora || '06:30', 270, 420); g.font = F(32, 600); g.fillText(tela.titulo || 'ALARME', 270, 480);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.roundRect(120, 760, 300, 80, 40); g.fill(); g.fillStyle = '#fff'; g.font = F(34, 600); g.fillText('Soneca', 270, 812);
    g.fillStyle = '#e53935'; g.beginPath(); g.roundRect(170, 870, 200, 70, 35); g.fill(); g.fillStyle = '#fff'; g.fillText('Parar', 270, 917);
  } else if (tipo === 'ligacao') {
    g.font = F(30, 500); g.fillText('chamada recebida', 270, 220); g.font = F(64, 700); g.fillText(tela.nome || 'Desconhecido', 270, 310);
    g.fillStyle = '#9aa6c7'; g.beginPath(); g.arc(270, 520, 110, 0, 7); g.fill();
    g.fillStyle = '#e53935'; g.beginPath(); g.arc(140, 900, 55, 0, 7); g.fill(); g.fillStyle = '#43a047'; g.beginPath(); g.arc(400, 900, 55, 0, 7); g.fill();
  } else if (tipo === 'notificacao') {
    g.font = F(120, 300); g.fillText(tela.relogio || '12:00', 270, 260);
    g.font = F(40, 800); const lt = linhasDe(g, tela.titulo || '', 420).slice(0, 2); g.font = F(38, 500); const lx = linhasDe(g, tela.texto || '', 420).slice(0, 4);
    g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.roundRect(30, 370, 480, 90 + lt.length * 48 + lx.length * 46, 28); g.fill();
    g.fillStyle = '#222'; g.textAlign = 'left'; g.font = F(26, 600); g.fillText((tela.app || 'MENSAGENS').toUpperCase(), 60, 415);
    g.font = F(40, 800); lt.forEach((l, i) => g.fillText(l, 60, 468 + i * 48));
    g.font = F(38, 500); lx.forEach((l, i) => g.fillText(l, 60, 476 + lt.length * 48 + i * 46));
  } else { // mensagem (chat)
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 70, 540, 110); g.fillStyle = '#fff'; g.font = F(36, 700); g.fillText(tela.de || 'Desconhecido', 270, 140);
    let y = 240; const msgs = tela.mensagens || [{ texto: tela.texto || '...' }];
    for (const m of msgs) {
      g.font = F(40, 600); const linhas = linhasDe(g, m.texto, 380); const h = linhas.length * 50 + 40; const eu = m.eu;
      g.fillStyle = eu ? '#2f8cff' : '#ffffff'; g.beginPath(); g.roundRect(eu ? 90 : 30, y, 420, h, 28); g.fill();
      g.fillStyle = eu ? '#fff' : '#111'; g.textAlign = 'left'; linhas.forEach((l, i) => g.fillText(l, (eu ? 90 : 30) + 22, y + 54 + i * 50)); y += h + 24;
    }
  }
  return texturaCanvas(c);
}
function linhasDe(g, txt, w) { const out = []; let l = ''; for (const p of String(txt).split(' ')) { const t = l ? l + ' ' + p : p; if (g.measureText(t).width > w && l) { out.push(l); l = p; } else l = t; } if (l) out.push(l); return out; }
function quebra(g, txt, x, y, w, lh) { linhasDe(g, txt, w).forEach((l, i) => g.fillText(l, x, y + i * lh)); }

// ---------- Cenários ----------
export const CENARIOS = {
  rua(o, g, r) {
    const n = o.hora === 'noite';
    g.add(caixa(500, 0.2, 500, o.chao || '#4ccd3d', { pos: [0, -0.1, 0] }));
    g.add(caixa(500, 0.1, 8, '#5c6070', { pos: [0, 0.02, -13] }));
    for (let x = -100; x <= 100; x += 7) g.add(caixa(3, 0.02, 0.3, '#e8e8e8', { pos: [x, 0.08, -13], sombra: false }));
    g.add(caixa(500, 0.25, 2.4, '#c9ccd5', { pos: [0, 0.12, -7.8] })); g.add(caixa(500, 0.25, 2.4, '#c9ccd5', { pos: [0, 0.12, -18.2] }));
    const cores = ['#e9e6dc', '#d9534f', '#f0b446', '#8fc1e3', '#b7e1a1', '#f2a7c3'], tel = ['#2f8a3c', '#5a5a66', '#3b5ba8', '#7a3b2a'];
    for (let x = -60; x <= 60; x += 15) add(g, r() < 0.15 ? 'predio' : 'casa', { cor: r.item(cores), telhado: r.item(tel), noite: n, altura: r.entre(7, 9) }, [x + r.entre(-2, 2), 0, -26]);
    for (let x = -50; x <= 50; x += 12) add(g, 'poste', { noite: n }, [x + 3, 0, -9.2], 180);
    for (let i = 0; i < 6; i++) add(g, 'arvore', { tam: r.entre(0.8, 1.2) }, [r.entre(-40, 40), 0, r.entre(-5, -3) - (i % 2) * 18]);
    add(g, 'caixa_correio', {}, [6, 0, -5.5]);
    for (let x = -60; x <= 60; x += 30) add(g, 'predio', { altura: r.entre(25, 45), cor: '#7fa6cf', noite: n }, [x + r.entre(-6, 6), 0, -60]);
    if (!n) nuvens(g, r); else lua(g);
  },
  parque(o, g, r) {
    g.add(caixa(500, 0.2, 500, o.chao || '#4ccd3d', { pos: [0, -0.1, 0] }));
    g.add(caixa(5, 0.06, 200, '#d8c49a', { pos: [-6, 0.02, 0], sombra: false }));
    for (let i = 0; i < 22; i++) { const x = r.entre(-50, 50), z = r.entre(-60, -6); if (Math.abs(x + 6) < 4) continue; add(g, r() < 0.3 ? 'pinheiro' : 'arvore', { tam: r.entre(0.8, 1.3) }, [x, 0, z]); }
    for (let i = 0; i < 10; i++) add(g, 'arbusto', {}, [r.entre(-30, 30), 0, r.entre(-14, -4)]);
    add(g, 'banco', {}, [5, 0, -4]); add(g, 'banco', {}, [-14, 0, -6], 30);
    g.userData.ancoras = { sentar: [5, 0.1, -3.8] };
    g.add(cilindro(7, 7, 0.1, mat('#4fa8e8', { rough: 0.1 }), { pos: [18, 0.05, -16], seg: 32 }));
    for (let i = 0; i < 40; i++) g.add(esfera(0.18, r.item(['#ff4f8b', '#ffd23f', '#ffffff', '#b06bff']), { pos: [r.entre(-20, 20), 0.15, r.entre(-10, 6)], sombra: false }));
    o.hora === 'noite' ? lua(g) : nuvens(g, r);
  },
  fachada(o, g, r) { // frente de uma casa: atores na calçada, parede atrás
    const n = o.hora === 'noite';
    g.add(caixa(500, 0.2, 500, '#4ccd3d', { pos: [0, -0.1, 0] })); g.add(caixa(500, 0.25, 6, '#c9ccd5', { pos: [0, 0.12, 1] }));
    g.add(caixa(30, 12, 1, o.cor || '#e8862f', { pos: [0, 6, -5] })); g.add(caixa(31, 1, 2, o.telhado || '#3d8f3d', { pos: [0, 12.4, -4.6] }));
    add(g, 'porta', { cor: '#ffffff' }, [0, 0, -4.4]);
    janela(g, -8, 6, -4.4, 5, 4, n); janela(g, 8, 6, -4.4, 5, 4, n);
    for (const x of [-12, -4, 4, 12]) add(g, 'arbusto', {}, [x, 0, -3.6]);
    add(g, 'arvore', {}, [-20, 0, -2]); n ? lua(g) : nuvens(g, r);
  },
  sala(o, g, r) {
    const n = o.hora === 'noite'; sala(g, { parede: o.parede || '#e8e6e1', chao: o.chao || '#bfb6a8' });
    janela(g, -6, 6, -7.6, 7, 5, n); janela(g, 6, 6, -7.6, 7, 5, n);
    add(g, 'sofa', { cor: o.cor || '#6b6f80' }, [0, 0, -6]); add(g, 'tv', {}, [10, 0, -2], -60);
    g.userData.ancoras = { sentar: [0, 0, -5.6] }; add(g, 'planta', {}, [-11, 0, -6]);
    g.add(caixa(9, 0.05, 6, '#c76b5a', { pos: [0, 0.03, -1], sombra: false }));
    luzTeto(g, 0, 0, n);
  },
  quarto(o, g, r) {
    const n = o.hora === 'noite'; sala(g, { parede: o.parede || '#c9dcf2', chao: o.chao || '#a8805a' });
    janela(g, 4, 6.5, -7.6, 5, 4, n);
    add(g, 'cama', { cor: o.cor || '#3b6fd8' }, [-7, 0, -3.6]);
    g.userData.ancoras = { deitar: [-7, 1.45, -0.4], sentar: [8, 0, -3.8] }; add(g, 'mesa', { largura: 4 }, [8, 0, -6]); add(g, 'computador', {}, [8, 0, -6.4]);
    add(g, 'cadeira', {}, [8, 0, -3.8], 180);
    g.add(caixa(2.4, 3.2, 0.1, mat('#ff6b6b'), { pos: [-2, 7, -7.7] }));
    luzTeto(g, 0, 0, n);
  },
  escola(o, g, r) {
    const n = o.hora === 'noite'; sala(g, { parede: o.parede || '#f1e7c9', chao: o.chao || '#b99a72', profundo: 10 });
    g.add(caixa(14, 5, 0.3, '#24553b', { pos: [0, 6, -9.6] })); g.add(caixa(14.6, 5.6, 0.2, '#7c5c46', { pos: [0, 6, -9.8] }));
    add(g, 'mesa', { largura: 5, cor: '#7c5c46' }, [-6, 0, -6]);
    for (let z = 2; z <= 12; z += 5) for (const x of [-9, 9]) { add(g, 'carteira', {}, [x, 0, z]); add(g, 'cadeira', { cor: '#2a5bd7' }, [x, 0, z + 1.6]); }
    janela(g, 10, 6.5, -9.6, 4, 3.5, n); luzTeto(g, 0, -2, n); luzTeto(g, 0, 8, n);
  },
  hospital(o, g, r) {
    const n = o.hora === 'noite'; sala(g, { parede: o.parede || '#dcecf2', chao: o.chao || '#c9d3d8' });
    g.add(caixa(1.2, 3.6, 0.2, '#e53935', { pos: [-4, 7, -7.6] })); g.add(caixa(3.6, 1.2, 0.2, '#e53935', { pos: [-4, 7, -7.6] }));
    add(g, 'cama', { cor: '#9fd0e8', lencol: '#ffffff' }, [3, 0, -3.5]);
    g.userData.ancoras = { deitar: [3, 1.45, -0.3] };
    g.add(caixa(1.6, 1.2, 0.8, '#333', { pos: [7, 5, -6.8] })); g.add(plano(1.4, 1.0, mat('#0b2', { emissive: '#0f6', emissiveIntensity: 0.8 }), { pos: [7, 5, -6.39] }));
    g.add(cilindro(0.08, 0.08, 7, '#bbb', { pos: [7, 3.5, -6.8] }));
    janela(g, 10, 6, -7.6, 4, 4, n); luzTeto(g, 0, 0, n);
  },
  casamento(o, g, r) {
    g.add(caixa(500, 0.2, 500, '#4ccd3d', { pos: [0, -0.1, 0] }));
    g.add(caixa(27, 0.1, 45, '#5d616f', { pos: [0, 0.0, 9], sombra: false }));
    for (let x = -12; x <= 12; x += 2) for (let z = -12; z <= 30; z += 2) g.add(caixa(1.92, 0.1, 1.92, (x + z) % 4 === 0 ? '#6c7080' : '#7b7f8f', { pos: [x, 0.05, z], sombra: false }));
    for (const x of [-4, 4]) g.add(caixa(0.6, 9, 0.6, '#ffffff', { pos: [x, 4.5, -6] })); g.add(caixa(9, 0.6, 0.6, '#ffffff', { pos: [0, 9, -6] }));
    for (let i = 0; i < 14; i++) g.add(esfera(0.45, r.item(['#ffffff', '#ffb3d9', '#ff66cc']), { pos: [r.entre(-4.5, 4.5), 9 + r.entre(-0.3, 0.6), -6 + r.entre(-0.4, 0.4)] }));
    for (let z = 4; z <= 16; z += 3) for (const x of [-9, -6.5, 6.5, 9]) add(g, 'cadeira', { cor: '#ffffff' }, [x, 0, z], 180);
    for (let i = 0; i < 12; i++) add(g, 'arvore', { tam: r.entre(0.9, 1.3) }, [r.entre(-40, 40), 0, r.entre(-40, -14)]);
    nuvens(g, r);
  },
  cidade(o, g, r) { // centro da cidade: calçada na frente, avenida, lojas e arranha-céus ao fundo
    const n = o.hora === 'noite';
    g.add(caixa(500, 0.2, 500, '#8f949e', { pos: [0, -0.1, 0] }));
    g.add(caixa(500, 0.25, 12, o.chao || '#c3c7cf', { pos: [0, 0.12, 0] }));
    for (let x = -80; x <= 80; x += 4) g.add(caixa(0.06, 0.02, 12, '#a9aeb8', { pos: [x, 0.26, 0], sombra: false }));   // juntas da calçada
    g.add(caixa(500, 0.1, 11, '#474b57', { pos: [0, 0.02, -11.5] }));
    for (let x = -100; x <= 100; x += 7) g.add(caixa(3, 0.02, 0.3, '#f2f3f3', { pos: [x, 0.08, -11.5], sombra: false }));
    g.add(caixa(500, 0.04, 0.25, '#f5cd30', { pos: [0, 0.09, -10.9], sombra: false })); g.add(caixa(500, 0.04, 0.25, '#f5cd30', { pos: [0, 0.09, -12.1], sombra: false }));
    add(g, 'faixa_pedestre', { comprimento: 10 }, [-16, 0, -11.5]);
    g.add(caixa(500, 0.25, 4, '#c3c7cf', { pos: [0, 0.12, -19] }));
    const nomes = ['PADARIA', 'FARMÁCIA', 'MERCADO', 'LANCHES', 'BANCO', 'CAFÉ', 'CELULARES', 'PIZZARIA', 'SORVETES', 'LIVRARIA'];
    const cores = ['#e85d5d', '#2e9e5b', '#e8862f', '#c4281c', '#1d3b72', '#7c5c46', '#6b32a8', '#d84315', '#ff66cc', '#00897b'];
    let k = r.entre(0, 10) | 0;
    for (let x = -54; x <= 54; x += 10) { const i = k++ % nomes.length; add(g, 'loja', { texto: nomes[i], cor: cores[i], noite: n, parede: r.item(['#f1e7c9', '#e9e6dc', '#d9d4c7', '#f0d9c0']) }, [x, 0, -24]); }
    for (let x = -70; x <= 70; x += 16) add(g, 'arranha_ceu', { altura: r.entre(30, 60), largura: r.entre(10, 14), cor: r.item(['#6f8fb3', '#8aa5c4', '#5f7896', '#9fb3c8']), noite: n }, [x + r.entre(-3, 3), 0, -48]);
    add(g, 'semaforo', { luz: 'vermelho' }, [-11, 0, -5.6]); add(g, 'semaforo', { luz: 'verde' }, [-21, 0, -17.6], 180);
    for (let x = -40; x <= 40; x += 14) add(g, 'poste', { noite: n }, [x + 6, 0, -5.8], 180);
    add(g, 'hidrante', {}, [7, 0, -4.8]); add(g, 'lixeira', {}, [-6, 0, -4.8]); add(g, 'lixeira', { cor: '#1565c0' }, [-4.8, 0, -4.8]);
    add(g, 'taxi', {}, [-30, 0, -9.5], 90); add(g, 'carro', { cor: '#1d3b72' }, [14, 0, -13.5], -90); add(g, 'carro', { cor: '#f2f3f3' }, [-50, 0, -13.5], -90);
    add(g, 'onibus', { texto: 'CENTRO' }, [36, 0, -9.5], 90);
    add(g, 'outdoor', { texto: o.texto || 'VOTE 10', noite: n }, [-30, 0, -32]);
    if (!n) nuvens(g, r); else lua(g);
  },
  praca(o, g, r) { // praça central com fonte, estátua e bancos
    const n = o.hora === 'noite';
    g.add(caixa(500, 0.2, 500, '#4ccd3d', { pos: [0, -0.1, 0] }));
    g.add(cilindro(24, 24, 0.1, '#d6cdb8', { pos: [0, 0.05, -8], seg: 48, sombra: false }));
    for (let a = 0; a < 16; a++) { const ang = a / 16 * Math.PI * 2; g.add(caixa(0.15, 0.02, 24, '#c2b89f', { pos: [Math.sin(ang) * 12, 0.11, -8 + Math.cos(ang) * 12], rot: [0, ang * 180 / Math.PI, 0], sombra: false })); }
    add(g, 'fonte', {}, [0, 0, -12]);
    add(g, 'estatua', { texto: o.texto || 'FUNDADOR' }, [-14, 0, -16], 20);
    for (const [x, z, v] of [[9, -5, -30], [-9, -5, 30], [12, -16, -70], [-6, -22, 10]]) add(g, 'banco', {}, [x, 0, z], v);
    for (const [x, z] of [[-20, -4], [20, -6], [-24, -20], [24, -22], [8, -28], [-12, -30]]) add(g, 'arvore', { tam: r.entre(0.9, 1.3) }, [x, 0, z]);
    for (const x of [-16, 16]) add(g, 'poste', { noite: n }, [x, 0, -2]);
    add(g, 'bandeira', {}, [16, 0, -18]); add(g, 'barraca', { cor: '#c4281c' }, [22, 0, -12], -40);
    for (let x = -60; x <= 60; x += 15) add(g, r() < 0.5 ? 'predio' : 'casa', { altura: r.entre(10, 26), cor: r.item(['#e9e6dc', '#f0b446', '#8fc1e3', '#d9534f']), noite: n }, [x, 0, -46]);
    n ? lua(g) : nuvens(g, r);
  },
  prefeitura(o, g, r) { // fachada da prefeitura com escadaria, colunas e palanque na frente
    const n = o.hora === 'noite';
    g.add(caixa(500, 0.2, 500, '#4ccd3d', { pos: [0, -0.1, 0] }));
    g.add(caixa(40, 0.2, 30, '#d6cdb8', { pos: [0, 0.05, 2] }));
    add(g, 'prefeitura_predio', { texto: o.texto, noite: n }, [0, 0, -20]);
    add(g, 'bandeira', {}, [-11, 0, -9]); add(g, 'bandeira', { cores: ['#ffffff', '#c4281c', '#ffffff'] }, [11, 0, -9]);
    if (o.palanque !== false) add(g, 'palanque', { texto: o.texto_palanque || 'PREFEITURA' }, [0, 0, -3]);
    for (const x of [-18, 18]) add(g, 'arvore', {}, [x, 0, -6]); for (const x of [-26, 26]) add(g, 'arvore', { tam: 1.2 }, [x, 0, -14]);
    for (const x of [-8, 8]) add(g, 'poste', { noite: n }, [x, 0, 3], x < 0 ? 0 : 180);
    g.userData.ancoras = { discursar: [0, 1.52, -2.6] };
    n ? lua(g) : nuvens(g, r);
  },
  praca_cheia(o, g, r) { // a praça com muita gente reunida (a multidão vem do roteiro; padrão: ~30 pessoas em rodinhas)
    CENARIOS.praca(o, g, r);
    add(g, 'barraca', { cor: '#1e88e5' }, [-22, 0, -8], 40); add(g, 'carro', { cor: '#f5cd30' }, [-26, 0, -26], 30);
    for (const [x, z] of [[-5, -20], [5, -20], [-18, -12], [18, -4]]) add(g, 'vaso_flor', {}, [x, 0, z]);
  },
  centro(o, g, r) { // avenida principal vista de frente: lojas dos dois lados, prefeitura no fim
    const n = o.hora === 'noite';
    g.add(caixa(500, 0.2, 500, '#8f949e', { pos: [0, -0.1, 0] }));
    g.add(caixa(12, 0.1, 76, '#474b57', { pos: [0, 0.02, -27] }));                                   // avenida (ao longo de z)
    for (let z = 10; z > -62; z -= 7) g.add(caixa(0.3, 0.02, 3, '#f2f3f3', { pos: [0, 0.08, z], sombra: false }));
    for (const s2 of [-1, 1]) { g.add(caixa(5, 0.25, 76, '#c3c7cf', { pos: [s2 * 8.5, 0.12, -27] })); g.add(caixa(0.3, 0.3, 76, '#d6d9df', { pos: [s2 * 6.1, 0.15, -27] })); }
    add(g, 'faixa_pedestre', { comprimento: 12 }, [0, 0, 4]).rotation.y = Math.PI / 2;
    const esq = [['PADARIA', '#e8862f'], ['FARMÁCIA', '#2e9e5b'], ['MERCADO', '#c4281c'], ['AÇOUGUE', '#8a1f1f'], ['LOTÉRICA', '#1d3b72'], ['PAPELARIA', '#6b32a8']];
    const dir = [['BANCO', '#1d3b72'], ['LANCHONETE', '#d84315'], ['SORVETERIA', '#ff66cc'], ['ÓTICA', '#00897b'], ['LOJA DE ROUPAS', '#6b32a8'], ['PIZZARIA', '#c4281c']];
    [[esq, -1], [dir, 1]].forEach(([lista, s2]) => lista.forEach(([nome, c], i) => { const z = -2 - i * 11;
      add(g, 'loja', { texto: nome, cor: c, noite: n, largura: 10, parede: r.item(['#f1e7c9', '#e9e6dc', '#d9d4c7', '#f0d9c0']) }, [s2 * 14.2, 0, z], -s2 * 90);
      const pl = PROPS.placa_lateral({ texto: nome, cor: c, noite: n }); pl.position.set(s2 * 11.1, 6.2, z + 3); pl.rotation.y = -s2 * Math.PI / 2; g.add(pl);
      if (i % 2 === 0) add(g, 'poste', { noite: n }, [s2 * 6.6, 0, z - 5], s2 > 0 ? 180 : 0);
      if (r() < 0.6) add(g, r.item(['lixeira', 'hidrante', 'vaso_flor', 'banco']), {}, [s2 * 9.8, 0, z + r.entre(-3, 3)], s2 * -90); }));
    for (const s2 of [-1, 1]) for (let i = 0; i < 4; i++) add(g, 'arranha_ceu', { altura: r.entre(28, 50), cor: r.item(['#6f8fb3', '#8aa5c4', '#9fb3c8']), noite: n }, [s2 * 30, 0, -10 - i * 18]);
    add(g, 'prefeitura_predio', { noite: n }, [0, 0, -86]);
    add(g, 'bandeira', {}, [-10, 0, -76]); add(g, 'bandeira', { cores: ['#ffffff', '#c4281c', '#ffffff'] }, [10, 0, -76]);
    g.add(caixa(44, 0.15, 18, '#d6cdb8', { pos: [0, 0.1, -72] })); for (const x of [-14, 14]) add(g, 'arvore', { tam: 1.1 }, [x, 0, -68]);
    add(g, 'taxi', {}, [-3, 0, -20], 90); add(g, 'onibus', { texto: 'CENTRO' }, [3, 0, -40], -90); add(g, 'carro', { cor: '#f2f3f3' }, [-3, 0, -52], 90);
    add(g, 'semaforo', { luz: 'verde' }, [-6.8, 0, 5.5]);
    if (!n) nuvens(g, r); else lua(g);
  },
  cidade_pequena(o, g, r) { construirCidade(o, g, r); if (o.local && o.local !== 'vista') { enquadrarLocal(g, o.local); recortarMundo(g, o.alcance ?? 80); g.userData.jaEnquadrado = true; } },
  mundo(o, g, r) { // MUNDO INTEGRADO: praça no centro, prédios ocos por fora e por dentro, portas automáticas, casa do protagonista
    construirMundo(o, g, r); const e = enquadrarMundo(g, o);
    // só existe o pedaço do mundo em volta do local gravado
    const vista = !o.local || o.local === 'vista', principal = g.children.find(c => c.userData?.lote?.id === o.local);
    const raio = o.alcance ?? (vista ? Infinity : o.comodo ? 4 : o.dentro ? 30 : 80);
    g.userData.recortados = recortarMundo(g, raio, principal ? [principal] : []);
    if (o.comodo === 'quarto_pais' && e.ancoras.deitar_pais) { e.ancoras.deitar = e.ancoras.deitar_pais; e.ancoras.dormir = e.ancoras.deitar_pais; }
    g.userData.ancoras = e.ancoras; },
  casa_protagonista(o, g, r) { construirCasa(o, g, r); const e = enquadrarComodo(g, o.comodo); g.userData.ancoras = e.ancoras; g.userData.limites = e.limites; },   // casa completa (use `comodo:`)   // modelo da cidade inteira (use `local:` para escolher onde a cena acontece)
  gabinete(o, g, r) { // escritório do prefeito: mesa, poltrona, bandeiras, estante, mesa de reunião, sofá e janelões
    const n = o.hora === 'noite'; sala(g, { largura: 30, parede: o.parede || '#e9dcc4', chao: o.chao || '#6b4426', profundo: 10, altura: 12 });
    g.add(caixa(30, 1.4, 0.2, '#5a3a22', { pos: [0, 0.7, -9.7] })); g.add(caixa(30, 0.25, 0.25, '#c9a24a', { pos: [0, 1.45, -9.7] }));   // lambri
    g.add(caixa(11, 0.05, 8, '#7b1f2b', { pos: [0, 0.03, -4.5], sombra: false })); g.add(caixa(10.4, 0.06, 7.4, '#9b2f3b', { pos: [0, 0.04, -4.5], sombra: false }));
    add(g, 'mesa_escritorio', {}, [0, 0, -5.2], 180); add(g, 'poltrona', {}, [0, 0, -8.0]);
    for (const x of [-2.2, 2.2]) add(g, 'cadeira', { cor: '#5a3a22' }, [x, 0, -1.4], 180);
    add(g, 'bandeira', { cores: ['#1f9d48', '#f5cd30', '#1d3b72'] }, [-5, 0, -8.6]).scale.setScalar(0.75); add(g, 'bandeira', { cores: ['#ffffff', '#c4281c', '#ffffff'] }, [5, 0, -8.6]).scale.setScalar(0.75);
    const q = PROPS.quadro_parede({ texto: 'PREFEITO', cor: '#1d3b72' }); q.position.set(0, 8.2, -9.65); g.add(q);
    add(g, 'estante', {}, [11.5, 0, -9.0]); for (const [x, c] of [[10.2, '#e0b040'], [12.6, '#c9c9c9']]) g.add(cilindro(0.25, 0.4, 1.0, mat(c, { metal: 0.8, rough: 0.3 }), { pos: [x, 8.5, -8.6] }));   // troféus
    for (const x of [-10.5, -4.5]) { janela(g, x, 6.5, -9.6, 4, 6, n); const c = PROPS.cortina({ cor: '#7b1f2b', largura: 4.6 }); c.position.set(x, 10.2, -9.2); g.add(c); }
    const mr = PROPS.mesa({ largura: 7, cor: '#5a3a22' }); mr.position.set(-9, 0, 2); mr.rotation.y = Math.PI / 2; g.add(mr);
    for (const z of [-0.5, 2, 4.5]) for (const s2 of [-1, 1]) add(g, 'cadeira', { cor: '#2a1a12' }, [-9 + s2 * 2.2, 0, z], s2 > 0 ? -90 : 90);
    add(g, 'sofa', { cor: '#2a1a12' }, [10, 0, 2], -90); add(g, 'mesa_centro', {}, [6.5, 0, 2], 90); add(g, 'planta', {}, [13, 0, -4]); add(g, 'planta', {}, [-13, 0, -6]);
    g.userData.ancoras = { sentar: [0, 0, -7.7], assinar: [0, 0, -7.4] };
    luzTeto(g, -6, -2, n); luzTeto(g, 6, -2, n);
  },
  celular(o, g, r) { // close na tela do celular (use `tela: {tipo, ...}`)
    g.add(caixa(60, 60, 1, o.cor || '#6b7a99', { pos: [0, 4, -6] }));
    const tel = grupo([caixa(3.3, 6.6, 0.35, '#111', { round: 0.3 })]);
    tel.add(plano(3.0, 6.0, new THREE.MeshBasicMaterial({ map: texturaTela(o.tela) }), { pos: [0, 0, 0.18] }));
    tel.position.set(0, 4.4, 0); tel.rotation.set(-0.05, 0, 0.04); g.add(tel);
  },
  vazio(o, g, r) { g.add(caixa(500, 0.2, 500, o.chao || '#d5d9e2', { pos: [0, -0.1, 0] })); },
};
Object.assign(CENARIOS, INTERIORES);
const INTERNOS = new Set(['sala', 'quarto', 'escola', 'hospital', 'gabinete', 'cozinha', 'casa_protagonista', ...Object.keys(INTERIORES)]);
export const NOMES_CENARIOS = Object.keys(CENARIOS);

export function construirCenario(nome, o = {}) {
  const fn = CENARIOS[nome] || CENARIOS.vazio;
  const g = new THREE.Group(); const r = rng(o.seed ?? nome);
  fn(o, g, r);
  if (nome === 'cidade_pequena' && !g.userData.jaEnquadrado) enquadrarLocal(g, o.local);
  g.traverse(m => { if (m.isMesh) { m.receiveShadow = true; if (m.castShadow === undefined) m.castShadow = true; } });
  const interno = INTERNOS.has(nome) || (nome === 'mundo' && !!(o.dentro || o.comodo));
  const amb = ambiente(o.hora || 'dia', interno);
  if (nome === 'celular') { amb.ceu = o.cor || '#6b7a99'; amb.nevoa = [200, 400]; }
  if (nome === 'vazio') { amb.ceu = o.cor || '#eef1f6'; amb.nevoa = [60, 140]; }
  if (nome === 'cidade_pequena' || nome === 'mundo') { amb.nevoa = [140, 600]; amb.sombra = (!o.local || o.local === 'vista') ? 150 : 50; }
  return { grupo: g, ...amb, ancoras: g.userData.ancoras || {}, limites: g.userData.limites, unidades: g.userData.unidades, portas: g.userData.portas, interno, cameraFixa: nome === 'celular' };
}
