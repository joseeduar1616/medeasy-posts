const VIDEO = { id: 'revisao-atrasada', dur: 11.5, topo: 'Cadência Med', topo2: 'Revisão', cenas: [
  { t0: 0, t1: 2.4, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'pergunta', t: 0, rot: 'Desafio', texto: 'Uma semana sem revisar' },
    { tipo: 'head', t: .45, passo: .11, top: 600, size: 116, texto: 'Você sobreviveria com a *revisão atrasada?*' } ] },
  { t0: 2.4, t1: 4.7, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'head', t: 2.45, passo: .1, top: 300, size: 96, texto: 'Revisões *vencidas*' },
    { tipo: 'contador', t: 2.7, y: 620, dur: .9, itens: [{ n: 3, l: 'SEGUNDA' }, { n: 9, l: 'QUARTA' }, { n: 15, l: 'SEXTA' }] },
    { tipo: 'carimbo', t: 3.9, x: 290, y: 1040, texto: 'E AGORA?', rot: -7 } ] },
  { t0: 4.7, t1: 9.2, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 4.75, passo: .11, texto: 'No Cadência Med cada aula volta *no dia certo*' },
    { tipo: 'tela', t: 4.9, y: 720, rot: 'Tela real: a escada de revisão', img: 'prints/revisoes.jpg', iw: 1440, recorte: [290, 225, 660, 190], zoom: 1.04 } ] },
  { t0: 9.2, t1: 11.5, bg: ['#5b21b6', '#0e7490'], blocos: [{ tipo: 'fim', t: 9.25, a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado' }] } ] };
