export function safeRedirectPath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  const base = "https://local.invalid";
  try {
    const destination = new URL(value, base);
    return destination.origin === base ? `${destination.pathname}${destination.search}${destination.hash}` : "/";
  } catch {
    return "/";
  }
}
