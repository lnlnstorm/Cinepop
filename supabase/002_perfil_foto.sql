-- Execute depois de 001_cinepop.sql. Nao apaga tabelas nem registros.
-- Cria o bucket privado de avatares e permite salvar sua referencia no perfil.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',false,1048576,array['image/jpeg'])
on conflict (id) do update
set public=false,file_size_limit=1048576,allowed_mime_types=array['image/jpeg'];

-- O aplicativo reduz a foto para JPEG 512x512 antes do envio.
-- Objetos usam o caminho <id-do-usuario>/<uuid-da-foto>.jpg.
drop policy if exists cinepop_avatar_select on storage.objects;
create policy cinepop_avatar_select on storage.objects for select to anon,authenticated
using (
    bucket_id='avatars' and (
        split_part(name,'/',1)=(select auth.uid())::text
        or exists (
            select 1 from public.perfis p
            where p.id::text=split_part(name,'/',1)
            and p.avatar_url='avatars/' || name
        )
    )
);
drop policy if exists cinepop_avatar_insert on storage.objects;
create policy cinepop_avatar_insert on storage.objects for insert to authenticated
with check (
    bucket_id='avatars'
    and split_part(name,'/',1)=(select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
);
drop policy if exists cinepop_avatar_delete on storage.objects;
create policy cinepop_avatar_delete on storage.objects for delete to authenticated
using (bucket_id='avatars' and split_part(name,'/',1)=(select auth.uid())::text);

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
        if p_avatar_url !~ ('^avatars/' || v_user::text || '/[0-9a-f-]{36}\.jpg$') then
            raise exception 'Foto invalida. Envie um arquivo seu ou use um link HTTPS.';
        end if;
        if not exists (
            select 1 from storage.objects
            where bucket_id='avatars' and name=substring(p_avatar_url from 9)
        ) then
            raise exception 'Envie a foto antes de salvar o perfil.';
        end if;
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
notify pgrst,'reload schema';
commit;
