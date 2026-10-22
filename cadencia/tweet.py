"""Gera um Reel 9:16 no formato "tweet" do Cadência Med.

    python3 cadencia/tweet.py cadencia/posts/2026-10-22-algo-tweet.json

Usa cadencia/molde-tweet.png (a arte da marca: cabeçalho, cartão branco com
o perfil, rodapé) e escreve por cima o texto do tweet. Dentro da área do
vídeo passam telas reais do app (cadencia/prints/), com movimento lento.

O JSON tem:
  "id": "2026-10-22-algo-tweet",
  "formato": "tweet",
  "texto": "O SOM QUE A VIDA TEM quando a **revisão** chega no **dia certo**",
  "midia": [{"print": "hoje", "mov": "direita"}, {"print": "revisoes", "mov": "zoom"}],
  "duracao": 9,
  "legenda": "..."

Formato meme (o que mais rende): em vez de "midia", use "clipe" com o
caminho de um vídeo (relativo a cadencia/ ou absoluto). O vídeo entra
recortado na área do cartão, com o áudio original. Opcionais: "inicio" e
"fim" em segundos pra cortar o trecho. Até 30 s.

Meme com foto da IA do Canva (o normal desde 22/10): use "imagem_ia": true.
Aí sai só publicado/<id>/moldura.png (a arte com o texto e a área da foto
vazada) e previa-texto.jpg. A foto entra embaixo no Canva (AGENTES.md).

Meme famoso (imagem pronta da pasta "memes famosos" do Drive): use "foto"
com o caminho da imagem baixada. Sai reel.mp4 parado de 6 s e capa.jpg.

Em "texto", **assim** sai em negrito. Cabem até 3 linhas. "mov" pode ser
direita, esquerda, zoom ou desce. Saída: cadencia/publicado/<id>/reel.mp4,
capa.jpg (primeiro quadro) e previa-*.jpg pra conferir.
"""
import json, os, re, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
PRINTS = os.path.join(AQUI, 'prints')
MOLDE = os.path.join(AQUI, 'molde-tweet.png')
FONTE = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
FONTE_B = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'

W, H = 1080, 1920
MX0, MY0, MX1, MY1 = 189, 898, 891, 1603   # área do vídeo no cartão
TX, TY, TW, TBOT = 189, 750, 700, 886      # área do texto
FPS = 30

VEDADO = ['—', '–']


def conferir(post):
    tudo = post.get('texto', '') + post.get('legenda', '')
    for m in VEDADO:
        if m in tudo:
            raise SystemExit('texto com travessão')
    if re.search(r'n[ãa]o [ée] .{1,40}, [ée] ', tudo, re.I):
        raise SystemExit('texto no molde "não é X, é Y"')
    if len(post.get('legenda', '')) > 2200:
        raise SystemExit('legenda passa de 2200 caracteres')
    if not any(post.get(k) for k in ('midia', 'clipe', 'imagem_ia', 'foto')):
        raise SystemExit('falta "foto" (meme famoso), "clipe" (vídeo), "imagem_ia" (foto do Canva) ou "midia" (telas do app)')


def palavras(texto):
    """Quebra em palavras. Cada palavra é uma lista de pedaços (texto, negrito),
    pra pontuação colada no negrito ("**12h**,") continuar colada."""
    out, negrito = [], False
    for token in texto.split():
        pedacos = []
        for parte in re.split(r'(\*\*)', token):
            if parte == '**':
                negrito = not negrito
            elif parte:
                pedacos.append((parte, negrito))
        if pedacos:
            out.append(pedacos)
    return out


def layout(texto, tam):
    f = ImageFont.truetype(FONTE, tam)
    fb = ImageFont.truetype(FONTE_B, tam)
    esp = f.getlength(' ')
    linhas, atual, larg = [], [], 0
    for pedacos in palavras(texto):
        lw = sum((fb if b else f).getlength(t) for t, b in pedacos)
        extra = lw if not atual else esp + lw
        if atual and larg + extra > TW:
            linhas.append(atual)
            atual, larg = [(pedacos, lw)], lw
        else:
            atual.append((pedacos, lw))
            larg += extra
    if atual:
        linhas.append(atual)
    return linhas, f, fb, esp


def base_com_texto(texto):
    for tam in (36, 34, 32, 30, 28):
        linhas, f, fb, esp = layout(texto, tam)
        passo = round(tam * 1.2)
        if len(linhas) * passo <= TBOT - TY:
            break
    else:
        raise SystemExit('texto longo demais pro tweet: corte pra caber em 3 linhas')
    img = Image.open(MOLDE).convert('RGB')
    d = ImageDraw.Draw(img)
    y = TY
    for linha in linhas:
        x = TX
        for i, (pedacos, lw) in enumerate(linha):
            if i:
                x += esp
            for t, b in pedacos:
                fonte = fb if b else f
                d.text((x, y), t, font=fonte, fill=(20, 20, 24))
                x += fonte.getlength(t)
        y += passo
    return img


