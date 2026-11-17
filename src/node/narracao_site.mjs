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
  return null;
}

/** Texto para colar no site: uma fala por linha, com pausa entre as cenas (é ela que marca onde cortar). */
export function textoParaSite(cenas) {
  return cenas.filter(c => c.fala && c.fala.trim()).map(c => c.fala.trim()).join(`\n<break time="${PAUSA_SITE}s" />\n`) + '\n';
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
 * Corta a narração em uma parte por cena com fala. Usa as N−1 maiores pausas (as <break> entre as cenas).
 * Devolve os arquivos .wav (cache/audio/site_*), na ordem das cenas com fala.
 */
export function dividirNarracao(arquivo, nFalas, ffmpeg) {
  const st = fs.statSync(arquivo), id = hash([path.resolve(arquivo), st.mtimeMs, st.size, nFalas]);
  const dir = garantirDir(p('cache', 'audio')), saida = Array.from({ length: nFalas }, (_, i) => path.join(dir, `site_${id}_${i + 1}.wav`));
  if (saida.every(f => fs.existsSync(f))) return saida;
  let { lista, dur } = silencios(arquivo, ffmpeg);
  if (lista.length < nFalas - 1) ({ lista, dur } = silencios(arquivo, ffmpeg, -30, 0.25));   // áudio mais "sujo": limiar mais tolerante
  const internas = lista.filter(s => s.ini > 0.3 && s.fim < dur - 0.3);   // silêncio do começo e do fim do arquivo não separa cenas
  if (internas.length < nFalas - 1) throw new Error(`A narração ${path.basename(arquivo)} tem ${internas.length + 1} trechos, mas o roteiro tem ${nFalas} falas.\n`
    + `Gere o áudio no site com o texto de "node gerar.mjs <roteiro> --texto-site" (as pausas <break> separam as cenas) e o modelo Eleven Multilingual v2.`);
  const cortes = internas.slice().sort((a, b) => (b.fim - b.ini) - (a.fim - a.ini)).slice(0, nFalas - 1).sort((a, b) => a.ini - b.ini);
  const cauda = lista.find(s => s.fim >= dur - 0.3 && s.ini > 0.3), cabeca = lista.find(s => s.ini <= 0.3);   // silêncio no começo/fim do arquivo fica de fora
  const limites = [cabeca ? Math.max(0, cabeca.fim - 0.08) : 0, ...cortes.flatMap(s => [s.ini + 0.12, s.fim - 0.08]), cauda ? cauda.ini + 0.12 : dur];   // guarda um respiro no fim de cada fala
  for (let i = 0; i < nFalas; i++) {
    const t0 = Math.max(0, limites[i * 2]), t1 = limites[i * 2 + 1];
    const r = spawnSync(ffmpeg, ['-y', '-v', 'error', '-nostdin', '-i', arquivo, '-ss', t0.toFixed(3), '-to', t1.toFixed(3), '-ar', '44100', '-ac', '1', saida[i]], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`ffmpeg não conseguiu cortar a narração: ${r.stderr?.slice(0, 300)}`);
  }
  return saida;
}
