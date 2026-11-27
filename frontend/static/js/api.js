export const API_URL =  `http://${window.location.hostname}:8000`;

export async function apiRequest(endpoint, options = {}) {

    const headers = new Headers(options.headers || {});

    const token = sessionStorage.getItem("access_token");

    // ==========================================
    // AUTENTICAÇÃO JWT
    // ==========================================

    if (token && !headers.has("Authorization")) {

        headers.set("Authorization", `Bearer ${token}`);
    }

    // ==========================================
    // DEFINIR CONTENT-TYPE
    // ==========================================

    if (options.body instanceof FormData) {

        // O navegador define automaticamente
        // multipart/form-data e seu boundary.
        headers.delete("Content-Type");

    } else if (
        options.body &&
        !headers.has("Content-Type")
    ) {

        headers.set("Content-Type", "application/json");
    }

    // ==========================================
    // REALIZAR REQUISIÇÃO
    // ==========================================

    let response;

    try {

        response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

    } catch (erro) {

        console.error("Erro de conexão:", erro);

        throw new Error(
            "Não foi possível conectar ao FastAPI. " +
            "Verifique se a porta 8000 está ativa."
        );
    }

    // ==========================================
    // PROCESSAR RESPOSTA
    // ==========================================

    const data = response.status === 204
        ? null
        : await response.json().catch(() => null);

    // ==========================================
    // TRATAMENTO DE ERROS
    // ==========================================

    if (!response.ok) {

        const detail = data?.detail;

        const message = typeof detail === "string"

            ? detail

            : Array.isArray(detail)

                ? detail.map(item => {

                    const campo = item.loc
                        ?.filter(local =>
                            !["body", "query", "path"].includes(local)
                        )
                        .join(".");

                    return campo
                        ? `${campo}: ${item.msg}`
                        : item.msg;

                }).join("; ")

                : `Erro HTTP ${response.status}`;

        const error = new Error(message);

        error.status = response.status;
        error.detail = detail;
        error.data = data;

        throw error;
    }

    return data;
}