def carregar_print(nome):
    arq = os.path.join(PRINTS, nome + '.jpg')
    if not os.path.exists(arq):
        raise SystemExit(f'print não encontrado: {nome}. Opções: ' +
                         ', '.join(sorted(f[:-4] for f in os.listdir(PRINTS) if f.endswith('.jpg'))))
    return Image.open(arq).convert('RGB')


def suave(t):
    return t * t * (3 - 2 * t)


def quadro_midia(img, mov, t):
    """Recorte da tela no instante t (0 a 1), do tamanho da área do vídeo."""
    bw, bh = MX1 - MX0, MY1 - MY0
    iw, ih = img.size
    t = suave(t)
    if mov == 'zoom':
        z0, z1 = 1.0, 1.35
        z = z0 + (z1 - z0) * t
        esc = max(bw / iw, bh / ih) * z
        cw, ch = bw / esc, bh / esc
        cx, cy = iw * 0.32, ih * 0.38
        x0 = min(max(cx - cw / 2, 0), iw - cw)
        y0 = min(max(cy - ch / 2, 0), ih - ch)
    elif mov == 'desce':
        esc = bw / iw * 1.6
        cw, ch = bw / esc, bh / esc
        x0 = (iw - cw) * 0.15
        y0 = (ih - ch) * t if ih > ch else 0
    else:
        esc = bh / ih * 1.05
        cw, ch = bw / esc, bh / esc
        span = max(iw - cw, 0)
        x0 = span * (t if mov == 'direita' else 1 - t)
        y0 = (ih - ch) * 0.3 if ih > ch else 0
    cw, ch = min(cw, iw), min(ch, ih)
    return img.crop((round(x0), round(y0), round(x0 + cw), round(y0 + ch))).resize((bw, bh), Image.BILINEAR)


def ffmpeg():
    exe = os.environ.get('FFMPEG')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return 'ffmpeg'


def tem_audio(arq):
    r = subprocess.run([ffmpeg(), '-hide_banner', '-i', arq], capture_output=True, text=True)
    return 'Audio:' in r.stderr


