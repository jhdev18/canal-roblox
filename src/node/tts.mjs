// Narração local. Motores: piper (padrão, voz neural PT-BR), espeak (robótico, sem download), nenhum (silêncio p/ testes).
import fs from 'node:fs';
import { p, hash, rodar, duracaoWav, garantirDir, log } from './util.mjs';

function limpar(txt) { return txt.replace(/[*_#~`]/g, '').replace(/\s+/g, ' ').trim(); }

/** Gera (ou reaproveita do cache) o áudio da fala. Retorna { arquivo, dur } ou null se não houver fala. */
export async function narrar(texto, cfgVoz, ffmpeg = 'ffmpeg') {
  texto = limpar(texto || ''); if (!texto) return null;
  const v = { motor: 'piper', velocidade: 1.0, ...cfgVoz };
  const dir = garantirDir(p('cache', 'audio'));
  const id = hash({ texto, motor: v.motor, modelo: v.modelo, vel: v.velocidade, esp: v.voz_espeak, f: v.falante });
  const final = `${dir}/${id}.wav`;
  if (fs.existsSync(final)) return { arquivo: final, dur: duracaoWav(final) };
  const bruto = `${dir}/${id}.bruto.wav`;
  if (v.motor === 'piper') {
    const modelo = p(v.modelo);
    if (!fs.existsSync(modelo)) throw new Error(`Voz do Piper não encontrada em ${v.modelo}.\nBaixe com:\n  python -m piper.download_voices pt_BR-faber-medium --download-dir assets/vozes\n(ou use --voz espeak para testar)`);
    const [cmd, ...args] = v.comando || ['python', '-m', 'piper'];
    await rodar(cmd, [...args, '-m', modelo, '-f', bruto, '--length-scale', String(1 / v.velocidade), ...(v.falante != null ? ['-s', String(v.falante)] : []), ...(v.cuda ? ['--cuda'] : [])], { entrada: texto + '\n' });
  } else if (v.motor === 'espeak') {
    await rodar(v.comando_espeak || 'espeak-ng', ['-v', v.voz_espeak || 'pt-br', '-s', String(Math.round(165 * v.velocidade)), '-w', bruto, texto]);
  } else if (v.motor === 'nenhum') {
    const dur = Math.max(0.6, texto.split(' ').length * 0.32);
    await rodar(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=mono`, '-t', String(dur), bruto]);
  } else throw new Error('Motor de voz desconhecido: ' + v.motor);
  // corta silêncio do começo/fim e padroniza (44.1 kHz mono)
  const corte = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse';
  await rodar(ffmpeg, ['-y', '-v', 'error', '-i', bruto, '-af', v.motor === 'nenhum' ? 'anull' : corte, '-ar', '44100', '-ac', '1', '-c:a', 'pcm_s16le', final]);
  fs.rmSync(bruto, { force: true });
  log(`voz: "${texto.slice(0, 50)}${texto.length > 50 ? '…' : ''}"`);
  return { arquivo: final, dur: duracaoWav(final) };
}
