
import { apiRequest } from "./api.js";

const form = document.getElementById("form-cadastro-material");
const mensagem = document.getElementById("mensagemCadastro");
const btnSalvar = form.querySelector('button[type="submit"]');

function mostrarMensagem(texto, sucesso = false) {
    mensagem.textContent = texto;
    mensagem.className = sucesso
        ? "alert alert-success"
        : "alert alert-danger";
}

// Cadastro do equipamento
form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagem.classList.add("d-none");

    const codigo = document.getElementById("patrimonio").value.trim();
    const nome = document.getElementById("nome_equipamento").value.trim();
    const quantidade = Number(document.getElementById("quantidade").value);
    const categoria = document.getElementById("categoria");
    const estado = document.getElementById("status").value;
    const observacoes = document.getElementById("observacoes").value.trim();

    const dados = {
        name: nome,
        component_id: codigo,
        quantity: quantidade,

        // Categoria armazenada na descrição,
        // pois ainda não há uma coluna category no modelo.
        description: categoria.options[categoria.selectedIndex].text,

        state: estado,
        obs: observacoes || null,
        is_active: estado === "disponivel"
    };

    btnSalvar.disabled = true;
    btnSalvar.textContent = "Salvando...";

    try {
        const usuario = await apiRequest("/user/me");

        if (!usuario.is_active || usuario.role !== "admin") {
            mostrarMensagem("Apenas administradores podem cadastrar equipamentos.");
            return;
        }

        await apiRequest("/component/", {
            method: "POST",
            body: JSON.stringify(dados)
        });

        mostrarMensagem("Equipamento cadastrado com sucesso!", true);
        form.reset();

    } catch (erro) {
        console.error("Erro ao cadastrar equipamento:", erro);

        mostrarMensagem(
            erro.message || "Não foi possível cadastrar o equipamento."
        );

    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = "Salvar Equipamento";
    }
});

// Encerrar sessão
document.getElementById("btnSair").addEventListener("click", () => {
    sessionStorage.removeItem("access_token");
    window.location.replace("./login_admin.html");
});
