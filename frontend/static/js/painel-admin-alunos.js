import { apiRequest } from "./api.js";

// ==========================================
// ELEMENTOS DO HTML
// ==========================================

const corpo = document.getElementById("corpoAlunos");
const contador = document.getElementById("contadorAlunos");
const busca = document.getElementById("buscaAluno");
const mensagem = document.getElementById("mensagemAlunos");

let usuarios = [];
let alunoSelecionado = null;

let saidaEmAndamento = false;
let retornoEmAndamento = false;

let carregandoEquipamentos = false;
let listaEquipamentosValida = false;

let consultaEquipamentos = 0;
let consultaHistorico = 0;

// ==========================================
// ROTAS DO BACKEND
// ==========================================

const ROTA_USUARIOS = "/user/";

const ROTA_STATUS_USUARIO = (id, novoStatus) =>
    `/user/${encodeURIComponent(id)}/status?novoStatus=${encodeURIComponent(novoStatus)}`;

const ROTA_STATUS = (id, novoStatus) =>
    `/reservation/status?reservation_id=${encodeURIComponent(id)}&status=${encodeURIComponent(novoStatus)}`;

const ROTA_HISTORICO = (id) =>
    `/reservation/admin/user/${encodeURIComponent(id)}?user_id=${encodeURIComponent(id)}`;

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function escapar(valor) {
    return String(valor ?? "").replace(
        /[&<>"']/g,
        c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[c]
    );
}

function normalizar(valor) {
    return String(valor ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function usuarioBloqueado(usuario) {
    return normalizar(usuario.status) === "bloqueado";
}

function buscarUsuario(id) {
    return usuarios.find(
        usuario => String(usuario.id) === String(id)
    );
}

function formatarData(valor) {

    if (!valor) return "Não informada";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return "Data inválida";
    }

    return data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function nomeEquipamento(reserva) {
    return reserva.component_name
        || reserva.component?.name
        || reserva.component_code
        || reserva.component?.component_id
        || `Equipamento #${reserva.component_id}`;
}

function mostrarMensagem(texto, tipo = "success") {

    if (!mensagem) return;

    mensagem.textContent = texto;
    mensagem.className = `alert alert-${tipo}`;
}

function mostrarModalSucesso(texto) {

    document.getElementById("mensagemSucesso")
        .textContent = texto;

    const modal = bootstrap.Modal.getOrCreateInstance(
        document.getElementById("modalSucesso")
    );

    modal.show();
}

function mostrarMensagemEquipamento(texto, tipo = "info") {

    const elemento = document.getElementById(
        "mensagemEquipamento"
    );

    elemento.className = `alert alert-${tipo}`;
    elemento.textContent = texto;
}

// ==========================================
// 1. CARREGAR USUÁRIOS
// ==========================================

async function carregarUsuarios() {

    const resposta = await apiRequest(ROTA_USUARIOS);

    if (!Array.isArray(resposta)) {
        throw new Error(
            "Resposta inválida da API de usuários."
        );
    }

    // Não exibir administradores
    usuarios = resposta.filter(
        usuario => normalizar(usuario.role) !== "admin"
    );

    pesquisarUsuarios();
}

// ==========================================
// 2. RENDERIZAR TABELA DE USUÁRIOS
// ==========================================

function renderizarUsuarios(lista) {

    contador.textContent =
        `Mostrando ${lista.length} de ${usuarios.length} usuário(s).`;

    if (lista.length === 0) {

        corpo.innerHTML = `
            <tr>
                <td colspan="4"
                    class="text-center py-4 text-muted">

                    Nenhum usuário encontrado.

                </td>
            </tr>
        `;

        return;
    }

    corpo.innerHTML = lista.map(usuario => {

        const bloqueado = usuarioBloqueado(usuario);

        const badge = bloqueado
            ? '<span class="badge bg-danger">Bloqueado</span>'
            : '<span class="badge bg-success">Acesso Liberado</span>';

        const botao = bloqueado
            ? "btn-success"
            : "btn-outline-danger";

        const textoBotao = bloqueado
            ? "Desbloquear"
            : "Bloquear";

        const vinculo =
            usuario.vinculo || "Não informado";

        return `
            <tr>

                <!-- Nome e e-mail -->
                <td class="ps-4">

                    <strong class="text-dark">
                        ${escapar(usuario.name)}
                    </strong><br>

                    <small class="text-muted">
                        ${escapar(usuario.email)}
                    </small>

                </td>

                <!-- Matrícula e vínculo -->
                <td>

                    <strong>
                        ${escapar(usuario.matricula || "—")}
                    </strong><br>

                    <small class="text-secondary">
                        ${escapar(vinculo)}
                    </small>

                </td>

                <!-- Status da conta -->
                <td>
                    ${badge}
                </td>

                <!-- Ações -->
                <td class="text-end pe-4">

                    <div class="acoes-usuario">

                        <button
                            type="button"
                            class="btn btn-sm btn-outline-primary"
                            data-id="${escapar(usuario.id)}"
                            data-acao="equipamentos">

                            Equipamentos

                        </button>

                        <button
                            type="button"
                            class="btn btn-sm btn-outline-secondary"
                            data-id="${escapar(usuario.id)}"
                            data-acao="historico">

                            Histórico

                        </button>

                        <button
                            type="button"
                            class="btn btn-sm ${botao}"
                            data-id="${escapar(usuario.id)}"
                            data-acao="status">

                            ${textoBotao}

                        </button>

                    </div>

                </td>

            </tr>
        `;

    }).join("");
}

// ==========================================
// 3. PESQUISAR USUÁRIOS
// ==========================================

function pesquisarUsuarios() {

    const termo = normalizar(busca.value);

    const filtrados = usuarios.filter(usuario =>

        normalizar(usuario.name).includes(termo) ||

        normalizar(usuario.matricula).includes(termo) ||

        normalizar(usuario.email).includes(termo)

    );

    renderizarUsuarios(filtrados);
}

document.getElementById("btnBuscarAluno")
    .addEventListener("click", pesquisarUsuarios);

busca.addEventListener("input", pesquisarUsuarios);

// ==========================================
// 4. BLOQUEAR / DESBLOQUEAR USUÁRIOS
// ==========================================

async function alterarStatus(id, botao) {

    const usuario = buscarUsuario(id);

    if (!usuario) return;

    const bloqueado = usuarioBloqueado(usuario);

    const novoStatus = bloqueado
        ? "Liberado"
        : "Bloqueado";

    const acao = bloqueado
        ? "desbloquear"
        : "bloquear";

    if (!confirm(`Deseja ${acao} ${usuario.name}?`)) {
        return;
    }

    botao.disabled = true;

    try {

        await apiRequest(
            ROTA_STATUS_USUARIO(id, novoStatus),
            {
                method: "PATCH"
            }
        );

        try {

            await carregarUsuarios();

            mostrarModalSucesso(
                bloqueado
                    ? "Usuário desbloqueado com sucesso!"
                    : "Usuário bloqueado com sucesso!"
            );

        } catch (erro) {

            mostrarMensagem(
                "Status atualizado, mas não foi possível recarregar a tabela.",
                "warning"
            );
        }

    } catch (erro) {

        console.error(
            "Erro ao alterar status:",
            erro
        );

        mostrarMensagem(
            erro.message ||
            "Não foi possível alterar a conta.",
            "danger"
        );

    } finally {

        botao.disabled = false;
    }
}

// ==========================================
// 5. BUSCAR RESERVAS DE UM USUÁRIO
// ==========================================

async function buscarReservasUsuario(id) {

    const rota = ROTA_HISTORICO(id);

    console.log("ID do usuário:", id);
    console.log("Rota de histórico:", rota);

    const reservas = await apiRequest(rota);

    console.log("Reservas recebidas:", reservas);

    if (!Array.isArray(reservas)) {

        throw new Error(
            "Resposta de histórico inválida."
        );
    }

    // Impedir que reservas de outros alunos sejam exibidas
    if (reservas.some(reserva =>
        reserva.user_id == null ||
        String(reserva.user_id) !== String(id)
    )) {

        throw new Error(
            "A API retornou reservas incompatíveis com o usuário selecionado."
        );
    }

    return reservas;
}

// ==========================================
// 6. CLASSIFICAÇÃO DAS RESERVAS
// ==========================================

// Reservas confirmadas aguardando retirada
function reservaAprovada(reserva) {

    if (reserva.return_date) {
        return false;
    }

    return [
        "approved",
        "aprovado",
        "aprovada",
        "confirmed",
        "confirmado",
        "confirmada"
    ].includes(normalizar(reserva.status));
}

// Equipamentos em posse do aluno
function reservaEmprestada(reserva) {

    if (reserva.return_date) {
        return false;
    }

    return [
        "borrowed",
        "emprestar",
        "emprestado",
        "emprestada",
        "retirado",
        "retirada",
        "em uso",
        "atrasado",
        "atrasada",
        "overdue",
        "reservado"
    ].includes(normalizar(reserva.status));
}

// Somente equipamentos devolvidos
function reservaDevolvida(reserva) {

    return [
        "devolver",
        "returned",
        "devolvido",
        "devolvida"
    ].includes(normalizar(reserva.status));
}

// Reservas recusadas
function reservaRecusada(reserva) {

    return [
        "rejected",
        "rejeitado",
        "rejeitada",
        "recusado",
        "recusada"
    ].includes(normalizar(reserva.status));
}

// Reservas pendentes
function reservaPendente(reserva) {

    return [
        "pending",
        "pendente"
    ].includes(normalizar(reserva.status));
}

// Reservas canceladas
function reservaCancelada(reserva) {

    return [
        "cancelled",
        "canceled",
        "cancelado",
        "cancelada"
    ].includes(normalizar(reserva.status));
}

// Verificar se o equipamento está atrasado
function reservaAtrasada(reserva) {

    // Somente equipamentos efetivamente emprestados
    if (!reservaEmprestada(reserva)) {
        return false;
    }

    if (reserva.return_date) {
        return false;
    }

    const status = normalizar(reserva.status);

    if ([
        "atrasado",
        "atrasada",
        "overdue"
    ].includes(status)) {

        return true;
    }

    if (!reserva.expected_return_date) {
        return false;
    }

    const prazo = new Date(
        reserva.expected_return_date
    );

    if (Number.isNaN(prazo.getTime())) {
        return false;
    }

    return prazo < new Date();
}

// ==========================================
// 7. MODAL DE HISTÓRICO
// ==========================================

async function mostrarHistorico(id) {

    const usuario = buscarUsuario(id);

    if (!usuario) return;

    const consultaAtual = ++consultaHistorico;

    const nome = document.getElementById(
        "nomeAlunoHistorico"
    );

    const banner = document.getElementById(
        "bannerStatusAluno"
    );

    const containerAtivo = document.getElementById(
        "conteudoEmprestimoAtivo"
    );

    const containerPassado = document.getElementById(
        "conteudoHistoricoPassado"
    );

    nome.textContent =
        `${usuario.name} (${usuario.matricula || "Sem matrícula"})`;

    banner.className = "alert alert-info";

    banner.textContent =
        "Carregando histórico do aluno...";

    containerAtivo.innerHTML = "";
    containerPassado.innerHTML = "";

    const modal = bootstrap.Modal.getOrCreateInstance(
        document.getElementById("modalHistorico")
    );

    modal.show();

    try {

        const reservas = await buscarReservasUsuario(id);

        // Ignorar respostas de consultas anteriores
        if (consultaAtual !== consultaHistorico) {
            return;
        }

        // ==================================
        // EMPRÉSTIMOS ATIVOS
        // ==================================

        const emprestimosAtivos = reservas.filter(
            reservaEmprestada
        );

        // ==================================
        // AGUARDANDO RETIRADA
        // ==================================

        const reservasAguardandoRetirada = reservas.filter(
            reservaAprovada
        );

        // ==================================
        // HISTÓRICO DE DEVOLUÇÕES
        // ==================================

        // CORREÇÃO:
        // Somente reservas com status de devolução
        // serão apresentadas nesta seção.

        const historicoPassado = reservas
        .filter(reserva =>
            reservaDevolvida(reserva) ||
            reservaRecusada(reserva)
        )
        .sort((a, b) => {

            const dataA = new Date(
                a.return_date || 0
            ).getTime();

            const dataB = new Date(
                b.return_date || 0
            ).getTime();

            return (
                (dataB || 0) - (dataA || 0)
            ) || (
                Number(b.id) - Number(a.id)
            );
        });
        // ==================================
        // EMPRÉSTIMOS ATRASADOS
        // ==================================

        const atrasadas = emprestimosAtivos.filter(
            reservaAtrasada
        );

        console.log(
            "Todas as reservas:",
            reservas
        );

        console.log(
            "Empréstimos ativos:",
            emprestimosAtivos
        );

        console.log(
            "Aguardando retirada:",
            reservasAguardandoRetirada
        );

        console.log(
            "Histórico de devoluções:",
            historicoPassado
        );

        console.log(
            "Empréstimos atrasados:",
            atrasadas
        );

        // ==================================
        // STATUS DO ALUNO
        // ==================================

        if (usuarioBloqueado(usuario)) {

            banner.className =
                "alert alert-danger fw-bold";

            banner.textContent =
                "ATENÇÃO: Este usuário está bloqueado.";

        } else if (atrasadas.length > 0) {

            banner.className =
                "alert alert-danger fw-bold";

            banner.textContent =
                `O aluno possui ${atrasadas.length} empréstimo(s) em atraso.`;

        } else if (emprestimosAtivos.length > 0) {

            banner.className =
                "alert alert-warning";

            banner.textContent =
                `O aluno possui ${emprestimosAtivos.length} empréstimo(s) ativo(s).`;

        } else if (reservasAguardandoRetirada.length > 0) {

            banner.className =
                "alert alert-info";

            banner.textContent =
                `O aluno possui ${reservasAguardandoRetirada.length} reserva(s) aguardando retirada.`;

        } else {

            banner.className =
                "alert alert-success";

            banner.textContent =
                "Nenhum empréstimo ativo identificado.";
        }

        // ==================================
        // RENDERIZAR EMPRÉSTIMOS ATIVOS
        // ==================================

        if (emprestimosAtivos.length === 0) {

            containerAtivo.innerHTML = `
                <p class="text-muted small fst-italic">

                    Nenhum equipamento em posse no momento.

                </p>
            `;

        } else {

            containerAtivo.innerHTML =
                emprestimosAtivos.map(reserva => {

                    const atrasado = reservaAtrasada(reserva);

                    return `
                        <div class="card mb-3 ${
                            atrasado
                                ? "border-danger"
                                : "border-warning"
                        }">

                            <div class="card-body">

                                <h6 class="fw-bold text-dark">

                                    ${escapar(nomeEquipamento(reserva))}

                                </h6>

                                <p class="small mb-1">

                                    <strong>Reserva:</strong>

                                    #${escapar(reserva.id)}

                                </p>

                                <p class="small mb-1">

                                    <strong>Código:</strong>

                                    ${escapar(reserva.component_code || "—")}

                                </p>

                                <p class="small mb-1">

                                    <strong>Quantidade:</strong>

                                    ${escapar(reserva.quantity)}

                                </p>

                                <p class="small mb-1">

                                    <strong>Data de saída:</strong>

                                    ${formatarData(reserva.loan_date)}

                                </p>

                                <p class="small mb-1 ${
                                    atrasado
                                        ? "text-danger fw-bold"
                                        : "text-muted"
                                }">

                                    <strong>Devolução prevista:</strong>

                                    ${formatarData(reserva.expected_return_date)}

                                    ${atrasado ? "(ATRASADO)" : ""}

                                </p>

                                <p class="small mb-1">

                                    <strong>Status:</strong>

                                    <span class="badge bg-${
                                        atrasado ? "danger" : "primary"
                                    }">

                                        ${escapar(reserva.status)}

                                    </span>

                                </p>

                                <p class="small bg-light p-2 rounded mb-0">

                                    <strong>Observações:</strong>

                                    ${escapar(
                                        reserva.Obs
                                        || reserva.obs
                                        || "Sem observações."
                                    )}

                                </p>

                            </div>

                        </div>
                    `;

                }).join("");
        }

        // ==================================
        // RENDERIZAR HISTÓRICO DE DEVOLUÇÕES
        // ==================================

        if (historicoPassado.length === 0) {

            containerPassado.innerHTML = `
                <p class="text-muted small fst-italic">

                    Nenhuma devolução concluída registrada.

                </p>
            `;

        } else {

            containerPassado.innerHTML =
                historicoPassado.map(reserva => `

                    <div class="card mb-3 bg-light border-0 shadow-sm">

                        <div class="card-body">

                            <h6 class="fw-bold text-dark">

                                ${escapar(nomeEquipamento(reserva))}

                            </h6>

                            <small class="d-block text-muted">

                                <strong>Reserva:</strong>

                                #${escapar(reserva.id)}

                            </small>

                            <small class="d-block text-muted">

                                <strong>Código:</strong>

                                ${escapar(reserva.component_code || "—")}

                            </small>

                            <small class="d-block text-muted">

                                <strong>Saída:</strong>

                                ${formatarData(reserva.loan_date)}

                            </small>

                            <small class="d-block text-muted">

                                <strong>Devolução prevista:</strong>

                                ${formatarData(reserva.expected_return_date)}

                            </small>

                            <small class="d-block text-success mb-2">

                                <strong>Devolução efetiva:</strong>

                                ${formatarData(reserva.return_date)}

                            </small>

                            <p class="small mb-1">

                                <strong>Quantidade:</strong>

                                ${escapar(reserva.quantity)}

                            </p>

                            <p class="small mb-1">

                                <strong>Justificativa:</strong>

                                ${escapar(
                                    reserva.justificativa
                                    || "Não informada"
                                )}

                            </p>

                            <p class="small mb-1">

                                <strong>Observações:</strong>

                                ${escapar(
                                    reserva.Obs
                                    || reserva.obs
                                    || "Sem observações."
                                )}

                            </p>

                            <p class="small mb-1">

                                <strong>Status:</strong>

                                <span class="badge bg-${
                                    reservaRecusada(reserva) ? "danger" : "success"
                                }">
                                    ${escapar(reserva.status)}
                                </span>

                            </p>

                        </div>

                    </div>

                `).join("");
        }

    } catch (erro) {

        if (consultaAtual !== consultaHistorico) {
            return;
        }

        console.error(
            "Erro ao carregar histórico:",
            erro
        );

        banner.className =
            "alert alert-danger";

        banner.textContent =
            erro.message ||
            "Não foi possível carregar o histórico.";
    }
}

// ==========================================
// 8. PREENCHER SELECT DE EQUIPAMENTOS
// ==========================================

function preencherSelect(select, reservas, placeholder) {

    select.replaceChildren();

    const opcaoInicial = document.createElement(
        "option"
    );

    opcaoInicial.value = "";
    opcaoInicial.textContent = placeholder;
    opcaoInicial.selected = true;
    opcaoInicial.disabled = true;

    select.appendChild(opcaoInicial);

    reservas.forEach(reserva => {

        const opcao = document.createElement(
            "option"
        );

        // Utilizar o ID da reserva
        opcao.value = String(reserva.id);

        opcao.textContent =
            `${nomeEquipamento(reserva)} - ${reserva.quantity} un. (Reserva #${reserva.id})`;

        select.appendChild(opcao);
    });
}

// ==========================================
// 9. CONTROLAR BOTÕES DE SAÍDA E DEVOLUÇÃO
// ==========================================

function atualizarBotoesEquipamentos() {

    const camposSaida = document.getElementById(
        "camposSaida"
    );

    const camposRetorno = document.getElementById(
        "camposRetorno"
    );

    const selectSaida = document.getElementById(
        "equipamentoSaida"
    );

    const selectRetorno = document.getElementById(
        "equipamentoRetorno"
    );

    const btnSalvarSaida = document.getElementById(
        "btnSalvarSaida"
    );

    const btnSalvarRetorno = document.getElementById(
        "btnSalvarRetorno"
    );

    const possuiSaida = Array.from(
        selectSaida.options
    ).some(opcao => opcao.value !== "");

    const possuiRetorno = Array.from(
        selectRetorno.options
    ).some(opcao => opcao.value !== "");

    const operacaoEmAndamento =
        saidaEmAndamento ||
        retornoEmAndamento ||
        carregandoEquipamentos;

    const bloquearSaida =
        operacaoEmAndamento ||
        !listaEquipamentosValida ||
        !possuiSaida;

    const bloquearRetorno =
        operacaoEmAndamento ||
        !listaEquipamentosValida ||
        !possuiRetorno;

    camposSaida.disabled = bloquearSaida;
    camposRetorno.disabled = bloquearRetorno;

    selectSaida.disabled = bloquearSaida;
    selectRetorno.disabled = bloquearRetorno;

    btnSalvarSaida.disabled = bloquearSaida;
    btnSalvarRetorno.disabled = bloquearRetorno;
}

// ==========================================
// 10. MODAL DE EQUIPAMENTOS
// ==========================================

async function mostrarEquipamentos(id, atualizar = false) {

    // Não trocar de aluno durante uma operação
    if (
        !atualizar &&
        (saidaEmAndamento || retornoEmAndamento)
    ) {
        return false;
    }

    const usuario = buscarUsuario(id);

    if (!usuario) return false;

    alunoSelecionado = usuario;

    const consultaAtual = ++consultaEquipamentos;

    carregandoEquipamentos = true;
    listaEquipamentosValida = false;

    document.getElementById("equipamentoAlunoId")
        .value = usuario.id;

    document.getElementById("nomeAlunoEquipamento")
        .textContent = usuario.name;

    const selectSaida = document.getElementById(
        "equipamentoSaida"
    );

    const selectRetorno = document.getElementById(
        "equipamentoRetorno"
    );

    document.getElementById("formSaida").reset();
    document.getElementById("formRetorno").reset();

    preencherSelect(
        selectSaida,
        [],
        "Carregando..."
    );

    preencherSelect(
        selectRetorno,
        [],
        "Carregando..."
    );

    atualizarBotoesEquipamentos();

    mostrarMensagemEquipamento(
        "Carregando equipamentos do aluno...",
        "info"
    );

    const modal = bootstrap.Modal.getOrCreateInstance(
        document.getElementById("modalEquipamento")
    );

    if (!atualizar) {
        modal.show();
    }

    try {

        const reservas = await buscarReservasUsuario(id);

        if (consultaAtual !== consultaEquipamentos) {
            return false;
        }

        // ==================================
        // RESERVAS AGUARDANDO RETIRADA
        // ==================================

        const reservasSaida = reservas.filter(
            reservaAprovada
        );

        // ==================================
        // RESERVAS AGUARDANDO DEVOLUÇÃO
        // ==================================

        const reservasRetorno = reservas.filter(
            reservaEmprestada
        );

        console.log(
            "Reservas aguardando saída:",
            reservasSaida
        );

        console.log(
            "Reservas aguardando retorno:",
            reservasRetorno
        );

        // Preencher lista de saída
        preencherSelect(
            selectSaida,

            reservasSaida,

            reservasSaida.length

                ? "Selecione o equipamento..."

                : "Nenhum equipamento aguardando retirada"
        );

        // Preencher lista de devolução
        preencherSelect(
            selectRetorno,

            reservasRetorno,

            reservasRetorno.length

                ? "Selecione o equipamento..."

                : "Nenhum empréstimo ativo"
        );

        listaEquipamentosValida = true;

        mostrarMensagemEquipamento(

            `${reservasSaida.length} reserva(s) aguardando retirada. ` +

            `${reservasRetorno.length} empréstimo(s) ativo(s).`,

            "info"
        );

        return true;

    } catch (erro) {

        if (consultaAtual !== consultaEquipamentos) {
            return false;
        }

        console.error(
            "Erro ao carregar equipamentos:",
            erro
        );

        listaEquipamentosValida = false;

        mostrarMensagemEquipamento(
            erro.message ||
            "Não foi possível carregar os equipamentos.",
            "danger"
        );

        return false;

    } finally {

        if (consultaAtual === consultaEquipamentos) {

            carregandoEquipamentos = false;

            atualizarBotoesEquipamentos();
        }
    }
}

// ==========================================
// 11. ATUALIZAR STATUS DO EMPRÉSTIMO
// ==========================================

async function atualizarEmprestimo(evento, operacao) {

    evento.preventDefault();

    // Impedir operações simultâneas
    if (
        !alunoSelecionado ||
        saidaEmAndamento ||
        retornoEmAndamento ||
        carregandoEquipamentos ||
        !listaEquipamentosValida
    ) {
        return;
    }

    if (!["saida", "retorno"].includes(operacao)) {
        return;
    }

    const alunoId = alunoSelecionado.id;

    const btnSalvarSaida = document.getElementById(
        "btnSalvarSaida"
    );

    const btnSalvarRetorno = document.getElementById(
        "btnSalvarRetorno"
    );

    const selectSaida = document.getElementById(
        "equipamentoSaida"
    );

    const selectRetorno = document.getElementById(
        "equipamentoRetorno"
    );

    // ==================================
    // IDENTIFICAR OPERAÇÃO
    // ==================================

    const isSaida = operacao === "saida";

    const selectEquipamento = isSaida
        ? selectSaida
        : selectRetorno;

    const botao = isSaida
        ? btnSalvarSaida
        : btnSalvarRetorno;

    // ID da reserva selecionada
    const reservaId = selectEquipamento.value;

    if (!reservaId) {

        mostrarMensagemEquipamento(
            "Selecione um equipamento.",
            "warning"
        );

        return;
    }

    // ==================================
    // DEFINIR NOVO STATUS
    // ==================================

    const novoStatus = isSaida
        ? "Emprestar"
        : "Devolver";

    const mensagemSucesso = isSaida
        ? "Saída registrada com sucesso!"
        : "Devolução registrada com sucesso!";

    const mensagemErro = isSaida
        ? "Não foi possível registrar a saída."
        : "Não foi possível registrar a devolução.";

    const textoOriginal = botao.textContent;

    let operacaoConcluida = false;

    // ==================================
    // BLOQUEAR FORMULÁRIOS
    // ==================================

    saidaEmAndamento = isSaida;
    retornoEmAndamento = !isSaida;

    atualizarBotoesEquipamentos();

    botao.textContent = "Registrando...";

    mostrarMensagemEquipamento(

        isSaida

            ? "Registrando saída do equipamento..."

            : "Registrando devolução do equipamento...",

        "info"
    );

    try {

        // Montar a rota de atualização
        const rota = ROTA_STATUS(
            reservaId,
            novoStatus
        );

        console.log("ID do aluno:", alunoId);
        console.log("ID da reserva:", reservaId);
        console.log("Novo status:", novoStatus);
        console.log("Rota utilizada:", rota);

        // ==================================
        // ATUALIZAR STATUS NO BACKEND
        // ==================================

        const resposta = await apiRequest(
            rota,
            {
                method: "PATCH"
            }
        );

        operacaoConcluida = true;
        listaEquipamentosValida = false;

        console.log(
            "Resposta do backend:",
            resposta
        );

        // ==================================
        // ATUALIZAR LISTAS DE EQUIPAMENTOS
        // ==================================

        const listaAtualizada = await mostrarEquipamentos(
            alunoId,
            true
        );

        if (listaAtualizada) {

            mostrarMensagemEquipamento(
                mensagemSucesso,
                "success"
            );

        } else {

            mostrarMensagemEquipamento(
                "Operação registrada, mas não foi possível " +
                "atualizar a lista. Reabra o modal.",
                "warning"
            );
        }

    } catch (erro) {

        console.error(
            "Erro ao atualizar empréstimo:",
            erro
        );

        if (operacaoConcluida) {

            listaEquipamentosValida = false;

            mostrarMensagemEquipamento(
                "Operação registrada, mas não foi possível " +
                "atualizar os equipamentos. Reabra o modal.",
                "warning"
            );

        } else {

            // Atualizar dados antes de permitir nova tentativa
            listaEquipamentosValida = false;

            await mostrarEquipamentos(alunoId, true);

            mostrarMensagemEquipamento(
                erro.message || mensagemErro,
                "danger"
            );
        }

    } finally {

        // Liberar controle dos formulários
        saidaEmAndamento = false;
        retornoEmAndamento = false;

        botao.textContent = textoOriginal;

        atualizarBotoesEquipamentos();
    }
}

// ==========================================
// 12. FORMULÁRIO DE SAÍDA
// ==========================================

document.getElementById("formSaida")
    .addEventListener("submit", async evento => {

        await atualizarEmprestimo(
            evento,
            "saida"
        );

    });

// ==========================================
// 13. FORMULÁRIO DE DEVOLUÇÃO
// ==========================================

document.getElementById("formRetorno")
    .addEventListener("submit", async evento => {

        await atualizarEmprestimo(
            evento,
            "retorno"
        );

    });

// ==========================================
// 14. EVENTOS DA TABELA
// ==========================================

corpo.addEventListener("click", async evento => {

    const botao = evento.target.closest(
        "button[data-acao]"
    );

    if (!botao) return;

    const id = botao.dataset.id;

    // Impedir operações simultâneas
    if (saidaEmAndamento || retornoEmAndamento) {
        return;
    }

    switch (botao.dataset.acao) {

        case "status":

            await alterarStatus(id, botao);

            break;

        case "historico":

            await mostrarHistorico(id);

            break;

        case "equipamentos":

            await mostrarEquipamentos(id);

            break;
    }
});

// ==========================================
// 15. LOGOUT
// ==========================================

document.getElementById("btnSair")
    .addEventListener("click", () => {

        sessionStorage.removeItem(
            "access_token"
        );

        window.location.replace(
            "./login_admin.html"
        );
    });

// ==========================================
// 16. INICIALIZAÇÃO
// ==========================================

async function iniciar() {

    if (!sessionStorage.getItem("access_token")) {

        window.location.replace(
            "./login_admin.html"
        );

        return;
    }

    try {

        const admin = await apiRequest(
            "/user/me"
        );

        const role = normalizar(admin.role);

        if (!admin.is_active || role !== "admin") {

            window.location.replace(
                "./login_admin.html"
            );

            return;
        }

        await carregarUsuarios();

    } catch (erro) {

        console.error(
            "Erro ao iniciar painel:",
            erro
        );

        if (
            erro.status === 401 ||
            erro.status === 403
        ) {

            sessionStorage.removeItem(
                "access_token"
            );

            window.location.replace(
                "./login_admin.html"
            );

            return;
        }

        corpo.innerHTML = `
            <tr>

                <td colspan="4"
                    class="text-center py-4 text-danger">

                    Não foi possível carregar os usuários.

                </td>

            </tr>
        `;

        contador.textContent =
            "Verifique a conexão e as rotas da API.";

        mostrarMensagem(
            erro.message ||
            "Erro ao carregar usuários.",
            "danger"
        );
    }
}

// ==========================================
// EXECUTAR SISTEMA
// ==========================================

iniciar();