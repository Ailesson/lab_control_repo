import { apiRequest, API_URL } from "./api.js";

// ==========================================
// ROTAS DO BACKEND
// ==========================================

const ROTA_USUARIO = "/user/me";
const ROTA_COMPONENTES = "/component/available";

const ROTA_QUANTIDADE = (component_id, new_quantity) =>
    `/component/${encodeURIComponent(component_id)}/quantity?new_quantity=${encodeURIComponent(new_quantity)}`;

// Rotas aguardando implementação
const ROTA_STATUS = null;
const ROTA_EXCLUIR = (component_id) =>
    `/component/${encodeURIComponent(component_id)}?component_id=${encodeURIComponent(component_id)}`;

// ==========================================
// ELEMENTOS DO HTML
// ==========================================

const corpo = document.getElementById("corpoEstoque");
const contador = document.getElementById("contadorEstoque");
const mensagem = document.getElementById("mensagemEstoque");

const form = document.getElementById("formEstoque");
const erroEstoque = document.getElementById("erroEstoque");

const btnSalvar = document.getElementById("btnSalvarQuantidade");
const btnStatus = document.getElementById("btnStatusItem");
const btnApagar = document.getElementById("btnApagarItem");

const inputQuantidade = document.getElementById("itemQuantidade");

const modalElemento = document.getElementById("modalItem");

const modal = bootstrap.Modal.getOrCreateInstance(
    modalElemento
);

let equipamentos = [];
let equipamentoSelecionado = null;
let operacaoEmAndamento = false;

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

function mostrarMensagem(texto, tipo = "success") {
    mensagem.textContent = texto;
    mensagem.className = `alert alert-${tipo} shadow-sm`;
}

function mostrarErro(texto) {
    erroEstoque.textContent = texto;
    erroEstoque.classList.remove("d-none");
}

function limparErro() {
    erroEstoque.textContent = "";
    erroEstoque.classList.add("d-none");
}

// Busca pelo código alfanumérico do componente
function buscarEquipamento(component_id) {

    if (component_id == null || component_id === "") {
        return undefined;
    }

    return equipamentos.find(
        item =>
            item.component_id != null &&
            String(item.component_id).trim() ===
            String(component_id).trim()
    );
}

// ==========================================
// 1. DADOS DO EQUIPAMENTO
// ==========================================

function obterNome(item) {
    return item.name ?? "Sem nome";
}

function obterCodigo(item) {
    return item.component_id ?? "Não informado";
}

function obterDescricao(item) {
    return item.description ?? "Sem descrição";
}

function obterObservacao(item) {
    return item.obs || "Sem observações";
}

function obterEstoqueDisponivel(item) {
    return item.quantity ?? null;
}

function obterEstoqueTotal(item) {
    return item.quantity_total
        ?? item.total_quantity
        ?? null;
}

function equipamentoDesabilitado(item) {
    return item.is_active === false;
}

// ==========================================
// 2. IMAGEM DO EQUIPAMENTO
// ==========================================

function obterFoto(item, tamanho = "100x100") {

    const placeholder =
        `https://placehold.co/${tamanho}/e2e8f0/1e293b?text=Sem+Foto`;

    if (!item.image_url) {

        console.warn(
            "Equipamento sem imagem:",
            item.component_id
        );

        return placeholder;
    }

    try {

        const url = new URL(
            item.image_url,
            API_URL
        );

        if (!["http:", "https:"].includes(url.protocol)) {
            return placeholder;
        }

        console.log("Caminho recebido:", item.image_url);
        console.log("URL da imagem:", url.href);

        return url.href;

    } catch (erro) {

        console.error("Erro ao carregar imagem:", erro);

        return placeholder;
    }
}

// ==========================================
// 3. STATUS DO EQUIPAMENTO
// ==========================================

function gerarBadge(item) {

    const estado = normalizar(item.state);

    if (equipamentoDesabilitado(item)) {

        return `
            <span class="badge bg-secondary">
                Desabilitado
            </span>
        `;

    }

    if (
        estado.includes("em uso") ||
        estado.includes("emprestado") ||
        estado.includes("parcial")
    ) {

        return `
            <span class="badge bg-warning text-dark">
                Em uso
            </span>
        `;

    }

    if (item.quantity === 0) {

        return `
            <span class="badge bg-warning text-dark">
                Sem estoque
            </span>
        `;

    }

    if (item.is_active === true) {

        return `
            <span class="badge bg-success">
                Ativo
            </span>
        `;

    }

    return `
        <span class="badge bg-secondary">
            Não informado
        </span>
    `;
}

