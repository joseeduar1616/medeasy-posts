const VIDEO = { id: 'antes-depois', dur: 11, topo: 'Cadência Med', topo2: 'Antes e depois', cenas: [
  { t0: 0, t1: 2.4, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'pergunta', t: 0, rot: 'Antes', texto: 'Eu antes do Cadência Med' },
    { tipo: 'chips', t: .4, y: 640, passo: .4, lista: [{ k: 'Cronograma:', v: 'na planilha', ruim: 1 }, { k: 'Flashcards:', v: 'em outro app', ruim: 1 }, { k: 'Cronômetro:', v: 'no celular', ruim: 1 }, { k: 'Revisão:', v: 'no caderno', ruim: 1 }] } ] },
  { t0: 2.4, t1: 4.2, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'head', t: 2.45, passo: .12, top: 420, size: 118, texto: '~Planilha~ ~flashcard~ ~cronômetro~ ~caderno~' },
    { tipo: 'carimbo', t: 3.4, x: 250, y: 1080, texto: 'CANSEI', rot: -7 } ] },
  { t0: 4.2, t1: 8.7, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 4.25, passo: .12, texto: 'Eu depois: *uma tela*' },
    { tipo: 'tela', t: 4.4, y: 560, rot: 'Tela real: Hoje no Cadência Med', img: 'prints/hoje.jpg', iw: 1440, recorte: [278, 200, 560, 300], zoom: 1.04 } ] },
  { t0: 8.7, t1: 11, bg: ['#5b21b6', '#0e7490'], blocos: [{ tipo: 'fim', t: 8.75, a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado' }] } ] };
