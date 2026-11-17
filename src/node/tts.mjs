// Narração. Motores: elevenlabs (API, com tempo exato de cada palavra), piper (local), espeak (robótico), nenhum (silêncio p/ testes).
// Todo áudio fica em cache/audio por hash do texto + voz: a mesma fala nunca é cobrada/gerada duas vezes.
import fs from 'node:fs';
import { p, hash, rodar, duracaoWav, garantirDir, log } from './util.mjs';

function limpar(txt) { return txt.replace(/[*_#~`]/g, '').replace(/\s+/g, ' ').trim(); }

let caracteresGastos = 0;
export const gastoElevenLabs = () => caracteresGastos;

/** Lê ELEVENLABS_API_KEY: primeiro o arquivo .env da raiz (o que o usuário edita), depois a variável de ambiente.
 *  Com várias linhas, prefere a que começa com sk_ (chave de verdade). Guarda a origem em `origemChave` para mensagens de erro. */
export let origemChave = '';
export function chaveElevenLabs() {
  const env = p('.env'), achadas = [];
  if (fs.existsSync(env)) for (const l of fs.readFileSync(env, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const m = l.match(/^\s*ELEVENLABS_API_KEY\s*=\s*["']?([^"'\s]+)/); if (m) achadas.push(m[1]);
  }
  if (achadas.length) { origemChave = 'arquivo .env'; return achadas.find(k => k.startsWith('sk_')) || achadas[achadas.length - 1]; }
  if (process.env.ELEVENLABS_API_KEY) { origemChave = 'variável de ambiente ELEVENLABS_API_KEY do Windows'; return process.env.ELEVENLABS_API_KEY.trim(); }
  return null;
}

/** Explica o problema mais comum antes de gastar uma chamada: arquivo com nome errado, ID no lugar da chave. */
function checarChave(chave) {
  if (!chave) { const txt = fs.existsSync(p('.env.txt')) ? '\nAchei ".env.txt": o Bloco de Notas salvou com .txt no fim. Renomeie para ".env" (ren .env.txt .env).' : '';
    throw new Error('Chave do ElevenLabs não encontrada. Crie o arquivo .env na raiz com:\n  ELEVENLABS_API_KEY=sk_sua_chave\n(copie de .env.exemplo)' + txt); }
  if (!chave.startsWith('sk_')) throw new Error(`A chave lida (${origemChave}) começa com "${chave.slice(0, 3)}", não com "sk_": isso é o ID da chave, não a chave.\n`
    + 'No site do ElevenLabs: Profile → API Keys → Create API Key, copie o valor que começa com sk_ (só aparece na hora) e coloque no .env:\n  ELEVENLABS_API_KEY=sk_...'
    + (origemChave.startsWith('variável') ? '\nEssa chave veio de uma variável do Windows: apague-a (set ELEVENLABS_API_KEY= nesta janela, e em "Editar as variáveis de ambiente") ou crie o .env.' : ''));
}

async function chamarEleven(caminho, { metodo = 'GET', corpo, base } = {}) {
  const chave = chaveElevenLabs(); checarChave(chave);
  const r = await fetch((base || process.env.ELEVENLABS_URL || 'https://api.elevenlabs.io') + caminho, {
    method: metodo, headers: { 'xi-api-key': chave, 'Content-Type': 'application/json', Accept: 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
  if (!r.ok) {
    const txt = await r.text();
    const dica = r.status === 401 ? ' (chave inválida ou sem permissão de text_to_speech)' : r.status === 429 ? ' (limite de uso/créditos atingido — tente mais tarde ou use --voz espeak para rascunhos)'
      : r.status === 404 ? ' (voice_id não existe na sua conta — rode: node gerar.mjs --vozes)'
      : r.status === 402 ? ' (plano grátis: vozes da Voice Library não funcionam pela API — use uma voz padrão (node gerar.mjs --vozes, categoria premade) ou assine o Starter)' : '';
    throw new Error(`ElevenLabs respondeu ${r.status}${dica}\n${txt.slice(0, 400)}`);
  }
  return r.json();
}

/** Lista as vozes da conta (node gerar.mjs --vozes). */
export async function listarVozes(base) {
  const j = await chamarEleven('/v1/voices', { base });
  return (j.voices || []).map(v => ({ id: v.voice_id, nome: v.name, categoria: v.category, tags: Object.values(v.labels || {}).join(', ') }));
}

/** Agrupa o alinhamento por caractere do ElevenLabs em palavras com início/fim. */
function palavrasDoAlinhamento(al) {
  const ch = al?.characters, ini = al?.character_start_times_seconds, fim = al?.character_end_times_seconds;
  if (!ch?.length) return null;
  const out = []; let atual = null;
  ch.forEach((c, i) => {
    if (/\s/.test(c)) { if (atual) { out.push(atual); atual = null; } return; }
    if (!atual) atual = { texto: '', ini: ini[i], fim: fim[i] };
    atual.texto += c; atual.fim = fim[i];
  });
  if (atual) out.push(atual);
  return out;
}

async function elevenlabs(texto, v, bruto) {
  const corpo = {
    text: texto, model_id: v.modelo_eleven || 'eleven_multilingual_v2',
    voice_settings: { stability: v.estabilidade ?? 0.45, similarity_boost: v.similaridade ?? 0.8, style: v.estilo ?? 0.3, use_speaker_boost: true, speed: Math.min(1.2, Math.max(0.7, v.velocidade ?? 1)) },
  };
  if (v.idioma) corpo.language_code = v.idioma;
  if (!v.voice_id) throw new Error('Defina voz.voice_id no config.yaml (ou `voz: {voice_id: ...}` no roteiro). Para ver as vozes da sua conta: node gerar.mjs --vozes');
  const j = await chamarEleven(`/v1/text-to-speech/${v.voice_id}/with-timestamps?output_format=mp3_44100_128`, { metodo: 'POST', corpo, base: v.eleven_url });
  fs.writeFileSync(bruto, Buffer.from(j.audio_base64, 'base64'));
  caracteresGastos += texto.length;
  return palavrasDoAlinhamento(j.alignment || j.normalized_alignment);
}

function idAudio(texto, v) {
  return hash({ texto, motor: v.motor, modelo: v.motor === 'elevenlabs' ? [v.voice_id, v.modelo_eleven, v.estabilidade, v.similaridade, v.estilo, v.idioma] : v.modelo,
    vel: v.velocidade, esp: v.voz_espeak, f: v.falante });
}

/** Quantos caracteres ainda NÃO estão em cache (= o que o ElevenLabs vai cobrar). */
export function caracteresPendentes(textos, cfgVoz) {
  const v = { motor: 'piper', velocidade: 1.0, ...cfgVoz };
  return textos.map(t => limpar(t || '')).filter(Boolean).filter(t => !fs.existsSync(p('cache', 'audio', idAudio(t, v) + '.wav'))).reduce((a, t) => a + t.length, 0);
}

/** Voz grátis para rascunho: voz do Windows (SAPI) no Windows, espeak-ng no Linux/Mac, ou silêncio cronometrado. */
export async function motorRascunho() {
  if (process.platform === 'win32') return 'windows';
  try { await rodar('espeak-ng', ['--version']); return 'espeak'; } catch { return 'nenhum'; }
}

/**
 * Gera (ou reaproveita do cache) o áudio da fala.
 * Retorna { arquivo, dur, palavras? } — `palavras` (tempos exatos) só no ElevenLabs.
 */
export async function narrar(texto, cfgVoz, ffmpeg = 'ffmpeg') {
  texto = limpar(texto || ''); if (!texto) return null;
  const v = { motor: 'piper', velocidade: 1.0, ...cfgVoz };
  const dir = garantirDir(p('cache', 'audio'));
  const id = idAudio(texto, v);
  const final = `${dir}/${id}.wav`, meta = `${dir}/${id}.json`;
  if (fs.existsSync(final)) return { arquivo: final, dur: duracaoWav(final), palavras: fs.existsSync(meta) ? JSON.parse(fs.readFileSync(meta, 'utf8')) : null };
  const bruto = `${dir}/${id}.bruto.${v.motor === 'elevenlabs' ? 'mp3' : 'wav'}`;
  let palavras = null;
  if (v.motor === 'elevenlabs') {
    palavras = await elevenlabs(texto, v, bruto);
  } else if (v.motor === 'piper') {
    const modelo = p(v.modelo);
    if (!fs.existsSync(modelo)) throw new Error(`Voz do Piper não encontrada em ${v.modelo}.\nBaixe com:\n  python -m piper.download_voices pt_BR-faber-medium --download-dir assets/vozes\n(ou use --voz espeak para testar)`);
    const [cmd, ...args] = v.comando || ['python', '-m', 'piper'];
    await rodar(cmd, [...args, '-m', modelo, '-f', bruto, '--length-scale', String(1 / v.velocidade), ...(v.falante != null ? ['-s', String(v.falante)] : []), ...(v.cuda ? ['--cuda'] : [])], { entrada: texto + '\n' });
  } else if (v.motor === 'espeak') {
    await rodar(v.comando_espeak || 'espeak-ng', ['-v', v.voz_espeak || 'pt-br', '-s', String(Math.round(165 * v.velocidade)), '-w', bruto, texto]);
  } else if (v.motor === 'windows') { // voz do sistema (grátis, offline); usa a voz pt-BR instalada se houver
    const caminho = bruto.replace(/'/g, "''");
    const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; ` +
      `$v = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'pt*' } | Select-Object -First 1; if ($v) { $s.SelectVoice($v.VoiceInfo.Name) }; ` +
      `$s.Rate = ${Math.round((v.velocidade - 1) * 10)}; $s.SetOutputToWaveFile('${caminho}'); $s.Speak([Console]::In.ReadToEnd()); $s.Dispose()`;
    await rodar('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { entrada: texto });
  } else if (v.motor === 'nenhum') {
    await rodar(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', String(Math.max(0.6, texto.split(' ').length * 0.32)), bruto]);
  } else if (v.motor === 'site') { throw new Error('motor "site": a narração vem de audios/<roteiro>.mp3 (veja --texto-site); a API não é usada');
  } else throw new Error('Motor de voz desconhecido: ' + v.motor);

  let filtro;
  if (palavras?.length) { // corta pelo alinhamento (exato) e desloca os tempos
    const ini = Math.max(0, palavras[0].ini - 0.04), fim = palavras.at(-1).fim + 0.12;
    filtro = `atrim=${ini.toFixed(3)}:${fim.toFixed(3)},asetpts=PTS-STARTPTS`;
    palavras = palavras.map(w => ({ ...w, ini: w.ini - ini, fim: w.fim - ini }));
    fs.writeFileSync(meta, JSON.stringify(palavras));
  } else if (v.motor !== 'nenhum') { // corta silêncio do começo/fim
    filtro = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse';
  }
  await rodar(ffmpeg, ['-y', '-v', 'error', '-i', bruto, ...(filtro ? ['-af', filtro] : []), '-ar', '44100', '-ac', '1', '-c:a', 'pcm_s16le', final]);
  fs.rmSync(bruto, { force: true });
  log(`voz (${v.motor}): "${texto.slice(0, 50)}${texto.length > 50 ? '…' : ''}"`);
  return { arquivo: final, dur: duracaoWav(final), palavras };
}
