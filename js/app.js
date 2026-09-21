(() => {
    "use strict";
    const C = window.Cinepop = {};
    C.$ = (selector, root = document) => root.querySelector(selector);
    C.escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    C.params = new URLSearchParams(location.search);
    C.message = (text = "", error = false, target = "#status") => {
        const node = C.$(target);
        if (node) { node.textContent = text; node.className = "status" + (error ? " erro" : ""); }
    };
    C.error = error => {
        console.error(error);
        if (error?.code === "23505") return "Este registro já existe. Atualize a página para conferir.";
        if (["42501", "PGRST202", "42P01", "42703"].includes(error?.code)) return "Não foi possível acessar este recurso. A configuração do banco precisa ser conferida.";
        if (typeof error?.message === "string" && error.message.trim()) return error.message;
        return error instanceof Error ? error.message : "Não foi possível concluir. Verifique sua conexão e tente novamente.";
    };
    C.query = async query => {
        const result = await query;
        if (result.error) throw result.error;
        return result.data;
    };
    C.all = async makeQuery => {
        let rows = [];
        for (let offset = 0; ; offset += 500) {
            const page = await C.query(makeQuery().range(offset, offset + 499));
            rows.push(...page);
            if (page.length < 500) return rows;
        }
    };
    C.action = async (button, task, target = "#status") => {
        if (button?.disabled) return;
        if (button) button.disabled = true;
        C.message("", false, target);
        try { await task(); }
        catch (error) { C.message(C.error(error), true, target); }
        finally { if (button) button.disabled = false; }
    };
    C.requireUser = () => {
        if (C.user) return C.user;
        throw new Error("Entre na sua conta pelo menu para continuar.");
    };
    C.poster = path => typeof path === "string" && /^\/[a-zA-Z0-9._/-]+$/.test(path)
        ? "https://image.tmdb.org/t/p/w500" + path : "";
    C.mediaLink = media => "midia.html?" + new URLSearchParams({ tipo: media.tipo, id: media.tmdb_id });
    C.profileLink = id => "perfil.html?" + new URLSearchParams({ id });
    C.card = (media, detail = "") => {
        const poster = C.poster(media.poster_path);
        return '<a class="card-filme" href="' + C.escape(C.mediaLink(media)) + '">' +
            (poster ? '<img loading="lazy" src="' + poster + '" alt="Pôster de ' + C.escape(media.titulo) + '">' : '<div class="sem-poster">Sem pôster</div>') +
            '<h3>' + C.escape(media.titulo) + '</h3><p>' + (media.tipo === "tv" ? "Série" : "Filme") +
            (media.data_lancamento ? " · " + C.escape(media.data_lancamento.slice(0, 4)) : "") +
            '</p>' + (detail ? '<p>' + C.escape(detail) + '</p>' : "") + '</a>';
    };
    C.grid = (node, records, empty = "Nenhum título por aqui ainda.") => {
        node.innerHTML = records.length ? records.map(row => C.card(row.midia || row,
            row.nota ? "Sua nota: " + Number(row.nota).toFixed(1) + "/5" : "")).join("") : '<p class="vazio">' + C.escape(empty) + '</p>';
    };
    C.normalize = (media, tipo) => ({
        tmdb_id: media.id, tipo, titulo: media.title || media.name,
        titulo_original: media.original_title || media.original_name || null,
        poster_path: media.poster_path || null, backdrop_path: media.backdrop_path || null,
        data_lancamento: media.release_date || media.first_air_date || null
    });
    C.ensureMedia = async media => {
        C.requireUser();
        const find = () => db.from("midias").select("*").eq("tmdb_id", media.tmdb_id).eq("tipo", media.tipo).maybeSingle();
        const existing = await C.query(find());
        if (existing) return existing;
        const result = await db.from("midias").insert(media).select().single();
        if (result.error?.code === "23505") return C.query(find());
        if (result.error) throw result.error;
        return result.data;
    };
    C.followButton = (button, id, following) => {
        button.textContent = following ? "Deixar de seguir" : "Seguir";
        button.setAttribute("aria-pressed", String(following));
        button.onclick = () => C.action(button, async () => {
            const user = C.requireUser();
            if (following) await C.query(db.from("seguidores").delete().eq("seguidor_id", user.id).eq("seguido_id", id));
            else await C.query(db.from("seguidores").insert({ seguidor_id: user.id, seguido_id: id }));
            C.followButton(button, id, !following);
            button.dispatchEvent(new CustomEvent("followchange"));
        });
    };
    C.listCard = list => '<article class="painel lista-card"><a href="lista.html?id=' + encodeURIComponent(list.id) + '"><h3>' +
        C.escape(list.titulo) + '</h3></a><p>' + C.escape(list.descricao || "Sem descrição.") +
        '</p><span class="etiqueta">' + (list.publica ? "Pública" : "Privada") + '</span>' +
        (list.tags?.length ? '<p class="tags-lista">' + list.tags.map(tag => '<span>#' + C.escape(tag) + '</span>').join('') + '</p>' : '') + '</article>';
    C.ready = (async () => {
        const header = C.$("#cabecalho");
        if (header) header.innerHTML = '<a class="logo" href="index.html">Cine<span>pop</span></a><nav aria-label="Navegação principal">' +
            '<a href="index.html">Filmes</a><a href="series.html">Séries</a><a href="lista.html">Listas</a><a href="amigos.html">Pessoas</a>' +
            '<a id="link-perfil" href="login.html">Entrar</a><button id="btn-sair" class="btn-secundario" hidden>Sair</button></nav>';
        C.user = null;
        try {
            if (typeof db === "undefined") throw new Error("Não foi possível conectar à conta. Recarregue a página.");
            const { data, error } = await db.auth.getSession();
            if (error) throw error;
            C.user = data.session?.user || null;
            if (C.user && header) {
                const perfil = await C.query(db.from("perfis").select("username").eq("id", C.user.id).maybeSingle());
                C.$("#link-perfil").textContent = perfil ? "@" + perfil.username : "Meu perfil";
                C.$("#link-perfil").href = "perfil.html";
                C.$("#btn-sair").hidden = false;
                C.$("#btn-sair").onclick = event => C.action(event.currentTarget, async () => {
                    await C.query(db.auth.signOut());
                    location.href = "login.html";
                });
            }
        } catch (error) { C.message(C.error(error), true); }
    })();
})();
