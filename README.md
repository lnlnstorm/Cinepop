# Cinepop

Aplicação em HTML, CSS e JavaScript puro. Não exige build.

## Configurar ao clonar do GitHub

Copie js/config.example.js para js/config.local.js e preencha TMDB_TOKEN com seu token de leitura do TMDB. O arquivo local está ignorado pelo Git. Nesta máquina ele já está preenchido.

js/supabase.js contém a URL e a chave publishable do projeto. Essas informações são públicas e o acesso aos dados é controlado pelas políticas RLS. Para usar outro projeto, substitua ambas pelas suas.

Ao publicar como site estático, inclua config.local.js no pacote de hospedagem. Ele não vem no clone do GitHub. Esse arquivo separa a configuração do repositório, mas o token de leitura continua acessível ao navegador, como já acontecia antes.

## Executar localmente

Na pasta deste projeto:

    python -m http.server 3000 --bind 127.0.0.1

Abra http://localhost:3000/index.html e mantenha o terminal aberto.
Se a porta estiver ocupada, utilize o servidor já iniciado para esta pasta ou outra porta.
Login, cadastro e confirmação de e-mail devem usar o mesmo host/porta para compartilhar a sessão.

## Aplicar no Supabase

1. Abra o projeto usado em js/supabase.js.
2. No SQL Editor, execute supabase/001_cinepop.sql e depois supabase/002_perfil_foto.sql. Se o primeiro já foi aplicado, execute somente 002_perfil_foto.sql.
3. Execute somente esse complemento. Não execute novamente o SQL antigo que contém DROP TABLE avaliacoes CASCADE.
4. Em Authentication > URL Configuration, configure:
   - Site URL: http://localhost:3000
   - Redirect URLs: http://localhost:3000/login.html
   - Se usar 127.0.0.1, adicione também http://127.0.0.1:3000/login.html.
   - Para outra porta ou produção, adicione o endereço exato correspondente.
5. Recarregue o site com Ctrl+F5.

A migração pressupõe as 14 tabelas do SQL fornecido. Verifica a versão nova de avaliações,
mantém registros e índices existentes, preenche configurações ausentes e substitui TODAS as
políticas RLS das tabelas Cinepop por regras coerentes. Não modifica outras tabelas.
Se houver políticas personalizadas além das enviadas, revise esse bloco antes de executar.
A execução é transacional e repetível. Nenhuma migração foi aplicada automaticamente ao banco remoto.

As chaves já existentes foram preservadas. A chave publishable do Supabase pertence ao cliente;
as permissões são aplicadas por RLS. Nunca coloque service_role no navegador.

## Funcionalidades

- index.html: filmes em alta na semana, pesquisa e paginação.
- series.html: séries em alta, pesquisa e paginação.
- midia.html?tipo=movie&id=... ou tipo=tv: detalhes do TMDB, média Cinepop, avaliação,
  spoiler, edição/exclusão de avaliação, watchlist, favoritos e inclusão em listas.
- perfil.html: seu perfil, edição, foto do computador/celular ou link HTTPS, privacidade, favoritos, notas,
  watchlist e listas. perfil.html?id=UUID abre outro perfil visível.
- amigos.html: busca por username, seguir/deixar de seguir, seguidores e seguindo.
- lista.html: explorar/criar listas; lista.html?id=ID permite ver e gerenciar os itens.
- Visitantes podem explorar; gravar exige login.

A média Cinepop usa escala 0,5–5 e as avaliações visíveis ao visitante.
TMDB usa 0–10. A página mostra as 30 avaliações visíveis mais recentes.
Sugestões são tendências do TMDB, ainda não recomendações personalizadas.

## Privacidade

Perfil privado é visível apenas ao dono, mesmo que outras pessoas já o sigam.
As avaliações, favoritos e listas desse perfil também ficam ocultos de outras pessoas.
Watchlist e configurações são sempre privadas. Uma lista privada só pode ser vista/editada
pelo dono; seus itens seguem a mesma regra. Contagens de seguidores respeitam a visibilidade.
Não há solicitação/aprovação de seguidores nesta etapa.

## Próxima etapa

