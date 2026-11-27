import { apiRequest } from "./api.js";

// ==========================================
// ROTAS DO BACKEND
// ==========================================

const ROTA_CADASTRO = "/component/";
const ROTA_USUARIO = "/user/me";

// ==========================================
// ELEMENTOS DO FORMULÁRIO
// ==========================================

const form = document.getElementById("form-cadastro-material");
const mensagem = document.getElementById("mensagemCadastro");
const btnSalvar = form.querySelector('button[type="submit"]');

const nome = document.getElementById("nome_equipamento");
const patrimonio = document.getElementById("patrimonio");
const quantidade = document.getElementById("quantidade");
const categoria = document.getElementById("categoria");
const estado = document.getElementById("status");
const observacoes = document.getElementById("observacoes");

const modalSucesso = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalSucesso")
);

let enviando = false;

// ==========================================
// ELEMENTOS DA FOTO
// ==========================================

const fotoInput = document.getElementById("foto");
const fotoPreview = document.querySelector(".foto-preview");
const fotoPlaceholder = document.querySelector(".foto-placeholder");
const fotoRemover = document.querySelector(".foto-remover");
const fotoErro = document.querySelector(".foto-erro");
const dropZone = document.querySelector(".foto-box");

const MAX_SIZE = 5 * 1024 * 1024;

const TIPOS_PERMITIDOS = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

let urlFotoAtual = null;

// ==========================================
// 1. MENSAGENS DO SISTEMA
// ==========================================

function mostrarMensagem(texto, sucesso = false) {

    mensagem.textContent = texto;

    mensagem.className = sucesso
        ? "alert alert-success"
        : "alert alert-danger";
}

// ==========================================
// 2. LIMPAR FOTO
// ==========================================

function limparFoto() {

    fotoInput.value = "";

    if (urlFotoAtual) {
        URL.revokeObjectURL(urlFotoAtual);
        urlFotoAtual = null;
    }

    fotoPreview.removeAttribute("src");
    fotoPreview.classList.add("d-none");

    fotoPlaceholder.classList.remove("d-none");
    fotoRemover.classList.add("d-none");

    fotoErro.textContent = "";
}

// ==========================================
// 3. VALIDAR FOTO
// ==========================================

function validarFoto(arquivo) {

    if (!arquivo) {
        return "Selecione uma foto do equipamento.";
    }

    if (!TIPOS_PERMITIDOS.includes(arquivo.type)) {
        return "Formato inválido. Use JPG, PNG ou WEBP.";
    }

    if (arquivo.size > MAX_SIZE) {
        return "A imagem deve possuir no máximo 5 MB.";
    }

    if (arquivo.size === 0) {
        return "O arquivo selecionado está vazio.";
    }

    return null;
}

// ==========================================
// 4. PRÉ-VISUALIZAÇÃO DA FOTO
// ==========================================

function mostrarPreview(arquivo) {

    const erro = validarFoto(arquivo);

    if (erro) {

        limparFoto();

        fotoErro.textContent = erro;

        return;
    }

    fotoErro.textContent = "";

    if (urlFotoAtual) {
        URL.revokeObjectURL(urlFotoAtual);
    }

    urlFotoAtual = URL.createObjectURL(arquivo);

    fotoPreview.src = urlFotoAtual;

    fotoPreview.classList.remove("d-none");
    fotoPlaceholder.classList.add("d-none");
    fotoRemover.classList.remove("d-none");
}

fotoInput.addEventListener("change", () => {

    const arquivo = fotoInput.files[0];

    if (!arquivo) {
        limparFoto();
        return;
    }

    mostrarPreview(arquivo);
});

// ==========================================
// 5. DRAG AND DROP
// ==========================================

["dragenter", "dragover", "dragleave", "drop"]
    .forEach(evento => {

        dropZone.addEventListener(evento, e => {

            e.preventDefault();
            e.stopPropagation();

        });
    });

// Destacar área ao arrastar imagem

["dragenter", "dragover"].forEach(evento => {

    dropZone.addEventListener(evento, () => {

        if (enviando) return;

        dropZone.style.backgroundColor = "#e2e8f0";
        dropZone.style.borderColor = "#0284c7";

    });
});

// Restaurar aparência original

["dragleave", "drop"].forEach(evento => {

    dropZone.addEventListener(evento, () => {

        dropZone.style.backgroundColor = "#f8fafc";
        dropZone.style.borderColor = "#cbd5e1";

    });
});

// Receber imagem arrastada

dropZone.addEventListener("drop", evento => {

    if (enviando) return;

    const arquivo = evento.dataTransfer.files[0];

    if (!arquivo) return;

    const erro = validarFoto(arquivo);

    if (erro) {

        limparFoto();
        fotoErro.textContent = erro;

        return;
    }

    const transferencia = new DataTransfer();

    transferencia.items.add(arquivo);

    fotoInput.files = transferencia.files;

    mostrarPreview(arquivo);
});

// ==========================================
// 6. REMOVER FOTO
// ==========================================

fotoRemover.addEventListener("click", () => {

    if (!enviando) {
        limparFoto();
    }
});

// ==========================================
// 7. LIMPAR FORMULÁRIO
// ==========================================

form.addEventListener("reset", evento => {

    if (enviando) {
        evento.preventDefault();
        return;
    }

    limparFoto();

    mensagem.textContent = "";
    mensagem.className = "alert d-none";
});

