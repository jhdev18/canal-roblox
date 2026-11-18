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
  comemorar: (t) => { const b = poseBase(); b.bd = [-6, 166 + S(t * 10) * 6]; b.be = [-6, 166 + S(t * 10 + 1) * 6];   // braços quase na vertical: ocupam pouco espaço para o lado (não invadem o vizinho)
    b.y = Math.abs(S(t * 6)) * 1.1; b.cab[0] = -10; return b; },
  pular: (t) => { const b = poseBase(); const k = Math.max(0, S(t * TAU * 0.9)); b.y = k * 2.2; b.bd = [0, 30 + k * 120]; b.be = [0, 30 + k * 120]; b.pd[0] = k * 20; b.pe[0] = -k * 20; return b; },
  apontar: (t) => { const b = respirar(poseBase(), t, 0.5); b.bd = [90, 0]; return b; },
  abracar_lado: (t) => { const b = respirar(poseBase(), t, 0.5); b.bd = [-35, 84 + S(t * 3) * 3]; return b; },   // braço direito por cima do ombro de quem está à ESQUERDA dele na tela (os dois de frente para a câmera)
  abracar_lado_e: (t) => { const b = respirar(poseBase(), t, 0.5); b.be = [-35, 84 + S(t * 3) * 3]; return b; },   // braço esquerdo por cima do ombro de quem está à DIREITA dele na tela
  abracar: (t) => { const b = respirar(poseBase(), t, 0.5); b.bd = [72, -52]; b.be = [72, -52]; b.tor[0] = 6 + S(t * 2) * 2; b.cab[0] = 8; return b; },   // braços envolvendo o outro (use os dois a ~1,5 stud, virados um para o outro)
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

  // --- cidade / política / interação ---
  discursar: (t) => { const b = respirar(poseBase(), t, 0.6); const g = S(t * 2.6); b.bd = [55 + g * 25, 20 + Math.max(0, g) * 25]; b.be = [20 - g * 10, 8];
    b.cab = [-6 + S(t * 5) * 4, S(t * 1.3) * 18, 0]; b.tor[1] = S(t * 1.3) * 6; return b; },
  acenar_multidao: (t) => { const b = respirar(poseBase(), t, 0.5); b.bd = [10, 150 + S(t * 9) * 15]; b.be = [10, 150 + S(t * 9 + 2) * 15]; b.cab = [-8, S(t * 1.5) * 25, 0]; return b; },
  apertar_mao: (t) => { const b = respirar(poseBase(), t, 0.5); b.bd = [62 + S(t * 9) * 8, -12]; b.tor[0] = 5; b.cab[0] = 5; return b; },
  continencia: (t) => { const b = poseBase(); b.bd = [100, 55]; b.cab[0] = -4; b.tor[0] = -2; return b; },
  andar_confiante: (t, d, p) => { const b = ciclo(poseBase(), t, 1.4, 26, 1.3); b.tor[0] = -5; b.cab[0] = -8; b.tor[1] = S(t * TAU * 1.4) * 6; b.frente = t * (p.vel ?? 5); return b; },
  andar_celular: (t, d, p) => { const b = ciclo(poseBase(), t, 1.5, 24); b.bd = [72, -8]; b.cab[0] = 20; b.frente = t * (p.vel ?? 4.5); return b; },
  correr_medo: (t, d, p) => { const b = ciclo(poseBase(), t, 3.0, 55); b.bd = [60 + S(t * 25) * 40, 60]; b.be = [60 - S(t * 25) * 40, 60]; b.cab[0] = -12; b.frente = t * (p.vel ?? 16); return b; },
  fugir: (t, d, p) => { const b = ciclo(poseBase(), t, 2.7, 55, 1.1); b.tor[0] = 12; b.cab[1] = 70; b.frente = t * (p.vel ?? 15); return b; },
  carregar: (t, d, p) => { const b = ciclo(poseBase(), t, 1.4, 20, 0); b.bd = [75, -14]; b.be = [75, -14]; b.tor[0] = -4; b.frente = t * (p.vel ?? 3.5); return b; },
  entrevistar: (t) => { const b = respirar(poseBase(), t, 0.5); b.bd = [72 + S(t * 3) * 4, -18]; b.cab[1] = -15; b.be = [20 + S(t * 2.5) * 12, 10]; return b; },
  filmar: (t) => { const b = respirar(poseBase(), t, 0.3); b.bd = [95, -15]; b.be = [95, -15]; b.cab[0] = 4; return b; },
  assinar: (t) => { const b = respirar(poseBase(), t, 0.4); b.bd = [55 + S(t * 14) * 4, -14 + S(t * 9) * 5]; b.be = [45, -10]; b.cab[0] = 28; b.tor[0] = 10; return b; },
  cochichar: (t) => { const b = respirar(poseBase(), t, 0.4); b.bd = [130, -25]; b.tor[2] = -12; b.cab = [6, -20, -14]; return b; },
  maos_pra_cima: (t) => { const b = poseBase(); b.bd = [0, 168]; b.be = [0, 168]; b.dx = S(t * 40) * 0.03; b.cab[0] = -6; return b; },
  implorar: (t) => { const b = ACOES.ajoelhar(t); b.bd = [110 + S(t * 6) * 10, -15]; b.be = [110 + S(t * 6) * 10, -15]; b.cab[0] = -18; return b; },
  espiar: (t) => { const b = respirar(poseBase(), t, 0.4); b.tor[2] = 16 + S(t * 1.5) * 4; b.cab = [0, 0, 12]; b.bd = [20, 5]; b.be = [-5, 8]; b.y = -0.15; return b; },
  agachar: (t) => { const b = respirar(poseBase(), t, 0.4); b.y = -0.9; b.pd = [70, 4]; b.pe = [70, 4]; b.tor[0] = 18; b.bd = [60, -10]; b.be = [60, -10]; b.cab[0] = -12; return b; },
  comemorar_vitoria: (t) => { const b = respirar(poseBase(), t, 0.5); const k = Math.abs(S(t * 7)); b.bd = [20 + k * 20, 130 + k * 35]; b.be = [40, 10]; b.y = k * 0.25; return b; },
  rir: (t) => { const b = poseBase(); b.bd = [30, -20]; b.be = [30, -20]; b.tor[0] = 8 + Math.abs(S(t * 14)) * 8; b.cab[0] = -14; b.y = Math.abs(S(t * 14)) * 0.08; return b; },
  negar: (t) => { const b = respirar(poseBase(), t, 0.4); b.cab[1] = S(t * 11) * 25; b.bd = [15, 15]; b.be = [15, 15]; return b; },
  concordar: (t) => { const b = respirar(poseBase(), t, 0.4); b.cab[0] = 8 + S(t * 9) * 12; return b; },
  cocar_cabeca: (t) => { const b = respirar(poseBase(), t, 0.4); b.bd = [150 + S(t * 16) * 6, 28]; b.cab = [6, 0, -10]; return b; },
  girar: (t) => { const b = poseBase(); b.raiz[1] = (t * 360) % 360; b.bd = [0, 80]; b.be = [0, 80]; return b; },
  desmaiar: (t) => { const b = poseBase(); const k = ease((t - 0.25) / 0.6); b.raiz = [90 * k, 0, 0]; b.y = 0.5 * k; b.dx = t < 0.25 ? S(t * 40) * 0.05 : 0; b.bd = [0, 10 + 40 * k]; b.be = [0, 10 + 40 * k]; return b; },

  // --- dia a dia / bairro ---
  chutar: (t) => { const b = respirar(poseBase(), t, 0.3); const k = Math.max(0, S(Math.min(t, 0.6) / 0.6 * Math.PI)); b.pd = [-30 + 110 * k, 0]; b.be = [40 * k, 20]; b.bd = [-20 * k, 15]; b.tor[0] = -8 * k; return b; },
  varrer: (t) => { const b = respirar(poseBase(), t, 0.3); const k = S(t * 5); b.bd = [45 + k * 15, -15]; b.be = [55 + k * 15, -25]; b.tor[1] = k * 14; b.cab[0] = 16; return b; },
  regar: (t) => { const b = respirar(poseBase(), t, 0.4); b.bd = [70 + S(t * 2) * 8, -6]; b.cab[0] = 18; return b; },
  gritar: (t) => { const b = poseBase(); b.bd = [140, -35]; b.be = [140, -35]; b.tor[0] = -8; b.cab[0] = -14; b.y = Math.abs(S(t * 10)) * 0.05; return b; },
  bater_porta: (t) => { const b = respirar(poseBase(), t, 0.3); b.bd = [95 + Math.max(0, S(t * 14)) * 18, -5]; return b; },
  nadar: (t) => { const b = poseBase(), a = t * 5; b.bd = [180 + S(a) * 70, 15]; b.be = [180 - S(a) * 70, 15]; b.cab[0] = -12; b.tor[0] = 18; b.pd = [S(a * 1.3) * 25, 0]; b.pe = [-S(a * 1.3) * 25, 0]; b.y = S(a * 0.5) * 0.12; return b; },   // braçadas (fica dentro da água até o peito)
  bocejar: (t) => { const b = poseBase(), k = Math.max(0, S(Math.min(t, 2.2) / 2.2 * Math.PI)); b.bd = [150 * k, 12]; b.be = [0, 10 + 35 * k]; b.cab[0] = -22 * k; b.tor[0] = -6 * k; b.y = 0.08 * k; return b; },   // mão na boca, cabeça pra trás
  cochilar: (t) => { const b = respirar(poseBase(), t, 0.5); b.cab[0] = 24 + S(t * 1.4) * 7; b.tor[0] = 7; b.bd = [4, 2]; b.be = [4, 2]; b.dx = S(t * 0.9) * 0.06; return b; },   // dorme em pé, cabeça caindo
  espreguicar: (t) => { const b = poseBase(); const k = ease(t / 0.8); b.bd = [0, 20 + 150 * k]; b.be = [0, 20 + 150 * k]; b.tor[0] = -10 * k; b.cab[0] = -20 * k; b.y = 0.1 * k; return b; },
  cozinhar: (t) => { const b = respirar(poseBase(), t, 0.3); b.bd = [60, -18 + S(t * 6) * 14]; b.be = [50, -10]; b.cab[0] = 22; return b; },
  comer: (t) => { const b = respirar(poseBase(), t, 0.3); const k = Math.max(0, S(t * 4)); b.bd = [60 + k * 70, -25 * k]; b.be = [40, -10]; b.cab[0] = 10 - k * 6; return b; },
  lavar_louca: (t) => { const b = respirar(poseBase(), t, 0.3); b.bd = [55 + S(t * 9) * 8, -15 + S(t * 6) * 8]; b.be = [55 - S(t * 9) * 8, -15]; b.cab[0] = 25; return b; },
  pedir_silencio: (t) => { const b = respirar(poseBase(), t, 0.3); b.bd = [135, -40]; b.cab[0] = -4; return b; },
  sentar_chao: (t) => { const b = respirar(poseBase(), t, 0.4); b.y = -1.5; b.pd = [88, 8]; b.pe = [88, 8]; b.bd = [40, 8]; b.be = [40, 8]; return b; },
  passear_cachorro: (t, d, p) => { const b = ciclo(poseBase(), t, 1.5, 24); b.bd = [35, 10]; b.frente = t * (p.vel ?? 4.5); return b; },

  // --- interiores (com âncoras: balcão, banco da igreja, cela) ---
  atender: (t) => { const b = respirar(poseBase(), t, 0.5); b.bd = [55 + S(t * 3) * 10, -12]; b.be = [50, -10]; b.cab[0] = 6 + S(t * 4) * 4; b.cab[1] = S(t * 0.9) * 12; return b; },
  pagar: (t) => { const b = respirar(poseBase(), t, 0.4); const k = ease(t / 0.5); b.bd = [30 + 55 * k, -8]; b.cab[0] = 10; return b; },
  rezar: (t) => { const b = ACOES.sentar(t); b.bd = [95, -26]; b.be = [95, -26]; b.cab[0] = 20; return b; },
  jogar_pc: (t) => { const b = ACOES.sentar(t); b.bd = [68 + S(t * 16) * 5, -12]; b.be = [68 - S(t * 13) * 5, -12]; b.cab[0] = 4 + S(t * 2) * 3; b.tor[0] = 6; return b; },
  esperar: (t) => { const b = respirar(poseBase(), t, 0.6); b.bd = [55, -38]; b.be = [55, -38]; b.tor[2] = S(t * 0.8) * 3; b.cab = [4 + S(t * 0.5) * 6, S(t * 0.37) * 25, 0]; return b; },
  segurar_grade: (t) => { const b = poseBase(); b.bd = [105 + S(t * 6) * 4, 8]; b.be = [105 - S(t * 6) * 4, 8]; b.cab[0] = -4; b.dx = S(t * 9) * 0.04; b.tor[0] = 4; return b; },
};

