#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";

const DEFAULT_PROJECT_REF = "zvtedscvvwwkcdmvfgro";
const SECRET_FILE = "supabase/.env.edge.local";

function parseArgs(argv) {
  return Object.fromEntries(
    argv.map((arg) => {
      const normalized = arg.replace(/^--/, "");
      const [key, value = "true"] = normalized.split("=");
      return [key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value];
    }),
  );
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

function readLocalSecretFile() {
  return existsSync(SECRET_FILE) ? parseEnv(readFileSync(SECRET_FILE, "utf8")) : {};
}

function required(value, message) {
  if (!value) {
    console.error(message);
    process.exit(1);
  }
  return value;
}

const args = parseArgs(process.argv.slice(2));
const localSecrets = readLocalSecretFile();
const projectRef = args.projectRef || process.env.SUPABASE_PROJECT_REF || process.env.FAREPING_SUPABASE_PROJECT_REF || DEFAULT_PROJECT_REF;
const cronSecret = process.env.FAREPING_CRON_SECRET || localSecrets.FAREPING_CRON_SECRET;
const requestedLimit = Number(args.limit || 1);
const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 1;
const endpoint = `https://${projectRef}.supabase.co/functions/v1/check-fares?limit=${limit}`;

required(cronSecret, `Missing FAREPING_CRON_SECRET. Add it to ${SECRET_FILE} or export it in your shell.`);

console.log(`Invoking check-fares at ${endpoint}`);

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${cronSecret}`,
    "Content-Type": "application/json",
  },
  body: "{}",
});

const text = await response.text();
let body;

try {
  body = JSON.parse(text);
} catch {
  body = text;
}

console.log(`HTTP ${response.status}`);
console.log(JSON.stringify(body, null, 2));

if (!response.ok) {
  process.exitCode = 1;
}
