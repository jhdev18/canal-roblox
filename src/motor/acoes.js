// Biblioteca de ações (animações procedurais). Puro JS, sem three.js: importável no Node para validar roteiros.
// Cada ação: (t, dur, p) => pose. t = segundos desde o início da cena, p = parâmetros extras do ator.
// Pose (graus): bd/be = braço direito/esquerdo [frente, lado], pd/pe = pernas [frente, lado],
// cab = cabeça [baixo, gira, inclina], tor = corpo [inclina_frente, gira, inclina_lado],
// y = sobe/desce o corpo, frente = distância andada para frente, raiz = rotação do boneco inteiro [x,y,z], dx = tremor lateral.
const S = Math.sin, C = Math.cos, TAU = Math.PI * 2;
const lim = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => { x = lim(x); return x * x * (3 - 2 * x); };

export function poseBase() {
  return { bd: [0, 3], be: [0, 3], pd: [0, 0], pe: [0, 0], cab: [0, 0, 0], tor: [0, 0, 0], y: 0, frente: 0, raiz: [0, 0, 0], dx: 0 };
}
function respirar(b, t, k = 1) {
  const r = S(t * 2.1) * 1.6 * k;
  b.bd[0] += r; b.be[0] -= r; b.tor[0] += S(t * 2.1) * 0.8 * k;
  b.cab[0] += S(t * 1.3) * 2 * k; b.cab[1] += S(t * 0.7) * 4 * k; b.y += S(t * 2.1) * 0.02;
  return b;
}
function ciclo(b, t, f, amp, bracos = 0.9) {
  const a = S(t * TAU * f) * amp;
  b.pd[0] = a; b.pe[0] = -a; b.bd[0] = -a * bracos; b.be[0] = a * bracos; b.y = Math.abs(S(t * TAU * f)) * amp / 250;
  return b;
}

