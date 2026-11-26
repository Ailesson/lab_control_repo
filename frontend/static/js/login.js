import { apiRequest } from "./api.js";

const PAGINAS = {
  admin: "./painel-admin.html",
  control: "./painel.html", // provisório: definir permissões e painel desse perfil
  user: "./painel.html"
};

const form = document.getElementById("form-login");
const btnEntrar = document.getElementById("btn-entrar");
const erroLogin = document.getElementById("erro-login");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  erroLogin.textContent = "";
  erroLogin.classList.add("d-none");

  const identificador = document.getElementById("identificador").value.trim();
  const password = document.getElementById("senha").value;
  const loginPorEmail = identificador.includes("@");

  // /auth/login/matricula é uma ROTA FUTURA; não consta no OpenAPI atual.
  const endpoint = loginPorEmail ? "/auth/login/json" : "/auth/login/matricula";
  const body = loginPorEmail
    ? { email: identificador, password }
    : { matricula: identificador, password };

  btnEntrar.disabled = true;
  btnEntrar.textContent = "ENTRANDO...";
  sessionStorage.removeItem("access_token");

  try {
    const token = await apiRequest(endpoint, {
      method: "POST",
      body: JSON.stringify(body)
    });

    if (!token?.access_token) throw new Error("A API não retornou um token de acesso.");

    sessionStorage.setItem("access_token", token.access_token);

    const usuario = await apiRequest("/user/me");
    if (!usuario?.is_active) throw new Error("Usuário inativo. Contate o administrador.");

    const proximaPagina = PAGINAS[usuario.role];
    if (!proximaPagina) throw new Error(`Perfil não configurado: ${usuario.role}`);

    window.location.assign(proximaPagina);
  } catch (error) {
    sessionStorage.removeItem("access_token");
    erroLogin.textContent = !loginPorEmail && error.status === 404
      ? "Login por matrícula ainda não está disponível no backend. Use seu e-mail por enquanto."
      : error.status === 401
        ? "Credenciais inválidas. Confira seu usuário e senha."
        : error.message;
    erroLogin.classList.remove("d-none");
    btnEntrar.disabled = false;
    btnEntrar.textContent = "ENTRAR";
  }
});
