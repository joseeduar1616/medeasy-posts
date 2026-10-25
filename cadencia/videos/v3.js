const ESCADA = ['1 sem', '1 mês', '2 meses', '4 meses', '6 meses'];
const FIM = { tipo: 'fim', a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado' };
const VIDEO = { id: 'tour', dur: 36, topo: 'Cadência Med', topo2: 'O app em 30 segundos', cenas: [
  { t0: 0, t1: 5.8, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: .3, texto: 'O cronograma *inteiro* já vem pronto' },
    { tipo: 'contador', t: 1.8, y: 760, itens: [{ n: 90, l: 'AULAS' }, { n: 213, l: 'TÓPICOS' }] },
    { tipo: 'chips', t: 3.6, y: 1150, lista: [{ k: 'Divididos nas', v: '5 áreas da prova' }] } ] },
  { t0: 5.8, t1: 11.2, bg: ['#312e81', '#155e75'], blocos: [
    { tipo: 'head', t: 6, texto: 'E segue o cronograma da ^faculdade^ também' },
    { tipo: 'tela', t: 7.8, y: 760, rot: 'Residência, ciclo clínico ou os dois', img: 'prints/cronograma.jpg', iw: 1440, recorte: [662, 126, 352, 188] } ] },
  { t0: 11.2, t1: 16.4, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 11.4, texto: 'A *revisão* volta sozinha' },
    { tipo: 'escada', t: 12.4, y: 780, passos: ESCADA, passo: .5 } ] },
  { t0: 16.4, t1: 21.8, bg: ['#4c1d95', '#155e75'], blocos: [
    { tipo: 'head', t: 16.6, texto: 'Flashcards saem do seu ^PDF^' },
    { tipo: 'tela', t: 17.8, y: 820, rot: 'Joga o PDF, a IA monta os cartões', img: 'prints/cartoes_ia.jpg', iw: 1080, recorte: [220, 232, 820, 330] } ] },
  { t0: 21.8, t1: 26.6, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 22, texto: 'O ^foco^ vira *estatística*' },
    { tipo: 'timer', t: 23, y: 760, vel: 14, info: [{ l: 'Modo', v: 'POMODORO' }, { l: 'ou', v: 'TEMPO CORRIDO' }] } ] },
  { t0: 26.6, t1: 31.6, bg: ['#4c1d95', '#155e75'], blocos: [
    { tipo: 'head', t: 26.8, texto: 'E o *ranking* com os amigos' },
    { tipo: 'rank', t: 27.8, y: 720, linhas: [{ n: 'Marina', h: '12h40' }, { n: 'Você', h: '11h05', eu: 1 }, { n: 'Rafael', h: '8h30' }, { n: 'Bia', h: '6h15' }] } ] },
  { t0: 31.6, t1: 36, bg: ['#5b21b6', '#0e7490'], blocos: [{ ...FIM, t: 31.8 }] } ] };
