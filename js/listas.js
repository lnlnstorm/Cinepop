(() => {
"use strict";
const C = window.Cinepop;
const id = C.params.get("id");
let list;
const tagsFrom = value => [...new Set(value.split(/[\s,]+/).map(tag => tag.trim().replace(/^#/,"").toLowerCase()).filter(tag => /^[a-z0-9áàâãéêíóôõúç_-]{1,30}$/i.test(tag)))].slice(0, 10);
async function collection() {
    const mine = C.$("#somente-minhas").checked;
    let query = () => {
        let q = db.from("listas").select("*").order("id", {ascending:false});
        if (mine) q = q.eq("usuario_id", C.requireUser().id);
        return q;
    };
    const lists = await C.all(query);
    C.$("#colecao-listas").innerHTML = lists.length ? lists.map(C.listCard).join("") : '<p class="vazio">Nenhuma lista por aqui. Crie a sua primeira lista.</p>';
}
async function items() {
    const rows = await C.all(() => db.from("lista_midias").select("id,midia:midias(*)").eq("lista_id", id).order("posicao", {nullsFirst:false}).order("id"));
    C.$("#itens-lista").innerHTML = rows.length ? rows.filter(row => row.midia).map(row =>
        '<div>' + C.card(row.midia) + (C.user?.id === list.usuario_id ? '<button class="btn-secundario remover-item" data-id="' + row.id + '">Remover da lista</button>' : '') + '</div>').join("") :
        '<p class="vazio">Esta lista está vazia. Abra um filme ou série para adicionar.</p>';
    C.$("#contagem-lista").textContent = rows.length === 1 ? "1 título nesta lista" : rows.length + " títulos nesta lista";
    C.$("#itens-lista").querySelectorAll(".remover-item").forEach(button => {
        button.onclick = () => C.action(button, async () => {
            await C.query(db.from("lista_midias").delete().eq("id", button.dataset.id).eq("lista_id", id));
            await items(); C.message("Título removido.");
        });
    });
}
function showList() {
    C.$("#titulo-lista").textContent = list.titulo;
    C.$("#descricao-lista").textContent = list.descricao || "Sem descrição.";
    C.$("#visibilidade-lista").textContent = list.publica ? "Lista pública" : "Lista privada";
    document.title = list.titulo + " | Cinepop";
}
async function init() {
    await C.ready;
    if (!id) {
        C.$("#pagina-listas").hidden = false;
        C.$("#criar-lista").hidden = !C.user;
        C.$("#filtro-minhas").hidden = !C.user;
        await collection();
        return;
    }
    if (!/^[1-9]\d*$/.test(id)) throw new Error("Lista inválida.");
    list = await C.query(db.from("listas").select("*").eq("id", id).maybeSingle());
    if (!list) throw new Error("Esta lista é privada ou não foi encontrada.");
    C.$("#pagina-lista").hidden = false; showList();
    C.$("#autor-lista").href = C.profileLink(list.usuario_id);
    if (C.user?.id === list.usuario_id) {
        C.$("#editar-lista").hidden = false;
        C.$("#titulo-edicao").value = list.titulo;
        C.$("#descricao-edicao").value = list.descricao || "";
        C.$("#tags-edicao").value = (list.tags || []).map(tag => "#" + tag).join(" ");
        C.$("#publica-edicao").checked = list.publica;
    }
    await items();
}
C.$("#form-criar-lista").onsubmit = event => {
    event.preventDefault();
    C.action(C.$("#criar-lista-btn"), async () => {
        const user = C.requireUser();
        const titulo = C.$("#titulo-nova-lista").value.trim();
        if (!titulo) throw new Error("Digite o título da lista.");
        const created = await C.query(db.from("listas").insert({usuario_id:user.id, titulo,
            descricao:C.$("#descricao-nova-lista").value.trim(), tags:tagsFrom(C.$("#tags-nova-lista").value), publica:C.$("#publica-nova-lista").checked}).select().single());
        location.href = "lista.html?id=" + created.id;
    });
};
C.$("#somente-minhas").onchange = () => collection().catch(error => C.message(C.error(error), true));
C.$("#form-editar-lista").onsubmit = event => {
    event.preventDefault();
    C.action(C.$("#salvar-lista"), async () => {
        const titulo = C.$("#titulo-edicao").value.trim();
        if (!titulo) throw new Error("Digite o título da lista.");
        list = await C.query(db.from("listas").update({titulo, descricao:C.$("#descricao-edicao").value.trim(), tags:tagsFrom(C.$("#tags-edicao").value),
            publica:C.$("#publica-edicao").checked}).eq("id", id).eq("usuario_id", C.requireUser().id).select().single());
        showList(); C.message("Lista atualizada.");
    });
};
C.$("#excluir-lista").onclick = event => C.action(event.currentTarget, async () => {
    if (!confirm("Excluir esta lista e seus itens?")) return;
    await C.query(db.from("listas").delete().eq("id", id).eq("usuario_id", C.requireUser().id));
    location.href = "lista.html";
});
init().catch(error => C.message(C.error(error), true));
})();
