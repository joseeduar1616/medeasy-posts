const VIDEO = { id: 'niveis-cansaco', dur: 18, topo: 'Cadência Med', topo2: 'Internato', cenas: [
  { t0: 0, t1: 3.2, bg: ['#4c0519', '#312e81'], blocos: [
    { tipo: 'head', t: .15, passo: .17, top: 420, size: 132, texto: 'Níveis de *cansaço* no ^internato^' } ] },
  { t0: 3.2, t1: 9.4, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'chips', t: 3.4, y: 300, passo: .75, lista: [{ k: 'Nível 1:', v: 'visita das 7h' }, { k: 'Nível 2:', v: 'ambulatório lotado' }, { k: 'Nível 3:', v: 'plantão de 12h', ruim: 1 }, { k: 'Nível 4:', v: 'aula atrasada às 23h', ruim: 1 }] },
    { tipo: 'carimbo', t: 7, x: 280, y: 1000, texto: 'E O NÍVEL 5?', rot: -7 } ] },
  { t0: 9.4, t1: 14.2, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 9.55, texto: 'Nível 5: abrir o Cadência Med e a semana *já estar montada*' },
    { tipo: 'tela', t: 11.3, y: 840, rot: 'Sua semana, com o plantão dentro', img: 'prints/rotina.jpg', iw: 1080, recorte: [205, 378, 520, 300] } ] },
  { t0: 14.2, t1: 18, bg: ['#5b21b6', '#0e7490'], blocos: [{ tipo: 'fim', t: 14.3, a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado' }] } ] };
