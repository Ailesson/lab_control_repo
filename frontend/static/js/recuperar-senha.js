import { apiRequest } from "./api.js";

// ==========================================
// ELEMENTOS DO HTML
// ==========================================

const formulario = document.getElementById("formRecuperarSenha");
const cpfInput = document.getElementById("cpf");
const mensagem = document.getElementById("mensagemRecuperacao");
const btnRecuperarSenha = document.getElementById("btnRecuperarSenha");

const themeToggleBtn = document.getElementById("themeToggle");
const body = document.body;

// ==========================================
// ROTAS DO BACKEND
// ==========================================

const ROTA_RECUPERACAO = "/user/senha/cpf";

// ==========================================
// 1. MÁSCARA DO CPF
// ==========================================

cpfInput.addEventListener("input", () => {

    let cpf = cpfInput.value.replace(/\D/g, "");

    cpf = cpf.slice(0, 11);

    cpf = cpf.replace(/(\d{3})(\d)/, "$1.$2");

    cpf = cpf.replace(/(\d{3})(\d)/, "$1.$2");

    cpf = cpf.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

    cpfInput.value = cpf;

    mensagem.className = "alert d-none";

    cpfInput.classList.remove("is-invalid");
});

// ==========================================
// 2. EXIBIR MENSAGENS
// ==========================================

function mostrarMensagem(texto, tipo = "success") {

    mensagem.className = `alert alert-${tipo}`;

    mensagem.textContent = texto;
}

const MENSAGEM_RECUPERACAO =
    "Caso exista uma conta vinculada ao CPF informado, " +
    "um link para redefinição de senha será enviado " +
    "ao e-mail cadastrado.";

// ==========================================
// 3. RECUPERAÇÃO DE SENHA
// ==========================================

formulario.addEventListener("submit", async evento => {

    evento.preventDefault();

    if (btnRecuperarSenha.disabled) return;

    // Remover pontos e traços do CPF
    const cpf = cpfInput.value.replace(/\D/g, "");

    if (cpf.length !== 11) {

        cpfInput.classList.add("is-invalid");

        mostrarMensagem(
            "Informe um CPF válido.",
            "warning"
        );

        return;
    }

    mensagem.className = "alert d-none";

    btnRecuperarSenha.disabled = true;
    btnRecuperarSenha.textContent = "Enviando...";
    cpfInput.disabled = true;

    try {

        await apiRequest(
            ROTA_RECUPERACAO,
            {
                method: "POST",
                body: JSON.stringify({
                    cpf: cpf
                })
            }
        );

        mostrarMensagem(
            "Caso exista uma conta vinculada ao CPF informado, " +
            "um link para redefinição de senha será enviado " +
            "ao e-mail cadastrado.",
            "success"
        );

        formulario.reset();

    } catch (erro) {

        if (erro.status === 429) {

            mostrarMensagem(
                "Muitas solicitações realizadas. Aguarde alguns minutos.",
                "warning"
            );

        } else {

            mostrarMensagem(
                "Não foi possível processar a solicitação. Tente novamente.",
                "danger"
            );
        }

    } finally {

        btnRecuperarSenha.disabled = false;
        btnRecuperarSenha.textContent = "Buscar Conta";
        cpfInput.disabled = false;
    }
});

// ==========================================
// 4. ATUALIZAR LOGOS CONFORME O TEMA
// ==========================================

function atualizarLogos() {

    const isLight = body.classList.contains("light-theme");

    const logos = document.querySelectorAll(
        "#logoUfam, #logoFeec, #logoPpgee"
    );

    logos.forEach(logo => {

        const novaSrc = isLight
            ? logo.getAttribute("data-light")
            : logo.getAttribute("data-dark");

        if (novaSrc) {

            logo.src = novaSrc;
        }
    });
}

// ==========================================
// 5. APLICAR TEMA SALVO
// ==========================================

if (localStorage.getItem("theme") === "light") {

    body.classList.add("light-theme");

    themeToggleBtn.innerHTML = "🌙";
}

atualizarLogos();

// ==========================================
// 6. ALTERNAR TEMA
// ==========================================

themeToggleBtn.addEventListener("click", () => {

    body.classList.toggle("light-theme");

    if (body.classList.contains("light-theme")) {

        localStorage.setItem("theme", "light");

        themeToggleBtn.innerHTML = "🌙";

    } else {

        localStorage.setItem("theme", "dark");

        themeToggleBtn.innerHTML = "☀️";
    }

    atualizarLogos();
});