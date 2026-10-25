import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const ignored = new Set([".git", "node_modules", ".next", ".vercel", ".playwright-cli", ".playwright"]);
const allowedRoots = new Set(["app", "components", "content", "data", "lib", "public", "scripts", "supabase", "tests"]);
const allowedFiles = new Set([".gitattributes", ".gitignore", ".env.example", "AGENTS.md", "CLAUDE.md", "LICENSE", "README.md", "SECURITY.md", "THIRD_PARTY_NOTICES.md", "jsconfig.json", "next.config.mjs", "package.json", "package-lock.json", "proxy.js"]);
const sampleFiles = ["content/corpus/sample-evidence-note.md", "content/methods/sample-research-question.md"];
const allowedAssets = new Set(["public/favicon.svg", "public/fonts/source-serif-4-semibold.ttf", "public/fonts/OFL-Source-Serif-4.txt"]);
const forbiddenFile = /(?:^|\/)(?:\.env(?:\..+)?|id_rsa|id_ed25519)$|\.(?:log|bundle|zip|bak|dump|pem|key|p12|sqlite|db|map)$/i;
const rules = [
  ["private-key", /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/],
  ["github-token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ["provider-secret", /\b(?:sk-[A-Za-z0-9_-]{24,}|sb_secret_[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})\b/],
  ["jwt", /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/],
  ["credential-in-url", /https?:\/\/[^\s/:]+:[^\s/@]+@/],
  ["specific-supabase-instance", /https?:\/\/[a-z0-9]{20}\.supabase\.co/i],
  ["local-user-path", /[A-Za-z]:[\\/]Users[\\/][^\s]+/i]
];
const issues = [];
function walk(dir = "") {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const name = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) { issues.push(`${name}: symbolic links are not allowed`); return []; }
    if (entry.isDirectory()) return ignored.has(entry.name) ? [] : walk(name);
    return [name];
  });
}
const files = walk();
const tracked = fs.existsSync(path.join(root, ".git"))
  ? execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean)
  : [];
for (const name of new Set([...files, ...tracked])) {
  if (!allowedFiles.has(name) && !allowedRoots.has(name.split("/")[0])) issues.push(`${name}: not in release allowlist`);
  if (name !== ".env.example" && forbiddenFile.test(name)) issues.push(`${name}: environment, backup, or credential file`);
  if (name.startsWith("public/") && !allowedAssets.has(name)) issues.push(`${name}: unreviewed public asset`);
  const fullPath = path.join(root, name);
  if (!fs.existsSync(fullPath)) { issues.push(`${name}: tracked file is missing`); continue; }
  if (name.endsWith(".ttf")) continue;
  const text = fs.readFileSync(fullPath, "utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const [rule, pattern] of rules) if (pattern.test(line)) issues.push(`${name}:${index + 1}: ${rule}`);
  });
}
const actualContent = files.filter(name => name.startsWith("content/")).sort();
if (JSON.stringify(actualContent) !== JSON.stringify(sampleFiles)) issues.push("content/: release must contain exactly the two approved samples");
const environment = fs.readFileSync(path.join(root, ".env.example"), "utf8");
for (const line of environment.split(/\r?\n/)) {
  if (/^(?:\w*(?:KEY|SECRET|TOKEN)|NEXT_PUBLIC_SUPABASE_URL)=.+/.test(line)) issues.push(".env.example: credential fields must be blank");
}
const data = fs.readdirSync(path.join(root, "data")).sort();
const expectedData = ["changelog.js", "knowledgeRelations.js", "learningPaths.js", "researchMethods.js", "terms.js", "toolGuides.js"];
if (JSON.stringify(data) !== JSON.stringify(expectedData)) issues.push("data/: unexpected content catalog");

if (issues.length) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Release file check passed: ${files.length} files; exactly 2 sample articles; no matched secret patterns.`);
  console.log("This static check does not audit dependencies, Git history, cloud permissions, or runtime vulnerabilities.");
}
