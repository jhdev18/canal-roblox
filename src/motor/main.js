// Núcleo do motor: monta uma cena a partir do JSON gerado pelo Node e renderiza quadro a quadro (determinístico).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { criarPersonagem } from './personagem.js';
import { construirCenario } from './cenarios.js';
import { criarProp } from './props.js';
import { posicionarCamera } from './camera.js';
import { ACOES, LOCOMOCAO, percorrer } from './acoes.js';
import { rng } from './util.js';
import { carregarRostosPersonalizados } from './rostos.js';
import { cor } from './util.js';

let R, composer, cena, cam, sol, hemi, cfg, atual;

function iniciar(c) {
  cfg = { largura: 1080, altura: 1920, fps: 30, ao: true, sombra: 2048, ...c };
  R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  R.setPixelRatio(1); R.setSize(cfg.largura, cfg.altura, false);
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  R.toneMapping = THREE.NeutralToneMapping; R.toneMappingExposure = 1.35;   // "three.js+" (escolhido na comparação)
  R.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById('palco').appendChild(R.domElement);
  cena = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(40, cfg.largura / cfg.altura, 0.1, 1200);
  hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6b8a5a, 1.3); cena.add(hemi);
  sol = new THREE.DirectionalLight(0xfff4e0, 3.4); sol.castShadow = true;
  Object.assign(sol.shadow.camera, { left: -35, right: 35, top: 35, bottom: -35, near: 1, far: 220 });
  sol.shadow.mapSize.set(cfg.sombra, cfg.sombra); sol.shadow.radius = 6; sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.02;
  cena.add(sol, sol.target);
  composer = new EffectComposer(R); composer.addPass(new RenderPass(cena, cam));
  if (cfg.ao) { const ao = new GTAOPass(cena, cam, cfg.largura, cfg.altura); ao.updateGtaoMaterial({ radius: 1.2, distanceFallOff: 1, thickness: 1 }); ao.blendIntensity = 1; composer.addPass(ao); }
  composer.addPass(new OutputPass());
  composer.setSize(cfg.largura, cfg.altura);
  return true;
}

/** Posição base de cada ator (auto-distribui quem não tem x). */
const ANCORA_DA_ACAO = { deitar: 'deitar', dormir: 'deitar', sentar: 'sentar', discursar: 'discursar', assinar: 'assinar' };
function posicoes(atores, ancoras = {}) {
  const usadas = {};
  const semX = atores.filter(a => a.x === undefined && !(ancoras[ANCORA_DA_ACAO[a.acao]] && a.y === undefined)); const n = semX.length;
  return atores.map(a => {
    const anc = ancoras[ANCORA_DA_ACAO[a.acao]];
    if (anc && a.y === undefined) { // vai sozinho para a cama/sofá do cenário (y explícito no roteiro = posição manual)
      const k = usadas[a.acao] = (usadas[a.acao] ?? -1) + 1;
      return { x: anc[0] + (a.acao === 'sentar' ? k * 2.2 : k * 0), y: anc[1], z: anc[2], vira: 0 };
    }
    let x = a.x, vira = a.vira;
    if (x === undefined) { const i = semX.indexOf(a); x = (i - (n - 1) / 2) * 3.4; }
    if (vira === undefined) vira = atores.length > 1 ? (x < 0 ? 25 : x > 0 ? -25 : 0) : 0;
    const caminho = a.caminho || (a.ate ? [a.ate] : null);
    return { x, z: a.z ?? 0, y: a.y ?? 0, vira, caminho };
  });
}
function posNoTempo(a, t) { // posição da raiz do ator no tempo t (sem tocar na pose atual)
  const q = (ACOES[a.acao] || ACOES.parado)(t, atual.dur, a.p || {}); const v = THREE.MathUtils.degToRad(a.base.vira);
  if (a.base.caminho?.length && LOCOMOCAO.has(a.acao)) { const r = percorrer(a.base.x, a.base.z, a.base.caminho, q.frente); return new THREE.Vector3(r.x, a.base.y, r.z); }
  return new THREE.Vector3(a.base.x + Math.sin(v) * q.frente, a.base.y, a.base.z + Math.cos(v) * q.frente);
}

