"""Monta roteiro.js do vídeo do agente (esfera que fala).
Uso: python3 roteiro.py [voz.mp3]
Sem áudio: tempo sintético proporcional às letras, em 35,76 s.
Com áudio: envelope real da voz a 30 fps e frases encaixadas nas pausas."""
import json, re, subprocess, sys
import numpy as np

FRASES = [  # (texto com *destaque*, cena)
    ("Eu *preciso* te contar", "orb"), ("um *segredo.*", "orb"), ("Eu não sou *humano.*", "orb"),
    ("Sou o *mentor de IA*", "orb"), ("do *Cadência Med,*", "orb"), ("e o meu trabalho é *simples:*", "orb"),
    ("*organizar* a sua preparação", "orb"), ("pra *residência.*", "orb"),
    ("Eu leio o seu *painel.*", "painel"), ("Sei quais *revisões* venceram,", "painel"),
    ("em que matéria você tá *abaixo da média*", "painel"), ("e quantos *plantões* você tem na semana.", "painel"),
    ("Aí eu monto a sua *semana*", "rotina"), ("em volta da *escala.*", "rotina"),
    ("Me manda o *PDF* da aula,", "cartoes"), ("e eu te devolvo os *flashcards* prontos.", "cartoes"),
    ("E cada aula volta pra *revisão*", "escada"), ("no *dia certo:*", "escada"),
    ("uma *semana,* um *mês,*", "escada"), ("*dois,* *quatro* e *seis* meses.", "escada"),
    ("Difícil de *acreditar?*", "orb"), ("Então faz *uma coisa:*", "orb"),
    ("clica no *link da bio*", "fim"), ("e testa *três dias grátis,* sem cartão.", "fim"),
    ("Eu tô te *esperando.*", "fim"),
]
DUR_SINT = 35.76
# onde a voz faz pausa: (frase, palavra) que abre cada trecho falado
UNIDADES = [(0, 0), (2, 0), (3, 0), (5, 0), (6, 0), (8, 0), (9, 0), (10, 0), (11, 0), (12, 0), (14, 0), (15, 0), (15, 6),
            (16, 0), (18, 0), (18, 2), (19, 0), (19, 1), (20, 0), (21, 0), (22, 0), (23, 0), (23, 5), (24, 0)]
FPS = 30


def palavras(txt):
    out, hl, dentro = [], [], False
    for tok in txt.split():
        abre = tok.startswith('*'); fecha = tok.endswith('*') or tok.rstrip('.,:?').endswith('*')
        w = tok.replace('*', '')
        if abre: dentro = True
        if dentro: hl.append(len(out))
        out.append(w)
        if fecha: dentro = False
    return out, hl


def pausa(w):
    return {'.': .45, '?': .45, ':': .3, ',': .18}.get(w[-1], .06)


def peso(w):
    return len(w) + 1.5


def envelope(mp3):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', mp3, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
    hop = 16000 // FPS
    n = len(x) // hop
    rms = np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1))
    return x, rms


