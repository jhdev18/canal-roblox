// Narração feita no SITE do ElevenLabs (plano grátis: a API não aceita vozes da biblioteca).
// 1) node gerar.mjs roteiros/x.yaml --texto-site  -> audios/x.txt com todas as falas separadas por pausas <break>
// 2) cole o texto no site (modelo Eleven Multilingual v2), gere e baixe o MP3 como audios/x.mp3
// 3) node gerar.mjs roteiros/x.yaml [--final]      -> o áudio é cortado nas pausas, uma parte por cena, e entra no vídeo
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { p, hash, garantirDir } from './util.mjs';

export const PAUSA_SITE = 1.2;   // segundos de pausa entre as cenas no texto do site
const EXT = ['mp3', 'wav', 'm4a', 'ogg', 'flac'];

/** Arquivo de narração do site para este roteiro (audios/<nome>.mp3 etc.), ou null. */
export function acharNarracaoSite(nome) {
  for (const e of EXT) { const f = p('audios', `${nome}.${e}`); if (fs.existsSync(f)) return f; }
  // tolera o erro comum do Windows (extensão escondida): nuvem_da_bia.mp3.mp3, nuvem_da_bia.MP3 etc.
  if (fs.existsSync(p('audios'))) for (const f of fs.readdirSync(p('audios'))) {
    const low = f.toLowerCase(); if (low.startsWith(nome.toLowerCase() + '.') && EXT.some(e => low.endsWith('.' + e))) return p('audios', f); }
  return null;
}

/** Texto para colar no site: uma fala por linha, com pausa entre as cenas (é ela que marca onde cortar).
 *  Modelos v2/turbo/flash leem <break>; o v3/v4 não — usa a tag de áudio [long pause]. */
export function textoParaSite(cenas, modelo = 'v2') {
  if (String(modelo) === 'corrido') return cenas.filter(c => c.fala && c.fala.trim()).map(c => c.fala.trim()).join('\n') + '\n';   // sem pausas marcadas
  const pausa = /^v[34]/.test(String(modelo)) ? '[long pause]' : `<break time="${PAUSA_SITE}s" />`;
  return cenas.filter(c => c.fala && c.fala.trim()).map(c => c.fala.trim()).join(`\n${pausa}\n`) + '\n';
}

/** Silêncios do áudio [{ini, fim}] pelo silencedetect do ffmpeg. */
function silencios(arquivo, ffmpeg, ruido = -35, min = 0.3) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-nostdin', '-i', arquivo, '-af', `silencedetect=noise=${ruido}dB:d=${min}`, '-f', 'null', '-'], { encoding: 'utf8' });
  const out = [], txt = r.stderr || ''; let ini = null;
  for (const l of txt.split('\n')) {
    const a = l.match(/silence_start: ([\d.]+)/); if (a) ini = Number(a[1]);
    const b = l.match(/silence_end: ([\d.]+)/); if (b && ini !== null) { out.push({ ini, fim: Number(b[1]) }); ini = null; }
  }
  const d = txt.match(/Duration: (\d+):(\d+):([\d.]+)/), dur = d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : 0;
  return { lista: out, dur };
}

/**
 * Corta a narração em uma parte por cena com fala (na ordem). Funciona com ou sem pausas marcadas:
 * estima onde cada fala termina pela quantidade de letras e escolhe, perto disso, o silêncio entre frases
 * (pausas longas, como <break>/[long pause], pesam mais). Devolve os .wav em cache/audio/site_*.
 */
export function dividirNarracao(arquivo, falas, ffmpeg) {
  const n = falas.length, st = fs.statSync(arquivo), id = hash([path.resolve(arquivo), st.mtimeMs, st.size, falas]);
  const dir = garantirDir(p('cache', 'audio')), saida = Array.from({ length: n }, (_, i) => path.join(dir, `site_${id}_${i + 1}.wav`));
  if (saida.every(f => fs.existsSync(f))) return saida;
  let { lista, dur } = silencios(arquivo, ffmpeg, -35, 0.12);
  const cabeca = lista.find(x => x.ini <= 0.3), cauda = lista.find(x => x.fim >= dur - 0.3 && x.ini > 0.3);
  const s0 = cabeca ? cabeca.fim : 0, s1 = cauda ? cauda.ini : dur;
  let cand = lista.filter(x => x.ini > s0 + 0.2 && x.fim < s1 - 0.2);
  if (cand.length < n - 1) { ({ lista } = silencios(arquivo, ffmpeg, -30, 0.08)); cand = lista.filter(x => x.ini > s0 + 0.2 && x.fim < s1 - 0.2); }
  if (cand.length < n - 1) throw new Error(`A narração ${path.basename(arquivo)} tem ${cand.length + 1} trechos com silêncio entre eles, mas o roteiro tem ${n} falas.\n`
    + 'Gere de novo com o texto de "node gerar.mjs <roteiro> --texto-site" (ou --texto-site v4), sem juntar nem cortar frases.');
  // posição esperada do fim de cada fala (proporcional às letras) e escolha ótima dos cortes (programação dinâmica)
  const letras = falas.map(t => Math.max(1, t.replace(/[^\p{L}\p{N}]/gu, '').length)), tot = letras.reduce((a, b) => a + b, 0);
  let acc = 0; const esperado = letras.slice(0, -1).map(l => s0 + (s1 - s0) * (acc += l) / tot);
  const sigma = Math.max(0.5, 0.3 * (s1 - s0) / n), M = cand.length, INF = 1e18;
  const custo = (k, j) => { const meio = (cand[j].ini + cand[j].fim) / 2, len = cand[j].fim - cand[j].ini; return ((meio - esperado[k]) / sigma) ** 2 - 6 * Math.min(len, 1.5); };
  let D = cand.map((_, j) => custo(0, j)); const volta = [D.map(() => -1)];
  for (let k = 1; k < n - 1; k++) { const N = new Array(M).fill(INF), V = new Array(M).fill(-1); let melhor = INF, arg = -1;
    for (let j = 0; j < M; j++) { if (j > 0 && D[j - 1] < melhor) { melhor = D[j - 1]; arg = j - 1; } if (arg >= 0) { N[j] = melhor + custo(k, j); V[j] = arg; } }
    D = N; volta.push(V); }
  let j = D.indexOf(Math.min(...D)); let cortes = [];
  for (let k = n - 2; k >= 0; k--) { cortes.unshift(cand[j]); j = volta[k][j]; }
  const longas = cand.filter(x => x.fim - x.ini >= 0.7);   // texto com pausas marcadas: as pausas longas são exatamente as trocas de cena
  if (longas.length >= n - 1 && longas.length <= n + 1) cortes = longas.slice().sort((a, b) => (b.fim - b.ini) - (a.fim - a.ini)).slice(0, n - 1).sort((a, b) => a.ini - b.ini);
  const limites = [Math.max(0, s0 - 0.08), ...cortes.flatMap(x => [x.ini + Math.min(0.12, (x.fim - x.ini) / 2), x.fim - Math.min(0.08, (x.fim - x.ini) / 2)]), Math.min(dur, s1 + 0.12)];
  for (let i = 0; i < n; i++) {
    const t0 = limites[i * 2], t1 = limites[i * 2 + 1];
    const r = spawnSync(ffmpeg, ['-y', '-v', 'error', '-nostdin', '-i', arquivo, '-ss', t0.toFixed(3), '-to', t1.toFixed(3), '-ar', '44100', '-ac', '1', saida[i]], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`ffmpeg não conseguiu cortar a narração: ${r.stderr?.slice(0, 300)}`);
  }
  return saida;
}