async function montar(c) {
  if (atual) { cena.remove(atual.raiz); }
  const raiz = new THREE.Group(); cena.add(raiz);
  const cen = construirCenario(c.cenario, { hora: c.hora, seed: c.seed, cor: c.cor, chao: c.chao, parede: c.parede, tela: c.tela, texto: c.texto, texto_palanque: c.texto_palanque, palanque: c.palanque });
  raiz.add(cen.grupo);
  cena.background = cor(cen.ceu); cena.fog = new THREE.Fog(cor(cen.ceu), cen.nevoa[0], cen.nevoa[1]);
  sol.color = cor(cen.sol.cor); sol.intensity = cen.sol.forca; hemi.color = cor(cen.hemi[0]); hemi.groundColor = cor(cen.hemi[1]); hemi.intensity = cen.hemi[2];
  for (const p of c.props || []) { const o = criarProp(p); if (o) raiz.add(o); }
  await carregarRostosPersonalizados((c.atores || []).flatMap(a => [a.rosto, a.spec?.rosto]).filter(Boolean));
  const bases = posicoes(c.atores || [], cen.ancoras);
  const atores = (c.atores || []).map((a, i) => {
    const p = criarPersonagem(a.spec); raiz.add(p.raiz);
    p.setRosto(a.rosto || p.rostoPadrao(a.acao), a.spec.extras || []);
    p.setProp(a.prop === undefined ? p.propPadrao(a.acao) : a.prop, { texto: a.prop_texto, cor: a.prop_cor });
    return { ...a, ator: p, base: bases[i] };
  });
  if (c.multidao) for (const f of criarMultidao(c.multidao, c.seed ?? c.cenario)) { raiz.add(f.ator.raiz); atores.push(f); }
  const prin = atores.filter(a => !a.figurante).map(a => a.base.x);
  const xs = prin; const espalha = xs.length > 1 ? Math.max(...xs) - Math.min(...xs) : 0;
  atual = { c, raiz, atores, cen, dur: c.dur, espalha, nquadros: Math.max(1, Math.round(c.dur * cfg.fps)) };
  posar(0); // garante shaders compilados antes do 1º quadro
  R.compile(cena, cam);
  return atual.nquadros;
}

// ---------- multidão de figurantes (gerada, não precisa de elenco) ----------
const PELES = ['amarelo', 'pele_clara', 'pele_media', 'pele_escura', 'amarelo'];
const ROUPAS_F = ['azul', 'vermelho', 'verde', 'roxo', 'laranja', 'branco', 'preto', 'rosa', 'ciano', 'cinza', '#3b6fd8', '#f5cd30'];
const CABELOS = [[], ['cabelo_curto'], ['cabelo_espetado'], ['cabelo_longo'], ['bone'], ['rabo_de_cavalo'], ['cabelo_curto'], ['coque'], ['touca']];
function criarMultidao(m, seed) {
  const r = rng('multidao' + seed + (m.seed || '')); const n = Math.min(m.n ?? 12, 40);
  const [x0, x1, z0, z1] = m.area || [-10, 10, -9, -4];
  const acoes = [].concat(m.acao || ['parado', 'palmas', 'acenar', 'comemorar']);
  const out = [];
  for (let i = 0; i < n; i++) {
    const spec = { id: 'fig' + i, pele: r.item(PELES), camisa: r.item(ROUPAS_F), calca: r.item(['azul', 'preto', 'cinza_escuro', 'verde_noob', 'marrom', 'bege']),
      acessorios: r.item(CABELOS), cabelo_cor: r.item(['#2b1d14', '#111', '#7c5c46', '#e0b040', '#c9c9c9']), rosto: 'neutro',
      bone_cor: r.item(ROUPAS_F), extras: r() < 0.15 ? ['oculos'] : r() < 0.1 ? ['barba'] : [] };
    const ator = criarPersonagem(spec); const acao = r.item(acoes);
    ator.setRosto(m.rosto || r.item(['feliz', 'sorriso', 'neutro', ...(acao === 'parado' ? ['desconfiado'] : ['rindo'])]), spec.extras);
    if (m.prop) ator.setProp(m.prop, { texto: r.item([].concat(m.prop_texto || 'FORA!')) });
    const x = r.entre(x0, x1), z = r.entre(z0, z1);
    const vira = m.vira ?? (Math.atan2(-x, (m.olhar_z ?? 0) - z) * 180 / Math.PI) + r.entre(-10, 10);
    out.push({ id: spec.id, figurante: true, spec, acao, p: {}, atraso: r.entre(0, 3), ator, base: { x, z, y: 0, vira } });
  }
  return out;
}

