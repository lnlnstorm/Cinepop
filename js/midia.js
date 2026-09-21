(() => {
    "use strict";
    const C = window.Cinepop;
    let media, saved, watched = false, favorite = false, currentRating;
    const tipo = C.params.get("tipo");
    const id = C.params.get("id");
    async function summary() {
        if (!saved) { C.$("#media-comunidade").textContent = "Sem avaliações"; return; }
        const rows = await C.query(db.rpc("cinepop_resumo_midia", { p_midia_id: saved.id }));
        const result = rows[0];
        C.$("#media-comunidade").textContent = Number(result?.total) > 0
            ? Number(result.media).toFixed(1) + "/5 · " + result.total + " avaliações" : "Sem avaliações";
        const reviews = await C.query(db.from("avaliacoes").select("id,nota,review,contem_spoiler,created_at,perfil:perfis!usuario_id(id,username)")
            .eq("midia_id", saved.id).order("created_at", { ascending: false }).limit(30));
        C.$("#reviews").innerHTML = reviews.length ? reviews.map(row => {
            const text = '<p class="texto-livre">' + C.escape(row.review || "Sem comentário.") + '</p>';
            return '<article class="painel"><a href="' + C.escape(C.profileLink(row.perfil?.id || "")) + '">@' +
                C.escape(row.perfil?.username || "usuário") + '</a><strong class="nota"> ' + Number(row.nota).toFixed(1) + '/5</strong>' +
                (row.contem_spoiler ? '<details><summary>Contém spoiler — mostrar</summary>' + text + '</details>' : text) + '</article>';
        }).join("") : '<p class="vazio">Seja a primeira pessoa a avaliar.</p>';
    }
    function states() {
        C.$("#watchlist").textContent = watched ? "Remover da watchlist" : "+ Watchlist";
        C.$("#watchlist").setAttribute("aria-pressed", String(watched));
        C.$("#favorito").textContent = favorite ? "Remover dos favoritos" : "♡ Favoritar";
        C.$("#favorito").setAttribute("aria-pressed", String(favorite));
        C.$("#excluir-avaliacao").hidden = !currentRating;
    }
    async function toggle(table, active) {
        const user = C.requireUser();
        saved = await C.ensureMedia(media);
        if (active) await C.query(db.from(table).delete().eq("usuario_id", user.id).eq("midia_id", saved.id));
        else await C.query(db.from(table).insert({ usuario_id: user.id, midia_id: saved.id }));
    }
    async function init() {
        if (!["movie", "tv"].includes(tipo) || !/^[1-9]\d*$/.test(id || "")) throw new Error("Título inválido. Escolha um filme ou série no catálogo.");
        const data = await C.tmdb("/" + tipo + "/" + id);
        media = C.normalize(data, tipo);
        document.title = media.titulo + " | Cinepop";
        C.$("#titulo").textContent = media.titulo;
        C.$("#sinopse").textContent = data.overview || "Sinopse indisponível.";
        C.$("#detalhes").textContent = [tipo === "movie" ? "Filme" : "Série", media.data_lancamento?.slice(0, 4),
        tipo === "movie" ? (data.runtime ? data.runtime + " min" : "") : data.number_of_seasons + " temporadas",
        data.genres?.map(item => item.name).join(", ")].filter(Boolean).join(" · ");
        C.$("#nota-tmdb").textContent = data.vote_average ? data.vote_average.toFixed(1) + "/10 no TMDB" : "Sem nota no TMDB";
        const poster = C.poster(media.poster_path);
        if (poster) { C.$("#poster").src = poster; C.$("#poster").alt = "Pôster de " + media.titulo; C.$("#poster").hidden = false; }
        C.$("#conteudo-midia").hidden = false;
        await C.ready;
        saved = await C.query(db.from("midias").select("*").eq("tmdb_id", id).eq("tipo", tipo).maybeSingle());
        if (C.user) {
            C.$("#acoes-usuario").hidden = false;
            if (saved) {
                const [watch, fav, rating] = await Promise.all([
                    C.query(db.from("watchlist").select("id").eq("usuario_id", C.user.id).eq("midia_id", saved.id).maybeSingle()),
                    C.query(db.from("favoritos").select("id").eq("usuario_id", C.user.id).eq("midia_id", saved.id).maybeSingle()),
                    C.query(db.from("avaliacoes").select("*").eq("usuario_id", C.user.id).eq("midia_id", saved.id).maybeSingle())
                ]);
                watched = !!watch; favorite = !!fav; currentRating = rating;
                if (rating) { C.$("#nota").value = rating.nota; C.$("#review").value = rating.review || ""; C.$("#spoiler").checked = rating.contem_spoiler; }
            }
            const lists = await C.all(() => db.from("listas").select("id,titulo").eq("usuario_id", C.user.id).order("id"));
            C.$("#lista-destino").innerHTML = '<option value="">Escolha uma lista</option>' + lists.map(list =>
                '<option value="' + list.id + '">' + C.escape(list.titulo) + '</option>').join("");
        } else C.$("#convite-login").hidden = false;
        states();
        await summary();
    }
    C.$("#watchlist").onclick = event => C.action(event.currentTarget, async () => { await toggle("watchlist", watched); watched = !watched; states(); C.message("Watchlist atualizada."); });
    C.$("#favorito").onclick = event => C.action(event.currentTarget, async () => { await toggle("favoritos", favorite); favorite = !favorite; states(); C.message("Favoritos atualizados."); });
    C.$("#form-avaliacao").onsubmit = event => {
        event.preventDefault();
        C.action(C.$("#salvar-avaliacao"), async () => {
            const user = C.requireUser();
            const nota = Number(C.$("#nota").value);
            if (nota < 0.5 || nota > 5 || nota * 2 !== Math.round(nota * 2)) throw new Error("Escolha uma nota de 0,5 a 5.");
            saved = await C.ensureMedia(media);
            currentRating = await C.query(db.from("avaliacoes").upsert({
                usuario_id: user.id, midia_id: saved.id, nota, review: C.$("#review").value.trim(),
                contem_spoiler: C.$("#spoiler").checked
            }, { onConflict: "usuario_id,midia_id" }).select().single());
            states(); await summary(); C.message("Avaliação salva!");
        });
    };
    C.$("#excluir-avaliacao").onclick = event => C.action(event.currentTarget, async () => {
        if (!confirm("Excluir sua avaliação deste título?")) return;
        await C.query(db.from("avaliacoes").delete().eq("id", currentRating.id).eq("usuario_id", C.requireUser().id));
        currentRating = null; C.$("#form-avaliacao").reset(); states(); await summary(); C.message("Avaliação excluída.");
    });
    C.$("#form-adicionar-lista").onsubmit = event => {
        event.preventDefault();
        C.action(C.$("#adicionar-lista"), async () => {
            C.requireUser();
            const lista_id = C.$("#lista-destino").value;
            if (!lista_id) throw new Error("Escolha uma lista primeiro.");
            saved = await C.ensureMedia(media);
            await C.query(db.from("lista_midias").insert({ lista_id, midia_id: saved.id }));
            C.message("Título adicionado à lista.");
        });
    };
    init().catch(error => C.message(C.error(error), true));
})();