function anel(p){ const r = 46, c = 2 * Math.PI * r; return `<svg class="ring" viewBox="0 0 110 110" role="img" aria-label="${p}% concluído"><circle cx="55" cy="55" r="${r}" fill="none" stroke="var(--line)" stroke-width="9"/><circle cx="55" cy="55" r="${r}" fill="none" stroke="var(--neon)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p / 100)}" transform="rotate(-90 55 55)"/><text x="55" y="58" text-anchor="middle" font-size="24">${p}%</text><text x="55" y="76" text-anchor="middle" font-size="9" fill="var(--muted)" style="fill:var(--muted);font-family:var(--f-body);font-weight:600;letter-spacing:.08em">CONCLUÍDO</text></svg>`; }
function portalView(p, preview){
  const ct = p.contato || CONTATO; const nome = primeiro(p.nome);
  const pend = (p.pendencias || []).filter(x => !x.feita); const feitas = (p.pendencias || []).filter(x => x.feita);
  const prazos = [];
  (p.provas || []).forEach(x => { if (x.prazoEnvio) prazos.push({ d:x.prazoEnvio, t:`Fim do envio do currículo ${x.nome}` }); if (x.dataProva) prazos.push({ d:x.dataProva, t:`Prova ${x.nome}` }); });
  (p.servicos || []).forEach(s => { if (s.prazo && s.etapa < ULT) prazos.push({ d:s.prazo, t:`Entrega prevista: ${s.nome}` }); });
  prazos.sort((a, b) => a.d.localeCompare(b.d)); const futuros = prazos.filter(x => dias(x.d) >= 0);
  const f = p.financeiro || {};
  const svcAtual = (p.servicos || []).filter(s => s.etapa < ULT).sort((a, b) => a.etapa - b.etapa)[0];
  const subt = !p.servicos?.length ? "Assim que o seu serviço começar, cada etapa aparece aqui" : svcAtual ? ETAPAS[svcAtual.etapa].c : "Tudo pronto. Agora é anexar na inscrição e focar na prova";
  const waTxt = `Oi, ${ct.mentor.split(" ")[0]}! Aqui é ${p.nome || ""}. `;
  return `${preview ? `<div class="preview-bar"><div class="wrap"><span>Prévia do que ${esc(nome)} vê</span><button class="btn sm" data-a="sairPreview">Voltar ao painel</button></div></div>` : ""}
  <header class="top"><div class="wrap top-in"><img class="logo" src="${LOGO}" alt=""><div class="brand"><b>MED<i>EASY</i></b><span>Seu currículo para a residência</span></div><span style="flex:1"></span><a class="btn sm" target="_blank" rel="noopener" href="${waLink(ct.whats, waTxt)}">Falar com o mentor</a></div></header>
  <main class="wrap portal stack" style="gap:16px">
    <section class="hero"><div><div class="label gold">Olá${nome ? ", " + esc(nome) : ""}</div><h1>${p.servicos?.length && !svcAtual ? "Seu currículo está pronto" : "Seu currículo está andando"}</h1><p>${esc(subt)}</p>
      <p class="xs faint" style="margin-top:10px">Atualizado ${esc(dataHora(p.atualizadoEm))}</p></div>${anel(p.progresso || 0)}</section>

    ${pend.length ? `<section class="card"><div class="card-h"><h2>O que falta você enviar</h2><span class="pill gold">${pend.length}</span></div>
      ${pend.map(x => `<div class="pend"><span class="dot gold" style="margin-top:7px;flex:none"></span><div class="grow"><div style="font-weight:600">${esc(x.texto)}</div>${x.prazo ? `<div class="xs muted">até ${dBR(x.prazo)}</div>` : ""}</div><a class="btn sm" target="_blank" rel="noopener" href="${waLink(ct.whats, waTxt + "Sobre a pendência: " + x.texto)}">Avisar</a></div>`).join("")}
      ${feitas.length ? `<details style="margin-top:10px"><summary class="small muted" style="cursor:pointer">${feitas.length} ${feitas.length > 1 ? "itens resolvidos" : "item resolvido"}</summary><div style="margin-top:8px">${feitas.map(x => `<div class="pend feita">${esc(x.texto)}</div>`).join("")}</div></details>` : ""}</section>` : ""}

    ${futuros.length ? `<section class="card"><div class="card-h"><h2>Próximas datas</h2></div><div class="list">${futuros.slice(0, 5).map(x => { const d = dias(x.d); return `<div class="li"><div class="countdown"><b class="num">${d}</b><span>${d === 1 ? "dia" : "dias"}</span></div><div class="grow"><div class="t">${esc(x.t)}</div><div class="small muted">${dBR(x.d)}</div></div></div>`; }).join("")}</div></section>` : ""}

    <section class="card"><div class="card-h"><h2>${(p.servicos || []).length > 1 ? "Seus serviços" : "Seu serviço"}</h2></div>
      ${(p.servicos || []).length ? `<div class="stack" style="gap:18px">${p.servicos.map(s => `<div><div class="row between" style="margin-bottom:10px"><b>${esc(s.nome)}</b>${s.etapa === ULT ? `<span class="pill ok">Entregue</span>` : ETAPAS[s.etapa].cli ? `<span class="pill gold">Depende de você</span>` : `<span class="pill">Com a MedEasy</span>`}</div>
        <div>${ETAPAS.map((e, j) => `<div class="pstep ${j < s.etapa || s.etapa === ULT ? "done" : j === s.etapa ? "cur" : "todo"}"><span class="b">${j < s.etapa || s.etapa === ULT ? "✓" : ""}</span><div><div class="tt">${e.t}</div>${j === s.etapa && s.etapa < ULT ? `<div class="small muted">${e.c}</div>` : ""}</div></div>`).join("")}</div></div>`).join(`<div class="hr"></div>`)}</div>` : `<div class="empty">O seu mentor está cadastrando os serviços</div>`}</section>

    ${resumoNotasView(p)}

    ${(p.provas || []).map(pv => { const it = pv.itens || []; const temNota = pv.notaEstimada !== "" && pv.notaEstimada != null;
      return `<section class="card"><div class="card-h"><div><h2>${esc(pv.nome)} ${esc(pv.ano || "")}</h2>${pv.area ? `<div class="sub">${esc(pv.area)}</div>` : ""}</div>${pv.link ? `<a class="btn sm" href="${esc(pv.link)}" target="_blank" rel="noopener">Edital</a>` : ""}</div>
        ${temNota ? `<div class="row" style="gap:24px;align-items:flex-end"><div><div class="label">Nota estimada</div><div class="score">${d1(num(pv.notaEstimada))}<small> / ${d1(num(pv.notaMax) || 100)}</small></div></div>${num(pv.notaPossivel) > num(pv.notaEstimada) ? `<div><div class="label gold">Possível até o prazo</div><div class="score gold" style="font-size:30px">${d1(num(pv.notaPossivel))}</div></div>` : ""}</div>
          <div class="bar" style="margin-top:12px;height:8px;position:relative"><i style="width:${Math.min(100, num(pv.notaEstimada) / (num(pv.notaMax) || 100) * 100)}%"></i></div>` : `<p class="muted small" style="margin:0">A projeção da nota aparece aqui depois da análise curricular</p>`}
        ${pv.prazoEnvio || pv.dataProva ? `<div class="row small" style="margin-top:12px">${pv.prazoEnvio ? `<span class="pill gold">Envio até ${dBR(pv.prazoEnvio)}</span>` : ""}${pv.dataProva ? `<span class="pill info">Prova ${dBR(pv.dataProva)}</span>` : ""}</div>` : ""}
        ${pv.regras ? `<p class="small" style="margin:12px 0 0;color:var(--muted)">${esc(pv.regras)}</p>` : ""}
        ${pv.edital ? `<details style="margin-top:12px"><summary class="small" style="cursor:pointer;font-weight:600">Como o currículo conta nesta prova</summary><div class="small" style="margin-top:8px"><p style="margin:0 0 6px"><b>Peso:</b> ${esc(pv.edital.peso || "")}</p><p style="margin:0 0 6px"><b>Envio:</b> ${esc(pv.edital.envio || "")}</p><p style="margin:0 0 6px"><b>Formato:</b> ${esc(pv.edital.formato || "")}</p>${pv.edital.obs ? `<p style="margin:0 0 6px"><b>Atenção:</b> ${esc(pv.edital.obs)}</p>` : ""}${typeof fichaTabela === "function" ? fichaTabela(pv.edital) : ""}</div></details>` : ""}
        ${it.length ? itensView(it) : ""}
        ${!preview && typeof marcacaoView === "function" ? marcacaoView(pv) : ""}
      </section>`; }).join("")}

    ${!preview && typeof certsClienteView === "function" ? certsClienteView() : ""}

    ${orcamentoClienteView(p)}

    ${(p.documentos || []).length ? `<section class="card"><div class="card-h"><h2>Seus documentos</h2></div><div class="list">${p.documentos.map(d => `<div class="li"><div class="grow"><div class="t">${esc(d.nome)}</div></div>${d.link ? `<a class="btn sm pri" href="${esc(d.link)}" target="_blank" rel="noopener">Abrir</a>` : ""}</div>`).join("")}</div></section>` : ""}

    ${(p.atualizacoes || []).length ? `<section class="card"><div class="card-h"><h2>Novidades</h2></div><div class="tl">${[...p.atualizacoes].reverse().slice(0, 12).map(a => `<div class="tl-i"><div class="xs muted">${esc(dataHora(a.em))}</div><div class="small">${esc(a.texto)}</div></div>`).join("")}</div></section>` : ""}

    ${f.total ? `<section class="card"><div class="card-h"><h2>Pagamento</h2>${f.saldo > 0 ? `<span class="pill gold">Saldo ${brl(f.saldo)}</span>` : `<span class="pill ok">Quitado</span>`}</div>
      <div class="row between small"><span>Total do serviço</span><b class="num">${brl(f.total)}</b></div><div class="row between small" style="margin-top:4px"><span>Pago</span><b class="num neon">${brl(f.pago)}</b></div>
      <div class="bar" style="margin-top:10px"><i style="width:${Math.min(100, f.pago / f.total * 100)}%"></i></div>
      <p class="xs muted" style="margin:10px 0 0">${f.saldo <= 0.009 ? "Pagamento completo. Obrigado pela confiança." : f.entradaOk ? "Entrada recebida. O restante é pago quando você receber a versão para conferência." : `A entrada é de 50% (${brl(f.total / 2)}) e libera o começo da produção.`}</p>
      ${f.pix && f.saldo > 0 ? `<div class="code" style="margin-top:10px;font-family:var(--f-body);font-size:13px">${esc(f.pix)}</div>` : ""}</section>` : ""}

    ${typeof feedbackCardView === "function" ? feedbackCardView(p, preview) : ""}

    <section class="card"><div class="card-h"><h2>Como funciona</h2></div>
      <details class="faq"><summary>Quanto tempo leva?</summary><p>A análise curricular sai em até 3 dias úteis. O Vitae e o Lattes, em até 7 dias úteis. Se precisar antes, fale com o mentor sobre a taxa de urgência.</p></details>
      <details class="faq"><summary>Como confiro o documento?</summary><p>Quando o serviço chegar na etapa de conferência, o link aparece em Seus documentos. Confira tudo e mande os ajustes pelo WhatsApp. Alterações depois de 2 dias do envio têm taxa adicional.</p></details>
      <details class="faq"><summary>Vocês enviam o currículo no site da prova?</summary><p>Não. Entregamos tudo pronto, do jeito que o edital pede, para você só anexar na inscrição.</p></details>
      <details class="faq"><summary>Posso mandar mais certificados depois?</summary><p>Pode. Avise o mentor. Certificados novos podem mudar a nota e o valor do serviço.</p></details>
      <details class="faq"><summary>Quem cuida dos certificados?</summary><p>A MedEasy organiza os certificados que você envia. Não produzimos certificados nem declarações, e a origem dos documentos é responsabilidade de quem envia.</p></details></section>

    <section class="card"><div class="row between"><div><div class="label">Seu mentor</div><b style="font-size:17px">${esc(ct.mentor)}</b><div class="small muted">${esc(ct.texto)} · ${esc(ct.email)}</div></div><a class="btn pri" target="_blank" rel="noopener" href="${waLink(ct.whats, waTxt)}">Chamar no WhatsApp</a></div></section>
    <p class="xs faint" style="text-align:center">MedEasy · @med_easyy · Goiânia, Goiás</p>
  </main>`;
}

