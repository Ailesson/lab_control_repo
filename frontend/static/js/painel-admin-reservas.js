
import { apiRequest } from "./api.js";

// Rotas esperadas no FastAPI.
// Precisam existir no backend para a integração funcionar.
const ROTA_PENDENTES = "/reservation/solicitacao";
const ROTA_DECISAO = (id, acao) =>
    `/reservation/status?reservation_id=${encodeURIComponent(id)}&status=${encodeURIComponent(acao)}`;

const corpo = document.getElementById("corpoReservas");
const contador = document.getElementById("contadorReservas");
const mensagem = document.getElementById("mensagemReservas");

// Evita interpretar dados recebidos como HTML
function escapar(valor) {
    return String(valor ?? "").replace(
        /[&<>"']/g,
        (caractere) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[caractere]
    );
}

// Formata datas em português brasileiro
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

// Mostra mensagens no rodapé da tabela
function mostrarMensagem(texto, erro = false) {
    mensagem.textContent = texto;
    mensagem.className = erro
        ? "text-danger"
        : "text-muted";
}

// Verifica se o usuário pode acessar a página
async function verificarAdmin() {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
        window.location.replace("./login_admin.html");
        return false;
    }

    const usuario = await apiRequest("/user/me");

    if (!usuario.is_active || usuario.role !== "admin") {
        window.location.replace("./painel.html");
        return false;
    }

    return true;
}

// Busca as solicitações pendentes no backend
async function carregarReservas() {
    corpo.innerHTML = `
        <tr>
            <td colspan="4" class="text-center py-4">
                Carregando solicitações...
            </td>
        </tr>
    `;

    try {
        const resposta = await apiRequest(ROTA_PENDENTES);

        const reservas = Array.isArray(resposta)
            ? resposta
            : resposta?.items;

        if (!Array.isArray(reservas)) {
            throw new Error("Formato de resposta inválido.");
        }

        contador.textContent =
            `A aguardar análise (${reservas.length})`;

        if (reservas.length === 0) {
            corpo.innerHTML = `
                <tr>
                    <td colspan="4"
                        class="text-center py-4 text-muted">
                        Nenhuma solicitação pendente.
                    </td>
                </tr>
            `;

            mostrarMensagem("Não há solicitações pendentes.");
            return;
        }

        corpo.innerHTML = reservas.map((reserva) => {
            const aluno = reserva.user_name
                ?? reserva.user?.name
                ?? "Aluno não identificado";

            const matricula = reserva.user_matricula
                ?? reserva.user?.matricula
                ?? "Não informada";

            const vinculo = reserva.user_vinculo
                ?? reserva.user?.vinculo
                ?? "Vínculo não informado";

            const equipamento = reserva.component_name
                ?? reserva.component?.name
                ?? "Equipamento não identificado";

            const patrimonio = reserva.component_code
                ?? reserva.component?.component_id
                ?? "Não informado";

            const dataSolicitacao = formatarData(
                reserva.loan_date
            );

            const dataDevolucao = formatarData(
                reserva.expected_return_date
            );

            return `
                <tr>
                    <td class="ps-4">
                        <strong class="text-dark">
                            ${escapar(aluno)}
                        </strong><br>
                        <small class="text-muted">
                            Matrícula: ${escapar(matricula)}
                            | ${escapar(vinculo)}
                        </small>
                    </td>

                    <td>
                        <strong>
                            ${escapar(equipamento)}
                        </strong><br>
                        <small class="text-secondary">
                            Patrimônio: ${escapar(patrimonio)}
                        </small>
                    </td>

                    <td>
                        <span class="d-block small text-muted">
                            Solicitação:
                            <strong>${dataSolicitacao}</strong>
                        </span>
                        <span class="d-block small text-muted">
                            Devolução prevista:
                            <strong>${dataDevolucao}</strong>
                        </span>
                    </td>

                    <td class="text-center">
                        <div class="d-flex justify-content-center gap-2">
                            <button
                                class="btn btn-sm btn-outline-danger fw-bold px-3"
                                data-id="${escapar(reserva.id)}"
                                data-acao="reject">
                                Recusar
                            </button>

                            <button
                                class="btn btn-sm btn-success fw-bold px-3"
                                data-id="${escapar(reserva.id)}"
                                data-acao="approve">
                                Aprovar
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

        mostrarMensagem(
            `${reservas.length} solicitação(ões) aguardando análise.`
        );

    } catch (erro) {
        console.error("Erro ao carregar reservas:", erro);

        corpo.innerHTML = `
            <tr>
                <td colspan="4"
                    class="text-center py-4 text-danger">
                    Não foi possível carregar as solicitações.
                </td>
            </tr>
        `;

        mostrarMensagem(erro.message, true);
    }
}

// Aprova ou recusa uma solicitação

async function decidirReserva(id, acao, botao) {
    // Converte a ação do botão para o valor esperado no backend
    const status = acao === "approve" ? "Aprovar" : "Recusar";

    const confirmar = window.confirm(
        status === "Aprovar"
            ? `Deseja aprovar a reserva #${id}?`
            : `Deseja recusar a reserva #${id}?`
    );

    if (!confirmar) return;

    const botoes = botao.closest("tr").querySelectorAll("button");

    botoes.forEach(item => item.disabled = true);

    try {
        await apiRequest(ROTA_DECISAO(id, status), {
            method: "PATCH"
        });

        mostrarMensagem(
            status === "Aprovar"
                ? "Reserva aprovada com sucesso!"
                : "Reserva recusada com sucesso!"
        );

        await carregarReservas();

    } catch (erro) {
        console.error("Erro ao atualizar reserva:", erro);

        mostrarMensagem(
            erro.message || "Erro ao atualizar reserva.",
            true
        );

        botoes.forEach(item => item.disabled = false);
    }
}

// Trata os botões gerados dinamicamente
corpo.addEventListener("click", async (evento) => {
    const botao = evento.target.closest("button[data-acao]");

    if (!botao) return;

    await decidirReserva(
        botao.dataset.id,
        botao.dataset.acao,
        botao
    );
});

// Sair da área administrativa
document.getElementById("btnSair")
    .addEventListener("click", () => {
        sessionStorage.removeItem("access_token");
        window.location.replace("./login_admin.html");
    });

// Inicialização
async function iniciar() {
    try {
        const autorizado = await verificarAdmin();

        if (autorizado) {
            await carregarReservas();
        }
    } catch (erro) {
        console.error("Erro de autenticação:", erro);
        sessionStorage.removeItem("access_token");
        window.location.replace("./login_admin.html");
    }
}

iniciar();