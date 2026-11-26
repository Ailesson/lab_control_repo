import { apiRequest } from "./api.js";

// Endpoints utilizados: GET /user/me, GET /component/available,
// GET /reservation/ e POST /reservation/.
// O nome abaixo DEVE corresponder ao ReservationCreate do FastAPI.
// Se o schema ainda não foi migrado, veja o LEIA-ME do pacote.
const CAMPO_DATA_PREVISTA = "return_date";
const LOGIN_URL = "./login.html";
const elementos = {
  perfil: document.getElementById("perfilUsuario"),
  mensagem: document.getElementById("mensagemPainel"),
  busca: document.getElementById("buscaEquipamento"),
  corpoEquipamentos: document.getElementById("corpoEquipamentos"),
  listaReservas: document.getElementById("listaReservas"),
  corpoHistorico: document.getElementById("corpoHistorico"),
  formReserva: document.getElementById("formReserva"),
  erroReserva: document.getElementById("erroReserva"),
  btnEnviarReserva: document.getElementById("btnEnviarReserva"),
};

let equipamentos = [];
let reservas = [];
let filtroAtual = "todos";
let equipamentoSelecionado = null;

function no(tag, classe = "", texto = null) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== null) elemento.textContent = String(texto);
  return elemento;
}
function formatarData(valor) {
  if (!valor) return "Não registrada";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "Data inválida" : data.toLocaleString("pt-BR");
}
function nomeEquipamento(reserva) {
    const codigo = reserva.component_code;

    // Buscar pelo código cadastrado do componente
    const componente = equipamentos.find(
        String(item.component_id ?? "").trim() === codigo 
    );

    return componente?.name
        || reserva.component_name
        || `Equipamento código ${codigo ?? "não informado"}`;
}
function mostrarMensagem(mensagem, tipo = "success") {
  elementos.mensagem.textContent = mensagem;
  elementos.mensagem.className = `alert alert-${tipo}`;
}
function tratarErro(erro, lugar = "painel") {
  console.error(`Erro no ${lugar}:`, erro);
  if (erro.status === 401) {
    sessionStorage.removeItem("access_token");
    window.location.replace(LOGIN_URL);
    return;
  }
  if (lugar === "reserva") {
    elementos.erroReserva.textContent = erro.message || "Não foi possível criar a reserva.";
    elementos.erroReserva.classList.remove("d-none");
  } else {
    mostrarMensagem(erro.message || "Não foi possível carregar os dados.", "danger");
  }
}
function linhaVazia(texto, colunas) {
  const linha = no("tr");
  const td = no("td", "text-center text-muted py-4", texto);
  td.colSpan = colunas;
  linha.append(td);
  return linha;
}
function badgeStatus(status) {
    const valor = String(status ?? "Não informado");
    const normalizado = valor.toLowerCase();

    const cores = {
        confirmed: "success",
        confirmado: "success",
        borrowed: "success",
        emprestado: "success",
        pending: "warning",
        pendente: "warning",
        returned: "secondary",
        devolvido: "secondary",
        cancelled: "danger",
        cancelado: "danger",
        rejected: "danger",
        rejeitado: "danger"
    };

    return no(
        "span",
        `badge bg-${cores[normalizado] || "secondary"}`,
        valor
    );
}

function renderizarEquipamentos() {
  const termo = elementos.busca.value.trim().toLocaleLowerCase("pt-BR");
  const visiveis = equipamentos.filter(item => {
    const disponivel = Number(item.quantity) > 0;
    const filtroOk = filtroAtual === "todos" || (filtroAtual === "disponivel" && disponivel);
    const buscaOk = `${item.name} ${item.component_id} ${item.description}`
      .toLocaleLowerCase("pt-BR").includes(termo);
    return filtroOk && buscaOk;
  });
  elementos.corpoEquipamentos.replaceChildren();
  if (!visiveis.length) {
    elementos.corpoEquipamentos.append(linhaVazia(
      equipamentos.length ? "Nenhum equipamento encontrado para essa busca/filtro." : "Nenhum equipamento disponível na API.", 4
    ));
    return;
  }
  for (const item of visiveis) {
    const disponivel = Number(item.quantity) > 0;
    const tr = no("tr", disponivel ? "" : "table-warning");
    const colNome = no("td", "ps-3");
    const btnDetalhes = no("button", "btn btn-link text-decoration-none fw-bold p-0 text-start", `🔍 ${item.name}`);
    btnDetalhes.type = "button";
    btnDetalhes.addEventListener("click", () => abrirDetalhes(item));
    colNome.append(btnDetalhes, no("br"), no("small", "text-muted", `Código: ${item.component_id} | ${item.description || "Sem descrição"}`));
    const colStatus = no("td");
    colStatus.append(no("span", `badge bg-${disponivel ? "success" : "secondary"}`, disponivel ? "Disponível" : "Sem estoque"));
    const colEstoque = no("td", "", `${item.quantity} unidade(s)`);
    const colAcao = no("td", "pe-3 text-end");
    const btnReserva = no("button", "btn btn-primary btn-sm px-3", "Reservar");
    btnReserva.type = "button";
    btnReserva.disabled = !disponivel;
    btnReserva.addEventListener("click", () => abrirReserva(item));
    colAcao.append(btnReserva);
    tr.append(colNome, colStatus, colEstoque, colAcao);
    elementos.corpoEquipamentos.append(tr);
  }
}

