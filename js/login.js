(() => {
    "use strict";
    const form = document.querySelector("#form-login");
    const message = document.querySelector("#mensagem");
    const button = document.querySelector("#btn-login");
    function show(text, success = false) {
        message.textContent = text;
        message.className = "mensagem-auth " + (success ? "sucesso" : "erro");
    }
    async function checkSession() {
        try {
            const { data, error } = await db.auth.getSession();
            if (error) throw error;
            if (data.session) location.href = "index.html";
        } catch { show("Não foi possível consultar sua sessão. Tente entrar novamente."); }
    }
    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (button.disabled) return;
        button.disabled = true; button.textContent = "Entrando...";
        message.textContent = "";
        try {
            const { error } = await db.auth.signInWithPassword({
                email: document.querySelector("#email").value.trim(),
                password: document.querySelector("#senha").value
            });
            if (error) {
                const text = error.code === "email_not_confirmed"
                    ? "Confirme seu e-mail antes de entrar."
                    : error.status === 429 ? "Muitas tentativas. Aguarde um pouco e tente novamente." : "Não foi possível entrar. Confira o e-mail e a senha.";
                throw new Error(text);
            }
            show("Login realizado!", true);
            location.href = "index.html";
        } catch (error) { show(error.message || "Não foi possível entrar. Confira sua conexão."); }
        finally { button.disabled = false; button.textContent = "Entrar"; }
    });
    checkSession();
})();