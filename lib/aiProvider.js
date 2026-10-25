export const AI_PROVIDER_NAME = "OpenCode Go";
export const AI_CHAT_URL = "https://opencode.ai/zen/go/v1/chat/completions";
export const DEFAULT_AI_MODEL = "glm-5.3";

function cleanEnv(value) {
  return String(value || "").trim();
}

function cleanApiKey(value) {
  let raw = cleanEnv(value);
  const assignment = raw.match(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*([\s\S]+)$/);
  if (assignment) raw = assignment[1].trim();
  if (
    raw.length >= 2
    && ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))
  ) {
    raw = raw.slice(1, -1).trim();
  }
  if (!raw || !/\s/.test(raw)) return raw;

  const candidates = raw
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => /^[A-Za-z0-9._-]{20,}$/.test(part));

  return candidates.length === 1 ? candidates[0] : raw;
}

export function getAiProviderConfig() {
  const openCodeApiKey = cleanApiKey(process.env.OPENCODE_API_KEY);
  const model = cleanEnv(process.env.OPENCODE_CHAT_MODEL) || DEFAULT_AI_MODEL;
  const apiKey = openCodeApiKey;

  return {
    apiKey,
    hasApiKey: Boolean(apiKey),
    keySource: openCodeApiKey ? "OPENCODE_API_KEY" : null,
    model,
    provider: AI_PROVIDER_NAME,
    url: AI_CHAT_URL
  };
}
