
import { apiRequest } from "./api.js";

async function verificarAdministrador() {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
        window.location.replace("./login_admin.html");
        return;
    }

    try {
        const usuario = await apiRequest("/user/me");

        if (!usuario.is_active || usuario.role !== "admin") {  
            throw new Error("Acesso não autorizado.");
        }

        console.log("Acesso administrativo autorizado");

        // Aqui podemos iniciar o carregamento
        // dos dados administrativos.
        
    } catch (erro) {
        console.error(erro);

        sessionStorage.removeItem("access_token");
        window.location.replace("./login_admin.html");
    }
}

verificarAdministrador();
