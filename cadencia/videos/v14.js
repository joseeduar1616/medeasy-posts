const ESCADA = ['1 sem', '1 mês', '2 meses', '4 meses', '6 meses'];
const VIDEO = { id: 'revisar-depois', dur: 11.5, topo: 'Cadência Med', topo2: 'Revisão', cenas: [
  { t0: 0, t1: 2.2, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: -.75, passo: .1, top: 330, size: 116, texto: 'POV: você disse *“vou revisar depois”*' },
    { tipo: 'chips', t: .2, y: 900, lista: [{ k: 'Aula de hoje', v: 'revisar depois' }] } ] },
  { t0: 2.2, t1: 4.4, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'carimbo', t: 2.25, x: 170, y: 330, texto: '1 MÊS DEPOIS', rot: -7 },
    { tipo: 'head', t: 2.6, passo: .1, top: 720, size: 104, texto: 'E a aula sumiu *da cabeça*' } ] },
  { t0: 4.4, t1: 9.1, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 4.42, passo: .1, texto: 'No Cadência Med cada aula volta *no dia certo*' },
    { tipo: 'escada', t: 4.6, y: 780, passos: ESCADA, passo: .4 },
    { tipo: 'head', t: 7.3, passo: .08, top: 1180, size: 80, texto: 'POV: você disse *“vou revisar depois”*' } ] },
  { t0: 9.1, t1: 11.5, bg: ['#5b21b6', '#0e7490'], blocos: [{ tipo: 'fim', t: 9.15, a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado', c: 'Black Friday · manda BLACK no direct' }] } ] };
