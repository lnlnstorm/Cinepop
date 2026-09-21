-- Cinepop: complemento para o modelo enviado (perfis, midias, avaliacoes etc.).
-- Execute TODO este arquivo no SQL Editor do projeto Supabase.
-- Nao apaga tabelas nem registros. Substitui as politicas RLS destas tabelas.
-- Pode ser executado novamente. Tudo ocorre em uma transacao.
begin;

-- Interrompe sem alterar nada se a versao antiga de avaliacoes estiver instalada.
do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'avaliacoes' and column_name = 'midia_id'
    ) then
        raise exception 'O banco ainda usa avaliacoes antiga. Migre os dados para usuario_id/midia_id antes de executar este complemento.';
    end if;
end $$;

create unique index if not exists perfis_username_lower_unique on public.perfis (lower(username));
create index if not exists avaliacoes_midia_idx on public.avaliacoes(midia_id);
create index if not exists seguidores_seguido_idx on public.seguidores(seguido_id);
create index if not exists listas_usuario_idx on public.listas(usuario_id);
create index if not exists diario_usuario_idx on public.diario(usuario_id);
create index if not exists notificacoes_usuario_idx on public.notificacoes(usuario_id);

-- Mantem perfis existentes e preenche apenas configuracoes ausentes.
insert into public.configuracoes(usuario_id)
select id from public.perfis on conflict (usuario_id) do nothing;

create or replace function public.criar_perfil_novo_usuario()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
    v_username text := lower(trim(new.raw_user_meta_data ->> 'username'));
begin
    if v_username is null or v_username !~ '^[a-z0-9._]{3,30}$' then
        raise exception 'Nome de usuario invalido: use de 3 a 30 letras, numeros, pontos ou _.';
    end if;
    insert into public.perfis(id,username,nome)
    values(new.id,v_username,left(new.raw_user_meta_data ->> 'nome',80));
    insert into public.configuracoes(usuario_id) values(new.id);
    return new;
end $$;
revoke all on function public.criar_perfil_novo_usuario() from public, anon, authenticated;
drop trigger if exists criar_perfil_apos_cadastro on auth.users;
create trigger criar_perfil_apos_cadastro after insert on auth.users
for each row execute function public.criar_perfil_novo_usuario();

