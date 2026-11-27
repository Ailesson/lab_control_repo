import { apiRequest } from "./api.js";

// ==========================================
// 1. CONFIGURAÇÕES
// ==========================================

const LOGIN_URL = "./login.html";

const ROTA_USUARIO = "/user/me";
const ROTA_COMPONENTES = "/component/available";
const ROTA_RESERVAS = "/reservation/";

// ==========================================
// 2. ELEMENTOS DO HTML
// ==========================================

const elementos = {
    perfil: document.getElementById("perfilUsuario"),
    mensagem: document.getElementById("mensagemPainel"),
    busca: document.getElementById("buscaEquipamento"),
    corpoEquipamentos: document.getElementById("corpoEquipamentos"),
    listaReservas: document.getElementById("listaReservas"),
    corpoHistorico: document.getElementById("corpoHistorico"),
    formReserva: document.getElementById("formReserva"),
    erroReserva: document.getElementById("erroReserva"),
    btnEnviarReserva: document.getElementById("btnEnviarReserva")
};

const selectJustificativa = document.getElementById(
    "selectJustificativa"
);

const campoOutro = document.getElementById("campoOutro");

// ==========================================
// 3. VARIÁVEIS DE CONTROLE
// ==========================================

let equipamentos = [];
let reservas = [];

let filtroAtual = "todos";

let equipamentoSelecionado = null;

let enviandoReserva = false;

// ==========================================
// 4. FUNÇÕES AUXILIARES
// ==========================================

function no(tag, classe = "", texto = null) {

    const elemento = document.createElement(tag);

    if (classe) {
        elemento.className = classe;
    }

    if (texto !== null) {
        elemento.textContent = String(texto);
    }

    return elemento;
}

