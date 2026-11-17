// Legenda palavra por palavra (estilo shorts): tempos estimados pela narração + arquivo .ass com efeito "pop".

/** Divide a fala em palavras com início/fim (segundos, relativos à cena) proporcionais ao tamanho de cada palavra. */
export function temposPalavras(fala, dur, cfg = {}, exatas = null) {
  const brutas = String(fala || '').replace(/[*_#~`]/g, '').split(/\s+/).filter(Boolean);
  if (!brutas.length || !dur) return [];
  let out;
  if (exatas?.length === brutas.length) { // tempos reais (ElevenLabs): cada palavra fica até a próxima começar
    out = brutas.map((w, i) => ({ texto: w, ini: exatas[i].ini, fim: exatas[i + 1]?.ini ?? exatas[i].fim }));
  } else { // estimativa proporcional ao tamanho da palavra + pausas de pontuação
    const peso = brutas.map(w => w.replace(/[^\p{L}\p{N}]/gu, '').length + 1.2 + (/[,;:]$/.test(w) ? 2.5 : /[.!?…]$/.test(w) ? 4 : 0));
    const total = peso.reduce((a, b) => a + b, 0);
    let t = 0; out = brutas.map((w, i) => { const ini = t; t += dur * peso[i] / total; return { texto: w, ini, fim: t }; });
  }
  // junta palavras curtinhas com a próxima ("do tempo", "a casa")
  const lim = cfg.juntar_curtas ?? 2; const grupos = [];
  for (let i = 0; i < out.length; i++) {
    const w = out[i], limpa = w.texto.replace(/[^\p{L}\p{N}]/gu, '');
    if (lim && limpa.length <= lim && i + 1 < out.length && !/[,.!?;:]$/.test(w.texto)) { out[i + 1] = { texto: w.texto + ' ' + out[i + 1].texto, ini: w.ini, fim: out[i + 1].fim }; continue; }
    grupos.push(w);
  }
  return grupos.map(g => ({ ...g, texto: formatar(g.texto, cfg) }));
}

function formatar(t, cfg) {
  if (cfg.sem_pontuacao !== false) t = t.replace(/[,.;:!?…"“”()]/g, '');
  if (cfg.minusculas !== false) t = t.toLocaleLowerCase('pt-BR');
  return t;
}

const tempoASS = (s) => { const cs = Math.max(0, Math.round(s * 100)); const h = Math.floor(cs / 360000), m = Math.floor(cs / 6000) % 60, ss = Math.floor(cs / 100) % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`; };
const corASS = (hex) => { const h = hex.replace('#', ''); return `&H00${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase(); };

/** palavras = [{texto, ini, fim}] em tempo absoluto do vídeo. */
export function gerarASS(palavras, { largura = 1080, altura = 1920 } = {}, cfg = {}) {
  const c = { fonte: 'Arial Black', tamanho: 92, cor: '#ffffff', contorno: '#000000', espessura: 7, sombra: 3, posicao_y: 0.67, pop: true, destaque: '#ffd23f', palavras_destaque: [], ...cfg };
  const esc = Math.round((c.tamanho * largura) / 1080);
  const cab = `[Script Info]
ScriptType: v4.00+
PlayResX: ${largura}
PlayResY: ${altura}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Palavra,${c.fonte},${esc},${corASS(c.cor)},${corASS(c.cor)},${corASS(c.contorno)},&H96000000,1,0,0,0,100,100,0,0,1,${c.espessura},${c.sombra},5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const destaque = new Set((c.palavras_destaque || []).map(w => w.toLowerCase()));
  const linhas = palavras.map((w, i) => {
    const fim = Math.min(palavras[i + 1]?.ini ?? w.fim + 0.25, w.ini + 1.6);
    const pop = c.pop ? '\\fscx72\\fscy72\\t(0,90,\\fscx112\\fscy112)\\t(90,170,\\fscx100\\fscy100)' : '';
    const cor = destaque.has(w.texto.toLowerCase()) ? `\\c${corASS(c.destaque)}` : '';
    return `Dialogue: 0,${tempoASS(w.ini)},${tempoASS(fim)},Palavra,,0,0,0,,{\\an5\\pos(${largura / 2},${Math.round(altura * c.posicao_y)})${pop}${cor}}${w.texto.replace(/[{}]/g, '')}`;
  });
  return cab + linhas.join('\n') + '\n';
}
