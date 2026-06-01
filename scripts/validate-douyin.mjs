import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const projectRoot = path.resolve(process.argv[2] || path.join(process.cwd(), "..", "shanfeng-express-douyin-miniapp"));
const appJsonPath = path.join(projectRoot, "app.json");

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(appJsonPath)) {
  fail(`missing app.json at ${appJsonPath}`);
  process.exit();
}

const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
const pages = appJson.pages || [];

if (!pages.length) fail("app.json pages is empty");
else pass(`app.json defines ${pages.length} pages`);

for (const page of pages) {
  for (const ext of [".js", ".json", ".ttml", ".ttss"]) {
    const file = path.join(projectRoot, `${page}${ext}`);
    if (fs.existsSync(file)) pass(`${page}${ext} exists`);
    else fail(`${page}${ext} missing`);
  }
}

for (const file of [
  "app.js",
  "utils/config.js",
  "utils/apiClient.js",
  "utils/orderStore.js",
  "utils/userStore.js"
]) {
  const fullPath = path.join(projectRoot, file);
  if (!fs.existsSync(fullPath)) {
    fail(`${file} missing`);
    continue;
  }
  try {
    execFileSync(process.execPath, ["--check", fullPath], { stdio: "pipe" });
    pass(`${file} syntax`);
  } catch (error) {
    fail(`${file} syntax error: ${error.message}`);
  }
}

const forbiddenRuntime = ["wx.", "wx:", ".wxml", ".wxss"];
const scanFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (/\.(js|json|ttml|ttss)$/.test(entry.name)) scanFiles.push(fullPath);
  }
}

walk(projectRoot);

for (const file of scanFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const word of forbiddenRuntime) {
    if (text.includes(word)) {
      fail(`${path.relative(projectRoot, file)} contains WeChat-only token ${word}`);
    }
  }
}

if (!process.exitCode) {
  console.log("Douyin mini program validation passed.");
}