function itensView(it){
  const sit = x => { const t = semAcento(x.situacao || ""); if (t.startsWith("completo")) return ["ok","Completo"]; if (t.startsWith("aumentar")) return ["gold","Dá para aumentar agora"]; if (t.startsWith("parcial")) return ["gold","Parcial"]; if (t.startsWith("medio")) return ["info","Médio prazo"]; if (t.startsWith("nao se aplica")) return ["","Não se aplica agora"]; return x.situacao ? ["", x.situacao] : (x.max && x.pontos >= x.max ? ["ok","Completo"] : ["",""]); };
  const completos = it.filter(x => x.max && x.pontos >= x.max).length;
  const chances = it.filter(x => x.ganho > 0 && /^(aumentar|parcial)/.test(semAcento(x.situacao || "aumentar"))).sort((a, b) => b.ganho - a.ganho).slice(0, 5);
  return `<div class="hr"></div>
   <div class="row between small"><span><b>${completos}</b> de ${it.length} itens completos</span>${chances.length ? `<span class="gold">Onde dá para ganhar mais agora</span>` : ""}</div>
   ${chances.length ? `<div class="stack" style="gap:6px;margin-top:8px">${chances.map(x => `<div class="pend" style="padding:8px 12px"><div class="grow small"><b>${esc(x.nome)}</b><div class="xs muted">${esc(x.regra || "")}</div></div><b class="num gold">+${d1(x.ganho)}</b></div>`).join("")}</div>` : ""}
   <div style="margin-top:12px">${it.map(x => { const [k, t] = sit(x); const tem = (x.comprovantes || []).length;
     return `<details class="faq"><summary style="list-style:none"><div class="itbar" style="border:0;padding:0"><div style="min-width:0"><div style="overflow-wrap:anywhere;font-weight:600">${esc(x.nome)}</div><div class="row" style="gap:6px;margin-top:4px">${t ? `<span class="pill ${k}">${esc(t)}</span>` : ""}${tem ? `<span class="xs muted">${tem} ${tem === 1 ? "comprovante" : "comprovantes"}</span>` : ""}</div><div class="bar ${x.max && x.pontos >= x.max ? "" : "gold"}" style="margin-top:6px"><i style="width:${x.max ? Math.min(100, x.pontos / x.max * 100) : 0}%"></i></div></div>
       <div class="num" style="text-align:right"><b>${d1(x.pontos)}</b><span class="muted"> / ${d1(x.max)}</span>${x.ganho ? `<div class="xs gold">+${d1(x.ganho)} possível</div>` : ""}</div></div></summary>
       <div class="small" style="margin-top:8px">${x.regra ? `<p class="muted" style="margin:0 0 8px">${esc(x.regra)}</p>` : ""}
        ${tem ? `<div class="label" style="margin-bottom:4px">O que você já tem</div><ol style="margin:0 0 8px;padding-left:20px">${x.comprovantes.map(c => `<li>${esc(c)}</li>`).join("")}</ol>` : `<p class="faint" style="margin:0 0 8px">Nenhum comprovante neste item ainda</p>`}
        ${x.comentario ? `<div class="label" style="margin-bottom:4px">${x.ganho > 0 ? "Como conseguir" : "Comentário do mentor"}</div><p style="margin:0">${esc(x.comentario)}</p>` : ""}</div></details>`; }).join("")}</div>`;
}

