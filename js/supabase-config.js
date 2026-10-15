/**
 * Harbor & Thread — Supabase Frontend Configuration
 *
 * SECURITY INSTRUCTIONS:
 * 1. ONLY use your Supabase Project URL and PUBLISHABLE / ANON key here.
 * 2. NEVER put your Supabase service_role key, database connection strings,
 *    or database passwords in this file or anywhere in frontend code.
 * 3. Frontend access is protected via PostgreSQL Row Level Security (RLS).
 *
 * HOW TO CONFIGURE:
 * - Enter your SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY below.
 * - If running under an environment that provides `window.__ENV__` or `process.env`,
 *   the client will automatically read from it first.
 */

const envSource =
  typeof window !== 'undefined' && window.__ENV__
    ? window.__ENV__
    : typeof process !== 'undefined' && process.env
    ? process.env
    : {};

const SUPABASE_CONFIG = {
  // Supabase Project URL (e.g. https://xyzcompany.supabase.co)
  SUPABASE_URL: envSource.SUPABASE_URL || 'https://nyjtsnwlnrmgiqladvsa.supabase.co',

  // Supabase Publishable / Anon Key (safe for browser client with RLS)
  SUPABASE_PUBLISHABLE_KEY: envSource.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_vJxuCCdiIRv2rEK1dgj1mA_0hnkx8E4',
};

// Protect against accidental exposure of secret service keys
if (
  typeof SUPABASE_CONFIG.SUPABASE_PUBLISHABLE_KEY === 'string' &&
  SUPABASE_CONFIG.SUPABASE_PUBLISHABLE_KEY.startsWith('sb_secret_')
) {
  console.error(
    'CRITICAL SECURITY WARNING: A secret service key was detected in frontend configuration! ' +
    'Immediately revoke this key in your Supabase dashboard and replace it with your Publishable/Anon key.'
  );
}

// Expose globally for browser usage
if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = SUPABASE_CONFIG;
}

// Export for ES modules / CommonJS / test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SUPABASE_CONFIG;
}
