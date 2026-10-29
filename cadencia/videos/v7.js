const VIDEO = { id: 'sobreviveria-4ano', dur: 18, topo: 'Cadência Med', topo2: '4º ano', cenas: [
  { t0: 0, t1: 3.6, bg: ['#4c0519', '#312e81'], blocos: [
    { tipo: 'head', t: .15, passo: .15, top: 380, size: 116, texto: 'Você sobreviveria a *um dia de 4º ano* com o ^ENAMED^ chegando?' } ] },
  { t0: 3.6, t1: 9, bg: ['#7c2d12', '#1e3a8a'], blocos: [
    { tipo: 'relogio', t: 3.7, y: 240, rot: 'Quinta-feira', texto: '07:00' },
    { tipo: 'chips', t: 4.5, y: 640, passo: .6, lista: [{ k: '07h:', v: 'ambulatório' }, { k: '13h:', v: 'aula' }, { k: '19h:', v: 'plantão', ruim: 1 }, { k: '23h:', v: 'Pediatria parada desde o 3º ano', ruim: 1 }] },
    { tipo: 'carimbo', t: 7.6, x: 260, y: 1150, texto: 'E O ENAMED?', rot: -7 } ] },
  { t0: 9, t1: 14, bg: ['#3b1d8f', '#0e7490'], blocos: [
    { tipo: 'head', t: 9.15, texto: 'O Cadência Med monta sua semana com o *ciclo clínico*' },
    { tipo: 'tela', t: 10.8, y: 780, rot: 'O conteúdo do estágio entra no cronograma', img: 'prints/cronograma.jpg', iw: 1440, recorte: [662, 126, 352, 188] } ] },
  { t0: 14, t1: 18, bg: ['#5b21b6', '#0e7490'], blocos: [{ tipo: 'fim', t: 14.1, a: 'Teste <span class="hl">3 dias</span> grátis', b: 'Sem cartão · tudo liberado' }] } ] };
