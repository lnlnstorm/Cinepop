# 🎬 Cinepop

O **Cinepop** é uma aplicação web para descobrir, avaliar e organizar filmes e séries, além de interagir com outros usuários.

O projeto foi inspirado em plataformas como o Letterboxd, mas possui identidade e implementação próprias. Foi desenvolvido com foco no aprendizado de desenvolvimento web, consumo de APIs, autenticação e banco de dados.

> Projeto desenvolvido para fins acadêmicos e de aprendizado.

---

## ✨ Funcionalidades

### 👤 Usuários

- Cadastro e login
- Perfil personalizado
- Nome e nome de usuário
- Biografia
- Foto de perfil
- Links sociais
- Perfil público ou privado
- Seguidores e seguindo

### 🎬 Filmes e séries

- Pesquisa de filmes
- Pesquisa de séries
- Catálogo com títulos em alta
- Página individual para cada título
- Pôster
- Sinopse
- Gêneros
- Ano de lançamento
- Duração ou número de temporadas
- Elenco
- Nota pública do TMDB

### ⭐ Avaliações

O usuário pode:

- dar notas de `0,5` até `5`;
- escrever uma review;
- marcar reviews que possuem spoilers;
- informar a data em que assistiu;
- marcar um título como reassistido;
- editar avaliações;
- excluir avaliações.

### 📅 Diário

O Cinepop registra separadamente:

- a data em que o título foi assistido;
- a data em que a avaliação foi publicada.

Isso permite registrar hoje um filme ou série que foi assistido anos atrás.

### ❤️ Favoritos

- Adicionar títulos aos favoritos
- Visualizar favoritos no perfil

### 👁️ Watchlist

- Adicionar filmes e séries para assistir depois
- Remover títulos da watchlist
- Visualizar a watchlist pelo perfil

### 📋 Listas

- Criar listas personalizadas
- Adicionar filmes e séries
- Organizar títulos
- Visualizar listas criadas

### 👥 Recursos sociais

- Pesquisar usuários
- Visualizar outros perfis
- Seguir usuários
- Deixar de seguir usuários
- Visualizar seguidores
- Visualizar quem o usuário segue
- Curtir avaliações
- Comentar em avaliações

### 📊 Estatísticas

O perfil apresenta:

- total de avaliações;
- média das notas;
- quantidade de filmes avaliados;
- quantidade de séries avaliadas;
- distribuição das notas;
- filtro por ano em que o título foi assistido.

---

## 🛠️ Tecnologias utilizadas

O projeto utiliza:

- HTML5
- CSS3
- JavaScript
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Row Level Security
- TMDB API
- Git
- GitHub

O front-end foi desenvolvido sem frameworks.

---

## 🗄️ Banco de dados

O banco de dados do Cinepop utiliza o **Supabase**.

Entre as principais estruturas do sistema estão:

- perfis;
- mídias;
- avaliações;
- diário;
- favoritos;
- watchlist;
- listas;
- seguidores;
- curtidas;
- comentários;
- configurações de usuário.

O projeto também utiliza políticas de segurança através de **Row Level Security (RLS)**.

---

## 🎞️ TMDB

As informações de filmes e séries são obtidas através da API do **The Movie Database (TMDB)**.

Entre os dados utilizados estão:

- título;
- pôster;
- sinopse;
- elenco;
- gêneros;
- ano de lançamento;
- duração;
- temporadas;
- nota pública.

> This product uses the TMDB API but is not endorsed or certified by TMDB.

---

## ⚙️ Como executar o projeto

### 1. Clone o repositório

```bash
git clone https://github.com/lnlnstorm/Cinepop.git
```

Entre na pasta do projeto:

```bash
cd Cinepop
```

---

### 2. Configure a API do TMDB

Dentro da pasta:

```text
js/
```

existe o arquivo:

```text
config.example.js
```

Crie uma cópia chamada:

```text
config.local.js
```

Depois configure seu token de leitura do TMDB:

