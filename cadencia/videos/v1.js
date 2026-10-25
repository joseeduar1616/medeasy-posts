const ESCADA = ['1 sem', '1 mês', '2 meses', '4 meses', '6 meses'];
const FIM = { tipo: 'fim', a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado' };
const VIDEO = { id: 'plantao', dur: 32, topo: 'Cadência Med', topo2: '3 dias grátis sem cartão', cenas: [
  { t0: 0, t1: 6.6, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'head', t: .3, texto: 'Três da *manhã.*' },
    { tipo: 'relogio', t: .9, y: 470, rot: 'Plantão · pronto-socorro', texto: '03:00' },
    { tipo: 'chips', t: 2.2, y: 930, passo: .75, lista: [
      { k: 'Aula de segunda:', v: 'não vista', ruim: 1 }, { k: 'Revisão de Cardio:', v: 'venceu', ruim: 1 }, { k: 'Prova:', v: 'chegando' }] } ] },
  { t0: 6.6, t1: 12, bg: ['#4c0519', '#312e81'], blocos: [
    { tipo: 'head', t: 6.8, texto: 'E aí você refaz o cronograma *inteiro*' },
    { tipo: 'chips', t: 8.4, y: 820, lista: [{ k: 'cronograma_final_', v: 'v7.xlsx' }] },
    { tipo: 'carimbo', t: 9.4, x: 300, y: 1040, texto: 'DE NOVO', rot: -8 } ] },
  { t0: 12, t1: 18, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 12.2, texto: 'O Cadência Med monta a semana em volta do *plantão*' },
    { tipo: 'tela', t: 14.4, y: 760, rot: 'Sua semana, com a escala dentro', img: 'prints/rotina.jpg', iw: 1080, recorte: [205, 378, 520, 300] } ] },
  { t0: 18, t1: 23.6, bg: ['#3b1d8f', '#155e75'], blocos: [
    { tipo: 'head', t: 18.2, texto: 'E a *revisão* volta no dia ^certo^' },
    { tipo: 'escada', t: 19.6, y: 800, passos: ESCADA, passo: .5 },
    { tipo: 'chips', t: 22.2, y: 1140, lista: [{ k: 'Toda aula marcada', v: 'entra na escada' }] } ] },
  { t0: 23.6, t1: 28, bg: ['#4c1d95', '#0e7490'], blocos: [
    { tipo: 'head', t: 23.8, texto: 'Estudo do jeito que o plantão *deixa*' },
    { tipo: 'checks', t: 25, y: 700, size: 104, passo: .6, itens: ['Semana *montada*', 'Revisão *sozinha*', 'Sem ~planilha~'] } ] },
  { t0: 28, t1: 32, bg: ['#5b21b6', '#0e7490'], blocos: [{ ...FIM, t: 28.2 }] } ] };