// ==========================================
// 4. CARREGAR EQUIPAMENTOS
// ==========================================

async function carregarEquipamentos() {

    corpo.innerHTML = `
        <tr>
            <td colspan="5"
                class="text-center py-5 text-muted">

                Carregando equipamentos...

            </td>
        </tr>
    `;

    try {

        const resposta = await apiRequest(
            ROTA_COMPONENTES
        );

        console.log(
            "Equipamentos recebidos:",
            resposta
        );

        if (!Array.isArray(resposta)) {

            throw new Error(
                "Formato inválido na resposta de equipamentos."
            );

        }

        equipamentos = resposta;

        renderizarEquipamentos();

    } catch (erro) {

        console.error(
            "Erro ao carregar equipamentos:",
            erro
        );

        contador.textContent = "—";

        corpo.innerHTML = `
            <tr>
                <td colspan="5"
                    class="text-center py-5 text-danger">

                    Não foi possível carregar os equipamentos.

                </td>
            </tr>
        `;

        mostrarMensagem(
            erro.message || "Erro ao consultar equipamentos.",
            "danger"
        );

        throw erro;
    }
}

// ==========================================
// 5. RENDERIZAR TABELA
// ==========================================

function renderizarEquipamentos() {

    contador.textContent = equipamentos.length;

    if (equipamentos.length === 0) {

        corpo.innerHTML = `
            <tr>
                <td colspan="5"
                    class="text-center py-5 text-muted">

                    Nenhum equipamento cadastrado.

                </td>
            </tr>
        `;

        return;
    }

    corpo.innerHTML = equipamentos.map(item => {

        const disponivel = obterEstoqueDisponivel(item);
        const total = obterEstoqueTotal(item);

        // Código alfanumérico utilizado na tabela
        const component_id = item.component_id;

        return `
            <tr data-id="${escapar(component_id)}">

                <!-- Foto -->
                <td class="ps-4">

                    <img
                        src="${escapar(obterFoto(item))}"
                        alt="${escapar(obterNome(item))}"
                        class="img-thumbnail-table border shadow-sm">

                </td>

                <!-- Nome e patrimônio -->
                <td>

                    <strong class="text-dark">

                        ${escapar(obterNome(item))}

                    </strong><br>

                    <small class="text-muted">

                        ${escapar(obterCodigo(item))}

                    </small>

                </td>

                <!-- Status -->
                <td>

                    ${gerarBadge(item)}

                </td>

                <!-- Estoque -->
                <td>

                    <span class="fw-bold">

                        ${escapar(disponivel ?? "—")}

                    </span>

                    / ${escapar(total ?? "—")}

                </td>

                <!-- Ação -->
                <td class="text-end pe-4">

                    <button
                        type="button"
                        class="btn btn-sm btn-outline-primary"
                        data-id="${escapar(component_id)}"
                        data-acao="gerenciar">

                        <i class="bi bi-pencil-square"></i>
                        Gerenciar

                    </button>

                </td>

            </tr>
        `;

    }).join("");
}

// ==========================================
// 6. CONTROLAR BOTÕES DO MODAL
// ==========================================

function atualizarBotoesModal() {

    const item = equipamentoSelecionado;

    if (!item) return;

    const total = obterEstoqueTotal(item);

    inputQuantidade.disabled =
        operacaoEmAndamento ||
        !ROTA_QUANTIDADE ||
        total === null;

    btnSalvar.disabled =
        operacaoEmAndamento ||
        !ROTA_QUANTIDADE ||
        total === null;

    btnStatus.disabled =
        operacaoEmAndamento ||
        !ROTA_STATUS;

    btnApagar.disabled =
        operacaoEmAndamento ||
        !ROTA_EXCLUIR;

    if (equipamentoDesabilitado(item)) {

        btnStatus.className =
            "btn btn-outline-success fw-bold";

        btnStatus.innerHTML = `
            <i class="bi bi-check-circle"></i>
            Reabilitar
        `;

    } else {

        btnStatus.className =
            "btn btn-outline-secondary fw-bold";

        btnStatus.innerHTML = `
            <i class="bi bi-pause-circle"></i>
            Desabilitar
        `;
    }
}