// ==========================================
// 8. VALIDAR FORMULÁRIO
// ==========================================

function validarFormulario() {

    if (!nome.value.trim()) {
        return "Informe o nome do equipamento.";
    }

    if (!patrimonio.value.trim()) {
        return "Informe o código de patrimônio.";
    }

    const qtd = Number(quantidade.value);

    if (!Number.isSafeInteger(qtd) || qtd < 1) {
        return "Informe uma quantidade inteira maior que zero.";
    }

    if (!categoria.value) {
        return "Selecione uma categoria.";
    }

    if (!estado.value) {
        return "Selecione o estado inicial.";
    }

    const erroFoto = validarFoto(fotoInput.files[0]);

    if (erroFoto) {
        return erroFoto;
    }

    return null;
}

// ==========================================
// 9. MONTAR DADOS DO COMPONENTE
// ==========================================

function montarDados() {

    // Objeto correspondente ao ComponentCreate
    const component = {

        component_id: patrimonio.value.trim(),

        name: nome.value.trim(),

        description:
            categoria.options[categoria.selectedIndex].text.trim(),

        quantity: Number(quantidade.value),

        state: estado.value,

        obs: observacoes.value.trim() || null

    };

    // Criar formulário multipart/form-data
    const dados = new FormData();

    // JSON enviado como string
    dados.append(
        "component",
        JSON.stringify(component)
    );

    // Arquivo da imagem
    dados.append(
        "file",
        fotoInput.files[0]
    );

    return dados;
}

// ==========================================
// 10. CONTROLAR FORMULÁRIO
// ==========================================

function controlarFormulario(desabilitado) {

    form.querySelectorAll(
        "input, select, textarea, button"
    ).forEach(elemento => {

        elemento.disabled = desabilitado;

    });

    btnSalvar.textContent = desabilitado
        ? "Salvando..."
        : "Salvar Equipamento";
}

// ==========================================
// 11. VERIFICAR ADMINISTRADOR
// ==========================================

async function verificarAdministrador() {

    const token = sessionStorage.getItem("access_token");

    if (!token) {

        window.location.replace("./login_admin.html");

        return false;
    }

    const usuario = await apiRequest(ROTA_USUARIO);

    if (
        !usuario.is_active ||
        String(usuario.role).toLowerCase() !== "admin"
    ) {

        mostrarMensagem(
            "Apenas administradores podem cadastrar equipamentos."
        );

        return false;
    }

    return true;
}

// ==========================================
// 12. CADASTRAR EQUIPAMENTO
// ==========================================

form.addEventListener("submit", async evento => {

    evento.preventDefault();

    if (enviando) return;

    mensagem.classList.add("d-none");

    // Validar formulário
    const erroValidacao = validarFormulario();

    if (erroValidacao) {

        mostrarMensagem(erroValidacao);

        return;
    }

    const dados = montarDados();

    const nomeEquipamento = nome.value.trim();

    enviando = true;

    controlarFormulario(true);

    try {

        // Verificar permissão administrativa
        const autorizado = await verificarAdministrador();

        if (!autorizado) return;

        // Exibir dados enviados no console
        console.log(
            "Dados do componente:",
            dados.get("component")
        );

        console.log(
            "Arquivo da imagem:",
            dados.get("file")
        );

        // Enviar JSON e imagem ao FastAPI
        const resposta = await apiRequest(
            ROTA_CADASTRO,
            {
                method: "POST",
                body: dados
            }
        );

        console.log(
            "Equipamento cadastrado:",
            resposta
        );

        // Liberar formulário antes de limpar
        enviando = false;

        controlarFormulario(false);

        form.reset();

        // Atualizar mensagem do modal
        document.getElementById(
            "mensagemSucesso"
        ).textContent =
            `O equipamento "${nomeEquipamento}" foi salvo e já está no sistema.`;

        // Mostrar sucesso somente após resposta da API
        modalSucesso.show();

    } catch (erro) {

        console.error(
            "Erro ao cadastrar equipamento:",
            erro
        );

        if (erro.status === 401) {

            sessionStorage.removeItem("access_token");

            window.location.replace("./login_admin.html");

            return;
        }

        mostrarMensagem(
            erro.message ||
            "Não foi possível cadastrar o equipamento."
        );

    } finally {

        enviando = false;

        controlarFormulario(false);
    }
});

// ==========================================
// 13. ENCERRAR SESSÃO
// ==========================================

document.getElementById("btnSair")
    .addEventListener("click", () => {

        sessionStorage.removeItem("access_token");

        window.location.replace("./login_admin.html");
    });

// ==========================================
// 14. INICIALIZAÇÃO
// ==========================================

async function iniciar() {

    controlarFormulario(true);

    btnSalvar.textContent = "Carregando...";

    try {

        const autorizado = await verificarAdministrador();

        if (!autorizado) return;

        controlarFormulario(false);

    } catch (erro) {

        console.error(
            "Erro ao verificar administrador:",
            erro
        );

        if (erro.status === 401) {

            sessionStorage.removeItem("access_token");

            window.location.replace("./login_admin.html");

            return;
        }

        mostrarMensagem(
            erro.message ||
            "Não foi possível verificar o administrador."
        );
    }
}

iniciar();