(() => {
    "use strict";
    const C = window.Cinepop;
    const targetProfile = C.params.get("perfil");
    let mode = ["seguidores","seguindo"].includes(C.params.get("modo")) ? C.params.get("modo") : "todos", offset = 0, request = 0;
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
            if (mode === "seguindo") { const owner = targetProfile || C.requireUser().id; ids = (await C.all(() => db.from("seguidores").select("seguido_id").eq("seguidor_id", owner))).map(row => row.seguido_id); }
            if (mode === "seguidores") {
                const owner = targetProfile || C.requireUser().id;
                ids = (await C.all(() => db.from("seguidores").select("id,seguidor_id").eq("seguido_id", owner).order("id"))).map(row => row.seguidor_id);
            }
            let profiles;
            if (ids) {
                // Dividir os IDs evita URLs maiores que o limite do servidor.
                const found = [];
                for (let i = 0; i < ids.length; i += 100) {
                    let query = db.from("perfis").select("id,nome,username,bio,avatar_url").in("id", ids.slice(i, i + 100)).order("username");
                    if (term) query = query.ilike("username", "%" + term.replace(/_/g, "\\_") + "%");
                    found.push(...await C.query(query));
                }
                found.sort((a, b) => a.username.localeCompare(b.username));
                profiles = found.slice(offset, offset + 21);
            } else {
                let query = db.from("perfis").select("id,nome,username,bio,avatar_url").order("username").range(offset, offset + 20);
                if (term) query = query.ilike("username", "%" + term.replace(/_/g, "\\_") + "%");
                profiles = await C.query(query);
            }
            if (ticket !== request) return;
            C.$("#proximas-pessoas").disabled = profiles.length <= 20;
            C.$("#pessoas-anteriores").disabled = offset === 0;
            profiles = profiles.slice(0, 20);
            profiles = await Promise.all(profiles.map(async profile => {
                if (profile.avatar_url?.startsWith("avatars/")) { try { profile.avatar = (await C.query(db.storage.from("avatars").createSignedUrl(profile.avatar_url.slice(8), 300))).signedUrl; } catch {} }
                else profile.avatar = profile.avatar_url;
                return profile;
            }));
            C.$("#pessoas").innerHTML = profiles.length ? profiles.map(profile =>
                '<article class="painel pessoa">' + (profile.avatar ? '<img class="avatar-mini" src="' + C.escape(profile.avatar) + '" alt="">' : '<span class="avatar-mini avatar-iniciais">' + C.escape((profile.nome || profile.username).slice(0,1).toUpperCase()) + '</span>') + '<div><a href="' + C.profileLink(profile.id) + '"><h2>@' + C.escape(profile.username) +
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
    if (targetProfile) { C.$("#filtro-pessoas").value = mode; C.$("#filtro-pessoas").hidden = true; C.$("#form-pessoas label").textContent = mode === "seguidores" ? "Seguidores" : "Seguindo"; }
    load();
})();
