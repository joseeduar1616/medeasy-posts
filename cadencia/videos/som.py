"""Trilha sintetizada pros vídeos: batida de cadência (pulso grave), pad suave e efeitos
nos momentos marcados pelo motor (tique, pop, whoosh, impacto, carimbo, risco).
    python3 som.py saida/<id>-eventos.json saida/<id>.wav
"""
import json, sys
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 44100
rng = np.random.default_rng(3)
ev = json.load(open(sys.argv[1]))
dur = ev['dur']
n = int(dur * SR)
L = np.zeros(n); R = np.zeros(n)
t = np.arange(n) / SR


def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b): return sosfilt(butter(2, [a, b], 'band', fs=SR, output='sos'), x)


def poe(sinal, t0, g=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= n: return
    s = sinal[: n - i] * g
    L[i:i + len(s)] += s * (1 - pan) ** .5 if pan > 0 else s
    R[i:i + len(s)] += s * (1 + pan) ** .5 if pan < 0 else s


def env(d, a=.003, k=8.0):
    tt = np.arange(int(d * SR)) / SR
    return np.minimum(1, tt / a) * np.exp(-k * tt)


# pad: acorde menor bem baixo, com respiração lenta
for f, g in ((110, .5), (130.81, .35), (164.81, .35), (220, .25), (329.63, .12)):
    L += g * np.sin(2 * np.pi * f * t + .3) * (.6 + .4 * np.sin(2 * np.pi * .11 * t))
    R += g * np.sin(2 * np.pi * f * 1.003 * t) * (.6 + .4 * np.sin(2 * np.pi * .13 * t + 1))
L = lp(L, 900) * .05; R = lp(R, 900) * .05
fade = np.minimum(1, t / .15) * np.minimum(1, (dur - t) / 1.2)

# batida de cadência: dois pulsos graves (como um coração), 96 bpm
bat = 60 / 96
d = .32; tt = np.arange(int(d * SR)) / SR
kick = np.sin(2 * np.pi * (48 + 70 * np.exp(-tt * 28)) * tt) * env(d, .002, 11)
for k in np.arange(0, dur - .5, bat * 2):
    poe(kick, k, .55); poe(kick, k + bat * .42, .32)

# hi-hat leve no contratempo
hat = hp(rng.standard_normal(int(.05 * SR)), 7000) * env(.05, .001, 70)
for k in np.arange(bat / 2, dur - .5, bat):
    poe(hat, k, .05)

SONS = {}
d = .05; SONS['tique'] = (hp(rng.standard_normal(int(d * SR)), 3000) * env(d, .001, 90) * .5
                          + np.sin(2 * np.pi * 2400 * np.arange(int(d * SR)) / SR) * env(d, .001, 80) * .25)
d = .14; tt = np.arange(int(d * SR)) / SR; SONS['pop'] = np.sin(2 * np.pi * (700 + 500 * np.exp(-tt * 40)) * tt) * env(d, .002, 30) * .45
d = .6; tt = np.arange(int(d * SR)) / SR
w = rng.standard_normal(len(tt)); w = sum(bp(w, f0, f0 * 1.6) * ((tt > a) & (tt <= a + .1)) for a, f0 in zip(np.arange(0, .6, .1), (500, 900, 1600, 2600, 1800, 900)))
SONS['whoosh'] = lp(w, 6000) * np.sin(np.pi * tt / d) ** 2 * .35
d = .9; tt = np.arange(int(d * SR)) / SR
SONS['impacto'] = (np.sin(2 * np.pi * (40 + 90 * np.exp(-tt * 18)) * tt) * env(d, .002, 4.5) * .9
                   + lp(rng.standard_normal(len(tt)), 2500) * env(d, .001, 14) * .25)
d = .4; tt = np.arange(int(d * SR)) / SR
SONS['carimbo'] = (np.sin(2 * np.pi * (60 + 140 * np.exp(-tt * 30)) * tt) * env(d, .001, 9) * .9
                   + bp(rng.standard_normal(len(tt)), 300, 2500) * env(d, .001, 25) * .6)
d = .35; tt = np.arange(int(d * SR)) / SR
SONS['risco'] = bp(rng.standard_normal(len(tt)), 1500, 6000) * np.sin(np.pi * tt / d) * .4

ganho = {'tique': .55, 'pop': .7, 'whoosh': .8, 'impacto': 1.0, 'carimbo': 1.0, 'risco': .8}
for i, e in enumerate(ev['eventos']):
    poe(SONS[e['tipo']], e['t'], ganho[e['tipo']], pan=(.25 if i % 2 else -.25) if e['tipo'] in ('tique', 'pop') else 0)

st = np.stack([L * fade, R * fade], 1)
st = np.tanh(st * 1.6) / np.tanh(1.6)
st *= .85 / np.abs(st).max()
wavfile.write(sys.argv[2], SR, (st * 32767).astype(np.int16))
print(sys.argv[2], f'{dur:.1f}s')
