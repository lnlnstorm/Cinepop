(() => {
    "use strict";
    const C = window.Cinepop;
    let profile, own, ratings = [], pendingPhoto = null, removePhoto = false, previewUrl = null;
    let selectedRating = null, photoVersion = 0, avatarVersion = 0;
    const formatNote = note => Number(note).toLocaleString("pt-BR", {maximumFractionDigits: 1});
    async function counts() {
        const [followers, following] = await Promise.all([
            db.from("seguidores").select("id", {count:"exact", head:true}).eq("seguido_id", profile.id),
            db.from("seguidores").select("id", {count:"exact", head:true}).eq("seguidor_id", profile.id)
        ]);
        if (followers.error) throw followers.error;
        if (following.error) throw following.error;
        C.$("#contagens").textContent = followers.count + " seguidores · " + following.count + " seguindo";
    }
    function initials() {
        return (profile.nome || profile.username).trim().split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase();
    }
    async function renderProfile() {
        const version = ++avatarVersion;
        C.$("#nome-perfil").textContent = profile.nome || profile.username;
        C.$("#username-perfil").textContent = "@" + profile.username;
        C.$("#bio-perfil").textContent = profile.bio || "Ainda sem biografia.";
        C.$("#avatar-iniciais").textContent = initials();
        C.$("#avatar-iniciais").hidden = false;
        const avatar = C.$("#avatar");
        avatar.hidden = true;
        avatar.onerror = () => { avatar.hidden = true; C.$("#avatar-iniciais").hidden = false; };
        document.title = "@" + profile.username + " | Cinepop";
        let url = profile.avatar_url;
        if (!url) return;
        try {
            if (url.startsWith("avatars/")) {
                const data = await C.query(db.storage.from("avatars").createSignedUrl(url.slice(8), 300));
                url = data.signedUrl;
            } else if (new URL(url).protocol !== "https:") return;
            if (version !== avatarVersion) return;
            avatar.src = url;
            avatar.hidden = false;
            C.$("#avatar-iniciais").hidden = true;
        } catch (error) {
            console.warn("Falha ao carregar avatar:", error);
            if (own) C.message("Não foi possível carregar sua foto. Tente recarregar a página.", true, "#status-foto");
        }
    }
    function clearPreview() {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = null;
        C.$("#foto-preview").hidden = true;
        C.$("#foto-preview").removeAttribute("src");
    }
    async function preparePhoto(file) {
        if (!["image/jpeg","image/png","image/webp"].includes(file.type))
            throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
        if (file.size > 10 * 1024 * 1024) throw new Error("Escolha uma foto de até 10 MB.");
        let bitmap;
        try { bitmap = await createImageBitmap(file); }
        catch { throw new Error("Não foi possível abrir essa imagem. Tente outro arquivo."); }
        try {
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 512;
            const context = canvas.getContext("2d");
            context.fillStyle = "#202830";
            context.fillRect(0,0,512,512);
            const side = Math.min(bitmap.width, bitmap.height);
            context.drawImage(bitmap, (bitmap.width-side)/2, (bitmap.height-side)/2, side, side, 0,0,512,512);
            const blob = await new Promise(resolve => canvas.toBlob(resolve,"image/jpeg",0.88));
            if (!blob) throw new Error("Não foi possível preparar a foto.");
            return blob;
        } finally { bitmap.close(); }
    }
    C.$("#foto-arquivo").onchange = async event => {
        const file = event.target.files[0];
        if (!file) return;
        const version = ++photoVersion;
        C.$("#salvar-perfil").disabled = true;
        C.message("Preparando prévia...", false, "#status-foto");
        try {
            const blob = await preparePhoto(file);
            if (version !== photoVersion) return;
            clearPreview();
            pendingPhoto = blob; removePhoto = false;
            C.$("#avatar-url").value = "";
            previewUrl = URL.createObjectURL(blob);
            C.$("#foto-preview").src = previewUrl;
            C.$("#foto-preview").hidden = false;
            C.message("Prévia pronta. Clique em Salvar perfil para enviar a foto.", false, "#status-foto");
        } catch (error) {
            if (version === photoVersion) { event.target.value = ""; C.message(error.message, true, "#status-foto"); }
        } finally { if (version === photoVersion) C.$("#salvar-perfil").disabled = false; }
    };
    C.$("#remover-foto").onclick = () => {
        photoVersion++;
        pendingPhoto = null; removePhoto = true;
        clearPreview();
        C.$("#foto-arquivo").value = "";
        C.$("#avatar-url").value = "";
        C.$("#salvar-perfil").disabled = false;
        C.message("A foto será removida ao salvar o perfil.", false, "#status-foto");
    };
    C.$("#avatar-url").oninput = () => {
        photoVersion++;
        pendingPhoto = null; removePhoto = !C.$("#avatar-url").value.trim();
        clearPreview(); C.$("#foto-arquivo").value = "";
        C.$("#salvar-perfil").disabled = false;
        C.message("Clique em Salvar perfil para aplicar a alteração.", false, "#status-foto");
    };
    function renderRatingList() {
        const filtered = selectedRating === null ? ratings : ratings.filter(row => Number(row.nota) === selectedRating);
        C.$("#filtro-nota").textContent = selectedRating === null ? "Todas as notas" : "Nota " + formatNote(selectedRating) + "/5";
        C.$("#limpar-nota").hidden = selectedRating === null;
        C.grid(C.$("#avaliacoes"), filtered.filter(row => row.midia), "Nenhuma avaliação com esta nota.");
        C.$("#grafico-notas").querySelectorAll("button").forEach(button =>
            button.setAttribute("aria-pressed", String(Number(button.dataset.nota) === selectedRating)));
    }
    function renderRatings() {
        const bins = Array.from({length:10},(_,index) => ({note:(index+1)/2, count:0}));
        ratings.forEach(row => { const bin = bins.find(item => item.note === Number(row.nota)); if (bin) bin.count++; });
        const max = Math.max(1,...bins.map(bin => bin.count));
        const average = ratings.length ? ratings.reduce((sum,row) => sum+Number(row.nota),0)/ratings.length : null;
        C.$("#total-avaliacoes").textContent = ratings.length;
        C.$("#media-perfil").textContent = average === null ? "—" : average.toLocaleString("pt-BR",{minimumFractionDigits:1, maximumFractionDigits:1}) + "/5";
        C.$("#total-filmes").textContent = ratings.filter(row => row.midia?.tipo === "movie").length;
        C.$("#total-series").textContent = ratings.filter(row => row.midia?.tipo === "tv").length;
        C.$("#grafico-notas").innerHTML = bins.map(bin => {
            const label = formatNote(bin.note) + " estrelas: " + bin.count + " avaliações";
            return '<button type="button" class="coluna-nota" data-nota="' + bin.note + '" aria-label="' + label + '" aria-pressed="false" title="' + label +
                '"><span class="quantidade-nota">' + bin.count + '</span><span class="trilho-nota" aria-hidden="true"><span class="barra-nota" style="height:' +
                (bin.count / max * 100) + '%"></span></span><span class="valor-nota">' + formatNote(bin.note) + '</span></button>';
        }).join("");
        C.$("#tabela-notas").innerHTML = bins.map(bin => '<tr><th scope="row">' + formatNote(bin.note) + '/5</th><td>' + bin.count +
            '</td><td>' + (ratings.length ? (bin.count/ratings.length*100).toLocaleString("pt-BR",{maximumFractionDigits:1}) : "0") + '%</td></tr>').join("");
        C.$("#grafico-notas").querySelectorAll("button").forEach(button => {
            button.onclick = () => {
                selectedRating = Number(button.dataset.nota);
                renderRatingList();
                C.$("#todas-avaliacoes").open = true;
                C.$("#todas-avaliacoes").scrollIntoView({behavior:"smooth",block:"start"});
            };
        });
        const recent = ratings.filter(row => row.midia?.tipo === "movie").slice(0,6);
        C.$("#filmes-recentes").innerHTML = recent.length ? recent.map(row => {
            const date = new Date(row.created_at);
            const when = Number.isNaN(date.getTime()) ? "" : " · " + date.toLocaleDateString("pt-BR");
            return C.card(row.midia, formatNote(row.nota) + "/5" + when);
        }).join("") : '<p class="vazio">Os filmes avaliados aparecerão aqui.</p>';
        renderRatingList();
    }
    C.$("#limpar-nota").onclick = () => { selectedRating = null; renderRatingList(); };
    async function init() {
        await C.ready;
        const id = C.params.get("id") || C.user?.id;
        if (!id) throw new Error("Entre na sua conta para ver seu perfil.");
        if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Perfil inválido.");
        profile = await C.query(db.from("perfis").select("*").eq("id",id).maybeSingle());
        if (!profile) throw new Error("Este perfil é privado ou não foi encontrado.");
        own = C.user?.id === profile.id;
        await renderProfile();
        C.$("#conteudo-perfil").hidden = false;
        await counts();
        if (own) {
            C.$("#editar-perfil").hidden = false;
            C.$("#nome").value = profile.nome || "";
            C.$("#username").value = profile.username;
            C.$("#bio").value = profile.bio || "";
            C.$("#avatar-url").value = profile.avatar_url?.startsWith("https://") ? profile.avatar_url : "";
            const settings = await C.query(db.from("configuracoes").select("perfil_privado").eq("usuario_id",id).maybeSingle());
            C.$("#perfil-privado").checked = !!settings?.perfil_privado;
            C.$("#secao-watchlist").hidden = false;
        } else if (C.user) {
            const following = await C.query(db.from("seguidores").select("id").eq("seguidor_id",C.user.id).eq("seguido_id",id).maybeSingle());
            const button = C.$("#seguir"); button.hidden = false;
            C.followButton(button,id,!!following);
            button.addEventListener("followchange",() => counts().catch(error => C.message(C.error(error),true)));
        }
        const [favorites, allRatings, lists, watchlist] = await Promise.all([
            C.all(() => db.from("favoritos").select("id,midia:midias(*)").eq("usuario_id",id).order("id",{ascending:false})),
            C.all(() => db.from("avaliacoes").select("id,nota,created_at,midia:midias(*)").eq("usuario_id",id).order("created_at",{ascending:false}).order("id",{ascending:false})),
            C.all(() => db.from("listas").select("*").eq("usuario_id",id).order("id",{ascending:false})),
            own ? C.all(() => db.from("watchlist").select("id,midia:midias(*)").eq("usuario_id",id).order("id",{ascending:false})) : []
        ]);
        ratings = allRatings;
        renderRatings();
        C.grid(C.$("#favoritos"),favorites.filter(row => row.midia),"Ainda não há favoritos.");
        C.grid(C.$("#watchlist-perfil"),watchlist.filter(row => row.midia),"Sua watchlist está vazia. Adicione títulos pelo catálogo.");
        C.$("#listas-perfil").innerHTML = lists.length ? lists.map(C.listCard).join("") : '<p class="vazio">Ainda não há listas.</p>';
    }
    function ownPhotoPath(url) {
        const prefix = "avatars/" + profile.id + "/";
        return url?.startsWith(prefix) ? url.slice(8) : null;
    }
    C.$("#form-perfil").onsubmit = event => {
        event.preventDefault();
        C.action(C.$("#salvar-perfil"), async () => {
            const username = C.$("#username").value.trim().toLowerCase();
            if (!/^[a-z0-9._]{3,30}$/.test(username)) throw new Error("Use de 3 a 30 letras, números, pontos ou _ no nome de usuário.");
            let avatar = C.$("#avatar-url").value.trim();
            if (avatar && !/^https:\/\//i.test(avatar)) throw new Error("Use um endereço HTTPS para o avatar.");
            if (!avatar && !removePhoto) avatar = profile.avatar_url;
            const oldPath = ownPhotoPath(profile.avatar_url);
            let uploadedPath = null, committed = false;
            C.$("#campos-perfil").disabled = true;
            try {
                if (pendingPhoto) {
                    C.message("Enviando foto...");
                    uploadedPath = profile.id + "/" + crypto.randomUUID() + ".jpg";
                    const {error} = await db.storage.from("avatars").upload(uploadedPath,pendingPhoto,{contentType:"image/jpeg",upsert:false});
                    if (error) { uploadedPath = null; throw new Error("Não foi possível enviar a foto. Confira sua conexão e se o upload de avatares está configurado."); }
                    avatar = "avatars/" + uploadedPath;
                }
                const result = await C.query(db.rpc("cinepop_atualizar_perfil", {
                    p_nome:C.$("#nome").value.trim(),p_username:username,p_bio:C.$("#bio").value.trim(),
                    p_avatar_url:avatar || null,p_privado:C.$("#perfil-privado").checked
                }));
                committed = true;
                profile = result;
                pendingPhoto = null; removePhoto = false; clearPreview();
                C.$("#foto-arquivo").value = "";
                C.message("",false,"#status-foto");
                await renderProfile();
                C.$("#link-perfil").textContent = "@" + profile.username;
                C.message("Perfil atualizado!");
                if (oldPath && oldPath !== ownPhotoPath(profile.avatar_url)) {
                    try {
                        const {error} = await db.storage.from("avatars").remove([oldPath]);
                        if (error) console.warn("Foto antiga não removida:",error);
                    } catch (error) { console.warn("Foto antiga não removida:",error); }
                }
            } catch (error) {
                if (uploadedPath && !committed) {
                    try { await db.storage.from("avatars").remove([uploadedPath]); } catch {}
                }
                throw error;
            } finally { C.$("#campos-perfil").disabled = false; }
        });
    };
    window.addEventListener("pagehide",clearPreview);
    init().catch(error => C.message(C.error(error),true));
})();