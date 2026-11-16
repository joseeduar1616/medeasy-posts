const VIDEO = { id: 'pediatria-parada', dur: 11.5, topo: 'Cadência Med', topo2: 'Internato e ENAMED', cenas: [
  { t0: 0, t1: 2.0, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'relogio', t: 0, y: 250, rot: 'Voltou do ambulatório', texto: '22:00' },
    { tipo: 'head', t: -.75, passo: .1, top: 720, size: 108, texto: 'POV: 22h, voltou do *ambulatório*' } ] },
  { t0: 2.0, t1: 4.2, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'carimbo', t: 2.0, x: 150, y: 330, texto: 'DESDE O 3º ANO', rot: -7 },
    { tipo: 'head', t: 2.4, passo: .1, top: 720, size: 104, texto: 'E a *Pediatria* tá parada' } ] },
  { t0: 4.2, t1: 9.1, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 4.22, passo: .1, texto: 'No Cadência Med: *estágio* e ^Pediatria^ juntos' },
    { tipo: 'tela', t: 4.5, y: 760, rot: 'Tela real: ciclo clínico no Cadência Med', img: 'prints/cronograma.jpg', iw: 1440, recorte: [662, 126, 352, 188] },
    { tipo: 'head', t: 7.3, passo: .08, top: 1320, size: 76, texto: 'POV: 22h, voltou do *ambulatório*' } ] },
  { t0: 9.1, t1: 11.5, bg: ['#5b21b6', '#0e7490'], blocos: [{ tipo: 'fim', t: 9.15, a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado', c: 'Black Friday · manda BLACK no direct' }] } ] };