-- Consulta booleana restrita: nao expoe configuracoes privadas.
-- Perfil privado significa visivel somente ao dono, inclusive para seguidores.
create or replace function public.cinepop_perfil_visivel(p_usuario_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
    select p_usuario_id = (select auth.uid())
        or not coalesce((select perfil_privado from public.configuracoes where usuario_id = p_usuario_id),false);
$$;
revoke all on function public.cinepop_perfil_visivel(uuid) from public;
grant execute on function public.cinepop_perfil_visivel(uuid) to anon, authenticated;

-- Remove politicas antigas, inclusive duplicadas/permissivas, somente do escopo Cinepop.
do $$
declare
    t text;
    p record;
    seq text;
begin
    foreach t in array array['perfis','configuracoes','midias','avaliacoes','diario','watchlist',
        'favoritos','seguidores','listas','lista_midias','likes_avaliacoes','comentarios','likes_listas','notificacoes']
    loop
        execute format('alter table public.%I enable row level security', t);
        for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
            execute format('drop policy %I on public.%I', p.policyname, t);
        end loop;
        execute format('revoke all on table public.%I from anon, authenticated', t);
        if t not in ('configuracoes','notificacoes','watchlist') then
            execute format('grant select on table public.%I to anon, authenticated', t);
        else
            execute format('grant select on table public.%I to authenticated', t);
        end if;
        if t not in ('perfis','configuracoes','notificacoes') then
            seq := pg_get_serial_sequence('public.' || t,'id');
            if seq is not null then
                execute format('grant usage, select on sequence %s to authenticated', seq);
            end if;
        end if;
    end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant update (username,nome,bio,avatar_url) on public.perfis to authenticated;
grant update (perfil_privado,notificacao_seguidor,notificacao_like,notificacao_comentario,tema) on public.configuracoes to authenticated;
grant insert on public.midias to authenticated;
grant insert,update,delete on public.avaliacoes,public.diario,public.listas,public.lista_midias to authenticated;
grant insert,delete on public.watchlist,public.favoritos,public.seguidores,public.likes_avaliacoes,public.likes_listas to authenticated;
grant insert,update,delete on public.comentarios to authenticated;
grant update (lida) on public.notificacoes to authenticated;

create policy perfis_select on public.perfis for select using (public.cinepop_perfil_visivel(id));
create policy perfis_update on public.perfis for update to authenticated
using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy configuracoes_select on public.configuracoes for select to authenticated using ((select auth.uid())=usuario_id);
create policy configuracoes_update on public.configuracoes for update to authenticated
using ((select auth.uid())=usuario_id) with check ((select auth.uid())=usuario_id);

create policy midias_select on public.midias for select using (true);
create policy midias_insert on public.midias for insert to authenticated with check ((select auth.uid()) is not null);

create policy avaliacoes_select on public.avaliacoes for select using (public.cinepop_perfil_visivel(usuario_id));
create policy avaliacoes_insert on public.avaliacoes for insert to authenticated with check ((select auth.uid())=usuario_id);
create policy avaliacoes_update on public.avaliacoes for update to authenticated
using ((select auth.uid())=usuario_id) with check ((select auth.uid())=usuario_id);
create policy avaliacoes_delete on public.avaliacoes for delete to authenticated using ((select auth.uid())=usuario_id);

create policy diario_select on public.diario for select using (public.cinepop_perfil_visivel(usuario_id));
create policy diario_insert on public.diario for insert to authenticated with check ((select auth.uid())=usuario_id);
create policy diario_update on public.diario for update to authenticated
using ((select auth.uid())=usuario_id) with check ((select auth.uid())=usuario_id);
create policy diario_delete on public.diario for delete to authenticated using ((select auth.uid())=usuario_id);

create policy watchlist_select on public.watchlist for select to authenticated using ((select auth.uid())=usuario_id);
create policy watchlist_insert on public.watchlist for insert to authenticated with check ((select auth.uid())=usuario_id);
create policy watchlist_delete on public.watchlist for delete to authenticated using ((select auth.uid())=usuario_id);

create policy favoritos_select on public.favoritos for select using (public.cinepop_perfil_visivel(usuario_id));
create policy favoritos_insert on public.favoritos for insert to authenticated with check ((select auth.uid())=usuario_id);
create policy favoritos_delete on public.favoritos for delete to authenticated using ((select auth.uid())=usuario_id);

create policy seguidores_select on public.seguidores for select using (
    (select auth.uid()) in (seguidor_id,seguido_id)
    or (public.cinepop_perfil_visivel(seguidor_id) and public.cinepop_perfil_visivel(seguido_id))
);
create policy seguidores_insert on public.seguidores for insert to authenticated with check (
    (select auth.uid())=seguidor_id and seguidor_id<>seguido_id and public.cinepop_perfil_visivel(seguido_id)
);
create policy seguidores_delete on public.seguidores for delete to authenticated using ((select auth.uid())=seguidor_id);

create policy listas_select on public.listas for select using (
    (select auth.uid())=usuario_id or (publica and public.cinepop_perfil_visivel(usuario_id))
);
create policy listas_insert on public.listas for insert to authenticated with check ((select auth.uid())=usuario_id);
create policy listas_update on public.listas for update to authenticated
using ((select auth.uid())=usuario_id) with check ((select auth.uid())=usuario_id);
create policy listas_delete on public.listas for delete to authenticated using ((select auth.uid())=usuario_id);

-- Consultar itens exige conseguir consultar a lista; gravar exige ser seu dono.
create policy lista_midias_select on public.lista_midias for select using (
    exists(select 1 from public.listas l where l.id=lista_id)
);
create policy lista_midias_insert on public.lista_midias for insert to authenticated with check (
    exists(select 1 from public.listas l where l.id=lista_id and l.usuario_id=(select auth.uid()))
);
create policy lista_midias_update on public.lista_midias for update to authenticated using (
    exists(select 1 from public.listas l where l.id=lista_id and l.usuario_id=(select auth.uid()))
) with check (
    exists(select 1 from public.listas l where l.id=lista_id and l.usuario_id=(select auth.uid()))
);
create policy lista_midias_delete on public.lista_midias for delete to authenticated using (
    exists(select 1 from public.listas l where l.id=lista_id and l.usuario_id=(select auth.uid()))
);

-- Preparacao da proxima etapa: permissoes de curtidas, comentarios e notificacoes.
create policy likes_avaliacoes_select on public.likes_avaliacoes for select using (
    public.cinepop_perfil_visivel(usuario_id) and exists(select 1 from public.avaliacoes a where a.id=avaliacao_id)
);
create policy likes_avaliacoes_insert on public.likes_avaliacoes for insert to authenticated with check (
    usuario_id=(select auth.uid()) and exists(select 1 from public.avaliacoes a where a.id=avaliacao_id)
);
create policy likes_avaliacoes_delete on public.likes_avaliacoes for delete to authenticated using (usuario_id=(select auth.uid()));

create policy comentarios_select on public.comentarios for select using (
    public.cinepop_perfil_visivel(usuario_id) and exists(select 1 from public.avaliacoes a where a.id=avaliacao_id)
);
create policy comentarios_insert on public.comentarios for insert to authenticated with check (
    usuario_id=(select auth.uid()) and length(trim(texto))>0 and exists(select 1 from public.avaliacoes a where a.id=avaliacao_id)
);
create policy comentarios_update on public.comentarios for update to authenticated using (usuario_id=(select auth.uid()))
with check (usuario_id=(select auth.uid()) and length(trim(texto))>0 and exists(select 1 from public.avaliacoes a where a.id=avaliacao_id));
create policy comentarios_delete on public.comentarios for delete to authenticated using (usuario_id=(select auth.uid()));

create policy likes_listas_select on public.likes_listas for select using (
    public.cinepop_perfil_visivel(usuario_id) and exists(select 1 from public.listas l where l.id=lista_id)
);
create policy likes_listas_insert on public.likes_listas for insert to authenticated with check (
    usuario_id=(select auth.uid()) and exists(select 1 from public.listas l where l.id=lista_id)
);
create policy likes_listas_delete on public.likes_listas for delete to authenticated using (usuario_id=(select auth.uid()));

create policy notificacoes_select on public.notificacoes for select to authenticated using (usuario_id=(select auth.uid()));
create policy notificacoes_update on public.notificacoes for update to authenticated
using (usuario_id=(select auth.uid())) with check (usuario_id=(select auth.uid()));
-- O cliente nao pode fabricar notificacoes. A geracao sera implementada no servidor.

-- Agregacao no banco: evita media incompleta quando ha mais de 1000 avaliacoes.
-- SECURITY INVOKER preserva o filtro RLS de perfis privados.
create or replace function public.cinepop_resumo_midia(p_midia_id bigint)
returns table(media numeric,total bigint)
language sql stable security invoker set search_path = ''
as $$
    select round(avg(nota),2),count(*) from public.avaliacoes where midia_id=p_midia_id;
$$;
revoke all on function public.cinepop_resumo_midia(bigint) from public;
grant execute on function public.cinepop_resumo_midia(bigint) to anon,authenticated;

-- Perfil e privacidade sao gravados juntos ou nenhuma alteracao e aplicada.
create or replace function public.cinepop_atualizar_perfil(
    p_nome text,p_username text,p_bio text,p_avatar_url text,p_privado boolean
) returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare
    v_user uuid := (select auth.uid());
    v_perfil public.perfis;
begin
    if v_user is null then raise exception 'Entre na sua conta.'; end if;
    if p_username is null or lower(trim(p_username)) !~ '^[a-z0-9._]{3,30}$' then
        raise exception 'Nome de usuario invalido.';
    end if;
    if length(p_nome)>80 or length(p_bio)>500 or length(p_avatar_url)>2000 then
        raise exception 'Os dados do perfil excedem o tamanho permitido.';
    end if;
    if coalesce(p_avatar_url,'')<>'' and p_avatar_url !~* '^https://' then
        raise exception 'O avatar deve usar HTTPS.';
    end if;
    update public.perfis set nome=p_nome,username=lower(trim(p_username)),bio=p_bio,avatar_url=p_avatar_url
    where id=v_user returning * into v_perfil;
    if not found then raise exception 'Perfil nao encontrado.'; end if;
    update public.configuracoes set perfil_privado=coalesce(p_privado,false) where usuario_id=v_user;
    if not found then raise exception 'Configuracoes nao encontradas.'; end if;
    return to_jsonb(v_perfil);
end $$;
revoke all on function public.cinepop_atualizar_perfil(text,text,text,text,boolean) from public;
grant execute on function public.cinepop_atualizar_perfil(text,text,text,text,boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