As tabelas e permissões de diário, curtidas, comentários e notificações ficam preparadas.
As telas e a geração automática de notificações ainda não foram implementadas.
Recuperação de senha também não faz parte desta entrega.

## Verificação manual após aplicar o SQL

1. Use duas contas diferentes (janelas/perfis de navegador separados).
2. Cadastre/entre, pesquise filme e série e abra os detalhes.
3. Avalie, altere a nota e confira a média; teste marcar spoiler e excluir.
4. Adicione/remova favoritos e watchlist; confira no próprio perfil.
5. Crie listas pública e privada, inclua um título, remova e edite a visibilidade.
6. Com a segunda conta, confira que a lista privada e a watchlist não aparecem.
7. Siga/deixe de seguir a outra conta e confira as contagens.
8. Torne o perfil privado e confirme que outra conta não acessa seu perfil e atividades.
9. Tente buscar termos sem resultado e abrir links de títulos/listas inválidos.

Documentação de referência:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://developer.themoviedb.org/reference/trending-movies
- https://developer.themoviedb.org/reference/trending-tv

## Testes automatizados

Ferramentas de teste ficam isoladas; nao sao necessarias para usar o site.

    npm.cmd install --prefix .cinepop-tools --no-save --package-lock=false @playwright/test @electric-sql/pglite
    node tests/database.cjs
    node tests/browser.cjs

O teste SQL usa PostgreSQL/PGlite em memoria e o schema de tests/schema-fixture.sql.
O teste de navegador usa o Chrome instalado no caminho padrao do Windows, servidor temporario
e APIs simuladas; nao cria contas nem altera o Supabase remoto.

## Perfil: notas, filmes recentes e foto

O perfil mostra a distribuição das notas de 0,5 a 5, tabela com quantidades e porcentagens,
média, totais de filmes e séries e os seis filmes avaliados mais recentemente.
Clique numa barra para filtrar as avaliações. A ordem dos recentes usa created_at da avaliação;
não representa a data em que o filme foi assistido (que pertence ao diário).

Em Editar meu perfil, escolha uma foto JPG/PNG/WebP de até 10 MB. A prévia é local;
o envio só ocorre ao clicar em Salvar perfil. O navegador recorta no centro e reduz para JPEG 512x512.
Também é possível remover a foto ou usar um endereço HTTPS.

Aplique supabase/002_perfil_foto.sql depois de 001_cinepop.sql para habilitar o upload.
Esse complemento cria/configura o bucket privado avatars (limite de 1 MB por arquivo enviado),
políticas de leitura/envio/exclusão e atualiza a função de edição de perfil. Não requer criar o bucket manualmente.
As fotos enviadas usam URLs temporárias de cinco minutos. Mudar a privacidade bloqueia novos acessos;
links temporários já emitidos podem continuar funcionando até expirar. Fotos por links externos seguem
as permissões do serviço onde estão hospedadas.
A referência permanente fica em perfis.avatar_url; não é gravada a URL temporária.
Execute as migrações sempre na ordem 001 → 002; repetir apenas 001 restaura a função antiga.

## Organização dos arquivos

A entrada principal é index.html. home.html era uma cópia idêntica e foi removido;
js/script.js era um arquivo sem código e sem referências, também removido.

Os JavaScripts restantes têm responsabilidades diferentes:
- app.js: funções compartilhadas, navegação e sessão.
- supabase.js / tmdb.js: conexão com cada serviço.
- catalogo.js: catálogo e pesquisa, compartilhados por filmes e séries.
- cadastro.js / login.js: autenticação.
- perfil.js / midia.js / amigos.js / listas.js: comportamento de cada página.

css/style.css contém a base visual e autenticação; css/app.css contém os componentes do aplicativo.
.cinepop-tools contém dependências dos testes (incluindo node_modules). .cinepop-backup contém cópias antigas.
Essas duas pastas estão ignoradas pelo Git e ocultas no explorador e na busca do VS Code por .vscode/settings.json.
Os arquivos de bibliotecas não precisam ser editados. As abas já abertas podem ser fechadas normalmente.

Referência do armazenamento: https://supabase.com/docs/guides/storage/buckets/fundamentals