/* Resumo das notas: uma linha por prova, com o que falta para o máximo */
function resumoNotasView(p){
  const pv = (p.provas || []).filter(x => x.notaEstimada !== "" && x.notaEstimada != null); if (!pv.length) return "";
  return `<section class="card"><div class="card-h"><h2>Suas notas no currículo</h2></div><div class="list">${pv.map(x => {
    const max = num(x.notaMax) || 100, n = num(x.notaEstimada), falta = Math.max(0, Math.round((max - n) * 100) / 100); const abertos = (x.itens || []).filter(i => i.max && i.pontos < i.max - 0.001).length;
    return `<div class="li"><div class="grow"><div class="t">${esc(x.nome)}</div><div class="small muted">${falta > 0 ? `Faltam ${d1(falta)} pontos para o máximo${abertos ? ` · ${abertos} ${abertos === 1 ? "item ainda pode subir" : "itens ainda podem subir"}` : ""}` : "Nota máxima no currículo"}</div><div class="bar" style="margin-top:6px"><i style="width:${Math.min(100, n / max * 100)}%"></i></div></div><b class="num" style="white-space:nowrap">${d1(n)} <span class="muted">/ ${d1(max)}</span></b></div>`; }).join("")}</div></section>`;
}
/* Orçamento do cliente: o plano que ele escolheu vezes os certificados e artigos que já entraram. Atualiza sozinho. */
function orcamentoClienteView(p){
  const e = p.orcamento !== undefined ? p.orcamento : (typeof estimarJS === "function" && (p.tipos || []).length ? estimarJS(clienteDoPortal(p)) : null);
  if (!e || !(e.linhas || []).length) return ""; const f = p.financeiro || {};
  return `<section class="card"><div class="card-h"><h2>Seu orçamento</h2>${e.completo ? `<span class="pill ok">Atualizado</span>` : `<span class="pill">Aguardando a contagem</span>`}</div>
   <p class="small muted" style="margin:0 0 10px">É o plano que você escolheu, calculado com os certificados e artigos que já entraram no seu currículo. Se entrar certificado novo, o valor se atualiza aqui.</p>
   <div class="tbl-wrap"><table class="tbl"><tbody>${e.linhas.map(l => `<tr><td class="small">${esc(l.desc)}<div class="xs muted">${esc(l.conta)}</div></td><td class="r num" style="white-space:nowrap">${l.valor == null ? "–" : brl(l.valor)}</td></tr>`).join("")}</tbody>
   <tfoot><tr><td>${e.completo ? "Total com os certificados de hoje" : "Total até agora"}</td><td class="r num" style="white-space:nowrap">${brl(e.total)}</td></tr></tfoot></table></div>
   <p class="xs muted" style="margin:8px 0 0">Cada certificado a mais soma o valor por certificado da prova, e cada artigo ou capítulo soma ${brl(12.5)}.${f.total ? ` Valor combinado com o seu mentor: ${brl(f.total)}.` : ""} Descontos combinados não entram nesta conta. O valor final é confirmado pelo mentor.</p></section>`;
}
