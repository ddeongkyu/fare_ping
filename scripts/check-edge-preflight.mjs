#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const PROJECT_REF = "zvtedscvvwwkcdmvfgro";
const REQUIRED_SECRET_KEYS = ["TRAVELPAYOUTS_TOKEN", "FAREPING_CRON_SECRET"];
const REQUIRED_SERVICE_KEY_OPTIONS = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"];
const SECRET_FILE = "supabase/.env.edge.local";
const SECRET_EXAMPLE_FILE = "supabase/.env.example";

function readText(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function parseEnv(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function isPlaceholder(value = "") {
  return !value || /your_|replace_|here|token|key/i.test(value);
}

function check(label, ok, detail = "") {
  const icon = ok ? "OK" : "TODO";
  console.log(`${icon} ${label}${detail ? ` - ${detail}` : ""}`);
  return ok;
}

let ok = true;

console.log("FarePing Edge Function preflight\n");

ok = check("Edge Function source", existsSync("supabase/functions/check-fares/index.ts"), "supabase/functions/check-fares/index.ts") && ok;
ok = check("Supabase function config", readText("supabase/config.toml").includes("[functions.check-fares]"), "verify_jwt is configured in supabase/config.toml") && ok;
ok = check("Schedule SQL template", existsSync("supabase/sql/008_optional_schedule_edge_function.sql"), "optional pg_cron template") && ok;
ok = check("Secret example file", existsSync(SECRET_EXAMPLE_FILE), SECRET_EXAMPLE_FILE) && ok;

const cli = spawnSync("npx", ["supabase", "--version"], { encoding: "utf8" });
ok = check("Supabase CLI", cli.status === 0, cli.status === 0 ? `v${cli.stdout.trim()}` : "run: npm exec supabase -- --version") && ok;

const secretEnv = parseEnv(readText(SECRET_FILE));
if (!existsSync(SECRET_FILE)) {
  ok = check("Local Edge secret file", false, `copy ${SECRET_EXAMPLE_FILE} to ${SECRET_FILE} and fill real values`) && ok;
} else {
  for (const key of REQUIRED_SECRET_KEYS) {
    ok = check(`Secret ${key}`, !isPlaceholder(secretEnv[key]), `${SECRET_FILE}`) && ok;
  }

  const hasServiceKey = REQUIRED_SERVICE_KEY_OPTIONS.some((key) => !isPlaceholder(secretEnv[key]));
  ok = check("Secret service role key", hasServiceKey, "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY") && ok;
}

console.log("\nDeploy target");
console.log(`PROJECT_REF=${PROJECT_REF}`);
console.log(`Function URL=https://${PROJECT_REF}.supabase.co/functions/v1/check-fares`);

console.log("\nNext commands");
console.log(`npx supabase link --project-ref ${PROJECT_REF}`);
console.log(`npm run edge:secrets:set`);
console.log(`npm run edge:deploy`);
console.log(`npm run edge:invoke -- --limit=1`);

if (!ok) {
  console.log("\nPreflight has TODO items. Fill those before deploying.");
  process.exitCode = 1;
}
