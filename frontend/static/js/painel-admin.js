import { apiRequest } from "./api.js";

// Configurações
const LOGIN_ADMIN_URL = "./login_admin.html";
const PAINEL_ALUNO_URL = "./painel.html";

// Elementos do HTML
const nomeAdmin = document.getElementById("nomeAdmin");
const btnSairAdmin = document.getElementById("btnSairAdmin");
const modulosAdmin = document.querySelectorAll(".card-menu a");

// Habilita ou desabilita os módulos administrativos
function controlarModulos(habilitado) {
    modulosAdmin.forEach(link => {
        link.classList.toggle("disabled", !habilitado);
        link.setAttribute("aria-disabled", String(!habilitado));

        if (habilitado) {
            link.removeAttribute("tabindex");
        } else {
            link.setAttribute("tabindex", "-1");
        }
    });
}

// Encerra a sessão
function encerrarSessao() {
    sessionStorage.removeItem("access_token");
    window.location.replace(LOGIN_ADMIN_URL);
}

// Evento de logout
btnSairAdmin.addEventListener("click", encerrarSessao);

// Impede acesso aos módulos antes da autenticação
modulosAdmin.forEach(link => {
    link.addEventListener("click", evento => {
        if (link.classList.contains("disabled")) {
            evento.preventDefault();
        }
    });
});

// Verifica o administrador autenticado
async function carregarAdministrador() {

    controlarModulos(false);

    nomeAdmin.textContent = "Carregando...";

    const token = sessionStorage.getItem("access_token");

    if (!token) {
        encerrarSessao();
        return;
    }

    try {

        // Busca os dados do usuário autenticado
        const usuario = await apiRequest("/user/me");

        console.log("Administrador autenticado:", usuario);

        // Verifica se o usuário está ativo
        if (!usuario?.is_active) {
            encerrarSessao();
            return;
        }

        // Verifica a permissão administrativa
        if (usuario.role !== "admin") {
            window.location.replace(PAINEL_ALUNO_URL);
            return;
        }

        // Exibe o nome real na navbar
        nomeAdmin.textContent =
            `Olá, ${usuario.name || "Administrador"}`;

        // Libera os módulos administrativos
        controlarModulos(true);

    } catch (erro) {

        console.error(
            "Erro ao carregar administrador:",
            erro
        );

        if (erro.status === 401 || erro.status === 403) {
            encerrarSessao();
            return;
        }

        nomeAdmin.textContent = "Erro ao carregar perfil";

        controlarModulos(false);

    }
}

// Inicialização
carregarAdministrador();