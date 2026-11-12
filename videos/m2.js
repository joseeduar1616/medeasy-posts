// Mesmo Reel do m1, com narração (voz Lucas do ElevenLabs, 21 s) e as cenas no tempo de cada frase.
// A voz entra em 0,3 s. Começo de cada frase no vídeo: 0,35 2,75 5,13 7,38 10,08 12,46 17,76 19,83.
export const VIDEO = { id: 'gaveta-narrado', dur: 23, voz: .3, cenas: [
  { t0: 0, t1: 2.6, tema: 'claro', blocos: [
    { tipo: 'head', t: -1, top: 300, size: 100, texto: 'Aquele certificado *parado* na gaveta...' },
    { tipo: 'tres', obj: 'certificados', t: -1, y: 640, h: 900 } ] },
  { t0: 2.6, t1: 4.95, tema: 'neon', blocos: [
    { tipo: 'head', t: 2.85, top: 640, size: 150, passo: .25, texto: 'pode *valer ponto*' },
    { tipo: 'sub', t: 3.6, top: 1080, texto: 'na prova de residência.' } ] },
  { t0: 4.95, t1: 7.25, tema: 'escuro', blocos: [
    { tipo: 'head', t: 5.1, top: 300, size: 96, passo: .14, texto: 'Só que cada edital *pontua* de um jeito.' },
    { tipo: 'fichas', t: 5.8, y: 820 } ] },
  { t0: 7.25, t1: 9.95, tema: 'claro', blocos: [
    { tipo: 'head', t: 7.4, top: 300, size: 92, passo: .15, texto: 'O que soma numa prova pode ~não contar~ na outra.' },
    { tipo: 'compara', t: 8.2, y: 900 } ] },
  { t0: 9.95, t1: 12.3, tema: 'escuro', blocos: [
    { tipo: 'tres', obj: 'lampada', t: 10, y: 330, h: 760 },
    { tipo: 'head', t: 10.1, top: 1130, size: 100, passo: .16, texto: 'A MedEasy lê o edital *por você.*' } ] },
  { t0: 12.3, t1: 17.6, tema: 'escuro', blocos: [
    { tipo: 'checks', t: 12.4, y: 470, tempos: [12.4, 13.9, 15.2, 16.35], itens: ['Confere *cada certificado*', 'Encaixa no *item certo*', 'Monta o *Currículo Vitae*', 'Mostra *o que falta*'] } ] },
  { t0: 17.6, t1: 19.65, tema: 'claro', blocos: [
    { tipo: 'head', t: 17.72, top: 270, size: 92, passo: .13, texto: 'E você acompanha tudo no *portal.*' },
    { tipo: 'tres', obj: 'celular', t: 17.8, y: 560, h: 940, anel: [.4, 1], lista: [.9, .25] } ] },
  { t0: 19.65, t1: 23, tema: 'escuro', blocos: [{ tipo: 'fim', t: 19.8 }] } ] };
