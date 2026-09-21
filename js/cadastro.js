(() => {
    "use strict";
    const form = document.querySelector("#form-cadastro");
    const message = document.querySelector("#mensagem");
    const button = document.querySelector("#btn-cadastro");
    function show(text, success = false) {
        message.textContent = text;
        message.className = "mensagem-auth " + (success ? "sucesso" : "erro");
    }
    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (button.disabled) return;
        const value = id => document.querySelector("#" + id).value;
        const nome = value("nome").trim(), username = value("username").trim().toLowerCase();
        const email = value("email").trim(), senha = value("senha");
        if (!nome || !email || !senha) return show("Preencha todos os campos.");
        if (!/^[a-z0-9._]{3,30}$/.test(username)) return show("Use de 3 a 30 letras, números, pontos ou _ no nome de usuário.");
        if (senha.length < 6) return show("A senha precisa ter pelo menos 6 caracteres.");
        if (senha !== value("confirmar-senha")) return show("As senhas não são iguais.");
        button.disabled = true; button.textContent = "Criando conta...";
        message.textContent = "";
        let completed = false;
        try {
            const { data, error } = await db.auth.signUp({
                email, password: senha,
                options: { emailRedirectTo: new URL("login.html", location.href).href, data: { nome, username } }
            });
            if (error) {
                if (error.code === "user_already_exists" || /already registered/i.test(error.message)) throw new Error("Este e-mail já possui uma conta.");
                if (error.status === 429) throw new Error("Muitas tentativas. Aguarde um pouco antes de tentar novamente.");
                if (error.code === "weak_password") throw new Error("A senha não atende aos requisitos. Use uma senha mais forte.");
                if (/redirect|url/i.test(error.message)) throw new Error("O endereço de confirmação não está autorizado no Supabase. Adicione este endereço em Authentication > URL Configuration: " + new URL("login.html", location.href).href);
                if (/invalid.*email|email.*invalid/i.test(error.message)) throw new Error("Informe um endereço de e-mail válido.");
                if (/database|duplicate|username/i.test(error.message)) throw new Error("Não foi possível salvar o perfil. Tente outro nome de usuário; se persistir, a configuração do cadastro precisa ser conferida.");
                if (typeof error.message === "string" && error.message.trim()) throw new Error(error.message);
                throw new Error("Não foi possível criar a conta. Confira os dados e tente novamente.");
            }
            if (!data.user) throw new Error("O cadastro não foi confirmado. Tente novamente.");
            if (data.session) {
                const { error: logoutError } = await db.auth.signOut({ scope: "local" });
                if (logoutError) throw new Error("Conta criada, mas não foi possível encerrar a sessão automática. Recarregue a página.");
            }
            show(data.session ? "Conta criada! Redirecionando para o login..." :
                "Solicitação recebida! Confira seu e-mail para confirmar o cadastro antes de entrar.", true);
            form.reset(); completed = true;
            setTimeout(() => { location.href = "login.html"; }, 2500);
        } catch (error) { show(error.message || "Não foi possível cadastrar. Verifique sua conexão."); }
        finally { if (!completed) { button.disabled = false; button.textContent = "Criar conta"; } }
    });
})();