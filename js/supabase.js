// Conexao compartilhada pelas paginas.

const SUPABASE_URL = "https://okuznjypxhdkgxlnfxdf.supabase.co";
const SUPABASE_KEY = "sb_publishable_6iNOlTn6NPGSWBJWqnPFhA_sjazn9A8";

const { createClient } = window.supabase;

const db = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
