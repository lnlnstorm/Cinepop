(() => {

    "use strict";

    const form = document.querySelector("#form-cadastro");
    const message = document.querySelector("#mensagem");
    const button = document.querySelector("#btn-cadastro");

    function show(text, success = false) {

        message.textContent = text;

        message.className =
            "mensagem-auth " +
            (success ? "sucesso" : "erro");
    }


    form.addEventListener("submit", async event => {

        event.preventDefault();

        if (button.disabled) return;


        const value =
            id => document.querySelector("#" + id).value;


        const nome =
            value("nome").trim();

        const username =
            value("username").trim().toLowerCase();

        const email =
            value("email").trim();

        const senha =
            value("senha");


        // =========================
        // VALIDAÇÕES
        // =========================

        if (!nome || !email || !senha) {

            return show(
                "Preencha todos os campos."
            );
        }


        if (
            !/^[a-z0-9._]{3,30}$/.test(username)
        ) {

            return show(
                "Use de 3 a 30 letras, números, pontos ou _ no nome de usuário."
            );
        }


        if (senha.length < 6) {

            return show(
                "A senha precisa ter pelo menos 6 caracteres."
            );
        }


        if (
            senha !== value("confirmar-senha")
        ) {

            return show(
                "As senhas não são iguais."
            );
        }


        button.disabled = true;

        button.textContent =
            "Criando conta...";

        message.textContent = "";


        let completed = false;


        try {

            // =========================
            // CADASTRO SUPABASE
            // =========================

            const {
                data,
                error
            } = await db.auth.signUp({

                email,

                password: senha,

                options: {

                    data: {
                        nome,
                        username
                    }
                }
            });


            // =========================
            // ERROS
            // =========================

            if (error) {

                if (
                    error.code === "user_already_exists" ||
                    /already registered/i.test(error.message)
                ) {

                    throw new Error(
                        "Este e-mail já possui uma conta."
                    );
                }


                if (error.status === 429) {

                    throw new Error(
                        "Muitas tentativas. Aguarde um pouco antes de tentar novamente."
                    );
                }


                if (error.code === "weak_password") {

                    throw new Error(
                        "A senha não atende aos requisitos. Use uma senha mais forte."
                    );
                }


                if (
                    /invalid.*email|email.*invalid/i
                        .test(error.message)
                ) {

                    throw new Error(
                        "Informe um endereço de e-mail válido."
                    );
                }


                if (
                    /database|duplicate|username/i
                        .test(error.message)
                ) {

                    throw new Error(
                        "Não foi possível salvar o perfil. Tente outro nome de usuário."
                    );
                }


                if (
                    typeof error.message === "string" &&
                    error.message.trim()
                ) {

                    throw new Error(
                        error.message
                    );
                }


                throw new Error(
                    "Não foi possível criar a conta."
                );
            }


            // =========================
            // SUCESSO
            // =========================

            if (!data.user) {

                throw new Error(
                    "Não foi possível criar a conta."
                );
            }


            show(
                "Conta criada com sucesso!",
                true
            );


            form.reset();

            completed = true;


            setTimeout(() => {

                location.href =
                    "index.html";

            }, 700);


        } catch (error) {

            show(
                error.message ||
                "Não foi possível cadastrar. Verifique sua conexão."
            );


        } finally {

            if (!completed) {

                button.disabled = false;

                button.textContent =
                    "Criar conta";
            }
        }

    });

})();
