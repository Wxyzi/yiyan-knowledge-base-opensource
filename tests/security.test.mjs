import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { safeRedirectPath } from "../lib/safeRedirect.js";
import { isDemoRequestAllowed } from "../lib/demoAccess.js";
import { getAiProviderConfig } from "../lib/aiProvider.js";

test("redirects remain on the same origin", () => {
  for (const input of ["https://example.com", "//example.com", "/\\example.com", "/\n/evil", null, "javascript:alert(1)"]) assert.equal(safeRedirectPath(input), "/");
  assert.equal(safeRedirectPath("/articles/sample-evidence-note?lang=en#source"), "/articles/sample-evidence-note?lang=en#source");
});
test("demo opens only sample reading without any Supabase credentials", () => {
  const env = { DEMO_MODE: "true" };
  assert.equal(isDemoRequestAllowed("/articles/sample-evidence-note", "GET", env), true);
  for (const route of ["/admin", "/settings", "/api/ai-search", "/account", "/articles/private-note", "/ai-history"]) assert.equal(isDemoRequestAllowed(route, "GET", env), false);
  assert.equal(isDemoRequestAllowed("/", "POST", env), false);
  assert.equal(isDemoRequestAllowed("/", "GET", {}), false);
  assert.equal(isDemoRequestAllowed("/", "GET", { ...env, NEXT_PUBLIC_SUPABASE_URL: "https://example.com" }), false);
  assert.equal(isDemoRequestAllowed("/", "GET", { ...env, NEXT_PUBLIC_SUPABASE_ANON_KEY: "sample" }), false);
});
test("tracking is opt-in at both client and API", () => {
  const client = fs.readFileSync(new URL("../components/ArticleViewTracker.jsx", import.meta.url), "utf8");
  const server = fs.readFileSync(new URL("../app/api/article-views/route.js", import.meta.url), "utf8");
  assert.match(client, /NEXT_PUBLIC_ENABLE_LEARNING_ANALYTICS !== "true"/);
  assert.match(server, /ENABLE_LEARNING_ANALYTICS !== "true"/);
});
test("schema enables RLS and prevents client role assignment", () => {
  const sql = fs.readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
  for (const table of ["profiles", "comments", "favorites", "article_views", "ai_conversations", "ai_chat_history"]) assert.ok(sql.includes(`alter table public.${table} enable row level security`));
  assert.match(sql, /grant update\(username\) on public\.profiles to authenticated/);
  assert.match(sql, /revoke update on public\.profiles from anon, authenticated/);
  assert.match(sql, /old\.role is distinct from new\.role/);
});

test("AI never falls back to another provider's credential", () => {
  const names = ["OPENCODE_API_KEY", "OPENCODE_CHAT_MODEL", "ZHIPU_API_KEY"];
  const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    delete process.env.OPENCODE_API_KEY;
    process.env.ZHIPU_API_KEY = "other-provider-test-value";
    assert.equal(getAiProviderConfig().hasApiKey, false);
    process.env.OPENCODE_API_KEY = "own-provider-test-value";
    process.env.OPENCODE_CHAT_MODEL = "selected-model";
    assert.equal(getAiProviderConfig().apiKey, "own-provider-test-value");
    assert.equal(getAiProviderConfig().model, "selected-model");
  } finally {
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  }
});
