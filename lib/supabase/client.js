import { createBrowserClient } from "@supabase/ssr";
import { browserOnlyAuthCookieName, supabaseAuthCookieName } from "@/lib/supabase/config";

const browserConfigKeys = {
  url: "yiyan.supabase.url",
  anonKey: "yiyan.supabase.anonKey"
};

export function getBrowserSupabaseConfig() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const envAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (envUrl && envAnonKey) {
    return { supabaseUrl: envUrl, supabaseAnonKey: envAnonKey, source: "env" };
  }

  if (typeof window === "undefined") {
    return { supabaseUrl: "", supabaseAnonKey: "", source: "missing" };
  }

  const localUrl = window.localStorage.getItem(browserConfigKeys.url) || "";
  const localAnonKey = window.localStorage.getItem(browserConfigKeys.anonKey) || "";

  return {
    supabaseUrl: localUrl.trim(),
    supabaseAnonKey: localAnonKey.trim(),
    source: localUrl && localAnonKey ? "browser" : "missing"
  };
}

export function saveBrowserSupabaseConfig({ supabaseUrl, supabaseAnonKey }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(browserConfigKeys.url, supabaseUrl.trim());
  window.localStorage.setItem(browserConfigKeys.anonKey, supabaseAnonKey.trim());
}

export function clearBrowserSupabaseConfig() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(browserConfigKeys.url);
  window.localStorage.removeItem(browserConfigKeys.anonKey);
}

export function hasSupabaseConfig() {
  const { supabaseUrl, supabaseAnonKey } = getBrowserSupabaseConfig();
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function createClient() {
  const { supabaseUrl, supabaseAnonKey, source } = getBrowserSupabaseConfig();
  const cookieName = source === "browser" ? browserOnlyAuthCookieName : supabaseAuthCookieName;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase config. Set it in /settings or .env.local.");
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      name: cookieName
    },
    auth: {
      storageKey: cookieName
    }
  });
}