export const ACOES = {
  parado: (t) => respirar(poseBase(), t),
  falar: (t) => { const b = respirar(poseBase(), t); b.cab[0] += S(t * 7) * 4; b.bd = [25 + S(t * 3) * 14, 12 + S(t * 2.2) * 8]; return b; },
  andar: (t, d, p) => { const b = ciclo(poseBase(), t, 1.7, 32); b.frente = t * (p.vel ?? 6); b.cab[0] = 2; return b; },
  correr: (t, d, p) => { const b = ciclo(poseBase(), t, 2.6, 58, 1.2); b.tor[0] = 10; b.frente = t * (p.vel ?? 15); return b; },
  acenar: (t) => { const b = respirar(poseBase(), t); b.bd = [8, 150 + S(t * 12) * 18]; b.cab[2] = -6; return b; },
  celular: (t) => { const b = respirar(poseBase(), t, 0.6); b.bd = [72 + S(t * 1.5) * 3, -8]; b.cab[0] = 18; return b; },
  digitar: (t) => { const b = respirar(poseBase(), t, 0.5); b.bd = [70 + S(t * 18) * 5, -10]; b.be = [70 - S(t * 18) * 5, -10]; b.cab[0] = 14; return b; },
  sentar: (t) => { const b = respirar(poseBase(), t, 0.6); b.pd = [90, 2]; b.pe = [90, 2]; b.y = -0.5; b.bd = [22, 4]; b.be = [22, 4]; return b; },
  deitar: (t) => { const b = poseBase(); b.raiz = [-90, 0, 0]; b.y = 0.5; b.tor[0] = S(t * 1.6) * 1; b.bd = [0, 6]; b.be = [0, 6]; return b; },
  dormir: (t) => ACOES.deitar(t),
  assustar: (t) => { const b = poseBase(); b.bd = [45, 35]; b.be = [45, 35]; b.cab[0] = -8; b.dx = S(t * 45) * 0.05; b.y = Math.abs(S(t * 30)) * 0.03; return b; },
  chorar: (t) => { const b = poseBase(); b.bd = [140, -18]; b.be = [140, -18]; b.cab[0] = 22; b.y = S(t * 18) * 0.04; b.tor[0] = 6; return b; },
  triste: (t) => { const b = respirar(poseBase(), t, 0.5); b.cab[0] = 25; b.tor[0] = 8; b.bd = [-4, 2]; b.be = [-4, 2]; return b; },
  bravo: (t) => { const b = poseBase(); b.bd = [-6, 22 + S(t * 30) * 3]; b.be = [-6, 22 + S(t * 30) * 3]; b.tor[0] = 6; b.dx = S(t * 38) * 0.03;
    const pisa = Math.max(0, S(t * 6)); b.pd[0] = pisa * 25; return b; },
  comemorar: (t) => { const b = poseBase(); b.bd = [0, 160 + S(t * 10) * 12]; b.be = [0, 160 + S(t * 10 + 1) * 12]; b.y = Math.abs(S(t * 6)) * 1.1; b.cab[0] = -10; return b; },
  pular: (t) => { const b = poseBase(); const k = Math.max(0, S(t * TAU * 0.9)); b.y = k * 2.2; b.bd = [0, 30 + k * 120]; b.be = [0, 30 + k * 120]; b.pd[0] = k * 20; b.pe[0] = -k * 20; return b; },
  apontar: (t) => { const b = respirar(poseBase(), t, 0.5); b.bd = [90, 0]; return b; },
  abracar: (t) => { const b = respirar(poseBase(), t, 0.5); b.bd = [85, -28]; b.be = [85, -28]; return b; },
  olhar_redor: (t) => { const b = respirar(poseBase(), t); b.cab[1] = S(t * 2.2) * 50; return b; },
  cair: (t) => { const b = poseBase(); const k = ease(t / 0.55); b.raiz = [-90 * k, 0, 0]; b.y = 0.5 * k; b.bd = [0, 10 + 60 * k]; b.be = [0, 10 + 60 * k]; return b; },
  dancar: (t) => { const b = poseBase(); const s = S(t * TAU * 1.6); b.bd = [0, 90 + s * 70]; b.be = [0, 90 - s * 70]; b.tor[2] = s * 8; b.cab[2] = -s * 10;
    b.y = Math.abs(s) * 0.4; b.pd[1] = Math.max(0, s) * 20; b.pe[1] = Math.max(0, -s) * 20; return b; },
  pensar: (t) => { const b = respirar(poseBase(), t, 0.5); b.bd = [125, -32]; b.cab = [-10, 12, 8]; return b; },
  socar: (t) => { const b = poseBase(); const k = S(t * TAU * 2.5); b.bd = [k > 0 ? 90 : 30, -6]; b.be = [k < 0 ? 90 : 30, -6]; b.tor[1] = k * 12; return b; },
  palmas: (t) => { const b = respirar(poseBase(), t, 0.5); const k = Math.abs(S(t * TAU * 2.5)); b.bd = [80, -20 + k * 26]; b.be = [80, -20 + k * 26]; return b; },
  ajoelhar: (t) => { const b = respirar(poseBase(), t, 0.5); b.pd = [90, 0]; b.y = -1.0; b.cab[0] = 18; return b; },
  empurrar: (t) => { const b = poseBase(); const k = ease(t / 0.3); b.bd = [90 * k, -6]; b.be = [90 * k, -6]; b.tor[0] = 12 * k; b.frente = k * 0.6; return b; },
  tremer: (t) => { const b = poseBase(); b.dx = S(t * 50) * 0.06; b.bd = [10, 8]; b.be = [10, 8]; return b; },
};

/** Rosto padrão quando o roteiro não define `rosto` para o ator. */
export const ROSTO_DA_ACAO = { chorar: 'chorando', assustar: 'assustado', bravo: 'bravo', comemorar: 'rindo', dormir: 'dormindo',
  cair: 'assustado', triste: 'triste', pensar: 'pensativo', tremer: 'nervoso', dancar: 'feliz', socar: 'bravo' };

/** Objetos que aparecem na mão automaticamente com a ação. */
export const PROP_DA_ACAO = { celular: 'celular', digitar: 'celular' };

export const NOMES_ACOES = Object.keys(ACOES);
