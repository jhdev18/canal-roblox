// Escolha automática da música de fundo.
// assets/musicas/<clima>/*.mp3  — suas faixas (populares, instrumentais) têm prioridade;
// arquivos "original_*" (trilhas geradas pelo projeto) são usados só quando a pasta não tem outras.
import fs from 'node:fs';
import path from 'node:path';
import { p, rodar, garantirDir, hash, log } from './util.mjs';

export const CLIMAS = ['suspense', 'triste', 'alegre', 'engracado', 'epico', 'curioso', 'calmo', 'perseguicao'];
const EXT = /\.(mp3|wav|ogg|m4a|flac)$/i;

// palavras que indicam o clima da história (pesos somados nas falas)
const PISTAS = {
  triste: ['morreu', 'morte', 'morrer', 'hospital', 'chorou', 'chorando', 'chorar', 'saudade', 'adeus', 'doente', 'perdeu', 'enterro', 'sozinho', 'triste', 'nunca mais', 'último', 'passou mal', 'faleceu'],
  suspense: ['inimigo', 'segredo', 'mistério', 'estranho', 'ninguém', 'mensagem', 'verdade', 'descobriu', 'nesse mundo', 'escondido', 'sumiu', 'desapareceu', 'medo', 'noite', 'perigo'],
  engracado: ['engraçado', 'risada', 'trollou', 'pegadinha', 'burro', 'bobo', 'zoou', 'trapalhada', 'kkk', 'piada', 'vergonha'],
  alegre: ['feliz', 'festa', 'aniversário', 'casamento', 'amigos', 'presente', 'ganhou', 'comemorou', 'alegria', 'sonho realizado'],
  epico: ['batalha', 'luta', 'poder', 'herói', 'vingança', 'guerra', 'lendário', 'mais forte', 'derrotou', 'rei'],
  perseguicao: ['correu', 'fugir', 'fugiu', 'perseguindo', 'polícia', 'corre', 'escapar', 'atrás dele'],
  curioso: ['imagina', 'e se', 'criança', 'quando era pequeno', 'descobrir', 'curioso', 'mágico'],
  calmo: ['rotina', 'tranquilo', 'calmo', 'dia normal'],
};
const PISTAS_CENARIO = { hospital: ['triste', 3], casamento: ['alegre', 2], escola: ['curioso', 1] };

export function inferirClima(rot) {
  const txt = rot.cenas.map(c => c.fala).join(' ').toLocaleLowerCase('pt-BR');
  const pts = Object.fromEntries(CLIMAS.map(c => [c, 0])); pts.suspense = 0.5; // desempate: o clima mais comum do nicho
  for (const [clima, palavras] of Object.entries(PISTAS)) for (const w of palavras) pts[clima] += (txt.match(new RegExp(`(^|[^\\p{L}])${w}`, 'gu')) || []).length;
  for (const c of rot.cenas) { const d = PISTAS_CENARIO[c.cenario]; if (d) pts[d[0]] += d[1] / rot.cenas.length * 3; }
  return Object.entries(pts).sort((a, b) => b[1] - a[1])[0][0];
}

function faixas(clima) {
  const dir = p('assets', 'musicas', clima);
  if (!fs.existsSync(dir)) return [];
  const todas = fs.readdirSync(dir).filter(f => EXT.test(f)).sort();
  const suas = todas.filter(f => !f.startsWith('original_'));
  return (suas.length ? suas : todas).map(f => path.join(dir, f));
}

/** Ponto em que a música "começa de verdade" (pula introdução silenciosa/parada). Cacheado por arquivo. */
async function inicioUtil(arq, ffmpeg) {
  const st = fs.statSync(arq); const cache = garantirDir(p('cache', 'musicas'));
  const meta = path.join(cache, hash(arq + st.size + st.mtimeMs) + '.json');
  if (fs.existsSync(meta)) return JSON.parse(fs.readFileSync(meta, 'utf8')).inicio;
  let inicio = 0;
  try {
    const out = await rodar(ffmpeg, ['-hide_banner', '-nostats', '-t', '90', '-i', arq, '-af', 'ebur128', '-f', 'null', '-'], { stderr: true });
    const linhas = String(out).match(/t:\s*[\d.]+\s+TARGET.*?M:\s*-?[\d.]+/g) || [];
    const pts = linhas.map(l => [parseFloat(l.match(/t:\s*([\d.]+)/)[1]), parseFloat(l.match(/M:\s*(-?[\d.]+)/)[1])]).filter(([, s]) => s > -70);
    if (pts.length > 20) {
      const ord = pts.map(x => x[1]).sort((a, b) => a - b); const alvo = ord[Math.floor(ord.length * 0.7)] - 4;
      const achou = pts.find(([, s]) => s >= alvo);
      if (achou && achou[0] > 2) inicio = Math.max(0, achou[0] - 0.6); // M = janela de 0,4 s
    }
  } catch { /* sem análise: começa do zero */ }
  fs.writeFileSync(meta, JSON.stringify({ inicio }));
  return inicio;
}

/**
 * Decide a música do vídeo. Retorna { arquivo, clima, inicio } ou null.
 * roteiro: `musica: nenhuma | <clima> | <nome do arquivo>`, `clima: <clima>`; sem nada = clima inferido das falas.
 * A escolha fica gravada por vídeo (re-renderizar mantém a mesma música) e o rodízio evita repetir faixas.
 */
export async function escolherMusica(rot, nome, cfg) {
  const pedido = rot.musica ?? cfg.audio.musica_padrao ?? 'auto';
  if (['nenhuma', 'nenhum', false].includes(pedido)) return null;
  const ff = cfg.ffmpeg || 'ffmpeg';
  if (pedido !== 'auto' && !CLIMAS.includes(pedido)) { // nome de arquivo específico
    const raiz = p('assets', 'musicas'); const alvo = String(pedido).toLowerCase();
    const todas = ['', ...CLIMAS].flatMap(c => { const d = path.join(raiz, c); return fs.existsSync(d) ? fs.readdirSync(d).filter(f => EXT.test(f)).map(f => path.join(d, f)) : []; });
    const achado = todas.find(f => path.basename(f).toLowerCase().replace(EXT, '') === alvo);
    const direto = fs.existsSync(p(String(pedido))) ? p(String(pedido)) : achado;
    if (!direto) { log(`aviso: música "${pedido}" não encontrada em assets/musicas (seguindo sem música)`); return null; }
    return { arquivo: direto, clima: path.basename(path.dirname(direto)), inicio: await inicioUtil(direto, ff) };
  }
  const clima = rot.clima || (CLIMAS.includes(pedido) ? pedido : inferirClima(rot));
  const lista = faixas(clima).length ? faixas(clima) : faixas('suspense');
  if (!lista.length) return null;
  const arqMem = path.join(garantirDir(p('cache')), 'musicas_escolhidas.json');
  const mem = fs.existsSync(arqMem) ? JSON.parse(fs.readFileSync(arqMem, 'utf8')) : {};
  let arquivo = mem[nome] && lista.includes(mem[nome]) ? mem[nome] : null;
  if (!arquivo) { // rodízio: a faixa menos usada até agora
    const usos = (f) => Object.values(mem).filter(x => x === f).length;
    arquivo = [...lista].sort((a, b) => usos(a) - usos(b) || (hash(nome + a) < hash(nome + b) ? -1 : 1))[0];
    mem[nome] = arquivo; fs.writeFileSync(arqMem, JSON.stringify(mem, null, 1));
  }
  return { arquivo, clima, inicio: await inicioUtil(arquivo, ff) };
}
