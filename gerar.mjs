#!/usr/bin/env node
// Gerador de shorts estilo Roblox — tudo local.
//   node gerar.mjs roteiros/exemplo.yaml            -> saida/exemplo.mp4
//   node gerar.mjs roteiros/exemplo.yaml --preview  -> prévia ao vivo no navegador
//   node gerar.mjs --catalogo                        -> lista todos os assets disponíveis
//   node gerar.mjs --vozes  /  --musicas            -> lista vozes do ElevenLabs / músicas disponíveis
// Opções: --rapido (540x960, sem AO) · --cenas 2-4 · --voz piper|espeak|nenhum · --gpu nao · --encoder h264_nvenc · --fps 24
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { p, hash, hashMotor, garantirDir, log, rodar, duracaoWav } from './src/node/util.mjs';
import { carregarRoteiro, catalogo } from './src/node/roteiro.mjs';
import { narrar, listarVozes, gastoElevenLabs } from './src/node/tts.mjs';
import { temposPalavras, gerarASS } from './src/node/legendas.mjs';
import { abrirMotor, renderizarCena } from './src/node/render.mjs';
import { montarVideo } from './src/node/montagem.mjs';
import { servir } from './src/node/servidor.mjs';

function argumentos(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; }
    else o._.push(a);
  }
  return o;
}
function intervalo(s, n) { // "2-4,7" -> Set{1,2,3,6} (base 0)
  const out = new Set(); for (const parte of String(s).split(',')) { const [a, b] = parte.split('-').map(Number); for (let i = a; i <= (b || a); i++) if (i >= 1 && i <= n) out.add(i - 1); }
  return out;
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

async function principal() {
  const a = argumentos(process.argv.slice(2));
  const cfg = YAML.parse(fs.readFileSync(p('config.yaml'), 'utf8'));
  if (a.vozes) { for (const v of await listarVozes(cfg.voz.eleven_url)) console.log(`${v.id}  ${v.nome.padEnd(22)} ${v.categoria || ''}  ${v.tags}`); return; }
  if (a.musicas) { for (const f of fs.readdirSync(p('assets', 'musicas')).filter(f => /\.(mp3|wav|ogg|m4a)$/i.test(f))) console.log(f.replace(/\.[^.]+$/, '')); return; }
  if (a.catalogo) { for (const [k, v] of Object.entries(catalogo())) console.log(`${k.padEnd(13)} ${v.join(', ')}`); return; }
  const arq = a._[0];
  if (!arq) { console.log('uso: node gerar.mjs roteiros/<nome>.yaml [--preview] [--rapido] [--cenas 1-3] [--voz espeak]\n      node gerar.mjs --catalogo'); process.exit(1); }

  // ---- configuração efetiva ----
  if (a.rapido) Object.assign(cfg.render, { largura: 540, altura: 960, ao: false, sombra: 1024 });
  for (const k of ['gpu', 'encoder', 'navegador']) if (a[k]) cfg.render[k] = a[k];
  if (a.fps) cfg.render.fps = Number(a.fps);
  if (a.voz) cfg.voz.motor = a.voz;
  cfg.ffmpeg = a.ffmpeg || cfg.ffmpeg || 'ffmpeg'; cfg.render.ffmpeg = cfg.ffmpeg;
  const rot = carregarRoteiro(path.resolve(arq));
  Object.assign(cfg.voz, rot.voz || {}); Object.assign(cfg.legenda, rot.legenda || {});
  const nome = rot.saida || path.basename(arq).replace(/\.ya?ml$/i, '');
  const fps = cfg.render.fps;
  let cenas = rot.cenas;
  if (a.cenas) { const sel = intervalo(a.cenas, cenas.length); cenas = cenas.filter((_, i) => sel.has(i)); }
  log(`roteiro "${rot.titulo || nome}" · ${cenas.length} cenas`);

  // ---- 1. narração ----
  for (const c of cenas) {
    let audio = null;
    if (c.audio) { // áudio gravado por você
      const dst = p('cache', 'audio', hash(path.resolve(c.audio) + fs.statSync(path.resolve(c.audio)).mtimeMs) + '.wav');
      if (!fs.existsSync(dst)) { garantirDir(path.dirname(dst)); await rodar(cfg.ffmpeg, ['-y', '-v', 'error', '-i', path.resolve(c.audio), '-ar', '44100', '-ac', '1', dst]); }
      audio = { arquivo: dst, dur: duracaoWav(dst) };
    } else audio = await narrar(c.fala, cfg.voz, cfg.ffmpeg);
    c.audioArq = audio?.arquivo;
    const bruto = c.dur ?? (audio ? audio.dur + cfg.voz.pausa : 1.5);
    c.dur = Math.max(1, Math.round(bruto * fps)) / fps;  // alinhado a quadros
    c.palavras = temposPalavras(c.fala, audio ? audio.dur : c.dur * 0.9, cfg.legenda, audio?.palavras);
  }
  const visual = (c) => ({ cenario: c.cenario, hora: c.hora, seed: c.seed, cor: c.cor, chao: c.chao, parede: c.parede, tela: c.tela, camera: c.camera, mov: c.mov,
    angulo: c.angulo, dist: c.dist, altura: c.altura, inclinar: c.inclinar, foco: c.foco, props: c.props, dur: c.dur,
    atores: c.atores.map(x => ({ ...x, spec: { ...x.spec } })) });

  // ---- prévia ao vivo ----
  if (a.preview) {
    const job = { render: { ...cfg.render, largura: 540, altura: 960, sombra: 1024 }, cenas: cenas.map(c => ({ ...visual(c), palavras: c.palavras,
      audio_url: c.audioArq ? '/' + path.relative(p(), c.audioArq).split(path.sep).join('/') : null })) };
    garantirDir(p('cache', 'preview')); fs.writeFileSync(p('cache', 'preview', 'job.json'), JSON.stringify(job));
    const { url } = await servir(Number(a.porta) || 5173);
    console.log(`\nPrévia: ${url}/src/motor/index.html?preview\n(Ctrl+C para sair)`); return;
  }

  // ---- 2. render das cenas (com cache) ----
  const hm = hashMotor(); const dirClipes = garantirDir(p('cache', 'clipes'));
  const rcfg = { largura: cfg.render.largura, altura: cfg.render.altura, fps, ao: cfg.render.ao, sombra: cfg.render.sombra, encoder: cfg.render.encoder };
  for (const c of cenas) c.clipe = path.join(dirClipes, hash({ v: visual(c), rcfg, hm }) + '.mp4');
  const faltam = cenas.filter(c => !fs.existsSync(c.clipe));
  log(`${cenas.length - faltam.length} cena(s) do cache · ${faltam.length} para renderizar`);
  if (faltam.length) {
    const t0 = Date.now(); const motor = await abrirMotor({ ...cfg.render, fps });
    log('GPU:', motor.gpuInfo);
    if (/swiftshader|llvmpipe|software/i.test(motor.gpuInfo) && cfg.render.gpu !== 'nao') log('aviso: renderização por SOFTWARE (sem placa de vídeo). Veja "GPU" no README.');
    try {
      for (const [i, c] of faltam.entries()) {
        await renderizarCena(motor, visual(c), c.clipe, { ...cfg.render, fps, ffmpeg: cfg.ffmpeg }, (f, n) =>
          process.stdout.write(`\r› cena ${c.idx + 1} (${i + 1}/${faltam.length}) quadro ${f}/${n}   `));
      }
    } finally { await motor.fechar(); }
    process.stdout.write('\n'); log(`render: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }

  // ---- 3. legenda + montagem ----
  const trabalho = garantirDir(p('cache', 'trabalho', nome));
  let t = 0; const palavras = [];
  for (const c of cenas) { for (const w of c.palavras) palavras.push({ ...w, ini: w.ini + t, fim: w.fim + t }); t += c.dur; }
  fs.writeFileSync(path.join(trabalho, 'legendas.ass'), gerarASS(palavras, cfg.render, { ...cfg.legenda, palavras_destaque: rot.destaque }));
  const pasta = garantirDir(p(cfg.saida?.pasta || 'saida'));
  const saida = path.join(pasta, `${nome}${a.cenas ? '_parcial' : ''}${a.rapido ? '_rapido' : ''}.mp4`);
  const musica = rot.musica ?? cfg.audio.musica_padrao;
  const total = await montarVideo({ cenas: cenas.map(c => ({ clipe: c.clipe, audio: c.audioArq, dur: c.dur, som: c.som })), trabalho, saida, musica, cfg });
  if (gastoElevenLabs()) log(`ElevenLabs: ${gastoElevenLabs()} caracteres usados nesta execução (falas repetidas vêm do cache)`);
  log(`pronto: ${path.relative(p(), saida)} (${fmt(total)})`);
}

principal().catch(e => { console.error('\n✖ ' + (e.message || e)); process.exit(1); });
