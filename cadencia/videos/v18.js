const VIDEO = { id: 'so-tres-revisoes', dur: 11.5, topo: 'Cadência Med', topo2: 'Revisão', cenas: [
  { t0: 0, t1: 2.0, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: -1.3, passo: .1, top: 330, size: 108, texto: 'POV: saiu do plantão às 7h e as *revisões de hoje* são só 3' },
    { tipo: 'chips', t: .2, y: 1080, lista: [{ k: 'Saída do plantão', v: '7h' }] } ] },
  { t0: 2.0, t1: 4.2, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'carimbo', t: 2.0, x: 270, y: 330, texto: 'SÓ 3', rot: -7 },
    { tipo: 'head', t: 2.4, passo: .1, top: 720, size: 104, texto: 'Sem caçar o que *venceu* e sem montar nada' } ] },
  { t0: 4.2, t1: 9.1, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 4.22, passo: .1, size: 94, texto: 'No Cadência Med a revisão já vem *separada* e ^no dia certo^' },
    { tipo: 'tela', t: 4.5, y: 690, rot: 'Tela real: revisões no Cadência Med', img: 'prints/revisoes.jpg', iw: 1440, recorte: [295, 225, 1110, 640], zoom: 1 },
    { tipo: 'head', t: 7.3, passo: .08, top: 1330, size: 62, texto: 'POV: saiu do plantão às 7h e as *revisões de hoje* são só 3' } ] },
  { t0: 9.1, t1: 11.5, bg: ['#5b21b6', '#0e7490'], blocos: [{ tipo: 'fim', t: 9.15, a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado', c: 'Black Friday · manda BLACK no direct' }] } ] };
