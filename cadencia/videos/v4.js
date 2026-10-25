const ESCADA = ['1 sem', '1 mês', '2 meses', '4 meses', '6 meses'];
const FIM = { tipo: 'fim', a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado' };
const VIDEO = { id: 'enamed', dur: 32, topo: 'Cadência Med', topo2: 'Internato e ENAMED', cenas: [
  { t0: 0, t1: 6.2, bg: ['#1e3a8a', '#4c1d95'], blocos: [
    { tipo: 'head', t: .3, texto: 'No ^ENAMED^ são *100 questões*' },
    { tipo: 'areas', t: 1.8, y: 720, itens: [{ n: 'Clínica', v: 20 }, { n: 'Cirurgia', v: 20 }, { n: 'Pediatria', v: 20 }, { n: 'GO', v: 20 }, { n: 'Preventiva', v: 20, largo: 1 }] } ] },
  { t0: 6.2, t1: 11.4, bg: ['#4c0519', '#312e81'], blocos: [
    { tipo: 'head', t: 6.4, texto: 'E o *internato* começando junto' },
    { tipo: 'chips', t: 7.8, y: 760, passo: .7, lista: [{ k: 'Plantão:', v: '12h' }, { k: 'Ambulatório:', v: 'de manhã' }, { k: 'Estudo:', v: 'quando der?', ruim: 1 }] } ] },
  { t0: 11.4, t1: 17, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 11.6, texto: 'O Cadência Med segue o seu ^ciclo^ ^clínico^' },
    { tipo: 'tela', t: 13.6, y: 800, rot: 'Residência, ciclo clínico ou os dois', img: 'prints/cronograma.jpg', iw: 1440, recorte: [662, 126, 352, 188] } ] },
  { t0: 17, t1: 22.4, bg: ['#3b1d8f', '#155e75'], blocos: [
    { tipo: 'head', t: 17.2, texto: 'E a *revisão* volta no dia certo' },
    { tipo: 'escada', t: 18.6, y: 800, passos: ESCADA, passo: .5 } ] },
  { t0: 22.4, t1: 27.6, bg: ['#4c1d95', '#0e7490'], blocos: [
    { tipo: 'head', t: 22.6, texto: 'Dá tempo se *começar agora*' },
    { tipo: 'checks', t: 23.8, y: 680, size: 92, passo: .6, itens: ['5 áreas *no radar*', 'Semana *com a escala*', 'Flashcards *do seu PDF*'] } ] },
  { t0: 27.6, t1: 32, bg: ['#5b21b6', '#0e7490'], blocos: [{ ...FIM, t: 27.8 }] } ] };
