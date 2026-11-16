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
import { ACOES } from './acoes.js';
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
function posicoes(atores) {
  const semX = atores.filter(a => a.x === undefined); const n = semX.length;
  return atores.map(a => {
    let x = a.x, vira = a.vira;
    if (x === undefined) { const i = semX.indexOf(a); x = (i - (n - 1) / 2) * 3.4; }
    if (vira === undefined) vira = atores.length > 1 ? (x < 0 ? 25 : x > 0 ? -25 : 0) : 0;
    return { x, z: a.z ?? 0, y: a.y ?? 0, vira };
  });
}
function posNoTempo(a, t) { // posição da raiz do ator no tempo t (sem tocar na pose atual)
  const q = (ACOES[a.acao] || ACOES.parado)(t, atual.dur, a.p || {}); const v = THREE.MathUtils.degToRad(a.base.vira);
  return new THREE.Vector3(a.base.x + Math.sin(v) * q.frente, a.base.y, a.base.z + Math.cos(v) * q.frente);
}

async function montar(c) {
  if (atual) { cena.remove(atual.raiz); }
  const raiz = new THREE.Group(); cena.add(raiz);
  const cen = construirCenario(c.cenario, { hora: c.hora, seed: c.seed, cor: c.cor, chao: c.chao, parede: c.parede, tela: c.tela });
  raiz.add(cen.grupo);
  cena.background = cor(cen.ceu); cena.fog = new THREE.Fog(cor(cen.ceu), cen.nevoa[0], cen.nevoa[1]);
  sol.color = cor(cen.sol.cor); sol.intensity = cen.sol.forca; hemi.color = cor(cen.hemi[0]); hemi.groundColor = cor(cen.hemi[1]); hemi.intensity = cen.hemi[2];
  for (const p of c.props || []) { const o = criarProp(p); if (o) raiz.add(o); }
  await carregarRostosPersonalizados((c.atores || []).flatMap(a => [a.rosto, a.spec?.rosto]).filter(Boolean));
  const bases = posicoes(c.atores || []);
  const atores = (c.atores || []).map((a, i) => {
    const p = criarPersonagem(a.spec); raiz.add(p.raiz);
    p.setRosto(a.rosto || p.rostoPadrao(a.acao), a.spec.extras || []);
    p.setProp(a.prop === undefined ? p.propPadrao(a.acao) : a.prop);
    return { ...a, ator: p, base: bases[i] };
  });
  const xs = bases.map(b => b.x); const espalha = xs.length > 1 ? Math.max(...xs) - Math.min(...xs) : 0;
  atual = { c, raiz, atores, cen, dur: c.dur, espalha, nquadros: Math.max(1, Math.round(c.dur * cfg.fps)) };
  posar(0); // garante shaders compilados antes do 1º quadro
  R.compile(cena, cam);
  return atual.nquadros;
}

function alvo(t) {
  const { atores, c } = atual;
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
