-- Execute depois de 001_cinepop.sql e 002_perfil_foto.sql no SQL Editor.
-- Acrescenta links sociais e tags; diário, comentários e curtidas já existem no modelo inicial.
begin;

alter table public.perfis add column if not exists instagram_url text;
alter table public.perfis add column if not exists letterboxd_url text;
alter table public.listas add column if not exists tags text[] not null default '{}';
grant update (instagram_url,letterboxd_url) on public.perfis to authenticated;

alter table public.perfis drop constraint if exists perfis_instagram_url_check;
alter table public.perfis add constraint perfis_instagram_url_check check (
    instagram_url is null or instagram_url ~* '^https://(www\.)?instagram\.com/[a-z0-9._-]+/?$'
);
alter table public.perfis drop constraint if exists perfis_letterboxd_url_check;
alter table public.perfis add constraint perfis_letterboxd_url_check check (
    letterboxd_url is null or letterboxd_url ~* '^https://(www\.)?letterboxd\.com/[a-z0-9_-]+/?$'
);

create or replace function public.cinepop_atualizar_perfil(
    p_nome text,p_username text,p_bio text,p_avatar_url text,p_privado boolean,
    p_instagram_url text,p_letterboxd_url text
) returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare
    v_user uuid := (select auth.uid());
    v_perfil public.perfis;
begin
    if v_user is null then raise exception 'Entre na sua conta.'; end if;
    if p_username is null or lower(trim(p_username)) !~ '^[a-z0-9._]{3,30}$' then raise exception 'Nome de usuario invalido.'; end if;
    if length(p_nome)>80 or length(p_bio)>500 or length(p_avatar_url)>2000 or length(p_instagram_url)>200 or length(p_letterboxd_url)>200 then raise exception 'Os dados do perfil excedem o tamanho permitido.'; end if;
    if coalesce(p_avatar_url,'')<>'' and p_avatar_url !~* '^https://' then
        if p_avatar_url !~ ('^avatars/' || v_user::text || '/[0-9a-f-]{36}\.jpg$') then raise exception 'Foto invalida.'; end if;
        if not exists (select 1 from storage.objects where bucket_id='avatars' and name=substring(p_avatar_url from 9)) then raise exception 'Envie a foto antes de salvar o perfil.'; end if;
    end if;
    if coalesce(p_instagram_url,'')<>'' and p_instagram_url !~* '^https://(www\.)?instagram\.com/[a-z0-9._-]+/?$' then raise exception 'Link do Instagram invalido.'; end if;
    if coalesce(p_letterboxd_url,'')<>'' and p_letterboxd_url !~* '^https://(www\.)?letterboxd\.com/[a-z0-9_-]+/?$' then raise exception 'Link do Letterboxd invalido.'; end if;
    update public.perfis set nome=p_nome, username=lower(trim(p_username)), bio=p_bio, avatar_url=p_avatar_url,
        instagram_url=nullif(trim(p_instagram_url),''), letterboxd_url=nullif(trim(p_letterboxd_url),'')
    where id=v_user returning * into v_perfil;
    update public.configuracoes set perfil_privado=coalesce(p_privado,false) where usuario_id=v_user;
    return to_jsonb(v_perfil);
end $$;
revoke all on function public.cinepop_atualizar_perfil(text,text,text,text,boolean,text,text) from public;
grant execute on function public.cinepop_atualizar_perfil(text,text,text,text,boolean,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
