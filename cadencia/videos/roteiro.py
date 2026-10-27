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
        lim = max(rms.max() * .06, np.percentile(rms, 20) * 1.5)
        fala = rms > lim
        # fecha buracos curtos (até 3 quadros) e acha os trechos de fala
        idx = np.where(fala)[0]
        trechos = []
        for k in idx:
            if trechos and k - trechos[-1][1] <= 4: trechos[-1][1] = k
            else: trechos.append([k, k])
        trechos = [(a / FPS, (b + 1) / FPS) for a, b in trechos]
        # eixo de "tempo falado": letras distribuídas só dentro dos trechos de fala
        total_fala = sum(b - a for a, b in trechos)
        pesos = np.array([peso(w) for _, _, w in todas]); acum = np.concatenate([[0], np.cumsum(pesos)]) / pesos.sum()

        def t_de(frac):
            alvo = frac * total_fala
            for a, b in trechos:
                if alvo <= b - a: return a + alvo
                alvo -= b - a
            return trechos[-1][1]
        tempos = [(t_de(acum[k]), t_de(acum[k + 1])) for k in range(len(todas))]
        # encaixa o começo de cada frase no começo de trecho de fala mais perto (até 0,45 s)
        inicios = [a for a, _ in trechos]
        k = 0; ajust = {}
        for i, (ws, _, _) in enumerate(fr):
            s = tempos[k][0]
            perto = min(inicios, key=lambda q: abs(q - s))
            ajust[i] = perto if abs(perto - s) < .45 else s
            k += len(ws)
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
