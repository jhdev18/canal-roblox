// Junta clipes + narração + música + efeitos + legenda em um MP4 final (um único passo do FFmpeg).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { p, rodar, barra, log } from './util.mjs';

function acharAsset(pasta, nome) {
  if (!nome || nome === 'nenhuma' || nome === 'nenhum') return null;
  if (fs.existsSync(p(nome))) return p(nome);
  for (const ext of ['', '.mp3', '.wav', '.ogg', '.m4a']) { const a = p('assets', pasta, nome + ext); if (fs.existsSync(a)) return a; }
  log(`aviso: ${pasta}/${nome} não encontrado (ignorando)`); return null;
}

/** Ganho (dB) para levar uma fala a −16 LUFS: cada cena fica no mesmo volume (limitado a ±12 dB). Guardado por arquivo. */
const ganhos = new Map();
function ganhoFala(arq, ffmpeg) {
  if (ganhos.has(arq)) return ganhos.get(arq);
  const r = spawnSync(ffmpeg, ['-nostdin', '-hide_banner', '-i', arq, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const m = [...(r.stderr || '').matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop(), I = m ? Number(m[1]) : NaN;
  const g = isFinite(I) && I > -70 ? Math.max(-12, Math.min(12, -16 - I)) : 0; ganhos.set(arq, g); return g;
}

/**
 * cenas: [{ clipe, audio?, dur, som? }], trabalho: pasta com legendas.ass
 */
export async function montarVideo({ cenas, trabalho, saida, musica, cfg }) {
  const lista = path.join(trabalho, 'clipes.txt');
  fs.writeFileSync(lista, cenas.map(c => `file '${barra(c.clipe).replace(/'/g, "'\\''")}'`).join('\n'));
  const total = cenas.reduce((a, c) => a + c.dur, 0);
  const args = ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lista];
  const filtros = []; let k = 1;
  const segs = cenas.map((c, i) => {
    if (c.audio) { args.push('-i', c.audio); filtros.push(`[${k++}:a]aformat=sample_rates=44100:channel_layouts=mono,volume=${ganhoFala(c.audio, cfg.ffmpeg || 'ffmpeg').toFixed(2)}dB,apad=whole_dur=${c.dur.toFixed(4)},atrim=0:${c.dur.toFixed(4)}[s${i}]`); }
    else filtros.push(`aevalsrc=0:c=mono:s=44100:d=${c.dur.toFixed(4)}[s${i}]`);
    return `[s${i}]`;
  });
  const mus = musica?.arquivo; // { arquivo, inicio } decidido por musica.mjs
  // loudnorm em puro silêncio gera NaN: só normaliza quando existe voz de verdade
  const temVoz = cenas.some(c => c.audio) && cfg.voz?.motor !== 'nenhum';
  // volume da voz constante: compressor suave + loudnorm em DUAS passadas (modo linear). O loudnorm de uma passada
  // age como controle automático de ganho e faz a voz subir e descer entre as cenas.
  const COMP = 'acompressor=threshold=0.1:ratio=3:attack=15:release=250:makeup=1';
  let norm = '';
  if (temVoz) {
    const med = spawnSync(cfg.ffmpeg || 'ffmpeg', [...args.map((a, i) => args[i - 1] === '-v' ? 'info' : a), '-nostdin', '-filter_complex', [...filtros, `${segs.join('')}concat=n=${segs.length}:v=0:a=1,${COMP},loudnorm=I=-14:TP=-1.5:LRA=7:print_format=json[med]`].join(';'),
      '-map', '[med]', '-f', 'null', '-'], { cwd: trabalho, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const j = (med.stderr || '').match(/\{[^{}]*"input_i"[^{}]*\}/);
    if (j) { const m = JSON.parse(j[0]); if (isFinite(Number(m.input_i))) norm = `,loudnorm=I=-14:TP=-1.5:LRA=7:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`; }
    if (!norm) norm = ',loudnorm=I=-14:TP=-1.5:LRA=11';
    norm = `,${COMP}${norm}`;
  }
  filtros.push(`${segs.join('')}concat=n=${segs.length}:v=0:a=1${norm},aresample=44100${mus ? ',asplit=2[narr][chave]' : '[narr]'}`);
  const mix = ['[narr]'];
  if (mus) { // música em loop que abaixa sozinha enquanto a voz fala (ducking)
    args.push('-stream_loop', '-1', ...(musica.inicio ? ['-ss', musica.inicio.toFixed(2)] : []), '-i', mus);
    filtros.push(`[${k++}:a]aresample=44100,aformat=channel_layouts=mono,volume=${cfg.audio.musica_volume},atrim=0:${total.toFixed(3)},afade=t=in:d=0.4,afade=t=out:st=${Math.max(0, total - 1.2).toFixed(3)}:d=1.2[musb]`);
    filtros.push(cfg.audio.ducking === false ? '[musb]anull[mus];[chave]anullsink' : `[musb][chave]sidechaincompress=threshold=0.03:ratio=4:attack=30:release=400:makeup=1[mus]`);
    mix.push('[mus]');
  }
  let t = 0;
  cenas.forEach((c, i) => { const s = acharAsset('sfx', c.som);
    if (s) { args.push('-i', s); const ms = Math.round(t * 1000); filtros.push(`[${k++}:a]aresample=44100,volume=${cfg.audio.sfx_volume},adelay=${ms}:all=1[fx${i}]`); mix.push(`[fx${i}]`); }
    t += c.dur; });
  filtros.push(mix.length > 1 ? `${mix.join('')}amix=inputs=${mix.length}:normalize=0:duration=first[aout]` : `[narr]anull[aout]`);
  const fontes = p('assets', 'fontes'); const temFontes = fs.existsSync(fontes) && fs.readdirSync(fontes).some(f => /\.(ttf|otf)$/i.test(f));
  const fd = temFontes ? `:fontsdir=${barra(path.relative(trabalho, fontes))}` : '';
  filtros.push(`[0:v]ass=legendas.ass${fd}[vout]`);
  const enc = cfg.render.encoder === 'h264_nvenc' ? ['-c:v', 'h264_nvenc', '-preset', 'p5', '-cq', '21', '-b:v', '0'] : ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20'];
  args.push('-filter_complex', filtros.join(';'), '-map', '[vout]', '-map', '[aout]', ...enc, '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
    '-t', total.toFixed(3), '-movflags', '+faststart', saida);
  await rodar(cfg.ffmpeg || 'ffmpeg', args, { cwd: trabalho });
  return total;
}
