const ESCADA = ['1 sem', '1 mês', '2 meses', '4 meses', '6 meses'];
const VIDEO = { id: 'so-o-gabarito', dur: 11.5, topo: 'Cadência Med', topo2: 'Caderno de erros', cenas: [
  { t0: 0, t1: 2.0, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: -1.3, passo: .1, top: 330, size: 108, texto: 'POV: terminou a *prova antiga* e só conferiu o gabarito' },
    { tipo: 'chips', t: .2, y: 1060, lista: [{ k: 'Prova antiga', v: 'gabarito conferido' }] } ] },
  { t0: 2.0, t1: 4.2, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'carimbo', t: 2.0, x: 170, y: 330, texto: 'SÓ O GABARITO', rot: -7 },
    { tipo: 'head', t: 2.4, passo: .1, top: 720, size: 104, texto: 'E as *erradas* ficaram pra trás' } ] },
  { t0: 4.2, t1: 9.1, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 4.22, passo: .1, texto: 'No Cadência Med o erro vai pro *caderno de erros* e ^volta no dia certo^' },
    { tipo: 'escada', t: 4.5, y: 800, passos: ESCADA, passo: .4 },
    { tipo: 'head', t: 7.3, passo: .08, top: 1220, size: 76, texto: 'POV: terminou a *prova antiga* e só conferiu o gabarito' } ] },
  { t0: 9.1, t1: 11.5, bg: ['#5b21b6', '#0e7490'], blocos: [{ tipo: 'fim', t: 9.15, a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado', c: 'Black Friday · manda BLACK no direct' }] } ] };
