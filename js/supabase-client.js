/**
 * Harbor & Thread — Reusable Supabase Client
 *
 * This module initializes and exports a single, reusable Supabase client
 * instance that can be shared across all pages (Home, Lookbook, Experience, Feedback).
 *
 * It supports:
 * - Direct `<script>` tag inclusion via CDN
 * - Dynamic asynchronous loading if the CDN script tag was not placed in HTML
 * - ES Module imports (import { getSupabaseClient } from './js/supabase-client.js')
 * - Global browser access via `window.supabaseClient`
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./supabase-config'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./supabase-config'));
  } else {
    const exports = factory(root.SUPABASE_CONFIG || {});
    root.HarborSupabase = exports;
    root.getSupabaseClient = exports.getSupabaseClient;
    root.checkSupabaseConnection = exports.checkSupabaseConnection;
  }
})(typeof self !== 'undefined' ? self : this, function (config) {
  'use strict';

  let clientInstance = null;
  let clientPromise = null;

  // Supabase CDN endpoint
  const CDN_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

  /**
   * Reads current configuration supporting:
   * 1. window.__ENV__ (injected by hosting platform / build step)
   * 2. process.env (Node.js / bundler environment variables)
   * 3. window.SUPABASE_CONFIG (browser config object from js/supabase-config.js)
   * 4. Passed module config
   */
  function getConfig() {
    const envSource =
      typeof window !== 'undefined' && window.__ENV__
        ? window.__ENV__
        : typeof process !== 'undefined' && process.env
        ? process.env
        : {};

    const globalConfig = (typeof window !== 'undefined' && window.SUPABASE_CONFIG) || config || {};

    const url = (envSource.SUPABASE_URL || globalConfig.SUPABASE_URL || '').trim();
    const key = (envSource.SUPABASE_PUBLISHABLE_KEY || globalConfig.SUPABASE_PUBLISHABLE_KEY || '').trim();

    // Strict Security Guard: Never allow service_role secret keys in the browser
    if (key) {
      const isSecret =
        key.startsWith('sb_secret_') ||
        (key.toLowerCase().includes('service_role') && !key.startsWith('sb_publishable_'));
      if (isSecret) {
        console.error(
          '[CRITICAL SECURITY ERROR] A Supabase service_role secret key was detected in frontend code! ' +
          'Never use service_role keys or database passwords in the browser. ' +
          'Immediately replace it with your SUPABASE_PUBLISHABLE_KEY (anon key).'
        );
      }
    }

    return { url, key };
  }

  /**
   * Dynamically loads the Supabase JS SDK if not already loaded in the document.
   */
  function loadSupabaseSDK() {
    if (typeof window === 'undefined') return Promise.reject(new Error('Window not found'));

    // If already loaded globally by a <script> tag
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      return Promise.resolve(window.supabase);
    }

    // Check if script tag is already being loaded
    const existingScript = document.querySelector(`script[src*="supabase-js"]`);
    if (existingScript) {
      return new Promise((resolve, reject) => {
        existingScript.addEventListener('load', () => resolve(window.supabase));
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Supabase SDK from CDN')));
      });
    }

    // Dynamically inject CDN script tag
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CDN_URL;
      script.async = true;
      script.onload = () => {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
          resolve(window.supabase);
        } else {
          reject(new Error('Supabase SDK loaded but createClient is not available'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Supabase SDK from CDN'));
      document.head.appendChild(script);
    });
  }

  /**
   * Initializes the Supabase client synchronously if the SDK is already present,
   * or sets up the client promise.
   */
  function initClientSync() {
    const { url, key } = getConfig();

    if (!url || !key) {
      console.warn(
        '[Harbor & Thread] Supabase URL or Publishable Key is not configured. ' +
        'Please check js/supabase-config.js.'
      );
      return null;
    }

    if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        clientInstance = window.supabase.createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        });
        window.supabaseClient = clientInstance;
        return clientInstance;
      } catch (err) {
        console.error('[Harbor & Thread] Failed to initialize Supabase client:', err);
        return null;
      }
    }
    return null;
  }

  /**
   * Retrieves or initializes the shared Supabase client (asynchronously).
   * Ensures SDK is loaded and returns the client instance.
   *
   * @returns {Promise<object|null>} The Supabase client instance
   */
  async function getSupabaseClient() {
    if (clientInstance) {
      return clientInstance;
    }

    if (clientPromise) {
      return clientPromise;
    }

    clientPromise = (async () => {
      const { url, key } = getConfig();
      if (!url || !key) {
        console.warn(
          '[Harbor & Thread] Supabase URL or Publishable Key missing. ' +
          'Configure them in js/supabase-config.js.'
        );
        return null;
      }

      try {
        const sdk = await loadSupabaseSDK();
        clientInstance = sdk.createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        });
        if (typeof window !== 'undefined') {
          window.supabaseClient = clientInstance;
        }
        return clientInstance;
      } catch (err) {
        console.error('[Harbor & Thread] Error loading Supabase SDK:', err);
        return null;
      }
    })();

    return clientPromise;
  }

  /**
   * Tests the connection to the configured Supabase instance.
   * Useful for debugging and verifying connection setup.
   *
   * @returns {Promise<{success: boolean, message: string, details?: any}>}
   */
  async function checkSupabaseConnection() {
    const { url, key } = getConfig();

    if (!url || !key) {
      return {
        success: false,
        message: 'Supabase URL or Publishable Key is not configured in js/supabase-config.js.'
      };
    }

    try {
      const client = await getSupabaseClient();
      if (!client) {
        return {
          success: false,
          message: 'Could not initialize Supabase client instance.'
        };
      }

      // Safe client-side check with Publishable / Anon key using Supabase Auth
      const { data, error } = await client.auth.getSession();
      if (error) {
        return {
          success: false,
          message: `Supabase client error: ${error.message}`,
          error
        };
      }

      return {
        success: true,
        message: `Connected successfully to Supabase project: ${url}`,
        hasActiveSession: Boolean(data?.session)
      };
    } catch (err) {
      return {
        success: false,
        message: `Network error connecting to Supabase: ${err.message}`,
        error: err
      };
    }
  }

  // Attempt synchronous initialization if SDK already loaded
  initClientSync();

  return {
    getSupabaseClient,
    checkSupabaseConnection,
    getConfig,
    // Getter property for direct access when already initialized
    get client() {
      return clientInstance;
    }
  };
});
