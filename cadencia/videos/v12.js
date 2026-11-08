const VIDEO = { id: 'ultimo-ranking', dur: 11.5, topo: 'Cadência Med', topo2: 'Sala com amigos', cenas: [
  { t0: 0, t1: 2.3, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'pergunta', t: 0, rot: 'POV', texto: 'Seu amigo te chamou pra sala do Cadência Med' },
    { tipo: 'head', t: .5, passo: .12, top: 640, size: 124, texto: 'E agora você tá em *último*' } ] },
  { t0: 2.3, t1: 4.5, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'head', t: 2.35, passo: .12, top: 300, size: 104, texto: 'Ranking da *sala*' },
    { tipo: 'rank', t: 2.6, y: 560, linhas: [{ n: 'Rafael', h: '9h40' }, { n: 'Marina', h: '8h30' }, { n: 'Bia', h: '6h15' }, { n: 'Você', h: '0h45', eu: 1 }] },
    { tipo: 'carimbo', t: 3.8, x: 260, y: 1180, texto: 'ÚLTIMO', rot: -7 } ] },
  { t0: 4.5, t1: 9.2, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 4.55, passo: .12, texto: 'Abri o *Foco* e liguei o ^pomodoro^' },
    { tipo: 'tela', t: 4.8, y: 700, rot: 'Tela real: Foco no Cadência Med', img: 'prints/foco.jpg', iw: 1440, recorte: [300, 160, 1000, 400] } ] },
  { t0: 9.2, t1: 11.5, bg: ['#5b21b6', '#0e7490'], blocos: [{ tipo: 'fim', t: 9.25, a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado' }] } ] };
