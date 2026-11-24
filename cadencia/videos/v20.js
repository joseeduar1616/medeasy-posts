const VIDEO = { id: 'onibus-15-min', dur: 11.5, topo: 'Cadência Med', topo2: 'Internato', cenas: [
  { t0: 0, t1: 2.0, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: -1.3, passo: .1, top: 330, size: 108, texto: 'POV: 6h40 no *ônibus* pro hospital e 15 minutos até chegar' },
    { tipo: 'chips', t: .2, y: 1120, lista: [{ k: 'Saída', v: '6h40' }] } ] },
  { t0: 2.0, t1: 4.2, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'carimbo', t: 2.0, x: 270, y: 330, texto: '15 MIN', rot: -7 },
    { tipo: 'head', t: 2.4, passo: .1, top: 720, size: 104, texto: 'E o celular só no *feed* até o ponto' } ] },
  { t0: 4.2, t1: 9.1, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 4.22, passo: .1, size: 94, texto: 'No Cadência Med os ^flashcards do dia^ já estão prontos' },
    { tipo: 'tela', t: 4.5, y: 690, rot: 'Tela real: flashcards com IA no Cadência Med', img: 'prints/cartoes_ia.jpg', iw: 1080, recorte: [210, 0, 840, 450], zoom: 1 },
    { tipo: 'head', t: 7.3, passo: .08, top: 1330, size: 62, texto: 'POV: 6h40 no *ônibus* pro hospital e 15 minutos até chegar' } ] },
  { t0: 9.1, t1: 11.5, bg: ['#5b21b6', '#0e7490'], blocos: [{ tipo: 'fim', t: 9.15, a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado', c: 'Black Friday · manda BLACK no direct' }] } ] };
