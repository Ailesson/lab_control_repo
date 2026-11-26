// Cadastro FEEC — frontend estático + FastAPI.
// Não adicione outro listener de submit ou outra máscara ao HTML.
const API_URL = "http://127.0.0.1:8000";
const form = document.getElementById("form-cadastro");
const mensagem = document.getElementById("mensagem-cadastro");

// Altere para true somente DEPOIS de adicionar `vinculo` ao UserCreate,
// ao modelo SQLAlchemy, ao service de cadastro e à migração Alembic.
const ENVIAR_VINCULO = false;

if (!form || !mensagem) {
  console.error("Cadastro: faltam form-cadastro ou mensagem-cadastro no HTML.");
} else {
  const campo = id => {
    const elemento = document.getElementById(id);
    if (!elemento) throw new Error(`Campo não encontrado no HTML: ${id}`);
    return elemento;
  };

  const apenasDigitos = valor => String(valor).replace(/\D/g, "");

  function cpfValido(valor) {
    const cpf = apenasDigitos(valor);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    for (let pos = 9; pos <= 10; pos++) {
      let soma = 0;
      for (let i = 0; i < pos; i++) soma += Number(cpf[i]) * (pos + 1 - i);
      const digito = (soma * 10) % 11;
      if ((digito === 10 ? 0 : digito) !== Number(cpf[pos])) return false;
    }
    return true;
  }

  function mostrarMensagem(texto, tipo = "danger") {
    mensagem.textContent = texto;
    mensagem.className = `alert alert-${tipo} mt-3`;
  }

  async function enviarCadastro(dados) {
    const resposta = await fetch(`${API_URL}/user/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });

    const corpo = await resposta.json().catch(() => null);
    if (resposta.ok) return corpo;

    let detalhe = `Falha no cadastro (HTTP ${resposta.status}).`;
    if (typeof corpo?.detail === "string") {
      detalhe = corpo.detail;
    } else if (Array.isArray(corpo?.detail)) {
      detalhe = corpo.detail.map(erro => {
        const local = (erro.loc || []).filter(p => p !== "body").join(".");
        return `${local || "Campo"}: ${erro.msg}`;
      }).join(" | ");
    }
    throw new Error(detalhe);
  }

  form.addEventListener("submit", async evento => {
    evento.preventDefault();
    mensagem.classList.add("d-none");

    const botao = form.querySelector('button[type="submit"]');
    const textoBotao = botao?.textContent || "Finalizar Cadastro";

    try {
      const name = campo("nome").value.trim();
      const cpf = apenasDigitos(campo("cpf").value);
      const telefone = apenasDigitos(campo("telefone").value);
      const matricula = campo("matricula").value.trim();
      const vinculo = campo("vinculo").value;
      const email = campo("email").value.trim().toLowerCase();
      const confirmaEmail = campo("confirma_email").value.trim().toLowerCase();
      const password = campo("senha").value;
      const confirmaSenha = campo("confirma_senha").value;

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (!name || !matricula || !vinculo || !email || !password) {
        throw new Error("Preencha todos os campos obrigatórios.");
      }
      if (!cpfValido(cpf)) throw new Error("CPF inválido.");
      if (![10, 11].includes(telefone.length)) {
        throw new Error("Informe telefone com DDD (10 ou 11 dígitos).");
      }
      if (email !== confirmaEmail) throw new Error("Os e-mails não coincidem.");
      if (password !== confirmaSenha) throw new Error("As senhas não coincidem.");

      // Nome das chaves deve coincidir com UserCreate no FastAPI.
      // Matrícula é string, preservando zeros à esquerda.
      const dados = { name, email, cpf, telefone, matricula, password };
      if (ENVIAR_VINCULO) dados.vinculo = vinculo;

      if (botao) {
        botao.disabled = true;
        botao.textContent = "CADASTRANDO...";
      }
      await enviarCadastro(dados);
      form.reset();
      mostrarMensagem(
        ENVIAR_VINCULO
          ? "Cadastro realizado! Você já pode fazer login."
          : "Cadastro realizado! Você já pode fazer login. O vínculo com a UFAM ainda não foi registrado.",
        "success"
      );
      // Evitar registrar senha, CPF, telefone ou conteúdo do payload no Console.
    } catch (erro) {
      mostrarMensagem(erro.message || "Não foi possível realizar o cadastro.");
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = textoBotao;
      }
    }
  });
}
