const readOnlyPaths = new Set(["/", "/articles", "/paths", "/terms", "/methods", "/tools", "/search", "/help", "/privacy"]);
const samplePaths = new Set(["/articles/sample-research-question", "/articles/sample-evidence-note"]);

export function isDemoRequestAllowed(pathname, method, env = process.env) {
  return env.DEMO_MODE === "true"
    && !env.NEXT_PUBLIC_SUPABASE_URL && !env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    && ["GET", "HEAD"].includes(method)
    && (readOnlyPaths.has(pathname) || samplePaths.has(pathname));
}
