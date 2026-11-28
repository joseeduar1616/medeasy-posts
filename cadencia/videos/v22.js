const VIDEO = { id: 'simulado-turma', dur: 11.5, topo: 'Cadência Med', topo2: 'Simulado com a turma', cenas: [
  { t0: 0, t1: 2.0, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: -1.3, passo: .1, top: 330, size: 108, texto: 'POV: sábado *8h* e a turma do internato toda no *mesmo simulado*' },
    { tipo: 'chips', t: .2, y: 1100, lista: [{ k: 'Sábado de folga', v: 'simulado às 8h' }] } ] },
  { t0: 2.0, t1: 4.2, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'carimbo', t: 2.0, x: 170, y: 330, texto: 'A TURMA TODA', rot: -7 },
    { tipo: 'head', t: 2.4, passo: .1, top: 720, size: 104, texto: 'E o grupo já tá *cobrando a nota*' } ] },
  { t0: 4.2, t1: 9.1, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 4.22, passo: .1, texto: 'No Cadência Med tem *simulado com a turma* e ^ranking da sala^' },
    { tipo: 'rank', t: 4.5, y: 790, linhas: [{ n: 'Lara', h: '9h10' }, { n: 'Você', h: '8h40', eu: 1 }, { n: 'Pedro', h: '7h25' }] },
    { tipo: 'head', t: 7.3, passo: .08, top: 1270, size: 76, texto: 'POV: sábado *8h* e a turma do internato toda no *mesmo simulado*' } ] },
  { t0: 9.1, t1: 11.5, bg: ['#5b21b6', '#0e7490'], blocos: [{ tipo: 'fim', t: 9.15, a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado', c: 'Black Friday · manda BLACK no direct' }] } ] };
