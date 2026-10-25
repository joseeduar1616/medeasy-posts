const VIDEO = { id: 'sobreviveria-internato', dur: 19, topo: 'Cadência Med', topo2: 'Internato', cenas: [
  { t0: 0, t1: 3.6, bg: ['#4c0519', '#312e81'], blocos: [
    { tipo: 'head', t: .15, passo: .16, top: 420, size: 128, texto: 'Você sobreviveria a *uma semana* de ^internato?^' } ] },
  { t0: 3.6, t1: 9.2, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'relogio', t: 3.7, y: 240, rot: 'Segunda-feira', texto: '06:00' },
    { tipo: 'chips', t: 4.5, y: 640, passo: .55, lista: [{ k: '06h:', v: 'visita na enfermaria' }, { k: '07h às 19h:', v: 'plantão', ruim: 1 }, { k: '20h:', v: 'aula atrasada', ruim: 1 }, { k: '23h:', v: 'revisão de Cardio?', ruim: 1 }, { k: 'Sábado:', v: 'simulado' }] },
    { tipo: 'carimbo', t: 7.9, x: 300, y: 1200, texto: 'E O SONO?', rot: -7 } ] },
  { t0: 9.2, t1: 14.6, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 9.35, texto: 'O Cadência Med encaixa o estudo na sua *escala*' },
    { tipo: 'tela', t: 11, y: 800, rot: 'Sua semana, com o plantão dentro', img: 'prints/rotina.jpg', iw: 1080, recorte: [205, 378, 520, 300] } ] },
  { t0: 14.6, t1: 19, bg: ['#5b21b6', '#0e7490'], blocos: [{ tipo: 'fim', t: 14.7, a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado' }] } ] };
