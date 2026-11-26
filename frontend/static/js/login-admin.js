
import { apiRequest } from "./api.js";

// ==========================================
// 1. CONFIGURAÇÕES
// ==========================================

const PAGINA_ADMIN = "./painel_admin.html";

const form = document.getElementById("form-login-admin");
const identificadorInput = document.getElementById("emailAdmin");
const senhaInput = document.getElementById("senhaAdmin");
const erroLogin = document.getElementById("erroLoginAdmin");

const btnEntrar = form.querySelector('button[type="submit"]');

// ==========================================
// 2. FUNÇÕES AUXILIARES
// ==========================================

// Exibe mensagens de erro no formulário
function mostrarErro(mensagem) {
    erroLogin.textContent = mensagem;
    erroLogin.classList.remove("d-none");
}

// Limpa mensagens anteriores
function limparErro() {
    erroLogin.textContent = "";
    erroLogin.classList.add("d-none");
}

// Habilita ou desabilita o botão
function alterarCarregamento(carregando) {
    btnEntrar.disabled = carregando;

    btnEntrar.textContent = carregando
        ? "AUTENTICANDO..."
        : "ENTRAR NA ADMINISTRAÇÃO";
}

// ==========================================
// 3. EVENTO DE LOGIN
// ==========================================

form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    limparErro();

    const identificador = identificadorInput.value.trim();
    const password = senhaInput.value;

    if (!identificador || !password) {
        mostrarErro("Preencha seu identificador e senha.");
        return;
    }

    const loginPorEmail = identificador.includes("@");

    // O backend ainda não possui autenticação por SIAPE.
    if (!loginPorEmail) {
        mostrarErro(
            "O login por SIAPE ainda não está disponível. " +
            "Utilize seu e-mail institucional por enquanto."
        );
        return;
    }

    alterarCarregamento(true);

    // Evita reutilizar uma sessão anterior
    sessionStorage.removeItem("access_token");

    try {
        // ==================================
        // ETAPA 1: AUTENTICAÇÃO NO FASTAPI
        // ==================================

        console.log("Iniciando autenticação administrativa...");

        const resposta = await apiRequest("/auth/login/json", {
            method: "POST",
            body: JSON.stringify({
                email: identificador,
                password: password
            })
        });

        if (!resposta?.access_token) {
            throw new Error(
                "A API não retornou um token de acesso."
            );
        }

        sessionStorage.setItem(
            "access_token",
            resposta.access_token
        );

        console.log("Autenticação realizada.");

        // ==================================
        // ETAPA 2: VERIFICAR USUÁRIO
        // ==================================

        const usuario = await apiRequest("/user/me");

        if (!usuario?.is_active) {
            throw new Error(
                "Sua conta está inativa. Contate o administrador."
            );
        }

        // ==================================
        // ETAPA 3: VERIFICAR PERMISSÃO
        // ==================================

        if (usuario.role !== "admin") {
            throw new Error(
                "Acesso negado. Sua conta não possui " +
                "permissão de administrador."
            );
        }

        console.log("Administrador autorizado:", usuario.name);

        // ==================================
        // ETAPA 4: REDIRECIONAR
        // ==================================

        window.location.assign(PAGINA_ADMIN);

    } catch (erro) {
        console.error("Erro no login administrativo:", erro);

        sessionStorage.removeItem("access_token");

        if (erro.status === 401) {
            mostrarErro("E-mail ou senha inválidos.");
        } else {
            mostrarErro(
                erro.message || "Não foi possível realizar o login."
            );
        }

    } finally {
        alterarCarregamento(false);
    }
});