```javascript
window.CINEPOP_CONFIG = {
    TMDB_TOKEN: "SEU_TOKEN_DE_LEITURA_DO_TMDB"
};
```

O arquivo:

```text
js/config.local.js
```

não deve ser enviado ao GitHub.

Ele deve permanecer incluído no `.gitignore`.

---

### 3. Configure o Supabase

Para utilizar todas as funcionalidades, é necessário criar e configurar um projeto no Supabase.

O projeto utiliza:

- Authentication
- PostgreSQL
- Storage
- Row Level Security
- funções SQL
- políticas de acesso

Os scripts SQL utilizados pelo projeto estão disponíveis na pasta:

```text
supabase/
```

---

### 4. Execute localmente

Com o Node.js instalado, execute:

```bash
npx serve . -l 3000
```

Caso o PowerShell bloqueie o `npx.ps1`, também é possível utilizar:

```bash
npx.cmd serve . -l 3000
```

Depois acesse:

```text
http://localhost:3000
```

---

## 📁 Estrutura do projeto

```text
Cinepop/
│
├── css/
│   ├── style.css
│   └── app.css
│
├── js/
│   ├── amigos.js
│   ├── app.js
│   ├── cadastro.js
│   ├── catalogo.js
│   ├── config.example.js
│   ├── listas.js
│   ├── login.js
│   ├── midia.js
│   ├── perfil.js
│   ├── pessoa.js
│   ├── supabase.js
│   └── tmdb.js
│
├── supabase/
│   └── scripts SQL
│
├── tests/
│
├── amigos.html
├── cadastro.html
├── index.html
├── lista.html
├── login.html
├── midia.html
├── perfil.html
├── pessoa.html
└── README.md
```

---

## 🎨 Interface

O Cinepop utiliza uma identidade visual escura com destaque em vermelho.

A interface busca seguir uma proposta mais próxima de uma **rede social de cinema**, utilizando:

- pôsteres como elementos principais;
- layout mais editorial;
- poucas caixas e cards;
- avaliações organizadas como publicações;
- páginas de perfil;
- recursos sociais;
- navegação responsiva.

---

## 🚧 Status do projeto

O Cinepop está em desenvolvimento.

### Implementado

- [x] Cadastro
- [x] Login
- [x] Perfis
- [x] Foto de perfil
- [x] Pesquisa de filmes
- [x] Pesquisa de séries
- [x] Integração com TMDB
- [x] Avaliações
- [x] Reviews
- [x] Data assistida
- [x] Diário
- [x] Favoritos
- [x] Watchlist
- [x] Listas
- [x] Seguidores
- [x] Curtidas
- [x] Comentários
- [x] Pesquisa de usuários
- [x] Estatísticas do perfil
- [x] Distribuição das notas

### Próximas melhorias

- [ ] Feed de atividades
- [ ] Sistema de notificações
- [ ] Melhorias no diário
- [ ] Melhorias nas listas
- [ ] Busca global por filmes, séries e usuários
- [ ] Mais configurações de perfil
- [ ] Melhorias de responsividade
- [ ] Refinamento da interface
- [ ] Publicação da aplicação

---

## 🎓 Objetivo acadêmico

O Cinepop foi desenvolvido para aplicar na prática conceitos de:

- HTML semântico;
- CSS;
- Flexbox;
- Grid;
- responsividade;
- JavaScript;
- manipulação do DOM;
- requisições assíncronas;
- consumo de APIs;
- formulários e validações;
- autenticação;
- banco de dados;
- operações CRUD;
- segurança utilizando RLS;
- integração entre front-end e banco de dados;
- Git e GitHub.

---

## 👨‍💻 Autor

Desenvolvido por **Iuri Farias Vieira**

GitHub: [@lnlnstorm](https://github.com/lnlnstorm)

---

## 📄 Observação

O Cinepop é um projeto independente desenvolvido para fins educacionais.

O projeto não possui vínculo com o Letterboxd.

Os dados e imagens relacionados a filmes e séries são fornecidos pelo TMDB.
