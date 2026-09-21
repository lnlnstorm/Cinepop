(() => {
"use strict";
const C = window.Cinepop;
const tipo = document.body.dataset.tipo || "movie";
let page = 1, totalPages = 1, query = "", sequence = 0;
async function load(append = false) {
    const request = ++sequence;
    const button = C.$("#carregar-mais");
    button.disabled = true;
    C.message("Carregando títulos...");
    try {
        const data = await C.tmdb(query ? "/search/" + tipo : "/trending/" + tipo + "/week", {page, ...(query ? {query, include_adult: false} : {})});
        if (request !== sequence) return;
        const markup = data.results.map(media => C.card(C.normalize(media, tipo),
            media.vote_average ? "TMDB: " + media.vote_average.toFixed(1) + "/10" : "")).join("");
        if (append) C.$("#catalogo").insertAdjacentHTML("beforeend", markup);
        else C.$("#catalogo").innerHTML = markup || '<p class="vazio">Nenhum resultado. Tente outro nome.</p>';
        totalPages = Math.min(data.total_pages, 500);
        button.hidden = page >= totalPages;
        C.$("#titulo-catalogo").textContent = query ? 'Resultados para “' + query + '”' : "Em alta nesta semana";
        C.message("");
    } catch (error) {
        if (request === sequence) { if (append) page--; C.message(C.error(error), true); }
    } finally { if (request === sequence) button.disabled = false; }
}
C.$("#form-pesquisa").addEventListener("submit", event => {
    event.preventDefault(); query = C.$("#pesquisa").value.trim(); page = 1; load();
});
C.$("#carregar-mais").onclick = () => { page++; load(true); };
load();
})();