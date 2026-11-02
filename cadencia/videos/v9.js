const VIDEO = { id: 'primeiro-dia-internato', dur: 11, topo: 'Cadência Med', topo2: 'Internato', cenas: [
  { t0: 0, t1: 2.3, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'pergunta', t: 0, rot: 'POV', texto: 'Primeiro dia de internato' },
    { tipo: 'head', t: .5, passo: .12, top: 640, size: 124, texto: 'E a semana *já tá montada*' } ] },
  { t0: 2.3, t1: 4.5, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'relogio', t: 2.35, y: 240, rot: 'Segunda-feira', texto: '07:00' },
    { tipo: 'chips', t: 2.7, y: 640, passo: .35, lista: [{ k: '07h:', v: 'visita' }, { k: '13h:', v: 'ambulatório' }, { k: '19h:', v: 'plantão', ruim: 1 }] } ] },
  { t0: 4.5, t1: 8.7, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 4.55, passo: .12, texto: 'Você põe a escala no Cadência Med e ele monta a *semana*' },
    { tipo: 'tela', t: 4.8, y: 840, rot: 'Sua semana, com o plantão dentro', img: 'prints/rotina.jpg', iw: 1080, recorte: [205, 378, 520, 300] } ] },
  { t0: 8.7, t1: 11, bg: ['#5b21b6', '#0e7490'], blocos: [{ tipo: 'fim', t: 8.75, a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado' }] } ] };