function formatarDataCurta(valor) {
    if (!valor) return "Não informada";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return "Data inválida";
    }

    return data.toLocaleDateString("pt-BR");
}

function calcularDiasRestantes(valor) {
    if (!valor) return null;

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) return null;

    const hoje = new Date();

    const inicioHoje = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate()
    );

    const dataPrevista = new Date(
        data.getFullYear(),
        data.getMonth(),
        data.getDate()
    );

    return Math.round(
        (dataPrevista - inicioHoje) / 86400000
    );
}

function textoPrazo(dias) {
    if (dias === null) return "";

    if (dias < 0) {
        return `Atrasada há ${Math.abs(dias)} dia(s)`;
    }

    if (dias === 0) return "Devolução prevista para hoje";

    return `${dias} dia(s) restante(s)`;
}


function renderizarReservas() {
    elementos.listaReservas.replaceChildren();
    elementos.corpoHistorico.replaceChildren();

    const statusFinalizados = new Set([
        "returned",
        "devolvido",
        "completed",
        "concluido",
        "cancelled",
        "canceled",
        "cancelado",
        "rejected",
        "rejeitado"
    ]);

    const ordenadas = [...reservas].sort(
        (a, b) => new Date(b.loan_date) - new Date(a.loan_date)
    );

    // Somente reservas ainda não encerradas
    const reservasAtivas = ordenadas.filter(reserva => {
        const status = String(reserva.status || "").toLowerCase();
        return !statusFinalizados.has(status);
    });

    // 1. Reservas ativas
    if (!reservasAtivas.length) {
        elementos.listaReservas.append(
            no(
                "li",
                "list-group-item text-muted small",
                "Nenhuma reserva ativa no momento."
            )
        );
    }

    for (const reserva of reservasAtivas) {
        const li = no("li", "list-group-item");

        const codigo = no(
            "small",
            "text-muted d-block",
            `Código: ${reserva.component_code}`
        );

        const nome = no(
            "strong",
            "",
            nomeEquipamento(reserva)
        );

        const status = badgeStatus(reserva.status);
        status.classList.add("mt-1");

        const data = reserva.expected_return_date;
        const dias = calcularDiasRestantes(data);

        const devolucao = no(
            "small",
            "d-block mt-2",
            `Devolução: ${formatarDataCurta(data)}`
        );

        const prazo = no(
            "small",
            dias !== null && dias <= 1
                ? "d-block text-danger fw-bold"
                : "d-block text-muted",
            textoPrazo(dias)
        );

        li.append(
            codigo,
            nome,
            no("br"),
            status,
            devolucao,
            prazo
        );

        elementos.listaReservas.append(li);
    }

    // 2. Histórico completo
    if (!ordenadas.length) {
        elementos.corpoHistorico.append(
            linhaVazia("Nenhuma reserva registrada.", 4)
        );
    }

    for (const reserva of ordenadas) {
        const tr = no("tr");

        const colNome = no("td", "ps-4");

        colNome.append(
            no(
                "strong",
                "",
                nomeEquipamento(reserva.component_id)
            ),
            no("br"),
            no(
                "small",
                "text-muted",
                `Reserva #${reserva.id} | ${reserva.quantity} un.`
            )
        );

        const colRetirada = no(
            "td",
            "",
            formatarData(reserva.loan_date)
        );

        const devolucao = reserva.return_date
            ? formatarData(reserva.return_date)
            : reserva.expected_return_date
                ? `Prevista: ${formatarDataCurta(
                    reserva.expected_return_date
                )}`
                : "Não informada";

        const colDevolucao = no("td", "", devolucao);

        const colStatus = no("td", "pe-4 text-end");
        colStatus.append(badgeStatus(reserva.status));

        tr.append(
            colNome,
            colRetirada,
            colDevolucao,
            colStatus
        );

        elementos.corpoHistorico.append(tr);
    }
}


