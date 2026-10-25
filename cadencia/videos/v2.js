const FIM = { tipo: 'fim', a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado' };
const VIDEO = { id: 'preco', dur: 32, topo: 'Cadência Med', topo2: 'Pergunta frequente', cenas: [
  { t0: 0, t1: 5.8, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'pergunta', t: .3, rot: 'Pergunta frequente', texto: 'Quanto custa o Cadência Med?' },
    { tipo: 'head', t: 1.4, top: 560, texto: 'Primeiro, você *testa.*' },
    { tipo: 'adesivo', t: 2.6, x: 72, y: 900, a: '3 dias', b: 'grátis', rot: -4 },
    { tipo: 'chips', t: 3.6, y: 1150, lista: [{ k: 'Tudo liberado,', v: 'sem cartão' }] } ] },
  { t0: 5.8, t1: 10.8, bg: ['#312e81', '#155e75'], blocos: [
    { tipo: 'head', t: 6, texto: 'Gostou? No ^mensal^ fica' },
    { tipo: 'grande', t: 7.3, y: 700, texto: 'R$ 39', sub: 'por mês' } ] },
  { t0: 10.8, t1: 16.6, bg: ['#4c1d95', '#0e7490'], blocos: [
    { tipo: 'head', t: 11, texto: 'Ou no *anual*' },
    { tipo: 'grande', t: 11.8, y: 560, texto: 'R$ 300', sub: 'por ano' },
    { tipo: 'adesivo', t: 13.4, x: 72, y: 1120, a: '=', b: 'R$ 25 por mês', rot: -3 } ] },
  { t0: 16.6, t1: 21.4, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 16.8, texto: 'E ainda tem *7 dias* de garantia' },
    { tipo: 'tela', t: 18.4, y: 880, rot: 'A tela de planos do app', img: 'prints/planos.jpg', iw: 1080, recorte: [205, 440, 845, 230] } ] },
  { t0: 21.4, t1: 27.4, bg: ['#4c1d95', '#155e75'], blocos: [
    { tipo: 'head', t: 21.6, texto: 'O que vem *dentro*' },
    { tipo: 'checks', t: 22.4, y: 520, size: 80, passo: .55, itens: ['*90 aulas* e 213 tópicos', 'Revisão *espaçada*', 'Flashcards *com IA*', 'Mentor *de IA*', 'Salas *com amigos*'] } ] },
  { t0: 27.4, t1: 32, bg: ['#5b21b6', '#0e7490'], blocos: [{ ...FIM, t: 27.6 }] } ] };
