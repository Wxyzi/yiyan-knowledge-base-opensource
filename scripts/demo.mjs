import { spawn } from "node:child_process";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), true);
const serviceKeys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "OPENCODE_API_KEY", "ZHIPU_API_KEY"];
if (serviceKeys.some(key => process.env[key])) {
  console.error("Demo mode requires all service credentials to be empty. Use npm run dev for a configured application.");
  process.exitCode = 1;
} else {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", ...process.argv.slice(2)], {
    stdio: "inherit", env: { ...process.env, DEMO_MODE: "true", NEXT_PUBLIC_ENABLE_LEARNING_ANALYTICS: "false", ENABLE_LEARNING_ANALYTICS: "false" }
  });
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
  child.on("exit", code => { process.exitCode = code || 0; });
}