def main():
    fr = [palavras(t) + (c,) for t, c in FRASES]
    todas = [(i, j, w) for i, (ws, _, _) in enumerate(fr) for j, w in enumerate(ws)]
    if len(sys.argv) > 1:
        x, rms = envelope(sys.argv[1])
        dur = len(x) / 16000
        fala = rms > 10 ** (-38 / 20)
        # trechos de fala separados por silêncio de 0,15 s ou mais; trecho curtinho (< 0,12 s) junta no seguinte
        trechos, k, n = [], 0, len(fala)
        while k < n:
            if not fala[k]: k += 1; continue
            a0 = k
            while k < n:
                if fala[k]: k += 1; continue
                q = k
                while q < n and not fala[q]: q += 1
                if q - k >= 5 or q >= n: break
                k = q
            trechos.append([a0 / FPS, k / FPS])
        junt = []
        for t0, t1 in trechos:
            if junt and junt[-1][1] - junt[-1][0] < .12: junt[-1][1] = t1
            else: junt.append([t0, t1])
        trechos = junt
        # cada unidade falada (entre pausas) cai num trecho; dentro dele, as palavras dividem o tempo pelas letras
        pos = {}; g = 0
        for i, (ws, _, _) in enumerate(fr):
            for j in range(len(ws)): pos[(i, j)] = g; g += 1
        ini = [pos[u] for u in UNIDADES] + [len(todas)]
        if len(trechos) != len(UNIDADES):
            sys.exit(f'achei {len(trechos)} trechos de fala e o texto tem {len(UNIDADES)} unidades: {trechos}')
        tempos = []
        for (t0, t1), u0, u1 in zip(trechos, ini, ini[1:]):
            ps = [peso(todas[q][2]) for q in range(u0, u1)]; tot = sum(ps); acc = t0
            for p in ps:
                d = (t1 - t0) * p / tot; tempos.append((acc, acc + d)); acc += d
        ajust = {}
        env = np.clip(rms / np.percentile(rms[fala], 95), 0, 1)
        env = np.convolve(env, np.ones(3) / 3, 'same')
    else:
        pesos = [peso(w) for _, _, w in todas]
        pausas = [pausa(w) if j == len(fr[i][0]) - 1 else 0 for i, j, w in todas]
        fala = DUR_SINT - .35 - sum(pausas) - .6
        unid = fala / sum(pesos)
        t = .35; tempos = []
        for p, pa in zip(pesos, pausas):
            tempos.append((t, t + p * unid)); t += p * unid + pa
        dur = DUR_SINT; ajust = {}
        env = None
    # monta as frases, reescalando as palavras quando o começo foi ajustado
    saida, k = [], 0
    for i, (ws, hl, cena) in enumerate(fr):
        bloco = tempos[k:k + len(ws)]; k += len(ws)
        s0, e0 = bloco[0][0], bloco[-1][1]
        s1 = ajust.get(i, s0); prox = None
        if i + 1 < len(fr): prox = ajust.get(i + 1, tempos[k][0])
        e1 = min(e0 + (s1 - s0), (prox - .05) if prox else dur) if s1 != s0 else e0
        esc = (e1 - s1) / max(e0 - s0, 1e-3)
        pal = [{'w': w, 's': round(s1 + (a - s0) * esc, 3), 'e': round(s1 + (b - s0) * esc, 3)} for w, (a, b) in zip(ws, bloco)]
        saida.append({'palavras': pal, 'hl': hl, 'cena': cena})
    if env is None:
        n = int(dur * FPS); env = np.zeros(n)
        for f in saida:
            for p in f['palavras']:
                a, b = int(p['s'] * FPS), int(p['e'] * FPS)
                env[a:b + 1] = np.maximum(env[a:b + 1], .55 + .4 * np.sin(np.linspace(0, np.pi, b - a + 1)))
    marcas = []
    for f in saida[18:20]:
        for j in f['hl']: marcas.append(float(f['palavras'][j]['s']))
    ev = []; ant = None
    for i, f in enumerate(saida):
        if f['cena'] != ant and i: ev.append({'t': round(f['palavras'][0]['s'] - .3, 3), 'tipo': 'impacto' if f['cena'] == 'fim' else 'whoosh'})
        ant = f['cena']
    for f in saida[9:12]: ev.append({'t': f['palavras'][-1]['e'], 'tipo': 'pop'})
    for m in marcas: ev.append({'t': m, 'tipo': 'tique'})
    import os; os.makedirs('saida', exist_ok=True)
    json.dump({'dur': round(dur + .8, 2), 'eventos': ev}, open('saida/agente-eventos.json', 'w'))
    rot = {'dur': round(dur + .8, 2), 'frases': saida, 'env': [round(float(v), 3) for v in env], 'marcasEscada': marcas}
    open('roteiro.js', 'w').write('window.ROTEIRO = ' + json.dumps(rot, ensure_ascii=False) + ';\n')
    print('dur', rot['dur'], 'frases', len(saida), 'marcas', marcas)
    for f in saida: print(f"{f['palavras'][0]['s']:6.2f}  {f['cena']:8s} {' '.join(p['w'] for p in f['palavras'])}")


main()