/** Ações que andam (usam `vel`, `caminho` e `ate`). */
export const LOCOMOCAO = new Set(['andar', 'correr', 'andar_confiante', 'andar_celular', 'correr_medo', 'fugir', 'carregar', 'passear_cachorro']);

/**
 * Percorre um trajeto [[x,z],...] a partir de (x0,z0) por `dist` studs.
 * Retorna { x, z, vira (graus), chegou }. vira 0 = olhando +Z (para a câmera), 90 = direita da tela.
 */
export function percorrer(x0, z0, caminho, dist) {
  let px = x0, pz = z0, resto = Math.max(0, dist), vira = 0;
  for (const [x, z] of caminho) {
    const dx = x - px, dz = z - pz, L = Math.hypot(dx, dz);
    if (L < 1e-6) continue;
    vira = Math.atan2(dx, dz) * 180 / Math.PI;
    if (resto <= L) return { x: px + dx * resto / L, z: pz + dz * resto / L, vira, chegou: false };
    resto -= L; px = x; pz = z;
  }
  return { x: px, z: pz, vira, chegou: true };
}

/** Rosto padrão quando o roteiro não define `rosto` para o ator. */
export const ROSTO_DA_ACAO = { bocejar: 'bocejando', cochilar: 'dormindo', chorar: 'chorando', assustar: 'assustado', bravo: 'bravo', comemorar: 'rindo', dormir: 'dormindo',
  cair: 'assustado', triste: 'triste', pensar: 'pensativo', tremer: 'nervoso', dancar: 'feliz', socar: 'bravo',
  discursar: 'confiante', andar_confiante: 'confiante', acenar_multidao: 'sorriso', correr_medo: 'assustado', fugir: 'assustado',
  maos_pra_cima: 'assustado', implorar: 'triste', espiar: 'desconfiado', cochichar: 'malandro', comemorar_vitoria: 'rindo',
  rir: 'rindo', negar: 'desconfiado', cocar_cabeca: 'pensativo', desmaiar: 'morto', apertar_mao: 'sorriso', gritar: 'bravo', espreguicar: 'dormindo', comer: 'feliz', chutar: 'confiante',
  atender: 'sorriso', rezar: 'dormindo', segurar_grade: 'triste', jogar_pc: 'confiante', esperar: 'desconfiado' };

/** Objetos que aparecem na mão automaticamente com a ação. */
export const PROP_DA_ACAO = { celular: 'celular', digitar: 'celular', andar_celular: 'celular', entrevistar: 'microfone', filmar: 'filmadora',
  carregar: 'caixa', assinar: 'caneta', varrer: 'vassoura', regar: 'regador', cozinhar: 'colher', comer: 'garfo', passear_cachorro: 'coleira', pagar: 'dinheiro' };

export const NOMES_ACOES = Object.keys(ACOES);