function preencherModalReserva(item) {
  equipamentoSelecionado = item;
  elementos.formReserva.reset();
  campoOutro.classList.add("d-none");
  campoOutro.required = false;
  // Valor mínimo para datetime-local no fuso local do navegador.
  const agora = new Date();
  const localAgora = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  document.getElementById("dataDevolucao").min = localAgora.toISOString().slice(0, 16);
  document.getElementById("reservaEquipamentoId").value = item.component_id;
  document.getElementById("reservaEquipamentoNome").textContent = item.name;
  const qtd = document.getElementById("reservaQuantidade");
  qtd.value = "1";
  qtd.max = String(Math.max(0, Number(item.quantity)));
  document.getElementById("textoEstoqueReserva").textContent = `Disponíveis: ${item.quantity} unidade(s)`;
  elementos.erroReserva.classList.add("d-none");
  elementos.erroReserva.textContent = "";
}
function abrirReserva(item) {
  preencherModalReserva(item);
  bootstrap.Modal.getOrCreateInstance(document.getElementById("modalReserva")).show();
}
function abrirDetalhes(item) {
  equipamentoSelecionado = item;
  document.getElementById("detalhesNome").textContent = item.name;
  document.getElementById("detalhesCodigo").textContent = `Código: ${item.component_id}`;
  document.getElementById("detalhesDescricao").textContent = item.description || "Sem descrição cadastrada";
  document.getElementById("detalhesEstoque").textContent = String(item.quantity);
  document.getElementById("btnDetalhesReservar").disabled = Number(item.quantity) < 1;
  bootstrap.Modal.getOrCreateInstance(document.getElementById("modalDetalhes")).show();
}

async function atualizarDados() {
  // Consulta exclusivamente rotas existentes na especificação OpenAPI fornecida.
  const [componentes, minhasReservas] = await Promise.all([
    apiRequest("/component/available"),
    apiRequest("/reservation/")
  ]);
  if (!Array.isArray(componentes) || !Array.isArray(minhasReservas)) {
    throw new Error("Formato inesperado na resposta de equipamentos ou reservas.");
  }
  equipamentos = componentes;
  reservas = minhasReservas;
  renderizarEquipamentos();
  renderizarReservas();
}

async function iniciar() {
  if (!sessionStorage.getItem("access_token")) {
    window.location.replace(LOGIN_URL);
    return;
  }
  try {
    const usuario = await apiRequest("/user/me");
    if (!usuario?.is_active) {
      sessionStorage.removeItem("access_token");
      throw new Error("Usuário inativo. Faça login com uma conta habilitada.");
    }
    const perfis = {user: "Aluno", control: "Controle", admin: "Administrador"};
    elementos.perfil.textContent = `${usuario.name} | Perfil: ${perfis[usuario.role] || usuario.role}`;
    await atualizarDados();
  } catch (erro) {
    tratarErro(erro);
  }
}

elementos.busca.addEventListener("input", renderizarEquipamentos);
document.querySelectorAll(".filtro-chip:not(:disabled)").forEach(btn => {
  btn.addEventListener("click", () => {
    filtroAtual = btn.dataset.filtro;
    document.querySelectorAll(".filtro-chip:not(:disabled)").forEach(b => {
      b.classList.remove("active", "btn-primary");
      b.classList.add("btn-outline-secondary");
    });
    btn.classList.remove("btn-outline-secondary");
    btn.classList.add("active", "btn-primary");
    renderizarEquipamentos();
  });
});
document.getElementById("btnSair").addEventListener("click", () => {
  sessionStorage.removeItem("access_token");
  window.location.replace(LOGIN_URL);
});
document.getElementById("btnDetalhesReservar").addEventListener("click", () => {
  if (!equipamentoSelecionado) return;
  const item = equipamentoSelecionado;
  const modalEl = document.getElementById("modalDetalhes");
  modalEl.addEventListener("hidden.bs.modal", () => abrirReserva(item), {once: true});
  bootstrap.Modal.getOrCreateInstance(modalEl).hide();
});
// Registrar este listener uma única vez, fora do evento submit.
const selectJustificativa = document.getElementById("selectJustificativa");
const campoOutro = document.getElementById("campoOutro");