function alvo(t) {
  const { c } = atual; const atores = atual.atores.filter(a => !a.figurante);
  if (!atores.length || atual.cen.cameraFixa) return new THREE.Vector3(0, atual.cen.cameraFixa ? -0.2 : 0, 0);
  const foco = atores.filter(a => !c.foco || a.id === c.foco);
  const v = new THREE.Vector3(); (foco.length ? foco : atores).forEach(a => v.add(posNoTempo(a, t))); return v.divideScalar(foco.length || atores.length);
}

function posar(t) {
  const { atores, c, dur } = atual;
  for (const a of atores) a.ator.posar(a.acao, t + (a.atraso || 0), dur, a.p || {}, a.base);
  const camC = atual.cen.cameraFixa ? { camera: 'detalhe', mov: c.mov || 'zoom_in', angulo: 0, dist: c.dist || 3.1 } : c;
  posicionarCamera(cam, camC, t, dur, alvo, atores.length && !c.foco ? atual.espalha : 0);
  const foco = alvo(t); const d = new THREE.Vector3(...atual.cen.sol.dir).normalize();
  sol.target.position.copy(foco); sol.position.copy(foco).addScaledVector(d, 80); sol.target.updateMatrixWorld();
}

function quadro(f, formato = 'image/jpeg', q = 0.93) {
  posar(f / cfg.fps); composer.render();
  return R.domElement.toDataURL(formato, q);
}
function quadros(f0, n) { const out = []; for (let f = f0; f < Math.min(f0 + n, atual.nquadros); f++) out.push(quadro(f)); return out; }

// ---------- Prévia ao vivo no navegador (npm run preview) ----------
async function preview() {
  const job = await (await fetch('/cache/preview/job.json')).json();
  iniciar({ ...job.render, ao: job.render.ao });
  const leg = document.getElementById('legenda'), info = document.getElementById('info');
  let i = 0, pausado = false; const audio = new Audio();
  document.addEventListener('keydown', e => { if (e.key === ' ') { pausado = !pausado; pausado ? audio.pause() : audio.play(); } if (e.key === 'ArrowRight') tocar(i + 1); if (e.key === 'ArrowLeft') tocar(i - 1); });
  async function tocar(n) {
    i = (n + job.cenas.length) % job.cenas.length; const c = job.cenas[i];
    await montar(c); info.textContent = `cena ${i + 1}/${job.cenas.length} · ${c.cenario} · ${c.camera || ''} ${c.mov || ''}`;
    if (c.audio_url) { audio.src = c.audio_url; audio.currentTime = 0; audio.play().catch(() => {}); }
    const t0 = performance.now();
    const loop = () => { if (job.cenas[i] !== c) return; if (pausado) return requestAnimationFrame(loop);
      const t = (performance.now() - t0) / 1000; if (t >= c.dur) return tocar(i + 1);
      posar(t); composer.render(); const w = (c.palavras || []).find(p => t >= p.ini && t < p.fim); leg.textContent = w ? w.texto : '';
      requestAnimationFrame(loop); };
    loop();
  }
  document.body.addEventListener('click', () => audio.play().catch(() => {}), { once: true });
  tocar(0);
}

window.motor = { iniciar, montar, quadro, quadros, preview, pronto: true };
if (new URLSearchParams(location.search).has('preview')) preview();