// ==========================================
// 7. ABRIR MODAL DO EQUIPAMENTO
// ==========================================

function abrirModal(component_id) {

    console.log(
        "Component ID recebido:",
        component_id
    );

    if (operacaoEmAndamento) {

        console.warn(
            "Existe uma operação em andamento."
        );

        return;
    }

    // Busca utilizando component_id
    const item = buscarEquipamento(component_id);

    if (!item) {

        console.error(
            "Equipamento não encontrado:",
            component_id
        );

        console.log(
            "Equipamentos cadastrados:",
            equipamentos
        );

        mostrarMensagem(
            "Equipamento não encontrado.",
            "danger"
        );

        return;
    }

    console.log(
        "Equipamento encontrado:",
        item
    );

    equipamentoSelecionado = item;

    limparErro();

    // Código alfanumérico do equipamento
    document.getElementById("itemId").value =
        item.component_id;

    // Nome do equipamento
    document.getElementById("itemNome").textContent =
        obterNome(item);

    // Patrimônio e observação
    document.getElementById("itemPatrimonio").textContent =
        `${obterCodigo(item)} — ${obterObservacao(item)}`;

    // Imagem do equipamento
    const imagem = document.getElementById("itemFoto");

    imagem.src = obterFoto(item, "400x250");

    imagem.alt = obterNome(item);

    // Quantidade total
    const total = obterEstoqueTotal(item);

    inputQuantidade.value = total ?? "";

    inputQuantidade.placeholder =
        total === null
            ? "Não informado"
            : "";

    atualizarBotoesModal();

    console.log(
        "Abrindo modal para:",
        item.component_id
    );

    modal.show();
}

// ==========================================
// 8. EXECUTAR OPERAÇÕES NO BACKEND
// ==========================================

async function executarOperacao(
    rota,
    opcoes,
    mensagemSucesso
) {

    if (!rota || operacaoEmAndamento) {
        return;
    }

    limparErro();

    operacaoEmAndamento = true;

    atualizarBotoesModal();

    try {

        console.log(
            "Rota utilizada:",
            rota
        );

        console.log(
            "Opções da requisição:",
            opcoes
        );

        const resposta = await apiRequest(
            rota,
            opcoes
        );

        console.log(
            "Resposta da operação:",
            resposta
        );

        modal.hide();

        try {

            await carregarEquipamentos();

            equipamentoSelecionado = null;

            mostrarMensagem(
                mensagemSucesso,
                "success"
            );

        } catch (erro) {

            equipamentoSelecionado = null;

            mostrarMensagem(
                "Operação concluída, mas não foi possível atualizar a tabela.",
                "warning"
            );

        }

    } catch (erro) {

        console.error(
            "Erro na operação:",
            erro
        );

        mostrarErro(
            erro.message ||
            "Não foi possível realizar a operação."
        );

    } finally {

        operacaoEmAndamento = false;

        atualizarBotoesModal();

    }
}

// ==========================================
// 9. ATUALIZAR QUANTIDADE TOTAL
// ==========================================

form.addEventListener("submit", async evento => {

    evento.preventDefault();

    if (!equipamentoSelecionado) {

        mostrarErro(
            "Nenhum equipamento selecionado."
        );

        return;
    }

    if (!ROTA_QUANTIDADE || operacaoEmAndamento) {
        return;
    }

    if (obterEstoqueTotal(equipamentoSelecionado) === null) {

        mostrarErro(
            "A API não informou a quantidade total do equipamento."
        );

        return;
    }

    const valor = inputQuantidade.value.trim();

    const quantidade = Number(valor);

    if (
        valor === "" ||
        !Number.isInteger(quantidade) ||
        quantidade < 0
    ) {

        mostrarErro(
            "Informe uma quantidade inteira válida."
        );

        return;
    }

    // Utiliza component_id e não o ID numérico
    const component_id =
        equipamentoSelecionado.component_id;

    if (!component_id) {

        mostrarErro(
            "Código do equipamento não encontrado."
        );

        return;
    }

    console.log(
        "Component ID:",
        component_id
    );

    console.log(
        "Nova quantidade:",
        quantidade
    );

    await executarOperacao(

        ROTA_QUANTIDADE(component_id, quantidade),

        {
            method: "PATCH",

            body: JSON.stringify({
                quantity: quantidade
            })
        },

        "Quantidade atualizada com sucesso!"
    );
});

