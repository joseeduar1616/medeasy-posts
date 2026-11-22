const VIDEO = { id: 'domingo-22h', dur: 11.5, topo: 'Cadência Med', topo2: 'Semana', cenas: [
  { t0: 0, t1: 2.0, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: -1.3, passo: .1, top: 330, size: 108, texto: 'POV: domingo 22h e a *semana* ainda não tá montada' },
    { tipo: 'chips', t: .2, y: 1080, lista: [{ k: 'Domingo', v: '22h' }] } ] },
  { t0: 2.0, t1: 4.2, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'carimbo', t: 2.0, x: 270, y: 330, texto: '22H', rot: -7 },
    { tipo: 'head', t: 2.4, passo: .1, top: 720, size: 104, texto: 'Plantão, aula, revisão e *nada no lugar*' } ] },
  { t0: 4.2, t1: 9.1, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 4.22, passo: .1, size: 94, texto: 'O mentor de IA do Cadência Med olha seu painel e ^monta a semana^' },
    { tipo: 'tela', t: 4.5, y: 690, rot: 'Tela real: mentor de IA no Cadência Med', img: 'prints/assistente.jpg', iw: 1080, recorte: [225, 255, 830, 300], zoom: 1 },
    { tipo: 'head', t: 7.3, passo: .08, top: 1330, size: 62, texto: 'POV: domingo 22h e a *semana* ainda não tá montada' } ] },
  { t0: 9.1, t1: 11.5, bg: ['#5b21b6', '#0e7490'], blocos: [{ tipo: 'fim', t: 9.15, a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado', c: 'Black Friday · manda BLACK no direct' }] } ] };
