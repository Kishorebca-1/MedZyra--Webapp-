const { createClient } = require("@supabase/supabase-js");

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Copy .env.example to .env and add your Supabase credentials."
    );
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
);

module.exports = supabase;