function normalizar(valor) {

    return String(valor ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

// ==========================================
// 5. FORMATAÇÃO DE DATAS
// ==========================================

function formatarData(valor) {

    if (!valor) {
        return "Não registrada";
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return "Data inválida";
    }

    return data.toLocaleString("pt-BR");
}

function formatarDataCurta(valor) {

    if (!valor) {
        return "Não informada";
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return "Data inválida";
    }

    return data.toLocaleDateString("pt-BR");
}

function calcularDiasRestantes(valor) {

    if (!valor) return null;

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return null;
    }

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

    if (dias === null) {
        return "";
    }

    if (dias < 0) {
        return `Atrasada há ${Math.abs(dias)} dia(s)`;
    }

    if (dias === 0) {
        return "Devolução prevista para hoje";
    }

    return `${dias} dia(s) restante(s)`;
}

// ==========================================
// 6. BUSCAR EQUIPAMENTO DA RESERVA
// ==========================================

function buscarEquipamentoReserva(reserva) {

    if (!reserva) {
        return undefined;
    }

    const codigo = String(
        reserva.component_code ?? ""
    ).trim();

    // Priorizar o código alfanumérico
    if (codigo) {

        const componente = equipamentos.find(item =>
            String(item.component_id ?? "").trim() === codigo
        );

        if (componente) {
            return componente;
        }
    }

    // Caso não encontre pelo código,
    // buscar pelo ID numérico do banco.
    if (reserva.component_id != null) {

        return equipamentos.find(item =>

            item.id != null &&

            String(item.id) ===
            String(reserva.component_id)

        );
    }

    return undefined;
}

function nomeEquipamento(reserva) {

    const componente = buscarEquipamentoReserva(reserva);

    return componente?.name
        || reserva?.component_name
        || `Equipamento código ${
            reserva?.component_code
            ?? reserva?.component_id
            ?? "não informado"
        }`;
}

function codigoEquipamento(reserva) {

    const componente = buscarEquipamentoReserva(reserva);

    return reserva?.component_code
        || componente?.component_id
        || reserva?.component_id
        || "Não informado";
}

// ==========================================
// 7. MENSAGENS E TRATAMENTO DE ERROS
// ==========================================

function mostrarMensagem(mensagem, tipo = "success") {

    elementos.mensagem.textContent = mensagem;

    elementos.mensagem.className =
        `alert alert-${tipo}`;
}

function tratarErro(erro, lugar = "painel") {

    console.error(`Erro no ${lugar}:`, erro);

    if (erro.status === 401) {

        sessionStorage.removeItem("access_token");

        window.location.replace(LOGIN_URL);

        return;
    }

    if (lugar === "reserva") {

        elementos.erroReserva.textContent =
            erro.message ||
            "Não foi possível criar a reserva.";

        elementos.erroReserva.classList.remove("d-none");

    } else {

        mostrarMensagem(

            erro.message ||
            "Não foi possível carregar os dados.",

            "danger"

        );
    }
}

function linhaVazia(texto, colunas) {

    const linha = no("tr");

    const td = no(
        "td",
        "text-center text-muted py-4",
        texto
    );

    td.colSpan = colunas;

    linha.append(td);

    return linha;
}

// ==========================================
// 8. STATUS DAS RESERVAS
// ==========================================

function badgeStatus(status) {

    const valor = String(
        status ?? "Não informado"
    );

    const normalizado = normalizar(valor);

    const cores = {

        confirmed: "success",
        confirmado: "success",

        borrowed: "success",
        emprestado: "success",

        approved: "success",
        aprovado: "success",

        pending: "warning",
        pendente: "warning",

        returned: "secondary",
        devolvido: "secondary",

        completed: "secondary",
        concluido: "secondary",

        cancelled: "danger",
        canceled: "danger",
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

function reservaFinalizada(reserva) {

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

    return statusFinalizados.has(
        normalizar(reserva.status)
    );
}

// ==========================================
// 9. RENDERIZAR EQUIPAMENTOS
// ==========================================

function renderizarEquipamentos() {

    const termo = normalizar(
        elementos.busca.value
    );

    const visiveis = equipamentos.filter(item => {

        const disponivel = Number(item.quantity) > 0;

        const filtroOk =

            filtroAtual === "todos" ||

            (
                filtroAtual === "disponivel" &&
                disponivel
            );

        const textoBusca = normalizar(

            `${item.name ?? ""} ` +
            `${item.component_id ?? ""} ` +
            `${item.description ?? ""}`

        );

        const buscaOk = textoBusca.includes(termo);

        return filtroOk && buscaOk;
    });

    elementos.corpoEquipamentos.replaceChildren();

    // Nenhum equipamento encontrado
    if (!visiveis.length) {

        elementos.corpoEquipamentos.append(

            linhaVazia(

                equipamentos.length

                    ? "Nenhum equipamento encontrado para essa busca/filtro."

                    : "Nenhum equipamento disponível na API.",

                4
            )
        );

        return;
    }

    // Criar linhas da tabela
    for (const item of visiveis) {

        const disponivel = Number(item.quantity) > 0;

        const tr = no(

            "tr",

            disponivel ? "" : "table-warning"
        );

        // ==================================
        // NOME DO EQUIPAMENTO
        // ==================================

        const colNome = no("td", "ps-3");

        const btnDetalhes = no(

            "button",

            "btn btn-link text-decoration-none fw-bold p-0 text-start",

            `🔍 ${item.name}`
        );

        btnDetalhes.type = "button";

        btnDetalhes.addEventListener(
            "click",
            () => abrirDetalhes(item)
        );

        colNome.append(

            btnDetalhes,

            no("br"),

            no(

                "small",

                "text-muted",

                `Código: ${item.component_id} | ${
                    item.description || "Sem descrição"
                }`
            )
        );

        // ==================================
        // STATUS DO EQUIPAMENTO
        // ==================================

        const colStatus = no("td");

        colStatus.append(

            no(

                "span",

                `badge bg-${
                    disponivel ? "success" : "secondary"
                }`,

                disponivel
                    ? "Disponível"
                    : "Sem estoque"

            )
        );

        // ==================================
        // QUANTIDADE DISPONÍVEL
        // ==================================

        const colEstoque = no(

            "td",

            "",

            `${item.quantity} unidade(s)`
        );

        // ==================================
        // BOTÃO RESERVAR
        // ==================================

        const colAcao = no(

            "td",

            "pe-3 text-end"
        );

        const btnReserva = no(

            "button",

            "btn btn-primary btn-sm px-3",

            "Reservar"
        );

        btnReserva.type = "button";

        btnReserva.disabled = !disponivel;

        btnReserva.addEventListener(

            "click",

            () => abrirReserva(item)
        );

        colAcao.append(btnReserva);

        // Adicionar colunas à tabela
        tr.append(

            colNome,
            colStatus,
            colEstoque,
            colAcao

        );

        elementos.corpoEquipamentos.append(tr);
    }
}

// ==========================================
// 10. RENDERIZAR RESERVAS ATIVAS
// ==========================================

function renderizarReservasAtivas(ordenadas) {

    elementos.listaReservas.replaceChildren();

    const reservasAtivas = ordenadas.filter(

        reserva => !reservaFinalizada(reserva)

    );

    if (!reservasAtivas.length) {

        elementos.listaReservas.append(

            no(

                "li",

                "list-group-item text-muted small",

                "Nenhuma reserva ativa no momento."
            )
        );

        return;
    }

    for (const reserva of reservasAtivas) {

        const li = no(

            "li",

            "list-group-item"
        );

        // Código do equipamento
        const codigo = no(

            "small",

            "text-muted d-block",

            `Código: ${codigoEquipamento(reserva)}`
        );

        // Nome do equipamento
        const nome = no(

            "strong",

            "",

            nomeEquipamento(reserva)
        );

        // Status da reserva
        const status = badgeStatus(
            reserva.status
        );

        status.classList.add("mt-1");

        // Data prevista de devolução
        const data = reserva.expected_return_date;

        const dias = calcularDiasRestantes(data);

        const devolucao = no(

            "small",

            "d-block mt-2",

            `Devolução: ${formatarDataCurta(data)}`
        );

        // Prazo restante
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
}

// ==========================================
// 11. RENDERIZAR HISTÓRICO
// ==========================================

function renderizarHistorico(ordenadas) {

    elementos.corpoHistorico.replaceChildren();

    if (!ordenadas.length) {

        elementos.corpoHistorico.append(

            linhaVazia(

                "Nenhuma reserva registrada.",

                4
            )
        );

        return;
    }

    for (const reserva of ordenadas) {

        const tr = no("tr");

        // ==================================
        // NOME DO EQUIPAMENTO
        // ==================================

        const colNome = no("td", "ps-4");

        colNome.append(

            no(

                "strong",

                "",

                nomeEquipamento(reserva)
            ),

            no("br"),

            no(

                "small",

                "text-muted",

                `Reserva #${reserva.id} | ${
                    reserva.quantity
                } un.`
            )
        );

        // ==================================
        // DATA DA RETIRADA
        // ==================================

        const colRetirada = no(

            "td",

            "",

            formatarData(reserva.loan_date)
        );

        // ==================================
        // DATA DA DEVOLUÇÃO
        // ==================================

        const devolucao = reserva.return_date

            ? formatarData(
                reserva.return_date
            )

            : reserva.expected_return_date

                ? `Prevista: ${formatarDataCurta(
                    reserva.expected_return_date
                )}`

                : "Não informada";

        const colDevolucao = no(

            "td",

            "",

            devolucao
        );

        // ==================================
        // STATUS
        // ==================================

        const colStatus = no(

            "td",

            "pe-4 text-end"
        );

        colStatus.append(

            badgeStatus(reserva.status)
        );

        // Adicionar colunas
        tr.append(

            colNome,

            colRetirada,

            colDevolucao,

            colStatus
        );

        elementos.corpoHistorico.append(tr);
    }
}

// ==========================================
// 12. RENDERIZAR TODAS AS RESERVAS
// ==========================================

function renderizarReservas() {

    const ordenadas = [...reservas].sort(

        (a, b) => {

            const dataA = new Date(
                a.loan_date ?? a.created_at ?? 0
            ).getTime();

            const dataB = new Date(
                b.loan_date ?? b.created_at ?? 0
            ).getTime();

            return (dataB || 0) - (dataA || 0);
        }
    );

    renderizarReservasAtivas(ordenadas);

    renderizarHistorico(ordenadas);
}

// ==========================================
// 13. PREENCHER MODAL DE RESERVA
// ==========================================

function preencherModalReserva(item) {

    equipamentoSelecionado = item;

    elementos.formReserva.reset();

    campoOutro.classList.add("d-none");

    campoOutro.required = false;

    // Data mínima no fuso horário local
    const agora = new Date();

    const localAgora = new Date(

        agora.getTime() -

        agora.getTimezoneOffset() * 60000

    );

    document.getElementById(
        "dataDevolucao"
    ).min = localAgora.toISOString().slice(0, 16);

    // Código alfanumérico
    document.getElementById(
        "reservaEquipamentoId"
    ).value = item.component_id;

    // Nome
    document.getElementById(
        "reservaEquipamentoNome"
    ).textContent = item.name;

    // Quantidade
    const qtd = document.getElementById(
        "reservaQuantidade"
    );

    qtd.value = "1";

    qtd.max = String(

        Math.max(
            0,
            Number(item.quantity)
        )
    );

    // Estoque disponível
    document.getElementById(
        "textoEstoqueReserva"
    ).textContent =
        `Disponíveis: ${item.quantity} unidade(s)`;

    // Limpar mensagens anteriores
    elementos.erroReserva.classList.add("d-none");

    elementos.erroReserva.textContent = "";
}

// ==========================================
// 14. ABRIR MODAL DE RESERVA
// ==========================================

function abrirReserva(item) {

    if (Number(item.quantity) < 1) {

        mostrarMensagem(

            "Este equipamento não possui estoque disponível.",

            "warning"
        );

        return;
    }

    preencherModalReserva(item);

    const modal = bootstrap.Modal.getOrCreateInstance(

        document.getElementById("modalReserva")

    );

    modal.show();
}

// ==========================================
// 15. ABRIR MODAL DE DETALHES
// ==========================================

function abrirDetalhes(item) {

    equipamentoSelecionado = item;

    document.getElementById(
        "detalhesNome"
    ).textContent = item.name;

    document.getElementById(
        "detalhesCodigo"
    ).textContent = `Código: ${item.component_id}`;

    document.getElementById(
        "detalhesDescricao"
    ).textContent =

        item.description ||

        "Sem descrição cadastrada";

    document.getElementById(
        "detalhesEstoque"
    ).textContent = String(item.quantity);

    document.getElementById(
        "btnDetalhesReservar"
    ).disabled = Number(item.quantity) < 1;

    const modal = bootstrap.Modal.getOrCreateInstance(

        document.getElementById("modalDetalhes")

    );

    modal.show();
}

// ==========================================
// 16. ATUALIZAR DADOS DO BACKEND
// ==========================================

async function atualizarDados() {

    const [componentes, minhasReservas] =

        await Promise.all([

            apiRequest(ROTA_COMPONENTES),

            apiRequest(ROTA_RESERVAS)

        ]);

    if (

        !Array.isArray(componentes) ||

        !Array.isArray(minhasReservas)

    ) {

        throw new Error(

            "Formato inesperado na resposta de equipamentos ou reservas."

        );
    }

    equipamentos = componentes;

    reservas = minhasReservas;

    console.log(
        "Equipamentos recebidos:",
        equipamentos
    );

    console.log(
        "Reservas recebidas:",
        reservas
    );

    renderizarEquipamentos();

    renderizarReservas();
}

// ==========================================
// 17. FILTRO DE BUSCA
// ==========================================

elementos.busca.addEventListener(

    "input",

    renderizarEquipamentos
);

// ==========================================
// 18. FILTROS DE EQUIPAMENTOS
// ==========================================

document.querySelectorAll(

    ".filtro-chip:not(:disabled)"

).forEach(btn => {

    btn.addEventListener("click", () => {

        filtroAtual = btn.dataset.filtro;

        document.querySelectorAll(

            ".filtro-chip:not(:disabled)"

        ).forEach(b => {

            b.classList.remove(
                "active",
                "btn-primary"
            );

            b.classList.add(
                "btn-outline-secondary"
            );
        });

        btn.classList.remove(
            "btn-outline-secondary"
        );

        btn.classList.add(
            "active",
            "btn-primary"
        );

        renderizarEquipamentos();
    });
});

// ==========================================
// 19. ENCERRAR SESSÃO
// ==========================================

document.getElementById(

    "btnSair"

).addEventListener("click", () => {

    sessionStorage.removeItem("access_token");

    window.location.replace(LOGIN_URL);
});

// ==========================================
// 20. RESERVAR PELO MODAL DE DETALHES
// ==========================================

document.getElementById(

    "btnDetalhesReservar"

).addEventListener("click", () => {

    if (!equipamentoSelecionado) {
        return;
    }

    const item = equipamentoSelecionado;

    const modalEl = document.getElementById(
        "modalDetalhes"
    );

    modalEl.addEventListener(

        "hidden.bs.modal",

        () => abrirReserva(item),

        { once: true }
    );

    bootstrap.Modal.getOrCreateInstance(
        modalEl
    ).hide();
});

// ==========================================
// 21. CAMPO DE JUSTIFICATIVA
// ==========================================

selectJustificativa.addEventListener(

    "change",

    () => {

        const outro =
            selectJustificativa.value === "outro";

        campoOutro.classList.toggle(

            "d-none",

            !outro
        );

        campoOutro.required = outro;

        if (!outro) {

            campoOutro.value = "";
        }
    }
);

// ==========================================
// 22. ENVIAR RESERVA
// ==========================================

elementos.formReserva.addEventListener(

    "submit",

    async evento => {

        evento.preventDefault();

        if (enviandoReserva) {
            return;
        }

        if (!equipamentoSelecionado) {

            tratarErro(

                new Error(
                    "Nenhum equipamento selecionado."
                ),

                "reserva"
            );

            return;
        }

        // ==================================
        // VALIDAR QUANTIDADE
        // ==================================

        const quantidade = Number(

            document.getElementById(
                "reservaQuantidade"
            ).value

        );

        if (

            !Number.isInteger(quantidade) ||

            quantidade < 1 ||

            quantidade >
                Number(equipamentoSelecionado.quantity)

        ) {

            tratarErro(

                new Error(

                    "Informe uma quantidade válida dentro do estoque disponível."

                ),

                "reserva"
            );

            return;
        }

        // ==================================
        // VALIDAR DATA DE DEVOLUÇÃO
        // ==================================

        const valorData = document.getElementById(

            "dataDevolucao"

        ).value;

        const dataPrevista = new Date(valorData);

        if (

            !valorData ||

            Number.isNaN(
                dataPrevista.getTime()
            ) ||

            dataPrevista <= new Date()

        ) {

            tratarErro(

                new Error(

                    "Informe uma data futura válida para a devolução."

                ),

                "reserva"
            );

            return;
        }

        // ==================================
        // VALIDAR JUSTIFICATIVA
        // ==================================

        const justificativa =
            selectJustificativa.value;

        const motivoOutro =
            campoOutro.value.trim();

        const observacoes = document.getElementById(

            "observacoes"

        ).value.trim();

        if (!justificativa) {

            tratarErro(

                new Error(

                    "Selecione uma justificativa de uso."

                ),

                "reserva"
            );

            return;
        }

        if (

            justificativa === "outro" &&

            !motivoOutro

        ) {

            tratarErro(

                new Error(

                    "Especifique o motivo da reserva."

                ),

                "reserva"
            );

            return;
        }

        // ==================================
        // MONTAR OBSERVAÇÕES
        // ==================================

        const obsFinal = justificativa === "outro"

            ? [

                `Motivo: ${motivoOutro}`,

                observacoes

            ].filter(Boolean).join("\n")

            : observacoes;

        // ==================================
        // MONTAR OBJETO DA RESERVA
        // ==================================

        const dadosReserva = {

            component_id: String(
                equipamentoSelecionado.component_id
            ),

            quantity: quantidade,

            expected_return_date:
                dataPrevista.toISOString(),

            justificativa: justificativa,

            obs: obsFinal || null

        };

        console.log(

            "Dados enviados:",

            dadosReserva
        );

        // ==================================
        // BLOQUEAR ENVIO DUPLICADO
        // ==================================

        enviandoReserva = true;

        elementos.btnEnviarReserva.disabled = true;

        elementos.btnEnviarReserva.textContent =
            "ENVIANDO...";

        elementos.erroReserva.classList.add("d-none");

        elementos.erroReserva.textContent = "";

        try {

            // ==============================
            // ENVIAR PARA O FASTAPI
            // ==============================

            const reserva = await apiRequest(

                ROTA_RESERVAS,

                {

                    method: "POST",

                    body: JSON.stringify(dadosReserva)

                }
            );

            console.log(

                "Reserva criada:",

                reserva
            );

            // ==============================
            // LIMPAR FORMULÁRIO
            // ==============================

            elementos.formReserva.reset();

            campoOutro.classList.add("d-none");

            campoOutro.required = false;

            // ==============================
            // FECHAR MODAL
            // ==============================

            bootstrap.Modal.getOrCreateInstance(

                document.getElementById("modalReserva")

            ).hide();

            equipamentoSelecionado = null;

            // ==============================
            // MENSAGEM DE SUCESSO
            // ==============================

            mostrarMensagem(

                `Solicitação enviada! Reserva #${
                    reserva?.id ?? "criada"
                }. Confira o status em Minhas Reservas.`,

                "success"
            );

            // ==============================
            // ATUALIZAR LISTAS
            // ==============================

            try {

                await atualizarDados();

            } catch (erro) {

                console.error(

                    "Erro ao atualizar listas:",

                    erro
                );

                mostrarMensagem(

                    "Reserva enviada, mas não foi possível atualizar as listas.",

                    "warning"
                );
            }

        } catch (erro) {

            tratarErro(

                erro,

                "reserva"
            );

        } finally {

            enviandoReserva = false;

            elementos.btnEnviarReserva.disabled = false;

            elementos.btnEnviarReserva.textContent =
                "Enviar Solicitação";
        }
    }
);

// ==========================================
// 23. INICIALIZAÇÃO DO PAINEL
// ==========================================

async function iniciar() {

    const token = sessionStorage.getItem(

        "access_token"
    );

    if (!token) {

        window.location.replace(LOGIN_URL);

        return;
    }

    try {

        // Consultar usuário autenticado
        const usuario = await apiRequest(

            ROTA_USUARIO
        );

        console.log(

            "Usuário autenticado:",

            usuario
        );

        // Verificar usuário ativo
        if (!usuario?.is_active) {

            sessionStorage.removeItem(

                "access_token"
            );

            window.location.replace(LOGIN_URL);

            return;
        }

        // Identificar perfil
        const perfis = {

            user: "Aluno",

            control: "Controle",

            admin: "Administrador"

        };

        elementos.perfil.textContent =

            `${usuario.name} | Perfil: ${
                perfis[usuario.role] || usuario.role
            }`;

        // Carregar equipamentos e reservas
        await atualizarDados();

    } catch (erro) {

        tratarErro(erro);
    }
}

// ==========================================
// 24. EXECUTAR PAINEL
// ==========================================

iniciar();