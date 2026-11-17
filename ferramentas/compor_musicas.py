"""Compositor procedural de trilhas originais (sem direitos de terceiros -> sem Content ID).

Gera loops perfeitos (o fim emenda no começo) em assets/musicas/<nome>.mp3.
Uso:  python ferramentas/compor_musicas.py            # gera todas
      python ferramentas/compor_musicas.py suspense   # gera só uma
      python ferramentas/compor_musicas.py --seed 7   # outra variação das melodias
Requer: numpy + ffmpeg no PATH.
"""
import subprocess, sys, os, tempfile, wave
import numpy as np

SR = 44100
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, '..', 'assets', 'musicas')


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env(n, a=0.005, r=0.05, d=None, sus=1.0):
    """Envelope: ataque linear, decaimento exponencial opcional (d = constante de tempo), release no fim."""
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    if d:
        e = e * (sus + (1 - sus) * np.exp(-t / d))
    rn = min(n, int(r * SR))
    if rn > 0:
        e[-rn:] *= np.linspace(1, 0, rn) ** 2
    return e


def aditivo(f, n, parciais, fase=None):
    """parciais: lista de (multiplicador, amplitude, decaimento_s ou None)."""
    t = np.arange(n) / SR
    out = np.zeros(n)
    rng = np.random.default_rng(int(f * 1000) % 2**32)
    for mult, amp, dec in parciais:
        fr = f * mult
        if fr > SR / 2.2:
            continue
        s = np.sin(2 * np.pi * fr * t + (rng.uniform(0, 6.28) if fase is None else fase))
        if dec:
            s *= np.exp(-t / dec)
        out += amp * s
    return out


# ---------------- instrumentos: (freq, duração_s, vel) -> array ----------------
def piano(f, d, v=1.0):
    n = int((d + 1.2) * SR)
    p = [(k * (1 + 0.0004 * k * k), 1 / k ** 1.4, 1.6 / (1 + 0.6 * k)) for k in range(1, 10)]
    s = aditivo(f, n, p) * env(n, 0.004, 0.25)
    s[: int(0.01 * SR)] += np.random.default_rng(1).normal(0, 0.02, int(0.01 * SR))  # martelo
    corte = int((d + 0.05) * SR)
    s[corte:] *= np.exp(-np.arange(n - corte) / SR / 0.18)  # abafador ao soltar
    return s * v * 0.5


def caixinha(f, d, v=1.0):
    n = int((d + 1.5) * SR)
    return aditivo(f, n, [(1, 1, 0.9), (2.76, 0.4, 0.35), (5.4, 0.25, 0.15), (8.9, 0.1, 0.08)]) * env(n, 0.002, 0.3) * v * 0.4


def pluck(f, d, v=1.0):
    n = int((d + 0.6) * SR)
    return aditivo(f, n, [(k, 1 / k, 0.5 / k) for k in range(1, 12)]) * env(n, 0.002, 0.1) * v * 0.35


def pizz(f, d, v=1.0):
    n = int(0.35 * SR)
    return aditivo(f, n, [(k, 1 / k ** 1.2, 0.12 / k ** 0.5) for k in range(1, 8)]) * env(n, 0.003, 0.05) * v * 0.5


def baixo(f, d, v=1.0):
    n = int((d + 0.08) * SR)
    return aditivo(f, n, [(1, 1, None), (2, 0.35, 0.3), (3, 0.12, 0.2)], fase=0) * env(n, 0.006, 0.06, d=0.5, sus=0.6) * v * 0.6


def tuba(f, d, v=1.0):
    n = int((d + 0.05) * SR)
    return aditivo(f, n, [(1, 1, None), (2, 0.6, None), (3, 0.35, None), (4, 0.2, None), (5, 0.1, None)], fase=0) * env(n, 0.02, 0.05, d=0.25, sus=0.5) * v * 0.45


def pad(f, d, v=1.0):
    n = int((d + 0.8) * SR)
    s = np.zeros(n)
    for det in (-0.006, 0, 0.007):  # três "serras" desafinadas = coro de cordas
        s += aditivo(f * (1 + det), n, [(k, 1 / k, None) for k in range(1, 14)])
    t = np.arange(n) / SR
    s *= 1 + 0.08 * np.sin(2 * np.pi * 5.2 * t)
    return s * env(n, 0.5, 0.8) * v * 0.08


