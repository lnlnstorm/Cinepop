(() => {
"use strict";
const token = window.CINEPOP_CONFIG?.TMDB_TOKEN;
const C = window.Cinepop;
C.tmdb = async (path, params = {}) => {
    if (!token || token === "COLE_SEU_TOKEN_DE_LEITURA_DO_TMDB") throw new Error("O catálogo ainda não foi configurado.");
    const url = new URL("https://api.themoviedb.org/3" + path);
    url.search = new URLSearchParams({language:"pt-BR", ...params});
    let response;
    try {
        response = await fetch(url, {headers:{Authorization:"Bearer " + token, accept:"application/json"}, signal:AbortSignal.timeout(15000)});
    } catch { throw new Error("Não foi possível conectar ao catálogo. Verifique sua conexão e tente novamente."); }
    if (!response.ok) {
        if (response.status === 404) throw new Error("Este título não foi encontrado.");
        if (response.status === 429) throw new Error("O catálogo recebeu muitas consultas. Tente novamente em instantes.");
        throw new Error("O catálogo está indisponível no momento. Tente novamente mais tarde.");
    }
    return response.json();
};
})();