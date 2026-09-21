# 🎬 Cinepop

O **Cinepop** é uma aplicação web para descobrir, avaliar e organizar filmes e séries, com recursos sociais entre usuários.

O projeto foi inspirado em plataformas como o Letterboxd, mas possui identidade própria e foi desenvolvido com foco em aprendizado de desenvolvimento web, integração com APIs e banco de dados.

---

## ✨ Funcionalidades

### 👤 Usuários
- Cadastro e login
- Perfil personalizado
- Nome de usuário
- Biografia
- Foto de perfil
- Links sociais
- Perfil público ou privado
- Seguidores e seguindo

### 🎬 Filmes e séries
- Pesquisa de filmes
- Pesquisa de séries
- Catálogo com conteúdos em alta
- Página individual de cada título
- Pôster
- Sinopse
- Gêneros
- Duração ou temporadas
- Elenco
- Nota pública do TMDB

### ⭐ Avaliações
- Nota de `0,5` até `5`
- Review em texto
- Marcação de spoilers
- Data em que o título foi assistido
- Marcação de reassistido
- Edição de avaliação
- Exclusão de avaliação

### 📅 Diário
O usuário pode registrar a data em que assistiu a determinado filme ou série.

A data assistida é armazenada separadamente da data em que a avaliação foi publicada.

### ❤️ Favoritos
- Adicionar títulos aos favoritos
- Visualizar favoritos pelo perfil

### 👁️ Watchlist
- Adicionar filmes e séries para assistir depois
- Remover títulos da watchlist

### 📋 Listas
- Criar listas personalizadas
- Adicionar filmes e séries
- Organizar títulos
- Visualizar listas criadas

### 👥 Recursos sociais
- Pesquisar usuários
- Visualizar perfis
- Seguir usuários
- Deixar de seguir
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

## 🛠️ Tecnologias

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

O banco de dados utiliza o **Supabase**.

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
- configurações.

Também são utilizadas políticas de segurança através de **Row Level Security (RLS)**.

---

## 🎞️ TMDB

As informações de filmes e séries são obtidas através da API do **The Movie Database (TMDB)**.

São utilizados dados como:

- título;
- pôster;
- sinopse;
- elenco;
- gêneros;
- ano de lançamento;
- duração;
- temporadas;
- avaliações públicas.

> This product uses the TMDB API but is not endorsed or certified by TMDB.

---

## ⚙️ Como executar

### 1. Clone o repositório

```bash
git clone https://github.com/lnlnstorm/Cinepop.git

Entre na pasta:

cd Cinepop
2. Configure o TMDB

Dentro da pasta:

js/

existe o arquivo:

config.example.js

Crie uma cópia com o nome:

config.local.js

E configure seu token:

window.CINEPOP_CONFIG = {
    TMDB_TOKEN: "SEU_TOKEN_DE_LEITURA_DO_TMDB"
};

O arquivo:

js/config.local.js

não deve ser enviado ao GitHub.

3. Configure o Supabase

Para utilizar todas as funcionalidades, é necessário configurar um projeto no Supabase com:

banco de dados;
autenticação;
tabelas;
funções;
políticas RLS;
Storage para fotos de perfil.

Os scripts SQL utilizados pelo projeto estão disponíveis na pasta:

supabase/
4. Execute localmente

Com Node.js instalado:

npx serve . -l 3000

No PowerShell, caso o npx seja bloqueado:

npx.cmd serve . -l 3000

Depois abra:

http://localhost:3000
📁 Estrutura
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
├── index.html
├── cadastro.html
├── login.html
├── midia.html
├── perfil.html
├── lista.html
├── amigos.html
├── pessoa.html
└── README.md
🎨 Interface

O Cinepop utiliza uma identidade visual escura com destaque em vermelho.

A interface busca seguir uma proposta mais voltada para uma rede social de cinema, com:

pôsteres em destaque;
layout mais editorial;
poucas caixas visuais;
avaliações organizadas como publicações;
páginas de perfil;
recursos sociais;
design responsivo.
🚧 Status

O projeto está em desenvolvimento.

Implementado
 Cadastro
 Login
 Perfis
 Foto de perfil
 Pesquisa de filmes
 Pesquisa de séries
 Integração com TMDB
 Avaliações
 Reviews
 Data assistida
 Diário
 Favoritos
 Watchlist
 Listas
 Seguidores
 Curtidas
 Comentários
 Pesquisa de usuários
 Estatísticas do perfil
 Distribuição das notas
Próximas melhorias
 Feed de atividades
 Sistema de notificações
 Melhorias no diário
 Melhorias nas listas
 Busca global
 Mais configurações de perfil
 Melhorias de responsividade
 Refinamento da interface
 Publicação da aplicação
🎓 Objetivo acadêmico

O Cinepop foi desenvolvido para aplicar conceitos de:

HTML semântico;
CSS;
Flexbox;
Grid;
responsividade;
JavaScript;
manipulação do DOM;
requisições assíncronas;
consumo de APIs;
autenticação;
banco de dados;
CRUD;
segurança com RLS;
integração front-end e banco;
Git e GitHub.
👨‍💻 Autor

Desenvolvido por Iuri Farias Vieira

GitHub: @lnlnstorm

📄 Observação

O Cinepop é um projeto independente desenvolvido para fins educacionais.

Não possui vínculo com o Letterboxd.

Os dados e imagens de filmes e séries são fornecidos pelo TMDB.


Depois salva o `README.md` e manda pro GitHub com:

```bash
git add README.md
git commit -m "docs: atualiza README do Cinepop"
git push origin main
