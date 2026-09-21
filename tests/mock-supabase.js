(() => {
    const uid = "11111111-1111-4111-8111-111111111111";
    const other = "22222222-2222-4222-8222-222222222222";
    const state = {
        perfis: [{ id: uid, username: "ana", nome: "Ana", bio: "Cinema sempre", avatar_url: null }, { id: other, username: "bia", nome: "Bia", bio: "", avatar_url: null }],
        configuracoes: [{ usuario_id: uid, perfil_privado: false }],
        midias: [], avaliacoes: [], diario: [], watchlist: [], favoritos: [], seguidores: [],
        listas: [{ id: 1, usuario_id: uid, titulo: "Para assistir", descricao: "Seleção", publica: true }], lista_midias: []
    };
    if (localStorage.getItem("profile-fixture") === "yes") {
        state.midias = [1, 2, 3, 4, 5].map(id => ({ id, tmdb_id: id, tipo: id === 4 ? "tv" : "movie", titulo: "Titulo " + id, poster_path: "/poster.jpg", data_lancamento: "2024-01-01" }));
        state.avaliacoes = [
            { id: 9, usuario_id: uid, midia_id: 1, nota: 0.5, created_at: "2024-01-01T12:00:00Z" },
            { id: 2, usuario_id: uid, midia_id: 2, nota: 4.5, created_at: "2026-01-01T12:00:00Z" },
            { id: 7, usuario_id: uid, midia_id: 3, nota: 4.5, created_at: "2025-01-01T12:00:00Z" },
            { id: 1, usuario_id: uid, midia_id: 4, nota: 5, created_at: "2027-01-01T12:00:00Z" }
        ];
        state.diario = [
            { id: 1, usuario_id: uid, midia_id: 5, data_assistido: "2023-06-10", created_at: "2023-06-10T12:00:00Z", reassistido: false },
            { id: 2, usuario_id: uid, midia_id: 2, data_assistido: "2026-02-10", created_at: "2026-02-10T12:00:00Z", reassistido: false },
            { id: 3, usuario_id: uid, midia_id: 1, data_assistido: "2023-01-10", created_at: "2023-01-10T12:00:00Z", reassistido: false },
            { id: 4, usuario_id: uid, midia_id: 3, data_assistido: "2025-03-10", created_at: "2025-03-10T12:00:00Z", reassistido: false }
        ];
    }

    window.__state = state;
    window.__calls = [];
    const user = () => localStorage.getItem("test-user") === "yes" ? { id: uid, email: "ana@example.com" } : null;
    const result = (data, error = null) => ({ data, error });
    class Query {
        constructor(table) { this.table = table; this.filters = []; this.sorts = []; this.mode = "select"; this.offset = 0; this.end = Infinity; }
        select(columns = "*", opts = {}) { this.columns = columns; this.options = opts; return this; }
        eq(k, v) { this.filters.push(r => String(r[k]) === String(v)); return this; }
        in(k, vs) { this.filters.push(r => vs.includes(r[k])); return this; }
        ilike(k, v) { const search = v.replaceAll("%", "").replaceAll("\\_", "_"); this.filters.push(r => r[k].includes(search)); return this; }
        order(k, opts = {}) { this.sorts.push([k, opts.ascending !== false]); return this; }
        range(a, b) { this.offset = a; this.end = b; return this; }
        limit(n) { this.end = n - 1; return this; }
        maybeSingle() { this.one = true; return this; }
        single() { this.one = true; return this; }
        insert(data) { this.mode = "insert"; this.input = data; return this; }
        upsert(data) { this.mode = "upsert"; this.input = data; return this; }
        update(data) { this.mode = "update"; this.input = data; return this; }
        delete() { this.mode = "delete"; return this; }
        then(resolve, reject) { return Promise.resolve().then(() => this.execute()).then(resolve, reject); }
        execute() {
            window.__calls.push({ table: this.table, mode: this.mode, input: this.input });
            let all = state[this.table], rows = all.filter(r => this.filters.every(f => f(r)));
            if (this.mode === "insert" || this.mode === "upsert") {
                let existing;
                if (this.mode === "upsert") existing = all.find(r => r.usuario_id === this.input.usuario_id && r.midia_id === this.input.midia_id);
                if (existing) { Object.assign(existing, this.input); rows = [existing]; }
                else { const row = { id: Math.max(0, ...all.map(r => Number(r.id) || 0)) + 1, created_at: new Date().toISOString(), ...this.input }; all.push(row); rows = [row]; }
            } else if (this.mode === "update") rows.forEach(r => Object.assign(r, this.input));
            else if (this.mode === "delete") state[this.table] = all.filter(r => !rows.includes(r));
            for (const [k, asc] of this.sorts.toReversed()) rows.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1));
            const count = rows.length;
            rows = rows.slice(this.offset, this.end === Infinity ? undefined : this.end + 1).map(r => ({ ...r }));
            if (this.columns?.includes("midia:midias")) rows.forEach(r => r.midia = state.midias.find(m => m.id == r.midia_id));
            if (this.columns?.includes("perfil:perfis")) rows.forEach(r => r.perfil = state.perfis.find(p => p.id === r.usuario_id));
            return { ...result(this.one ? (rows[0] || null) : rows), count };
        }
    }
    window.supabase = {
        createClient: () => ({
            storage: {
                from: () => ({
                    upload: async (path, blob) => {
                        if (window.__failUpload) return result(null, { message: "Falha simulada" });
                        window.__uploads ||= [];
                        window.__uploads.push({ path, type: blob.type, size: blob.size });
                        return result({ path });
                    },
                    createSignedUrl: async path => result({ signedUrl: "https://test-avatars.invalid/" + path }),
                    remove: async paths => { window.__removed ||= []; window.__removed.push(...paths); return result(paths); }
                })
            },
            from: table => new Query(table),
            auth: {
                getSession: async () => result({ session: user() ? { user: user() } : null }),
                signInWithPassword: async () => { localStorage.setItem("test-user", "yes"); return result({ user: user() }); },
                signOut: async () => { localStorage.removeItem("test-user"); return result(null); },
                signUp: async input => { window.__signup = input; return result({ user: { id: uid }, session: null }); }
            },
            rpc: async (name, input) => {
                if (name === "cinepop_resumo_midia") {
                    const rows = state.avaliacoes.filter(r => r.midia_id === input.p_midia_id);
                    return result([{ total: rows.length, media: rows.length ? rows.reduce((n, r) => n + r.nota, 0) / rows.length : null }]);
                }
                if (name === "cinepop_atualizar_perfil") {
                    if (window.__failProfileSave) return result(null, { code: "23505" });
                    const p = state.perfis.find(r => r.id === uid);
                    Object.assign(p, { nome: input.p_nome, username: input.p_username, bio: input.p_bio, avatar_url: input.p_avatar_url });
                    state.configuracoes[0].perfil_privado = input.p_privado;
                    return result(p);
                }
                return result(null, { code: "PGRST202" });
            }
        })
    };
})();