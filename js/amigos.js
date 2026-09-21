(() => {
"use strict";
const C = window.Cinepop;
let mode = "todos", offset = 0, request = 0;
async function load() {
    const ticket = ++request;
    C.message("Carregando pessoas...");
    try {
        await C.ready;
        const term = C.$("#busca-pessoas").value.trim().toLowerCase();
        if (term && !/^[a-z0-9._]+$/.test(term)) throw new Error("Pesquise pelo nome de usuário: letras, números, ponto ou _.");
        let ids = null;
        let follows = [];
        if (C.user) follows = await C.all(() => db.from("seguidores").select("id,seguido_id").eq("seguidor_id", C.user.id).order("id"));
        if (mode === "seguindo") { C.requireUser(); ids = follows.map(row => row.seguido_id); }
        if (mode === "seguidores") {
            C.requireUser();
            ids = (await C.all(() => db.from("seguidores").select("id,seguidor_id").eq("seguido_id", C.user.id).order("id"))).map(row => row.seguidor_id);
        }
        let profiles;
        if (ids) {
            // Dividir os IDs evita URLs maiores que o limite do servidor.
            const found = [];
            for (let i = 0; i < ids.length; i += 100) {
                let query = db.from("perfis").select("id,nome,username,bio").in("id", ids.slice(i, i + 100)).order("username");
                if (term) query = query.ilike("username", "%" + term.replace(/_/g, "\\_") + "%");
                found.push(...await C.query(query));
            }
            found.sort((a,b) => a.username.localeCompare(b.username));
            profiles = found.slice(offset, offset + 21);
        } else {
            let query = db.from("perfis").select("id,nome,username,bio").order("username").range(offset, offset + 20);
            if (term) query = query.ilike("username", "%" + term.replace(/_/g, "\\_") + "%");
            profiles = await C.query(query);
        }
        if (ticket !== request) return;
        C.$("#proximas-pessoas").disabled = profiles.length <= 20;
        C.$("#pessoas-anteriores").disabled = offset === 0;
        profiles = profiles.slice(0,20);
        C.$("#pessoas").innerHTML = profiles.length ? profiles.map(profile =>
            '<article class="painel pessoa"><div><a href="' + C.profileLink(profile.id) + '"><h2>@' + C.escape(profile.username) +
            '</h2></a><p>' + C.escape(profile.nome || "") + '</p><p>' + C.escape(profile.bio || "") + '</p></div>' +
            (C.user && profile.id !== C.user.id ? '<button class="btn-secundario" data-follow="' + profile.id + '"></button>' : '') +
            '</article>').join("") : '<p class="vazio">Nenhuma pessoa encontrada. Perfis privados não aparecem na busca.</p>';
        C.$("#pessoas").querySelectorAll("[data-follow]").forEach(button =>
            C.followButton(button, button.dataset.follow, follows.some(row => row.seguido_id === button.dataset.follow)));
        C.message("");
    } catch (error) { if (ticket === request) C.message(C.error(error), true); }
}
C.$("#form-pessoas").onsubmit = event => { event.preventDefault(); offset = 0; load(); };
C.$("#filtro-pessoas").onchange = event => { mode = event.target.value; offset = 0; load(); };
C.$("#proximas-pessoas").onclick = () => { offset += 20; load(); };
C.$("#pessoas-anteriores").onclick = () => { offset = Math.max(0, offset - 20); load(); };
load();
})();