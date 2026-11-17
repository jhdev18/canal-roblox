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
import { ACOES, LOCOMOCAO, percorrer, ROSTO_DA_ACAO, PROP_DA_ACAO } from './acoes.js';
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
  cam = new THREE.PerspectiveCamera(40, cfg.largura / cfg.altura, 0.4, 1200);   // near maior = mais precisão de profundidade (menos z-fighting)
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
const ANCORA_DA_ACAO = { deitar: 'deitar', dormir: 'deitar', sentar: 'sentar', discursar: 'discursar', assinar: 'assinar', cozinhar: 'cozinhar', lavar_louca: 'lavar_louca', atender: 'atender', rezar: 'rezar', segurar_grade: 'segurar_grade', jogar_pc: 'jogar_pc' };
function posicoes(atores, ancoras = {}) {
  const usadas = {}, ocupados = new Set();
  const semX = atores.filter(a => a.x === undefined && !(ancoras[ANCORA_DA_ACAO[a.acao]] && a.y === undefined)); const n = semX.length;
  return atores.map(a => {
    const anc = ancoras[ANCORA_DA_ACAO[a.acao]];
    if (anc && a.y === undefined && Array.isArray(anc[0])) { // lista de assentos reais: pega o primeiro livre
      const p = anc.find(q => !ocupados.has(q.join())) || anc[0]; ocupados.add(p.join());
      return { x: p[0], y: p[1], z: p[2], vira: p[3] ?? 0 };
    }
    if (anc && a.y === undefined) { // vai sozinho para a cama/sofá do cenário (y explícito no roteiro = posição manual)
      const k = usadas[a.acao] = (usadas[a.acao] ?? -1) + 1;
      const v = anc[3] ?? 0, passo = a.acao === 'sentar' ? k * 2.2 : 0;
      return { x: anc[0] + passo * Math.cos(v * Math.PI / 180), y: anc[1], z: anc[2] - passo * Math.sin(v * Math.PI / 180), vira: v };
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
  const cen = construirCenario(c.cenario, { local: c.local, comodo: c.comodo, dentro: c.dentro, alcance: c.alcance, hora: c.hora, seed: c.seed, cor: c.cor, chao: c.chao, parede: c.parede, tela: c.tela, texto: c.texto, texto_palanque: c.texto_palanque, palanque: c.palanque });
  raiz.add(cen.grupo);
  cena.background = cor(cen.ceu); cena.fog = new THREE.Fog(cor(cen.ceu), cen.nevoa[0], cen.nevoa[1]);
  const sr = cen.sombra || 35; Object.assign(sol.shadow.camera, { left: -sr, right: sr, top: sr, bottom: -sr, far: 120 + sr * 2 }); sol.shadow.camera.updateProjectionMatrix();
  sol.color = cor(cen.sol.cor); sol.intensity = cen.sol.forca; hemi.color = cor(cen.hemi[0]); hemi.groundColor = cor(cen.hemi[1]); hemi.intensity = cen.hemi[2];
  for (const p of c.props || []) { const o = criarProp(p); if (o) raiz.add(o); }
  await carregarRostosPersonalizados((c.atores || []).flatMap(a => [a.rosto, a.spec?.rosto]).filter(Boolean));
  const bases = posicoes(c.atores || [], cen.ancoras);
  const atores = (c.atores || []).map((a, i) => {
    const p = criarPersonagem(a.spec); raiz.add(p.raiz);
    p.setRosto(a.rosto || p.rostoPadrao(a.acao), a.spec.extras || []);
    p.setProp(a.prop === undefined ? p.propPadrao(a.acao) : a.prop, { texto: a.prop_texto, cor: a.prop_cor });
    const petTipo = a.pet || (a.acao === 'passear_cachorro' ? 'cachorro' : null);
    const pet = petTipo ? criarProp({ tipo: petTipo, cor: a.pet_cor }) : null; if (pet) raiz.add(pet);
    return { ...a, ator: p, base: bases[i], pet };
  });
  if (c.multidao) for (const f of criarMultidao({ ...c.multidao, ancoraFila: cen.ancoras.fila }, c.seed ?? c.cenario)) { raiz.add(f.ator.raiz); if (f.pet) raiz.add(f.pet); atores.push(f); }
  const prin = atores.filter(a => !a.figurante).map(a => a.base.x);
  const xs = prin; const espalha = xs.length > 1 ? Math.max(...xs) - Math.min(...xs) : 0;
  atual = { c, raiz, atores, cen, dur: c.dur, espalha, nquadros: Math.max(1, Math.round(c.dur * cfg.fps)) };
  // mundo integrado: paredes que somem (corte) e portas automáticas
  cena.updateMatrixWorld(true);
  atual.unidades = cen.unidades || []; atual.corteMeshes = []; for (const u of atual.unidades) { u.traverse(m => { if (m.isMesh) atual.corteMeshes.push(m); }); if (u.userData.movel) u.userData.caixa = new THREE.Box3().setFromObject(u); }
  atual.portas = (cen.portas || []).map(piv => ({ piv, c: piv.localToWorld(new THREE.Vector3(1.2, 0, 0)) }));
  liberarVisao();
  posar(0); // garante shaders compilados antes do 1º quadro
  R.compile(cena, cam);
  return atual.nquadros;
}

// ---------- multidão de figurantes (gerada, não precisa de elenco) ----------
const PELES = ['amarelo', 'pele_clara', 'pele_media', 'pele_escura', 'amarelo'];
const ROUPAS_F = ['azul', 'vermelho', 'verde', 'roxo', 'laranja', 'branco', 'preto', 'rosa', 'ciano', 'cinza', '#3b6fd8', '#f5cd30'];
const CABELOS = [[], ['cabelo_curto'], ['cabelo_espetado'], ['cabelo_longo'], ['bone'], ['rabo_de_cavalo'], ['cabelo_curto'], ['coque'], ['touca']];
const CONVERSA = ['falar', 'rir', 'concordar', 'negar', 'parado', 'cochichar', 'celular', 'palmas', 'falar', 'comer', 'acenar', 'olhar_redor'];
function specAleatorio(r, i) {
  return { id: 'fig' + i, pele: r.item(PELES), camisa: r.item(ROUPAS_F), calca: r.item(['azul', 'preto', 'cinza_escuro', 'verde_noob', 'marrom', 'bege']),
    acessorios: r.item(CABELOS), cabelo_cor: r.item(['#2b1d14', '#111', '#7c5c46', '#e0b040', '#c9c9c9']), rosto: 'neutro',
    bone_cor: r.item(ROUPAS_F), extras: r() < 0.15 ? ['oculos'] : r() < 0.1 ? ['barba'] : [] };
}
/**
 * Figurantes. m = { n, area:[x0,x1,z0,z1], acao, modo: espalhado|grupos|passantes, specs (personagens do elenco), prop, prop_texto, rosto, olhar_z, livre: raio livre no centro }
 */
function criarMultidao(m, seed) {
  const r = rng('multidao' + seed + (m.seed || '')); const n = Math.min(m.n ?? 12, 40);
  const [x0, x1, z0, z1] = m.area || [-10, 10, -9, -4];
  const modo = m.modo || 'espalhado', livre = m.livre ?? 0;
  const acoes = [].concat(m.acao || (modo === 'fila' ? ['esperar', 'parado', 'celular', 'esperar', 'olhar_redor', 'cocar_cabeca'] : modo === 'grupos' ? CONVERSA : modo === 'passantes' ? ['andar', 'andar', 'andar_celular', 'passear_cachorro', 'andar'] : ['parado', 'palmas', 'acenar', 'comemorar']));
  const specs = [...(m.specs || [])].sort(() => r() - 0.5);
  const evitar = (x, z) => Math.hypot(x, z) < livre || (m.evitar || []).some(([ex, ez, er]) => Math.hypot(x - ex, z - ez) < er);
  const ocupados = []; const minimo = m.espaco ?? (modo === 'grupos' ? 7 : 2.8);
  const livreDe = (x, z) => ocupados.every(([ox, oz]) => Math.hypot(x - ox, z - oz) >= minimo);
  const ponto = () => { for (let k = 0; k < 80; k++) { const x = r.entre(x0, x1), z = r.entre(z0, z1); if (!evitar(x, z) && livreDe(x, z)) { ocupados.push([x, z]); return [x, z]; } } return null; };
  // posições conforme o modo
  const lugares = [];
  if (modo === 'grupos') {
    while (lugares.length < n) { const pt = ponto(); if (!pt) break; const [cx, cz] = pt; const k = Math.min(n - lugares.length, 2 + Math.floor(r() * 3)); const g0 = r() * 6.28;
      for (let j = 0; j < k; j++) { const a = g0 + j / k * 6.28 + r.entre(-0.3, 0.3), rr = k === 2 ? 1.5 : 2.0;
        const x = cx + Math.sin(a) * rr, z = cz + Math.cos(a) * rr; lugares.push({ x, z, vira: Math.atan2(cx - x, cz - z) * 180 / Math.PI }); } }
  } else if (modo === 'fila') { // uma pessoa atrás da outra, cada uma olhando para a da frente
    const F = { inicio: [0, -2.2], vira: 180, cresce: [0, 1], ...(m.ancoraFila || {}), ...(m.inicio ? { inicio: m.inicio } : {}), ...(m.cresce ? { cresce: m.cresce } : {}) };
    const L = Math.hypot(...F.cresce) || 1, dx = F.cresce[0] / L, dz = F.cresce[1] / L, esp = m.espaco ?? 2.3;
    const pts = F.caminho?.length ? [F.inicio, ...F.caminho] : null;   // fila com curvas (cordão): segue os pontos
    const aoLongo = (d) => { for (let k = 0; k < pts.length - 1; k++) { const [ax, az] = pts[k], [bx, bz] = pts[k + 1], s = Math.hypot(bx - ax, bz - az);
        if (d <= s || k === pts.length - 2) { const t = d / s; return [ax + (bx - ax) * t, az + (bz - az) * t]; } d -= s; } };
    for (let i = 0; i < n; i++) { const curva = pts ? 0 : Math.sin(i * 0.9) * 0.35; const [bx, bz] = pts ? aoLongo(esp * i) : [F.inicio[0] + dx * esp * i, F.inicio[1] + dz * esp * i];
      const x = bx + dz * curva, z = bz - dx * curva;
      const px = i === 0 ? null : lugares[i - 1]; lugares.push({ x, z, vira: px ? Math.atan2(px.x - x, px.z - z) * 180 / Math.PI : F.vira }); }
  } else if (modo === 'passantes') {
    for (let i = 0; i < n; i++) { const lado = r() < 0.5 ? -1 : 1, faixa = m.faixas || [[x0, x0 + 2.5], [x1 - 2.5, x1]];
      const fx = faixa[lado < 0 ? 0 : 1]; let ok = null;
      for (let k = 0; k < 40 && !ok; k++) { const x = r.entre(fx[0], fx[1]), z = r.entre(z0, z1); if (livreDe(x, z)) { ok = [x, z]; ocupados.push(ok); } }
      if (ok) lugares.push({ x: ok[0], z: ok[1], vira: r() < 0.5 ? 0 : 180, vel: r.entre(3, 5.5) }); }
  } else {
    for (let i = 0; i < n; i++) { const pt = ponto(); if (!pt) break; const [x, z] = pt; lugares.push({ x, z, vira: m.vira ?? (Math.atan2(-x, (m.olhar_z ?? 0) - z) * 180 / Math.PI) + r.entre(-10, 10) }); }
  }
  return lugares.slice(0, n).map((L, i) => {
    const spec = specs.length && (i < specs.length) && r() < (m.mistura ?? 0.8) ? { ...specs[i], id: 'fig' + i } : specAleatorio(r, i);
    const ator = criarPersonagem(spec); let acao = r.item(acoes);
    if (modo !== 'passantes' && LOCOMOCAO.has(acao)) acao = 'parado';
    ator.setRosto(m.rosto || (spec.rosto !== 'neutro' && !ROSTO_DA_ACAO[acao] ? spec.rosto : ROSTO_DA_ACAO[acao] || r.item(['feliz', 'sorriso', 'neutro', 'rindo'])), spec.extras || []);
    const prop = m.prop || PROP_DA_ACAO[acao]; if (prop) ator.setProp(prop, { texto: r.item([].concat(m.prop_texto || 'FORA!')) });
    const pet = acao === 'passear_cachorro' ? criarProp({ tipo: 'cachorro', cor: r.item(['#c58a4a', '#7c5c46', '#f2f3f3', '#2b2b2b']) }) : null;
    return { id: spec.id, figurante: true, spec, acao, p: { vel: L.vel }, atraso: r.entre(0, 3), ator, pet, base: { x: L.x, z: L.z, y: 0, vira: L.vira } };
  });
}

function alvo(t) {
  const { c } = atual; if (c.alvo_xz) return new THREE.Vector3(c.alvo_xz[0], 0, c.alvo_xz[1]);
  let atores = atual.atores.filter(a => !a.figurante);
  if (!atores.length && atual.atores.length && !atual.cen.cameraFixa) atores = atual.atores; // só multidão: mira no centro dela
  if (!atores.length || atual.cen.cameraFixa) return new THREE.Vector3(0, atual.cen.cameraFixa ? -0.2 : 0, 0);
  const foco = atores.filter(a => !c.foco || a.id === c.foco);
  const v = new THREE.Vector3(); (foco.length ? foco : atores).forEach(a => v.add(posNoTempo(a, t))); return v.divideScalar(foco.length || atores.length);
}

function posar(t) {
  const { atores, c, dur } = atual;
  for (const a of atores) {
    a.ator.posar(a.acao, t + (a.atraso || 0), dur, a.p || {}, a.base);
    if (a.pet) { // animal de estimação acompanha o dono (ao lado direito, um pouco à frente)
      const rz = a.ator.raiz, ang = rz.rotation.y, ox = a.acao === 'passear_cachorro' ? 0.9 : -1.9, oz = a.acao === 'passear_cachorro' ? 2.6 : 0.6;
      a.pet.position.set(rz.position.x + ox * Math.cos(ang) + oz * Math.sin(ang), Math.abs(Math.sin(t * 11)) * (LOCOMOCAO.has(a.acao) ? 0.1 : 0), rz.position.z - ox * Math.sin(ang) + oz * Math.cos(ang));
      a.pet.rotation.y = ang;
    }
  }
  const camC = atual.cen.cameraFixa ? { camera: 'detalhe', mov: c.mov || 'zoom_in', angulo: 0, dist: c.dist || 3.1 } : c;
  const mira = posicionarCamera(cam, camC, t, dur, alvo, atores.length && !c.foco ? atual.espalha : 0);
  const L = atual.cen.limites; // interiores: a câmera não atravessa paredes
  if (L && mira) { cam.position.x = Math.max(-L.x, Math.min(L.x, cam.position.x)); cam.position.y = Math.max(0.8, Math.min(L.y, cam.position.y)); cam.position.z = Math.max(L.z, cam.position.z); cam.lookAt(mira); }
  if (atual.portas?.length || atual.unidades?.length) { cena.updateMatrixWorld(true); portasECortes(); }
  const foco = alvo(t); const d = new THREE.Vector3(...atual.cen.sol.dir).normalize();
  sol.target.position.copy(foco); sol.position.copy(foco).addScaledVector(d, 60 + (atual.cen.sombra || 35)); sol.target.updateMatrixWorld();
}

const _v = new THREE.Vector3(), _rc = new THREE.Raycaster();
/** A cada quadro: portas abrem quando alguém chega perto; paredes/tetos entre a câmera e os atores somem (vista em corte). */
function portasECortes() {
  for (const pt of atual.portas) {
    let dmin = 1e9; for (const a of atual.atores) { const p = a.ator.raiz.position; dmin = Math.min(dmin, Math.hypot(p.x - pt.c.x, p.z - pt.c.z)); }
    pt.piv.rotation.y = THREE.MathUtils.degToRad(85) * Math.min(1, Math.max(0, (4.6 - dmin) / 2.0));
  }
  if (!atual.unidades.length) return;
  for (const u of atual.unidades) u.visible = !u.userData.oculto;
  const foco = atual.c.foco; // com foco, só o ator em foco abre o corte (quem está do outro lado não apaga a fachada)
  for (const a of atual.atores) { if (a.figurante || (foco && a.id !== foco)) continue; a.ator.raiz.getWorldPosition(_v);
    for (const dy of [4.4, 2.6, 0.9]) { const p = _v.clone(); p.y += dy; const dir = p.sub(cam.position); const dist = dir.length(); _rc.set(cam.position, dir.normalize()); _rc.far = dist - 0.25;
      for (const h of _rc.intersectObjects(atual.corteMeshes, false)) { const u = h.object.userData.unidade; if (!u) continue;
        if (u.userData.movel && u.userData.caixa.distanceToPoint(_v) < 2.6) continue;   // móvel colado no ator (cadeira, cama): fica
        u.visible = false; } } }
}

/**
 * Esconde objetos do cenário que ficariam entre a câmera e os atores (árvores, postes, caixas d'água, paredes de prédio...).
 * Testa alguns instantes da cena e vários pontos de cada ator. Chão, ruas e paredes de salas (objetos enormes) nunca são escondidos.
 */
function liberarVisao() {
  const alvos = atual.atores.filter(a => !a.figurante); if (atual.cen.cameraFixa || atual.c.liberar_visao === false) return;
  const raizCen = atual.cen.grupo, rc = new THREE.Raycaster(), caixa = new THREE.Box3(), tam = new THREE.Vector3(), escondidos = new Set();
  const topo = (o) => { while (o.parent && o.parent !== raizCen) o = o.parent; return o.parent === raizCen ? o : null; };
  for (const t of [0, atual.dur * 0.5, atual.dur]) {
    posar(t); cena.updateMatrixWorld(true);
    for (const o of raizCen.children) { // objetos colados na lente (copas de árvore, postes) também saem
      if (escondidos.has(o)) continue; caixa.setFromObject(o).getSize(tam);
      const temAtor = alvos.some(a => { const b = a.ator.raiz.getWorldPosition(new THREE.Vector3()); return caixa.containsPoint(b) || caixa.distanceToPoint(b) < 2.6; });
      if (!temAtor && Math.max(tam.x, tam.z) <= 45 && caixa.distanceToPoint(cam.position) < 3.5) { o.visible = false; escondidos.add(o); }
    }
    for (const a of alvos) {
      a.ator.raiz.updateMatrixWorld(true); const base = a.ator.raiz.getWorldPosition(new THREE.Vector3());
      for (const [dx, dy] of [[0, 4.6], [0, 3], [0, 1], [-1.2, 3], [1.2, 3]]) {
        const p = base.clone().add(new THREE.Vector3(dx, dy, 0)), dir = p.clone().sub(cam.position), dist = dir.length();
        rc.set(cam.position, dir.normalize()); rc.far = dist - 0.6;
        for (const f of atual.atores) if (f.figurante && f.ator.raiz.visible && rc.intersectObject(f.ator.raiz, true).length) { f.ator.raiz.visible = false; if (f.pet) f.pet.visible = false; } // figurante na frente do ator principal
        for (const h of rc.intersectObject(raizCen, true)) {
          const o = topo(h.object); if (!o || escondidos.has(o)) continue;
          caixa.setFromObject(o).getSize(tam); if (Math.max(tam.x, tam.z) > 45) continue;   // chão/rua/parede gigante: mantém
          if (caixa.containsPoint(base) || caixa.distanceToPoint(base) < 2.6) continue;     // colado no ator (balcão, mesa, palco): faz parte da cena
          o.visible = false; escondidos.add(o);
        }
      }
    }
  }
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

/** Posição na tela (pixels) de pontos do mundo [[x,y,z],...] — usado para escrever nomes no mapa. */
function projetar(pts) { posar(0); cam.updateMatrixWorld(); return pts.map(p => { const v = new THREE.Vector3(...p).project(cam); return [(v.x + 1) / 2 * cfg.largura, (1 - v.y) / 2 * cfg.altura]; }); }
window.motor = { iniciar, montar, quadro, quadros, preview, projetar, pronto: true, depurar: () => { const nObj = (() => { let k = 0; atual.cen.grupo.traverse(o => { if (o.isMesh) k++; }); return k; })(); const nLuz = (() => { let k = 0; cena.traverse(o => { if (o.isLight) k++; }); return k; })(); const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(0, 0), cam); const h = rc.intersectObjects(cena.children, true).slice(0, 3);
  return { malhas: nObj, luzes: nLuz, camera: cam.position.toArray().map(v => +v.toFixed(2)), toques: h.map(x => ({ d: +x.distance.toFixed(2), cor: x.object.material?.color?.getHexString?.(), geo: x.object.geometry?.parameters, pos: x.object.getWorldPosition(new THREE.Vector3()).toArray().map(v => +v.toFixed(1)) })) }; } };
if (new URLSearchParams(location.search).has('preview')) preview();
