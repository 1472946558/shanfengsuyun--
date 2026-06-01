#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const lucideNodes = require("lucide-static/icon-nodes.json");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const uiDir = path.join(root, "assets", "ui");
const tabbarDir = path.join(root, "assets", "tabbar");

const ink = "#0f1b21";
const muted = "#8a8f99";
const brand = "#d7b15a";
const brandStrong = "#b8892d";
const green = "#20b79a";
const blue = "#2f8ee2";
const rose = "#5d67e8";

mkdirSync(uiDir, { recursive: true });
mkdirSync(tabbarDir, { recursive: true });

function escapeAttr(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function renderNode([tag, attrs]) {
  const attrString = Object.entries(attrs)
    .map(([key, value]) => `${key}="${escapeAttr(value)}"`)
    .join(" ");
  return `<${tag} ${attrString} />`;
}

function iconMarkup(name) {
  const nodes = lucideNodes[name];
  if (!nodes) throw new Error(`Missing lucide icon: ${name}`);
  return nodes.map(renderNode).join("");
}

function uiSvg(name, accent = brand) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="card" x1="18" y1="12" x2="82" y2="88" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#eefbfd"/>
    </linearGradient>
    <linearGradient id="wash" x1="18" y1="12" x2="76" y2="84" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.14"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#0f1b21" flood-opacity="0.1"/>
    </filter>
  </defs>
  <rect x="10" y="10" width="76" height="76" rx="27" fill="url(#card)" filter="url(#shadow)"/>
  <rect x="10" y="10" width="76" height="76" rx="27" fill="url(#wash)"/>
  <rect x="10.5" y="10.5" width="75" height="75" rx="26.5" fill="none" stroke="${accent}" stroke-opacity="0.12"/>
  <circle cx="68" cy="28" r="14" fill="${accent}" fill-opacity="0.16"/>
  <circle cx="68" cy="28" r="4.5" fill="${accent}" fill-opacity="0.9"/>
  <g transform="translate(24 24) scale(2)" fill="none" stroke="${ink}" stroke-width="1.58" stroke-linecap="round" stroke-linejoin="round">
    ${iconMarkup(name)}
  </g>
</svg>`;
}

function tabbarSvg(name, color) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="81" height="81" viewBox="0 0 81 81" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(18 18) scale(1.88)" fill="none" stroke="${color}" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
    ${iconMarkup(name)}
  </g>
</svg>`;
}

const uiIcons = {
  api: ["server-cog", blue],
  city: ["map", green],
  clock: ["clock-3", brand],
  cold: ["snowflake", blue],
  coupon: ["ticket-percent", brandStrong],
  device: ["smartphone", blue],
  document: ["file-text", brand],
  dropoff: ["map-pin-house", brandStrong],
  enterprise: ["building-2", brand],
  flower: ["flower-2", rose],
  list: ["list-checks", brand],
  note: ["notebook-pen", brand],
  phone: ["phone", green],
  pickup: ["map-pinned", green],
  price: ["circle-dollar-sign", brand],
  qq: ["user-round", blue],
  courier: ["bike", brand],
  route: ["route", green],
  shield: ["shield-check", brand],
  support: ["headphones", brand],
  user: ["user-round", brand],
  warning: ["triangle-alert", brandStrong],
  wechat: ["message-circle", green],
  weight: ["weight", brand],
};

const tabbarIcons = {
  home: "house",
  order: "square-pen",
  track: "route",
  orders: "package-check",
  profile: "user-round",
};

for (const [assetName, [lucideName, accent]] of Object.entries(uiIcons)) {
  await sharp(Buffer.from(uiSvg(lucideName, accent)))
    .png()
    .toFile(path.join(uiDir, `${assetName}.png`));
}

for (const [assetName, lucideName] of Object.entries(tabbarIcons)) {
  for (const [state, color] of [["normal", muted], ["active", brand]]) {
    await sharp(Buffer.from(tabbarSvg(lucideName, color)))
      .png()
      .toFile(path.join(tabbarDir, `${assetName}-${state}.png`));
  }
}

console.log(`Generated ${Object.keys(uiIcons).length} UI icons and ${Object.keys(tabbarIcons).length * 2} tabbar icons from Lucide.`);
