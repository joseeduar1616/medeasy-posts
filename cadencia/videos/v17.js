const ESCADA = ['1 sem', '1 mês', '2 meses', '4 meses', '6 meses'];
const VIDEO = { id: 'terceira-vez', dur: 11.5, topo: 'Cadência Med', topo2: 'Caderno de erros', cenas: [
  { t0: 0, t1: 2.0, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: -1.3, passo: .1, top: 330, size: 108, texto: 'POV: errou a mesma questão de *Cardio* pela terceira vez' },
    { tipo: 'chips', t: .2, y: 1000, lista: [{ k: 'Questão de Cardio', v: 'errada de novo' }] } ] },
  { t0: 2.0, t1: 4.2, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'carimbo', t: 2.0, x: 250, y: 330, texto: '3ª VEZ', rot: -7 },
    { tipo: 'head', t: 2.4, passo: .1, top: 720, size: 104, texto: 'E a *mesma alternativa* errada' } ] },
  { t0: 4.2, t1: 9.1, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 4.22, passo: .1, texto: 'No Cadência Med o erro vai pro *caderno de erros* e ^volta no dia certo^' },
    { tipo: 'escada', t: 4.5, y: 800, passos: ESCADA, passo: .4 },
    { tipo: 'head', t: 7.3, passo: .08, top: 1220, size: 76, texto: 'POV: errou a mesma questão de *Cardio* pela terceira vez' } ] },
  { t0: 9.1, t1: 11.5, bg: ['#5b21b6', '#0e7490'], blocos: [{ tipo: 'fim', t: 9.15, a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado', c: 'Black Friday · manda BLACK no direct' }] } ] };
