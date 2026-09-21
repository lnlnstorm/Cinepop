const { PGlite } = require("../.cinepop-tools/node_modules/@electric-sql/pglite");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const path = require("node:path");
async function main() {
    const db = new PGlite();
    await db.exec("create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key, raw_user_meta_data jsonb);");
    await db.exec("create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;");
    const schemaPath = process.argv[2] || path.join(__dirname,"schema-fixture.sql");
    if (!schemaPath) throw new Error("Informe o caminho do SQL original como argumento.");
    const original = fs.readFileSync(schemaPath, "utf8");
    const start = original.indexOf("create table if not exists public.perfis");
    assert.ok(start >= 0, "Schema original deve conter perfis");
    await db.exec(original.slice(start));
    const migration = fs.readFileSync(path.join(__dirname, "../supabase/001_cinepop.sql"), "utf8");
    await db.exec(migration);
    await db.exec(migration); // Repetibilidade sem apagar dados.
    const a = "11111111-1111-4111-8111-111111111111";
    const b = "22222222-2222-4222-8222-222222222222";
    await db.query("insert into auth.users values ($1,$2),($3,$4)", [a, JSON.stringify({ username: "ANA", nome: "Ana" }), b, JSON.stringify({ username: "bia", nome: "Bia" })]);
    assert.equal((await db.query("select username from public.perfis where id=$1", [a])).rows[0].username, "ana");
    assert.equal((await db.query("select count(*) from public.configuracoes")).rows[0].count, 2);
    async function as(user, sql, params = []) {
        await db.exec("set role " + (user ? "authenticated" : "anon"));
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user || ""]);
        try { return await db.query(sql, params); }
        finally { await db.exec("reset role"); }
    }
    await as(a, "insert into public.midias(tmdb_id,tipo,titulo) values (10,'movie','Filme'),(10,'tv','Serie')");
    await as(a, "insert into public.avaliacoes(usuario_id,midia_id,nota) values ($1,1,4)", [a]);
    await as(b, "insert into public.avaliacoes(usuario_id,midia_id,nota) values ($1,1,2)", [b]);
    const avg = (await as(null, "select * from public.cinepop_resumo_midia(1)")).rows[0];
    assert.equal(Number(avg.media), 3); assert.equal(Number(avg.total), 2);
    await assert.rejects(as(b, "insert into public.avaliacoes(usuario_id,midia_id,nota) values ($1,2,5)", [a]));
    assert.equal((await as(b, "update public.avaliacoes set nota=5 where usuario_id=$1 returning id", [a])).rows.length, 0);
    await as(a, "insert into public.watchlist(usuario_id,midia_id) values ($1,1)", [a]);
    assert.equal((await as(b, "select * from public.watchlist")).rows.length, 0);
    await assert.rejects(as(null, "select * from public.watchlist"));
    await as(a, "insert into public.favoritos(usuario_id,midia_id) values ($1,1)", [a]);
    await as(a, "insert into public.listas(usuario_id,titulo,publica) values ($1,'Publica',true),($1,'Privada',false)", [a]);
    await as(a, "insert into public.lista_midias(lista_id,midia_id) values (1,1),(2,1)");
    assert.equal((await as(b, "select * from public.listas")).rows.length, 1);
    assert.equal((await as(b, "select * from public.lista_midias")).rows.length, 1);
    await assert.rejects(as(b, "insert into public.lista_midias(lista_id,midia_id) values (1,2)"));
    assert.equal((await as(b, "delete from public.lista_midias where lista_id=1 returning id")).rows.length, 0);
    await as(b, "insert into public.seguidores(seguidor_id,seguido_id) values ($1,$2)", [b, a]);
    await assert.rejects(as(a, "insert into public.seguidores(seguidor_id,seguido_id) values ($1,$1)", [a]));
    await as(a, "select public.cinepop_atualizar_perfil('Ana','ana','Bio',null,true)");
    assert.equal((await as(b, "select * from public.perfis where id=$1", [a])).rows.length, 0);
    assert.equal((await as(b, "select * from public.favoritos where usuario_id=$1", [a])).rows.length, 0);
    assert.equal((await as(b, "select * from public.listas where usuario_id=$1", [a])).rows.length, 0);
    assert.equal((await as(b, "select * from public.lista_midias")).rows.length, 0);
    assert.equal(Number((await as(b, "select * from public.cinepop_resumo_midia(1)")).rows[0].media), 2);
    assert.equal(Number((await as(a, "select * from public.cinepop_resumo_midia(1)")).rows[0].media), 3);
    await assert.rejects(as(b, "insert into public.notificacoes(usuario_id,tipo) values ($1,'like')", [a]));
    await as(a, "select public.cinepop_atualizar_perfil('Ana','ana','Bio',null,false)");
    await as(a, "update public.avaliacoes set nota=5 where midia_id=1");
    assert.equal(Number((await as(null, "select * from public.cinepop_resumo_midia(1)")).rows[0].media), 3.5);
    // Rerun preserves all existing user records.
    await db.exec(migration);
    assert.equal((await db.query("select count(*) from public.avaliacoes")).rows[0].count, 2);
    console.log("OK: SQL executado duas vezes, trigger, grants, RLS entre duas contas, privacidade, itens de listas, media e preservacao de dados.");

    // Replica minima do schema Storage, somente neste banco descartavel.
    await db.exec("create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(id bigint generated by default as identity primary key,bucket_id text references storage.buckets(id),name text,unique(bucket_id,name)); alter table storage.objects enable row level security; grant usage on schema storage to anon,authenticated; grant select on storage.objects to anon; grant select,insert,delete on storage.objects to authenticated; grant usage on sequence storage.objects_id_seq to authenticated;");
    const avatarMigration=fs.readFileSync(path.join(__dirname,"../supabase/002_perfil_foto.sql"),"utf8");
    await db.exec(avatarMigration);
    await db.exec(avatarMigration);
    const avatarPath=a+"/33333333-3333-4333-8333-333333333333.jpg";
    await assert.rejects(as(b,"insert into storage.objects(bucket_id,name) values ('avatars',$1)",[avatarPath]));
    await assert.rejects(as(null,"insert into storage.objects(bucket_id,name) values ('avatars',$1)",[avatarPath]));
    await as(a,"insert into storage.objects(bucket_id,name) values ('avatars',$1)",[avatarPath]);
    assert.equal((await as(b,"select * from storage.objects")).rows.length,0,"Foto nao publicada fica privada");
    await assert.rejects(as(b,"select public.cinepop_atualizar_perfil('Bia','bia','', $1, false)",["avatars/"+avatarPath]));
    await as(a,"select public.cinepop_atualizar_perfil('Ana','ana','', $1, false)",["avatars/"+avatarPath]);
    assert.equal((await as(null,"select * from storage.objects")).rows.length,1,"Avatar do perfil publico visivel");
    assert.equal((await as(b,"delete from storage.objects returning id")).rows.length,0);
    await as(a,"select public.cinepop_atualizar_perfil('Ana','ana','', $1, true)",["avatars/"+avatarPath]);
    assert.equal((await as(b,"select * from storage.objects")).rows.length,0,"Perfil privado protege avatar");
    assert.equal((await as(a,"select * from storage.objects")).rows.length,1);
    await as(a,"select public.cinepop_atualizar_perfil('Ana','ana','',null,false)");
    assert.equal((await as(null,"select * from storage.objects")).rows.length,0,"Foto antiga nao pode mais ser publicada");
    await as(a,"delete from storage.objects where name=$1",[avatarPath]);
    assert.equal((await as(a,"select * from storage.objects")).rows.length,0);
    console.log("OK: upload autorizado por dono, avatar privado/publico, referencia valida, exclusao e repetibilidade.");

    await db.close();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