def chip(f, d, v=1.0):  # onda quadrada 8-bit com vibrato
    n = int((d + 0.03) * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 6 * t) * np.minimum(1, t / 0.15)
    s = sum(np.sin(2 * np.pi * f * k * np.cumsum(vib) / SR) / k for k in range(1, 16, 2) if f * k < SR / 2.2)
    return s * env(n, 0.004, 0.03, d=0.4, sus=0.7) * v * 0.16


def epiano(f, d, v=1.0):
    n = int((d + 0.8) * SR)
    t = np.arange(n) / SR
    s = aditivo(f, n, [(1, 1, 1.5), (2, 0.3, 0.4), (3, 0.08, 0.2), (14, 0.05, 0.03)], fase=0)
    return s * (1 + 0.25 * np.sin(2 * np.pi * 4.5 * t)) * env(n, 0.003, 0.3) * v * 0.4


def ruido(n, seed=0):
    return np.random.default_rng(seed).normal(0, 1, n)


def kick(v=1.0):
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t / 0.04)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16) * v * 0.9


def snare(v=1.0):
    n = int(0.25 * SR); t = np.arange(n) / SR
    s = passa_banda(ruido(n, 3), 1200, 7000) * np.exp(-t / 0.07) + 0.4 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05)
    return s * v * 0.5


def hat(v=1.0, aberto=False):
    n = int((0.25 if aberto else 0.06) * SR); t = np.arange(n) / SR
    return passa_banda(ruido(n, 5), 7000, 16000) * np.exp(-t / (0.08 if aberto else 0.015)) * v * 0.25


def palma(v=1.0):
    n = int(0.2 * SR); t = np.arange(n) / SR; e = np.zeros(n)
    for o in (0, 0.01, 0.022):
        e += np.exp(-np.maximum(0, t - o) / 0.012) * (t >= o)
    return passa_banda(ruido(n, 9), 900, 5000) * e * v * 0.3


def tom(f=90, v=1.0):
    n = int(0.6 * SR); t = np.arange(n) / SR
    fr = f * (1 + 0.5 * np.exp(-t / 0.05))
    return (np.sin(2 * np.pi * np.cumsum(fr) / SR) + 0.2 * passa_banda(ruido(n, 11), 200, 2000) * np.exp(-t / 0.03)) * np.exp(-t / 0.3) * v * 0.8


def madeira(v=1.0):
    n = int(0.08 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 900 * t) * np.exp(-t / 0.015) * v * 0.35


# ---------------- efeitos (FFT, circulares = loop perfeito) ----------------
def passa_banda(x, lo=None, hi=None):
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(fr)
    if lo: g *= 1 / np.sqrt(1 + (lo / np.maximum(fr, 1)) ** 4)
    if hi: g *= 1 / np.sqrt(1 + (fr / hi) ** 4)
    return np.fft.irfft(X * g, len(x))


def reverb(x, tempo=2.2, mix=0.25, seed=2):
    n = len(x); m = int(tempo * SR)
    ir = np.zeros(n); t = np.arange(m) / SR
    cauda = ruido(m, seed) * np.exp(-t * 6.9 / tempo)
    cauda = passa_banda(cauda, 200, 6000)
    ir[:m] = cauda[: min(m, n)] if m <= n else cauda[:n]
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    molhado = np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(ir), n)  # convolução circular: cauda volta ao início
    return x * (1 - mix) + molhado * mix * 1.4


# ---------------- sequenciador ----------------
class Faixa:
    def __init__(self, bpm, compassos, tempos=4):
        self.spb = 60 / bpm; self.n = int(round(compassos * tempos * self.spb * SR))
        self.bus = {}

    def add(self, bus, sinal, tempo):
        b = self.bus.setdefault(bus, np.zeros(self.n))
        i = int(round(tempo * self.spb * SR)) % self.n
        s = sinal[: self.n]
        fim = i + len(s)
        if fim <= self.n: b[i:fim] += s
        else: b[i:] += s[: self.n - i]; b[: fim - self.n] += s[self.n - i:]

    def nota(self, bus, inst, midi, tempo, dur, v=1.0):
        self.add(bus, inst(hz(midi), dur * self.spb, v), tempo)

    def mix(self, ganhos, efeitos=None):
        out = np.zeros(self.n)
        for k, b in self.bus.items():
            if efeitos and k in efeitos: b = efeitos[k](b)
            out += b * ganhos.get(k, 1.0)
        return out


ACORDES = {  # intervalos a partir da tônica
    'm': [0, 3, 7], 'M': [0, 4, 7], 'm7': [0, 3, 7, 10], 'M7': [0, 4, 7, 11], '7': [0, 4, 7, 10], 'm9': [0, 3, 7, 10, 14], 'M9': [0, 4, 7, 11, 14], 'sus': [0, 5, 7],
}