selectJustificativa.addEventListener("change", () => {
  const outro = selectJustificativa.value === "outro";
  campoOutro.classList.toggle("d-none", !outro);
  campoOutro.required = outro;
  if (!outro) campoOutro.value = "";
});

elementos.formReserva.addEventListener("submit", async evento => {
  evento.preventDefault();
  if (!equipamentoSelecionado) return;

  const quantidade = Number(document.getElementById("reservaQuantidade").value);
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > Number(equipamentoSelecionado.quantity)) {
    tratarErro(new Error("Informe uma quantidade válida dentro do estoque disponível."), "reserva");
    return;
  }

  // Data *prevista de devolução*, e não data da retirada.
  const valorData = document.getElementById("dataDevolucao").value;
  const dataPrevista = new Date(valorData);
  if (!valorData || Number.isNaN(dataPrevista.getTime()) || dataPrevista <= new Date()) {
    tratarErro(new Error("Informe uma data futura válida para a devolução."), "reserva");
    return;
  }

  const justificativa = selectJustificativa.value;
  const motivoOutro = campoOutro.value.trim();
  const observacoes = document.getElementById("observacoes").value.trim();
  if (!justificativa) {
    tratarErro(new Error("Selecione uma justificativa de uso."), "reserva");
    return;
  }
  if (justificativa === "outro" && !motivoOutro) {
    tratarErro(new Error("Especifique o motivo da reserva."), "reserva");
    return;
  }

  // O schema tem somente 'justificativa' e 'obs'; inclui o texto livre
  // da opção 'Outro' em obs, sem precisar criar outro campo no backend.
  const obsFinal = justificativa === "outro"
    ? [`Motivo: ${motivoOutro}`, observacoes].filter(Boolean).join("\n")
    : observacoes;

  elementos.btnEnviarReserva.disabled = true;
  elementos.btnEnviarReserva.textContent = "ENVIANDO...";
  elementos.erroReserva.classList.add("d-none");
  elementos.erroReserva.textContent = "";
  try {
    const dataDevolucao = document.getElementById("dataDevolucao").value;

    const justificativa = document.getElementById(
        "selectJustificativa"
    ).value;

    const motivoOutro = document.getElementById(
        "campoOutro"
    ).value.trim();

    const observacoes = document.getElementById(
        "observacoes"
    ).value.trim();

    const obsFinal = justificativa === "outro"
        ? `Motivo: ${motivoOutro}${observacoes ? "\n" + observacoes : ""}`
        : observacoes;

    const dataPrevista = new Date(dataDevolucao);

    if (!dataDevolucao || Number.isNaN(dataPrevista.getTime()) ||
        dataPrevista <= new Date()) {
        tratarErro(
            new Error("Informe uma data futura para devolução."),
            "reserva"
        );
        return;
    }

    if (!justificativa || (justificativa === "outro" && !motivoOutro)) {
        tratarErro(
            new Error("Informe uma justificativa válida."),
            "reserva"
        );
        return;
    }

const dadosReserva = {
    component_id: String(equipamentoSelecionado.component_id),
    quantity: quantidade,
    expected_return_date: dataPrevista.toISOString(),
    justificativa: justificativa,
    Obs: obsFinal || null
};
    console.log("Dados enviados:", dadosReserva);

    const reserva = await apiRequest("/reservation/", {
        method: "POST",
        body: JSON.stringify(dadosReserva)
    });

    elementos.formReserva.reset();
    campoOutro.classList.add("d-none");
    campoOutro.required = false;
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalReserva")).hide();
    mostrarMensagem(`Solicitação enviada! Reserva #${reserva.id ?? "criada"}. Confira o status em Minhas Reservas.`, "success");
    // Se a atualização falhar, não repetir o POST: a reserva já foi criada.
    try {
      await atualizarDados();
    } catch (erro) {
      tratarErro(new Error(`Reserva enviada, mas não foi possível atualizar as listas: ${erro.message}`));
    }
  } catch (erro) {
    tratarErro(erro, "reserva");
  } finally {
    elementos.btnEnviarReserva.disabled = false;
    elementos.btnEnviarReserva.textContent = "Enviar Solicitação";
  }
});

iniciar();
