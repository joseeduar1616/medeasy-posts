const VIDEO = { id: 'rodizio-5-areas', dur: 11.5, topo: 'Cadência Med', topo2: 'Internato e ENAMED', cenas: [
  { t0: 0, t1: 2.1, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'relogio', t: 0, y: 250, rot: 'Rodízio de Cirurgia', texto: '06:00' },
    { tipo: 'head', t: 0, passo: .1, top: 720, size: 116, texto: 'POV: 6h no *centro cirúrgico*' } ] },
  { t0: 2.1, t1: 4.3, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'head', t: 2.12, passo: .1, top: 280, size: 104, texto: 'E o ENAMED cobra as ^5 áreas^' },
    { tipo: 'areas', t: 2.3, y: 620, itens: [{ n: 'Clínica', v: 20 }, { n: 'Cirurgia', v: 20 }, { n: 'Pediatria', v: 20 }, { n: 'GO', v: 20 }, { n: 'Preventiva', v: 20, largo: 1 }] },
    { tipo: 'carimbo', t: 3.1, x: 250, y: 1230, texto: '5 ÁREAS', rot: -7 } ] },
  { t0: 4.3, t1: 9.1, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 4.32, passo: .1, texto: 'No Cadência Med as *5 áreas* ficam na ^mesma tela^' },
    { tipo: 'tela', t: 4.6, y: 760, rot: 'Tela real: matérias no Cadência Med', img: 'prints/materias.jpg', iw: 1700, recorte: [15, 140, 905, 300] },
    { tipo: 'head', t: 7.4, passo: .08, top: 1180, size: 80, texto: 'POV: 6h no *centro cirúrgico*' } ] },
  { t0: 9.1, t1: 11.5, bg: ['#5b21b6', '#0e7490'], blocos: [{ tipo: 'fim', t: 9.15, a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado', c: 'Black Friday · manda BLACK no direct' }] } ] };
