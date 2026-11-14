const VIDEO = { id: 'niveis-revisao', dur: 12, topo: 'Cadência Med', topo2: 'Revisão', cenas: [
  { t0: 0, t1: 4.2, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'head', t: -.75, passo: .1, top: 300, size: 116, texto: 'Níveis de *revisão atrasada*' },
    { tipo: 'chips', t: -.45, y: 720, passo: 1, lista: [{ k: 'Nível 1:', v: '3 vencidas' }, { k: 'Nível 2:', v: '9 vencidas' }, { k: 'Nível 3:', v: '15 vencidas', ruim: 1 }, { k: 'Nível 4:', v: 'fingir que não viu', ruim: 1 }] },
    { tipo: 'carimbo', t: 3.3, x: 260, y: 1230, texto: 'E O NÍVEL 5?', rot: -7 } ] },
  { t0: 4.2, t1: 9.6, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 4.22, passo: .1, texto: 'Nível 5: abrir o Cadência Med e ver *o dia certo* de cada revisão' },
    { tipo: 'tela', t: 5.3, y: 860, rot: 'Tela real: revisões no Cadência Med', img: 'prints/revisoes.jpg', iw: 1440, recorte: [295, 150, 880, 250], zoom: 1.04 } ] },
  { t0: 9.6, t1: 12, bg: ['#5b21b6', '#0e7490'], blocos: [{ tipo: 'fim', t: 9.65, a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado', c: 'Black Friday · manda BLACK no direct' }] } ] };
