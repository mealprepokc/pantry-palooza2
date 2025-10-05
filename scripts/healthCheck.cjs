// Simple Supabase health check using anon key
// Reads EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY from .env.development

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      if (!line || line.trim().startsWith('#')) return;
      const idx = line.indexOf('=');
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key && !(key in process.env)) process.env[key] = value;
    });
  } catch (e) {
    console.warn('Could not read env file at', filePath, e.message);
  }
}

async function main() {
  const root = process.cwd();
  loadEnv(path.join(root, '.env.development'));
  loadEnv(path.join(root, '.env')); // fallback

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.');
    process.exit(1);
  }

  const supabase = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const results = { envLoaded: !!url && !!anon, url, tables: {}, functions: {} };

  // Check tables existence by attempting a harmless select
  const tableChecks = ['user_library', 'user_selections'];
  for (const t of tableChecks) {
    try {
      const { error } = await supabase.from(t).select('*', { count: 'estimated', head: true }).limit(1);
      results.tables[t] = error ? { ok: false, error: error.message } : { ok: true };
    } catch (e) {
      results.tables[t] = { ok: false, error: e.message };
    }
  }

  // Check Edge Function with a minimally valid body used by the app
  try {
    const { data, error } = await supabase.functions.invoke('generate-dishes', {
      body: {
        seasonings: ['Salt'],
        vegetables: ['Tomatoes'],
        entrees: ['Chicken'],
        pastas: ['Spaghetti'],
        equipment: ['Stovetop'],
        filters: { mealType: 'Dinner', servings: 2, maxTimeMinutes: 30, mode: 'strict' },
      },
    });
    results.functions['generate-dishes'] = error ? { ok: false, error: error.message } : { ok: true, sampleResponseKeys: data ? Object.keys(data) : [] };
  } catch (e) {
    results.functions['generate-dishes'] = { ok: false, error: e.message };
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
