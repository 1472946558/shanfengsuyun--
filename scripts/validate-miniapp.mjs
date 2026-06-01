#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const runtimeExtensions = [".js", ".json", ".wxml", ".wxss"];
const pageExtensions = [".js", ".json", ".wxml", ".wxss"];
const runtimeForbiddenWords = ["顺丰", "SF Express", "闪送", "Shansong"];

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function readJson(relativePath) {
  const fullPath = path.join(root, relativePath);
  try {
    return JSON.parse(readFileSync(fullPath, "utf8"));
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
    return null;
  }
}

function ensureFile(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!existsSync(fullPath)) {
    fail(`missing ${relativePath}`);
    return false;
  }
  return true;
}

function checkJavaScript(relativePath) {
  const result = spawnSync(process.execPath, ["-c", path.join(root, relativePath)], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    fail(`${relativePath} has JavaScript syntax error: ${result.stderr.trim()}`);
    return;
  }
  pass(`${relativePath} syntax`);
}

function checkRuntimeBrandSafety(relativePath) {
  const content = readFileSync(path.join(root, relativePath), "utf8");
  const forbidden = runtimeForbiddenWords.find((word) => content.includes(word));
  if (forbidden) {
    fail(`${relativePath} contains forbidden runtime brand word: ${forbidden}`);
  }
}

function checkRuntimeCompatibility(relativePath) {
  if (!relativePath.endsWith(".js")) return;
  const content = readFileSync(path.join(root, relativePath), "utf8");
  if (content.includes("...")) {
    fail(`${relativePath} uses spread syntax; use Object.assign for WeChat DevTools compatibility`);
  }
  if (/\{\s*\[[^\]]+\]\s*:/.test(content)) {
    fail(`${relativePath} uses computed property inside object literal; build setData payloads with a plain object first`);
  }
}

const app = readJson("app.json");
if (!app) process.exit(1);

if (!Array.isArray(app.pages) || app.pages.length === 0) {
  fail("app.json must define pages");
} else {
  pass(`app.json defines ${app.pages.length} pages`);
}

const tabBarPages = new Set((app.tabBar?.list || []).map((item) => item.pagePath));
if (tabBarPages.size < 4) {
  fail("tabBar should include at least 4 entry pages");
} else {
  pass(`tabBar defines ${tabBarPages.size} entries`);
}

for (const item of app.tabBar?.list || []) {
  if (!item.iconPath || !item.selectedIconPath) {
    fail(`tabBar item ${item.pagePath} must define iconPath and selectedIconPath`);
    continue;
  }
  ensureFile(item.iconPath);
  ensureFile(item.selectedIconPath);
}

for (const page of app.pages || []) {
  for (const ext of pageExtensions) {
    ensureFile(`${page}${ext}`);
  }
  if (ensureFile(`${page}.json`)) readJson(`${page}.json`);
  if (ensureFile(`${page}.js`)) checkJavaScript(`${page}.js`);
}

for (const required of [
  "app.js",
  "app.json",
  "app.wxss",
  "sitemap.json",
  "utils/config.js",
  "utils/apiClient.js",
  "utils/paymentStore.js",
  "utils/orderStore.js",
  "utils/userStore.js"
]) {
  ensureFile(required);
  if (required.endsWith(".json")) readJson(required);
  if (required.endsWith(".js")) checkJavaScript(required);
}

const runtimeFiles = [
  "app.js",
  "app.json",
  "app.wxss",
  "utils/config.js",
  "utils/apiClient.js",
  "utils/paymentStore.js",
  "utils/orderStore.js",
  "utils/userStore.js",
  ...(app.pages || []).flatMap((page) => runtimeExtensions.map((ext) => `${page}${ext}`)),
];

for (const file of runtimeFiles) {
  if (existsSync(path.join(root, file))) checkRuntimeBrandSafety(file);
  if (existsSync(path.join(root, file))) checkRuntimeCompatibility(file);
}

if (process.exitCode) {
  console.error("Mini program validation failed.");
  process.exit(process.exitCode);
}

console.log("Mini program validation passed.");
