(() => {
    "use strict";
    const C = window.Cinepop;
    let media, saved, watched = false, favorite = false, currentRating;
    // Alguns navegadores/servidores podem preservar o &amp; do atributo href na URL.
    // Aceitamos ambos os formatos para que um card sempre abra o título correto.
    const tipo = C.params.get("tipo") || C.params.get("amp;tipo");
    const id = C.params.get("id") || C.params.get("amp;id");
    async function summary() {
        if (!saved) { C.$("#media-comunidade").textContent = "Sem avaliações"; return; }
        const rows = await C.query(db.rpc("cinepop_resumo_midia", { p_midia_id: saved.id }));
        const result = rows[0];
        C.$("#media-comunidade").textContent = Number(result?.total) > 0
            ? Number(result.media).toFixed(1) + "/5 · " + result.total + " avaliações" : "Sem avaliações";
        const reviews = await C.query(db.from("avaliacoes").select("id,nota,review,contem_spoiler,created_at,perfil:perfis!usuario_id(id,username)")
            .eq("midia_id", saved.id).order("created_at", { ascending: false }).limit(30));
        const ids = reviews.map(review => review.id);
        const [likes, comments] = ids.length ? await Promise.all([
            C.all(() => db.from("likes_avaliacoes").select("id,avaliacao_id,usuario_id").in("avaliacao_id", ids)),
            C.all(() => db.from("comentarios").select("id,avaliacao_id,texto,created_at,perfil:perfis!usuario_id(username)").in("avaliacao_id", ids).order("created_at"))
        ]) : [[], []];
        const likesByReview = new Map(ids.map(reviewId => [reviewId, []]));
        const commentsByReview = new Map(ids.map(reviewId => [reviewId, []]));
        likes.forEach(like => likesByReview.get(like.avaliacao_id)?.push(like));
        comments.forEach(comment => commentsByReview.get(comment.avaliacao_id)?.push(comment));
        C.$("#reviews").innerHTML = reviews.length ? reviews.map(row => {
            const text = '<p class="texto-livre">' + C.escape(row.review || "Sem comentário.") + '</p>';
            const reviewLikes = likesByReview.get(row.id) || [];
            const liked = reviewLikes.some(like => like.usuario_id === C.user?.id);
            const reviewComments = commentsByReview.get(row.id) || [];
            const when = new Date(row.created_at);
            const date = Number.isNaN(when.getTime()) ? "" : '<span class="data-avaliacao">Avaliado em ' + when.toLocaleDateString("pt-BR") + '</span>';
            return '<article class="painel"><a href="' + C.escape(C.profileLink(row.perfil?.id || "")) + '">@' +
                C.escape(row.perfil?.username || "usuário") + '</a><strong class="nota"> ' + Number(row.nota).toFixed(1) + '/5</strong>' + date +
                (row.contem_spoiler ? '<details><summary>Contém spoiler — mostrar</summary>' + text + '</details>' : text) +
                '<div class="acoes review-acoes"><button class="btn-secundario" data-like="' + row.id + '" aria-pressed="' + liked + '">' + (liked ? '♥ Curtido' : '♡ Curtir') + ' · ' + reviewLikes.length + '</button></div>' +
                '<details><summary>' + reviewComments.length + ' comentário' + (reviewComments.length === 1 ? '' : 's') + '</summary><div class="comentarios">' + reviewComments.map(comment => '<p><strong>@' + C.escape(comment.perfil?.username || 'usuário') + '</strong> ' + C.escape(comment.texto) + '</p>').join('') +
                (C.user ? '<form class="form-comentario" data-review="' + row.id + '"><input maxlength="1000" required placeholder="Escreva um comentário"><button class="btn-secundario">Enviar</button></form>' : '<p class="muted">Entre para comentar.</p>') + '</div></details></article>';
        }).join("") : '<p class="vazio">Seja a primeira pessoa a avaliar.</p>';
        C.$("#reviews").querySelectorAll("[data-like]").forEach(button => button.onclick = () => C.action(button, async () => {
            const user = C.requireUser(), reviewId = Number(button.dataset.like), active = button.getAttribute("aria-pressed") === "true";
            if (active) await C.query(db.from("likes_avaliacoes").delete().eq("usuario_id", user.id).eq("avaliacao_id", reviewId));
            else await C.query(db.from("likes_avaliacoes").insert({usuario_id:user.id, avaliacao_id:reviewId}));
            await summary();
        }));
        C.$("#reviews").querySelectorAll(".form-comentario").forEach(form => form.onsubmit = event => {
            event.preventDefault(); C.action(form.querySelector("button"), async () => {
                const text = form.querySelector("input").value.trim(); if (!text) throw new Error("Escreva um comentário.");
                await C.query(db.from("comentarios").insert({usuario_id:C.requireUser().id, avaliacao_id:Number(form.dataset.review), texto:text})); await summary();
            });
        });
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
        C.tmdb("/" + tipo + "/" + id + "/credits").then(credits => {
            const cast = (credits.cast || []).slice(0, 10);
            C.$("#elenco").innerHTML = cast.length ? cast.map(person =>
                '<article class="pessoa-elenco">' + (person.profile_path ? '<img loading="lazy" src="https://image.tmdb.org/t/p/w185' + C.escape(person.profile_path) + '" alt="">' : '<div class="sem-foto">Sem foto</div>') +
                '<a href="pessoa.html?id=' + encodeURIComponent(person.id) + '"><strong>' + C.escape(person.name) + '</strong><span>' + C.escape(person.character || "Elenco") + '</span></a></article>').join("") : '<p class="vazio">Elenco indisponível.</p>';
        }).catch(() => { C.$("#elenco").innerHTML = '<p class="vazio">Elenco indisponível.</p>'; });
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
            const date = C.$("#data-assistido").value;
            if (date) await C.query(db.from("diario").insert({ usuario_id:user.id, midia_id:saved.id, data_assistido:date, reassistido:C.$("#reassistido").checked }));
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
    C.$("#data-assistido").value = new Date().toISOString().slice(0, 10);
    init().catch(error => C.message(C.error(error), true));
})();