def acorde(nome):  # "A:m" -> (57, [0,3,7])
    raiz, tipo = nome.split(':')
    return 45 + 'A A# B C C# D D# E F F# G G#'.split().index(raiz), ACORDES[tipo]


def melodia(rng, prog, compassos, escala, base, passos=(1, 1, 0.5, 0.5, 2), alcance=(0, 14)):
    """Passeio aleatório na escala, puxando para notas do acorde no tempo forte. Retorna [(midi, inicio, dur)]."""
    notas, t, grau = [], 0.0, 7
    while t < compassos * 4 - 0.01:
        d = rng.choice(passos)
        if t + d > compassos * 4: d = compassos * 4 - t
        r, iv = acorde(prog[int(t // 4) % len(prog)])
        if abs(t % 2) < 1e-6:  # tempo forte -> nota do acorde
            alvos = [g for g in range(alcance[0], alcance[1]) if (base + escala[g % len(escala)] + 12 * (g // len(escala)) - r) % 12 in [i % 12 for i in iv]]
            grau = min(alvos, key=lambda g: abs(g - grau) + rng.random())
        else:
            grau = int(np.clip(grau + rng.choice([-2, -1, -1, 1, 1, 2]), *alcance))
        if rng.random() > 0.12:
            notas.append((base + escala[grau % len(escala)] + 12 * (grau // len(escala)), t, d))
        t += d
    return notas


MENOR = [0, 2, 3, 5, 7, 8, 10]; MAIOR = [0, 2, 4, 5, 7, 9, 11]


# ---------------- as trilhas ----------------
def suspense(rng):
    prog = ['A:m', 'F:M', 'D:m', 'E:M']; F = Faixa(88, 16)
    for c in range(16):
        r, iv = acorde(prog[c % 4]); t0 = c * 4
        for i in iv: F.nota('pad', pad, r + i, t0, 4, 0.9)
        for k in range(8): F.nota('baixo', baixo, r - 12, t0 + k * 0.5, 0.4, 0.7 if k % 2 else 1)
        for k in range(8): F.add('tic', hat(0.5 if k % 2 else 0.8), t0 + k * 0.5)
        if c >= 4:
            for k, i in enumerate([0, 7, 12, iv[1] + 12, 12, 7]): F.nota('arp', caixinha, r + 12 + i, t0 + k * 0.66, 0.6, 0.5)
        if c >= 8:
            F.add('bumbo', kick(0.9), t0); F.add('bumbo', kick(0.6), t0 + 0.35); F.add('bumbo', kick(0.9), t0 + 2); F.add('bumbo', kick(0.6), t0 + 2.35)
    return F.mix({'pad': 1, 'baixo': 0.8, 'tic': 0.5, 'arp': 0.6, 'bumbo': 0.8}, {'pad': lambda b: reverb(passa_banda(b, None, 2500), 3, 0.4), 'arp': lambda b: reverb(b, 3, 0.5)})


def triste(rng):
    prog = ['A:m', 'F:M', 'C:M', 'G:M']; F = Faixa(70, 16)
    for c in range(16):
        r, iv = acorde(prog[c % 4]); t0 = c * 4
        padrao = [0, 7, 12, iv[1] + 12, 12, 7, 0, 7]
        for k, i in enumerate(padrao): F.nota('piano', piano, r - 12 + i, t0 + k * 0.5, 0.5, 0.55 if k else 0.8)
        if c >= 4:
            for i in iv: F.nota('cordas', pad, r + i, t0, 4, 0.6)
    for m, t, d in melodia(rng, prog, 8, MENOR, 69, passos=(1, 1, 2, 0.5)):
        F.nota('mel', piano, m, 32 + t, d, 0.7)
    return F.mix({'piano': 1, 'cordas': 0.7, 'mel': 0.8}, {'piano': lambda b: reverb(b, 2.8, 0.35), 'mel': lambda b: reverb(b, 2.8, 0.35), 'cordas': lambda b: reverb(passa_banda(b, None, 3000), 3, 0.5)})


def alegre(rng):
    prog = ['C:M', 'G:M', 'A:m', 'F:M']; F = Faixa(118, 16)
    for c in range(16):
        r, iv = acorde(prog[c % 4]); t0 = c * 4
        for b in (0.5, 1.5, 2.5, 3.5):
            for j, i in enumerate(iv): F.nota('uke', pluck, r + 12 + i, t0 + b + j * 0.02, 0.4, 0.6)
        for k, b in enumerate([0, 1.5, 2, 3]): F.nota('baixo', baixo, r - 12 + (7 if k == 1 else 0), t0 + b, 0.45)
        for b in range(4): F.add('bat', kick(0.8) if b % 2 == 0 else snare(0.7), t0 + b)
        for k in range(8): F.add('bat', hat(0.45), t0 + k * 0.5 + 0.0)
        if c % 2: F.add('bat', palma(0.6), t0 + 3.5)
    for m, t, d in melodia(rng, prog, 8, MAIOR, 72, passos=(0.5, 0.5, 1, 0.25, 0.25)):
        F.nota('chip', chip, m, 32 + t, d * 0.9, 0.8)
    return F.mix({'uke': 0.9, 'baixo': 0.8, 'bat': 0.8, 'chip': 0.7}, {'uke': lambda b: reverb(b, 1.2, 0.2), 'chip': lambda b: reverb(b, 1.0, 0.2)})


def engracado(rng):
    prog = ['F:M', 'C:7', 'F:M', 'A#:M', 'F:M', 'C:7', 'D:m', 'C:7']; F = Faixa(112, 16)
    for c in range(16):
        r, iv = acorde(prog[c % 8]); t0 = c * 4
        for k, b in enumerate([0, 1, 2, 3]): F.nota('tuba', tuba, r - 12 + (0 if k % 2 == 0 else 7) - (12 if r > 50 else 0), t0 + b, 0.45)
        for b in (0.5, 1.5, 2.5, 3.5):
            for i in iv[:3]: F.nota('pizz', pizz, r + 12 + i, t0 + b, 0.2, 0.35)
        F.add('mad', madeira(0.7), t0 + 1); F.add('mad', madeira(0.7), t0 + 3)
        if c % 4 == 3: F.add('mad', madeira(0.6), t0 + 3.5); F.add('mad', madeira(0.6), t0 + 3.75)
    for m, t, d in melodia(rng, prog, 16, MAIOR, 65, passos=(0.5, 0.5, 0.25, 0.25, 1)):
        F.nota('mel', pizz, m + 12, t, d, 0.75)
    return F.mix({'tuba': 0.9, 'pizz': 0.6, 'mad': 0.6, 'mel': 0.8}, {'pizz': lambda b: reverb(b, 1.0, 0.15), 'mel': lambda b: reverb(b, 1.0, 0.18)})


def epico(rng):
    prog = ['D:m', 'A#:M', 'F:M', 'C:M']; F = Faixa(100, 16)
    for c in range(16):
        r, iv = acorde(prog[c % 4]); t0 = c * 4
        for i in iv: F.nota('cordas', pad, r + i, t0, 4, 1.0); F.nota('cordas', pad, r + i - 12, t0, 4, 0.7)
        for k in range(8): F.nota('baixo', baixo, r - 24 + 12, t0 + k * 0.5, 0.4, 0.8)
        if c >= 4:
            for b, v in [(0, 1), (0.75, 0.6), (1.5, 0.8), (2, 1), (2.75, 0.6), (3.25, 0.7), (3.5, 0.9)]: F.add('tambor', tom(70 if b in (0, 2) else 110, v), t0 + b)
        if c >= 8:
            F.add('tambor', kick(1), t0); F.add('tambor', snare(0.8), t0 + 2)
    for m, t, d in melodia(rng, prog, 8, MENOR, 62, passos=(2, 1, 1, 4)):
        F.nota('metal', chip, m, 32 + t, d, 0.5)
    return F.mix({'cordas': 1.0, 'baixo': 0.7, 'tambor': 0.9, 'metal': 0.6}, {'cordas': lambda b: reverb(passa_banda(b, None, 3500), 3, 0.45), 'tambor': lambda b: reverb(b, 2, 0.25), 'metal': lambda b: reverb(passa_banda(b, None, 2500), 2.5, 0.4)})


def curioso(rng):
    prog = ['C:M7', 'F:M7', 'A:m7', 'G:sus']; F = Faixa(96, 16)
    for c in range(16):
        r, iv = acorde(prog[c % 4]); t0 = c * 4
        arp = [iv[0], iv[1], iv[2], iv[-1], iv[2], iv[1]]
        for k in range(8): F.nota('caixa', caixinha, r + 24 + arp[k % len(arp)], t0 + k * 0.5, 0.5, 0.6)
        for i in iv[:3]: F.nota('pad', pad, r + 12 + i, t0, 4, 0.4)
        F.nota('baixo', pizz, r - 12, t0, 1); F.nota('baixo', pizz, r - 5, t0 + 2, 1)
    return F.mix({'caixa': 0.8, 'pad': 0.6, 'baixo': 0.9}, {'caixa': lambda b: reverb(b, 2.5, 0.4), 'pad': lambda b: reverb(passa_banda(b, None, 2500), 3, 0.5)})


def lofi(rng):
    prog = ['D:m9', 'G:7', 'C:M9', 'A:m7']; F = Faixa(82, 16)
    sw = 0.08  # swing
    for c in range(16):
        r, iv = acorde(prog[c % 4]); t0 = c * 4
        for i in iv: F.nota('ep', epiano, r + i, t0 + 0.02 * iv.index(i), 3.6, 0.5)
        F.nota('baixo', baixo, r - 12, t0, 1.5); F.nota('baixo', baixo, r - 12 + 7, t0 + 2.5, 1)
        F.add('bat', kick(0.7), t0); F.add('bat', kick(0.5), t0 + 2.5); F.add('bat', snare(0.45), t0 + 1); F.add('bat', snare(0.45), t0 + 3)
        for k in range(8): F.add('bat', hat(0.35 if k % 2 else 0.5), t0 + k * 0.5 + (sw if k % 2 else 0))
    for m, t, d in melodia(rng, prog, 8, MENOR, 62, passos=(1, 0.5, 1.5, 2)):
        F.nota('mel', epiano, m + 12, 32 + t, d, 0.4)
    vinil = passa_banda(ruido(F.n, 21), 1000, 8000) * 0.004 + (np.random.default_rng(4).random(F.n) > 0.9998) * 0.08
    F.bus['vinil'] = vinil
    return F.mix({'ep': 0.8, 'baixo': 0.8, 'bat': 0.6, 'mel': 0.6, 'vinil': 1}, {'ep': lambda b: reverb(passa_banda(b, None, 3500), 2, 0.3), 'bat': lambda b: passa_banda(b, None, 7000), 'mel': lambda b: reverb(passa_banda(b, None, 3500), 2, 0.35)})


def perseguicao(rng):
    prog = ['E:m', 'E:m', 'C:M', 'D:M']; F = Faixa(136, 16)
    for c in range(16):
        r, iv = acorde(prog[c % 4]); r = r if r < 52 else r - 12; t0 = c * 4
        for k in range(16): F.nota('baixo', baixo, r - 12 + (12 if k % 4 == 3 else 0), t0 + k * 0.25, 0.22, 0.9 if k % 4 == 0 else 0.6)
        for b in range(4): F.add('bat', kick(0.9), t0 + b)
        F.add('bat', snare(0.8), t0 + 1); F.add('bat', snare(0.8), t0 + 3)
        for k in range(16): F.add('bat', hat(0.3 + 0.2 * (k % 2 == 0)), t0 + k * 0.25)
        for i in iv: F.nota('pad', pad, r + 12 + i, t0, 4, 0.6)
    for m, t, d in melodia(rng, prog, 8, MENOR, 64, passos=(0.25, 0.5, 0.25, 0.5, 1)):
        F.nota('lead', chip, m + 12, 32 + t, d * 0.9, 0.6)
    return F.mix({'baixo': 0.8, 'bat': 0.8, 'pad': 0.6, 'lead': 0.6}, {'pad': lambda b: reverb(passa_banda(b, None, 3000), 2, 0.4), 'lead': lambda b: reverb(b, 1.2, 0.2)})


TRILHAS = {'suspense': suspense, 'triste': triste, 'alegre': alegre, 'engracado': engracado, 'epico': epico,
           'curioso': curioso, 'lofi': lofi, 'perseguicao': perseguicao}


def salvar(nome, x):
    x = np.tanh(x / (np.max(np.abs(x)) + 1e-9) * 1.2) * 0.9
    est = np.stack([x, np.roll(x, int(0.012 * SR))], 1)  # leve estéreo (Haas)
    os.makedirs(SAIDA, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        caminho = tmp.name
    with wave.open(caminho, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((est * 32767).astype('<i2').tobytes())
    dst = os.path.join(SAIDA, nome + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', caminho, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '160k', dst], check=True)
    os.remove(caminho)
    print(f'  {nome}.mp3  ({len(x) / SR:.0f} s)')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    seed = int(sys.argv[sys.argv.index('--seed') + 1]) if '--seed' in sys.argv else 1
    args = [a for a in args if not a.isdigit()]
    for nome in args or TRILHAS:
        salvar(nome, TRILHAS[nome](np.random.default_rng(seed)))