def duracao(arq):
    r = subprocess.run([ffmpeg(), '-hide_banner', '-i', arq], capture_output=True, text=True)
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r.stderr)
    if not m:
        raise SystemExit('não consegui ler a duração do clipe')
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def meme(post, base, dest):
    clipe = post['clipe']
    if not os.path.isabs(clipe):
        clipe = os.path.join(AQUI, clipe)
    if not os.path.exists(clipe):
        raise SystemExit('clipe não encontrado: ' + clipe)
    ini = float(post.get('inicio', 0))
    fim = float(post.get('fim', duracao(clipe)))
    dur = min(fim - ini, 30.0)
    if dur < 3:
        raise SystemExit('o trecho do clipe precisa ter pelo menos 3 s')
    fundo = os.path.join(dest, '_fundo.png')
    base.save(fundo)
    bw, bh = MX1 - MX0, MY1 - MY0
    saida = os.path.join(dest, 'reel.mp4')
    filtro = (f'[1:v]trim=start={ini}:duration={dur},setpts=PTS-STARTPTS,fps={FPS},'
              f'scale={bw}:{bh}:force_original_aspect_ratio=increase,crop={bw}:{bh},setsar=1[c];'
              f'[0:v][c]overlay={MX0}:{MY0}:shortest=1,format=yuv420p[v]')
    cmd = [ffmpeg(), '-v', 'error', '-y', '-loop', '1', '-framerate', str(FPS), '-i', fundo, '-i', clipe]
    if tem_audio(clipe):
        filtro += f';[1:a]atrim=start={ini}:duration={dur},asetpts=PTS-STARTPTS[a]'
        mapa = ['-map', '[v]', '-map', '[a]']
    else:
        cmd += ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100']
        mapa = ['-map', '[v]', '-map', '2:a']
    cmd += ['-filter_complex', filtro, *mapa, '-t', f'{dur:.2f}', '-c:v', 'libx264', '-preset', 'medium',
            '-crf', '20', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', saida]
    if subprocess.run(cmd).returncode != 0:
        raise SystemExit('ffmpeg falhou')
    for nome, t in (('capa.jpg', 0.4), ('previa-meio.jpg', dur / 2), ('previa-fim.jpg', max(dur - 0.5, 0))):
        subprocess.run([ffmpeg(), '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', saida, '-frames:v', '1',
                        '-q:v', '3', os.path.join(dest, nome)])
    os.remove(fundo)
    print(saida, f'{dur:.1f} s')


def foto_meme(post, base):
    """Meme famoso (imagem pronta da pasta do Drive) dentro do cartão.
    A imagem entra inteira (sem cortar o texto que ela já tem), com o fundo
    preenchido pela própria imagem desfocada. Sai reel.mp4 parado de 6 s,
    capa.jpg (9:16, serve pro story) e não sobe a imagem original."""
    from PIL import ImageFilter
    arq = post['foto']
    if not os.path.isabs(arq):
        arq = os.path.join(AQUI, arq)
    if not os.path.exists(arq):
        raise SystemExit('foto não encontrada: ' + arq)
    bw, bh = MX1 - MX0, MY1 - MY0
    im = Image.open(arq).convert('RGB')
    fundo = im.copy()
    r = max(bw / fundo.width, bh / fundo.height)
    fundo = fundo.resize((round(fundo.width * r) + 1, round(fundo.height * r) + 1))
    fundo = fundo.crop(((fundo.width - bw) // 2, (fundo.height - bh) // 2,
                        (fundo.width - bw) // 2 + bw, (fundo.height - bh) // 2 + bh))
    fundo = fundo.filter(ImageFilter.GaussianBlur(28))
    r = min(bw / im.width, bh / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    fundo.paste(im, ((bw - im.width) // 2, (bh - im.height) // 2))
    quadro = base.copy()
    quadro.paste(fundo, (MX0, MY0))
    dest = os.path.join(AQUI, 'publicado', post['id'])
    os.makedirs(dest, exist_ok=True)
    capa = os.path.join(dest, 'capa.jpg')
    quadro.save(capa, quality=92)
    dur = float(post.get('duracao', 6))
    saida = os.path.join(dest, 'reel.mp4')
    cmd = [ffmpeg(), '-v', 'error', '-y', '-loop', '1', '-framerate', str(FPS), '-i', capa,
           '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
           '-t', f'{dur:.2f}', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
           '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', saida]
    if subprocess.run(cmd).returncode != 0:
        raise SystemExit('ffmpeg falhou')
    print(saida, f'{dur:.1f} s')


def moldura(post, base):
    """Meme com foto feita por IA no Canva: gera a arte com o texto e a área da
    foto vazada (transparente). No Canva a foto entra embaixo e esta arte por
    cima, e a exportação sai de lá (veja AGENTES.md)."""
    dest = os.path.join(AQUI, 'publicado', post['id'])
    os.makedirs(dest, exist_ok=True)
    img = base.convert('RGBA')
    vazio = Image.new('RGBA', (MX1 - MX0, MY1 - MY0), (0, 0, 0, 0))
    img.paste(vazio, (MX0, MY0))
    saida = os.path.join(dest, 'moldura.png')
    img.save(saida, optimize=True)
    previa = base.copy()
    ImageDraw.Draw(previa).rectangle((MX0, MY0, MX1 - 1, MY1 - 1), fill=(120, 120, 130))
    previa.save(os.path.join(dest, 'previa-texto.jpg'), quality=85)
    print(saida)


def main():
    post = json.load(open(sys.argv[1], encoding='utf-8'))
    conferir(post)
    base = base_com_texto(post['texto'])
    if post.get('imagem_ia'):
        return moldura(post, base)
    if post.get('foto'):
        return foto_meme(post, base)
    if post.get('clipe'):
        dest = os.path.join(AQUI, 'publicado', post['id'])
        os.makedirs(dest, exist_ok=True)
        return meme(post, base, dest)
    cenas = [(carregar_print(m['print']), m.get('mov', 'direita')) for m in post['midia']]
    dur = float(post.get('duracao', 9))
    n = round(dur * FPS)
    por_cena = n / len(cenas)
    fade = round(0.45 * FPS)

    dest = os.path.join(AQUI, 'publicado', post['id'])
    os.makedirs(dest, exist_ok=True)
    saida = os.path.join(dest, 'reel.mp4')
    cmd = [ffmpeg(), '-v', 'error', '-y',
           '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
           '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
           '-shortest', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
           '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', saida]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    previas = {0, n // 3, (2 * n) // 3, n - 1}
    for k in range(n):
        i = min(int(k / por_cena), len(cenas) - 1)
        t = (k - i * por_cena) / por_cena
        m = quadro_midia(*cenas[i], t)
        if i + 1 < len(cenas) and (i + 1) * por_cena - k <= fade:
            prox = quadro_midia(*cenas[i + 1], 0)
            a = 1 - ((i + 1) * por_cena - k) / fade
            m = Image.blend(m, prox, max(0.0, min(1.0, a)))
        quadro = base.copy()
        quadro.paste(m, (MX0, MY0))
        proc.stdin.write(quadro.tobytes())
        if k in previas:
            quadro.save(os.path.join(dest, 'capa.jpg' if k == 0 else f'previa-{k}.jpg'), quality=90)
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit('ffmpeg falhou')
    print(saida, f'{n / FPS:.1f} s')


if __name__ == '__main__':
    main()
