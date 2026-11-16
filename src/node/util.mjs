import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const p = (...a) => path.join(RAIZ, ...a);
export const barra = (x) => x.split(path.sep).join('/');

export function hash(obj, n = 16) { return createHash('sha1').update(typeof obj === 'string' ? obj : JSON.stringify(obj)).digest('hex').slice(0, n); }

/** Hash do código do motor: mudar o motor invalida o cache de clipes automaticamente. */
export function hashMotor() {
  const dir = p('src', 'motor');
  return hash(fs.readdirSync(dir).sort().map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n'));
}

export function garantirDir(d) { fs.mkdirSync(d, { recursive: true }); return d; }

/** Executa um comando e devolve stdout. Rejeita com stderr se falhar. */
export function rodar(cmd, args, { cwd, entrada, silencioso = true } = {}) {
  return new Promise((res, rej) => {
    const pr = spawn(cmd, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let out = '', err = '';
    pr.stdout.on('data', d => { out += d; }); pr.stderr.on('data', d => { err += d; if (!silencioso) process.stderr.write(d); });
    pr.on('error', e => rej(new Error(`Não consegui executar "${cmd}": ${e.message}`)));
    pr.on('close', c => c === 0 ? res(out) : rej(new Error(`${cmd} saiu com código ${c}\n${err.slice(-2500)}`)));
    if (entrada !== undefined) pr.stdin.end(entrada); else pr.stdin.end();
  });
}

/** Duração de um WAV PCM lendo o cabeçalho (sem ffprobe). */
export function duracaoWav(arq) {
  const b = fs.readFileSync(arq); let i = 12, taxa = 0, canais = 1, bits = 16;
  while (i < b.length - 8) {
    const id = b.toString('ascii', i, i + 4), tam = b.readUInt32LE(i + 4);
    if (id === 'fmt ') { canais = b.readUInt16LE(i + 10); taxa = b.readUInt32LE(i + 12); bits = b.readUInt16LE(i + 22); }
    if (id === 'data') return Math.min(tam, b.length - i - 8) / (taxa * canais * bits / 8);
    i += 8 + tam + (tam % 2);
  }
  throw new Error('WAV inválido: ' + arq);
}

/** Sugestão para nomes digitados errado ("cenario 'rual' não existe. Quis dizer 'rua'?"). */
export function sugerir(nome, opcoes) {
  const d = (a, b) => { const m = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) m[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return m[a.length][b.length]; };
  const best = [...opcoes].sort((a, b) => d(nome, a) - d(nome, b))[0];
  return best ? ` Quis dizer "${best}"?` : '';
}

export const log = (...a) => console.log('›', ...a);