// ==========================================
// 10. HABILITAR / DESABILITAR EQUIPAMENTO
// ==========================================

btnStatus.addEventListener("click", async () => {

    if (
        !equipamentoSelecionado ||
        !ROTA_STATUS ||
        operacaoEmAndamento
    ) {
        return;
    }

    const desabilitado = equipamentoDesabilitado(
        equipamentoSelecionado
    );

    const novoStatus = desabilitado;

    const acao = desabilitado
        ? "reabilitar"
        : "desabilitar";

    const confirmar = window.confirm(

        `Deseja ${acao} o equipamento ` +
        `"${obterNome(equipamentoSelecionado)}"?`

    );

    if (!confirmar) return;

    const component_id =
        equipamentoSelecionado.component_id;

    await executarOperacao(

        ROTA_STATUS(
            component_id,
            novoStatus
        ),

        {
            method: "PATCH"
        },

        desabilitado
            ? "Equipamento reabilitado com sucesso!"
            : "Equipamento desabilitado com sucesso!"
    );
});

// ==========================================
// 11. EXCLUIR EQUIPAMENTO
// ==========================================

btnApagar.addEventListener("click", async () => {

    if (
        !equipamentoSelecionado ||
        !ROTA_EXCLUIR ||
        operacaoEmAndamento
    ) {
        return;
    }

    const confirmar = window.confirm(

        "ATENÇÃO: Deseja apagar permanentemente o equipamento " +

        `"${obterNome(equipamentoSelecionado)}"?`

    );

    if (!confirmar) return;

    const component_id =
        equipamentoSelecionado.component_id;

    await executarOperacao(

        ROTA_EXCLUIR(component_id),

        {
            method: "DELETE"
        },

        "Equipamento excluído com sucesso!"
    );
});

// ==========================================
// 12. EVENTOS DA TABELA
// ==========================================

corpo.addEventListener("click", evento => {

    // Identifica o botão Gerenciar
    const botao = evento.target.closest(
        'button[data-acao="gerenciar"]'
    );

    // Identifica a linha selecionada
    const linha = evento.target.closest(
        "tr[data-id]"
    );

    // Obtém o código alfanumérico do equipamento
    const component_id =
        botao?.dataset.id ??
        linha?.dataset.id;

    if (!component_id) {
        return;
    }

    console.log(
        "Component ID selecionado:",
        component_id
    );

    try {

        abrirModal(component_id);

    } catch (erro) {

        console.error(
            "Erro ao abrir modal:",
            erro
        );

        mostrarMensagem(

            erro.message ||
            "Não foi possível abrir o equipamento.",

            "danger"
        );

    }
});

// ==========================================
// 13. VERIFICAR ADMINISTRADOR
// ==========================================

async function verificarAdministrador() {

    const token = sessionStorage.getItem(
        "access_token"
    );

    if (!token) {

        window.location.replace(
            "./login_admin.html"
        );

        return false;
    }

    const usuario = await apiRequest(
        ROTA_USUARIO
    );

    const role = normalizar(usuario.role);

    if (!usuario.is_active || role !== "admin") {

        window.location.replace(
            "./login_admin.html"
        );

        return false;
    }

    return true;
}

// ==========================================
// 14. INICIALIZAÇÃO
// ==========================================

async function iniciar() {

    try {

        const autorizado =
            await verificarAdministrador();

        if (!autorizado) return;

        await carregarEquipamentos();

    } catch (erro) {

        console.error(
            "Erro no gerenciamento de estoque:",
            erro
        );

        if (erro.status === 401 || erro.status === 403) {

            sessionStorage.removeItem(
                "access_token"
            );

            window.location.replace(
                "./login_admin.html"
            );

            return;
        }

        mostrarMensagem(

            erro.message ||
            "Não foi possível carregar o estoque.",

            "danger"
        );
    }
}

iniciar();