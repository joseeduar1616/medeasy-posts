// Reel "O certificado na gaveta": motion de marca, sem rosto, 31 s.
// Nada de número inventado: o vídeo fala do serviço como ele é (CLAUDE.md e PLAYBOOK.md).
export const VIDEO = { id: 'gaveta', dur: 31, cenas: [
  { t0: 0, t1: 3.8, tema: 'claro', blocos: [
    { tipo: 'head', t: -1, top: 300, size: 100, texto: 'Aquele certificado *parado* na gaveta...' },
    { tipo: 'tres', obj: 'certificados', t: -1, y: 640, h: 900 } ] },
  { t0: 3.8, t1: 7, tema: 'neon', blocos: [
    { tipo: 'head', t: 4.1, top: 640, size: 150, passo: .28, texto: 'pode *valer ponto*' },
    { tipo: 'sub', t: 5.2, top: 1080, texto: 'na prova de residência.' } ] },
  { t0: 7, t1: 11.4, tema: 'escuro', blocos: [
    { tipo: 'head', t: 7.25, top: 300, size: 96, texto: 'Só que cada edital *pontua* de um jeito.' },
    { tipo: 'fichas', t: 8.4, y: 820 } ] },
  { t0: 11.4, t1: 15.2, tema: 'claro', blocos: [
    { tipo: 'head', t: 11.6, top: 300, size: 92, texto: 'O que soma numa prova pode ~não contar~ na outra.' },
    { tipo: 'compara', t: 12.9, y: 900 } ] },
  { t0: 15.2, t1: 19.2, tema: 'escuro', blocos: [
    { tipo: 'tres', obj: 'lampada', t: 15.35, y: 330, h: 760 },
    { tipo: 'head', t: 16.3, top: 1130, size: 100, texto: 'A MedEasy lê o edital *por você.*' } ] },
  { t0: 19.2, t1: 23.8, tema: 'escuro', blocos: [
    { tipo: 'checks', t: 19.5, y: 470, passo: .7, itens: ['Confere *cada certificado*', 'Encaixa no *item certo*', 'Monta o *Currículo Vitae*', 'Mostra *o que falta*'] } ] },
  { t0: 23.8, t1: 27.6, tema: 'claro', blocos: [
    { tipo: 'head', t: 24, top: 270, size: 92, texto: 'E você acompanha tudo no *portal.*' },
    { tipo: 'tres', obj: 'celular', t: 24.6, y: 560, h: 940 } ] },
  { t0: 27.6, t1: 31, tema: 'escuro', blocos: [{ tipo: 'fim', t: 27.85 }] } ] };
