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

// ==========================================
// ROTAS DO BACKEND
// ==========================================

const ROTA_USUARIOS = "/user/";

const ROTA_STATUS = (id, novoStatus) =>
    `/user/${encodeURIComponent(id)}/status?novoStatus=${encodeURIComponent(novoStatus)}`;

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

// ==========================================
// 1. CARREGAR USUÁRIOS
// ==========================================

async function carregarUsuarios() {

    const resposta = await apiRequest(ROTA_USUARIOS);

    if (!Array.isArray(resposta)) {
        throw new Error("Resposta inválida da API de usuários.");
    }

    // Não exibir administradores
    usuarios = resposta.filter(
        usuario => normalizar(usuario.role) !== "admin"
    );

    pesquisarUsuarios();
}

// ==========================================
// 2. RENDERIZAR TABELA
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

        const vinculo = usuario.vinculo || "Não informado";

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
// 4. BLOQUEAR / DESBLOQUEAR
// ==========================================

async function alterarStatus(id, botao) {

    const usuario = buscarUsuario(id);

    if (!usuario) return;

    const bloqueado = usuarioBloqueado(usuario);

    // Define o novo status a partir do status atual
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

        await apiRequest(ROTA_STATUS(id, novoStatus), {
            method: "PATCH"
        });

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

        console.error("Erro ao alterar status:", erro);

        mostrarMensagem(
            erro.message || "Não foi possível alterar a conta.",
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

    const reservas = await apiRequest(
        ROTA_HISTORICO(id)
    );

    if (!Array.isArray(reservas)) {
        throw new Error("Resposta de histórico inválida.");
    }

    return reservas;
}

// ==========================================
// 6. CLASSIFICAÇÃO DAS RESERVAS
// ==========================================

function reservaAprovada(reserva) {

    return [
        "approved",
        "aprovado",
        "aprovada",
        "confirmed",
        "confirmado",
        "confirmada"
    ].includes(normalizar(reserva.status));
}

function reservaEmprestada(reserva) {

    return [
        "borrowed",
        "emprestado",
        "emprestada",
        "retirado",
        "retirada",
        "em uso",
        "atrasado",
        "atrasada",
        "overdue"
    ].includes(normalizar(reserva.status));
}

function reservaDevolvida(reserva) {

    return [
        "returned",
        "devolvido",
        "devolvida",
        "completed",
        "concluido",
        "concluida",
        "finalizado",
        "finalizada"
    ].includes(normalizar(reserva.status));
}

function reservaAtrasada(reserva) {

    if (!reservaEmprestada(reserva)) {
        return false;
    }

    const status = normalizar(reserva.status);

    if (["atrasado", "atrasada", "overdue"].includes(status)) {
        return true;
    }

    if (!reserva.expected_return_date) {
        return false;
    }

    const prazo = new Date(reserva.expected_return_date);

    return !Number.isNaN(prazo.getTime())
        && prazo < new Date();
}

// ==========================================
// 7. MODAL DE HISTÓRICO
// ==========================================

async function mostrarHistorico(id) {

    const usuario = buscarUsuario(id);

    if (!usuario) return;

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
    banner.textContent = "Carregando histórico do aluno...";

    containerAtivo.innerHTML = "";
    containerPassado.innerHTML = "";

    const modal = bootstrap.Modal.getOrCreateInstance(
        document.getElementById("modalHistorico")
    );

    modal.show();

    try {

        const reservas = await buscarReservasUsuario(id);

        const emprestimosAtivos = reservas.filter(
            reservaEmprestada
        );

        const historicoPassado = reservas.filter(
            reservaDevolvida
        );

        const atrasadas = emprestimosAtivos.filter(
            reservaAtrasada
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

            banner.className = "alert alert-warning";

            banner.textContent =
                `O aluno possui ${emprestimosAtivos.length} empréstimo(s) ativo(s).`;

        } else {

            banner.className = "alert alert-success";

            banner.textContent =
                "Nenhum empréstimo ativo identificado.";

        }

        // ==================================
        // EMPRÉSTIMOS ATIVOS
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
                                    ${escapar(reserva.status)}
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
        // HISTÓRICO DE DEVOLUÇÕES
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

                                <strong>Saída:</strong>
                                ${formatarData(reserva.loan_date)}

                            </small>

                            <small class="d-block text-success mb-2">

                                <strong>Devolução:</strong>
                                ${formatarData(reserva.return_date)}

                            </small>

                            <p class="small mb-1">

                                <strong>Quantidade:</strong>
                                ${escapar(reserva.quantity)}

                            </p>

                            <p class="small mb-0">

                                <strong>Observações:</strong>

                                ${escapar(
                                    reserva.Obs
                                    || reserva.obs
                                    || "Sem observações."
                                )}

                            </p>

                        </div>

                    </div>

                `).join("");

        }

    } catch (erro) {

        console.error("Erro ao carregar histórico:", erro);

        banner.className = "alert alert-danger";

        banner.textContent =
            erro.message || "Não foi possível carregar o histórico.";

    }
}

// ==========================================
// 8. PREENCHER SELECT DE EQUIPAMENTOS
// ==========================================

function preencherSelect(select, reservas, placeholder) {

    select.replaceChildren();

    const opcaoInicial = document.createElement("option");

    opcaoInicial.value = "";
    opcaoInicial.textContent = placeholder;
    opcaoInicial.selected = true;
    opcaoInicial.disabled = true;

    select.appendChild(opcaoInicial);

    reservas.forEach(reserva => {

        const opcao = document.createElement("option");

        opcao.value = String(reserva.id);

        opcao.textContent =
            `${nomeEquipamento(reserva)} - ${reserva.quantity} un.`;

        select.appendChild(opcao);

    });
}

// ==========================================
// 9. MODAL DE EQUIPAMENTOS
// ==========================================

async function mostrarEquipamentos(id) {

    const usuario = buscarUsuario(id);

    if (!usuario) return;

    alunoSelecionado = usuario;

    document.getElementById("equipamentoAlunoId")
        .value = usuario.id;

    document.getElementById("nomeAlunoEquipamento")
        .textContent = usuario.name;

    const mensagemEquipamento = document.getElementById(
        "mensagemEquipamento"
    );

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

    document.getElementById("formSaida").reset();
    document.getElementById("formRetorno").reset();

    camposSaida.disabled = true;
    camposRetorno.disabled = true;

    document.getElementById("btnSalvarSaida").disabled = true;
    document.getElementById("btnSalvarRetorno").disabled = true;

    preencherSelect(selectSaida, [], "Carregando...");
    preencherSelect(selectRetorno, [], "Carregando...");

    mensagemEquipamento.className = "alert alert-info";

    mensagemEquipamento.textContent =
        "Carregando equipamentos do aluno...";

    const modal = bootstrap.Modal.getOrCreateInstance(
        document.getElementById("modalEquipamento")
    );

    modal.show();

    try {

        const reservas = await buscarReservasUsuario(id);

        // Equipamentos aprovados, aguardando retirada
        const reservasSaida = reservas.filter(
            reservaAprovada
        );

        // Equipamentos emprestados, aguardando devolução
        const reservasRetorno = reservas.filter(
            reservaEmprestada
        );

        preencherSelect(
            selectSaida,
            reservasSaida,
            reservasSaida.length
                ? "Selecione o equipamento..."
                : "Nenhum equipamento aguardando retirada"
        );

        preencherSelect(
            selectRetorno,
            reservasRetorno,
            reservasRetorno.length
                ? "Selecione o equipamento..."
                : "Nenhum empréstimo ativo"
        );

        camposSaida.disabled = reservasSaida.length === 0;

        camposRetorno.disabled = reservasRetorno.length === 0;

        mensagemEquipamento.className =
            "alert alert-info small";

        mensagemEquipamento.textContent =
            `${reservasSaida.length} reserva(s) aguardando retirada. ` +
            `${reservasRetorno.length} empréstimo(s) ativo(s). ` +
            "O registro de saída e devolução ainda depende da integração das rotas.";

    } catch (erro) {

        console.error("Erro ao carregar equipamentos:", erro);

        mensagemEquipamento.className =
            "alert alert-danger";

        mensagemEquipamento.textContent =
            erro.message || "Não foi possível carregar os equipamentos.";

    }
}

// ==========================================
// 10. FORMULÁRIO DE SAÍDA
// ==========================================

document.getElementById("formSaida")
    .addEventListener("submit", evento => {

        evento.preventDefault();

        if (!alunoSelecionado) return;

        const mensagemEquipamento = document.getElementById(
            "mensagemEquipamento"
        );

        mensagemEquipamento.className =
            "alert alert-warning";

        mensagemEquipamento.textContent =
            "A rota de registro de saída ainda não foi integrada.";

    });

// ==========================================
// 11. FORMULÁRIO DE DEVOLUÇÃO
// ==========================================

document.getElementById("formRetorno")
    .addEventListener("submit", evento => {

        evento.preventDefault();

        if (!alunoSelecionado) return;

        const mensagemEquipamento = document.getElementById(
            "mensagemEquipamento"
        );

        mensagemEquipamento.className =
            "alert alert-warning";

        mensagemEquipamento.textContent =
            "A rota de registro de devolução ainda não foi integrada.";

    });

// ==========================================
// 12. EVENTOS DA TABELA
// ==========================================

corpo.addEventListener("click", async evento => {

    const botao = evento.target.closest(
        "button[data-acao]"
    );

    if (!botao) return;

    const id = botao.dataset.id;

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
// 13. LOGOUT
// ==========================================

document.getElementById("btnSair")
    .addEventListener("click", () => {

        sessionStorage.removeItem("access_token");

        window.location.replace(
            "./login_admin.html"
        );

    });

// ==========================================
// 14. INICIALIZAÇÃO
// ==========================================

async function iniciar() {

    if (!sessionStorage.getItem("access_token")) {

        window.location.replace("./login_admin.html");

        return;
    }

    try {

        const admin = await apiRequest("/user/me");

        const role = normalizar(admin.role);

        if (!admin.is_active || role !== "admin") {

            window.location.replace("./login_admin.html");

            return;

        }

        await carregarUsuarios();

    } catch (erro) {

        console.error("Erro ao iniciar painel:", erro);

        if (erro.status === 401 || erro.status === 403) {

            sessionStorage.removeItem("access_token");

            window.location.replace("./login_admin.html");

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
            erro.message || "Erro ao carregar usuários.",
            "danger"
        );

    }

}

iniciar();