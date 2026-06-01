#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "assets", "tabbar");
const size = 81;
const normal = [138, 143, 153, 255];
const active = [215, 177, 90, 255];

mkdirSync(outputDir, { recursive: true });

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function createCanvas() {
  return new Uint8ClampedArray(size * size * 4);
}

function setPixel(canvas, x, y, color) {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= size || py >= size) return;
  const index = (py * size + px) * 4;
  canvas[index] = color[0];
  canvas[index + 1] = color[1];
  canvas[index + 2] = color[2];
  canvas[index + 3] = color[3];
}

function fillCircle(canvas, cx, cy, radius, color) {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) setPixel(canvas, x, y, color);
    }
  }
}

function line(canvas, x1, y1, x2, y2, color, width = 6) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2;
  for (let i = 0; i <= steps; i += 1) {
    const t = steps === 0 ? 0 : i / steps;
    fillCircle(canvas, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, width / 2, color);
  }
}

function rect(canvas, x, y, w, h, color) {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) setPixel(canvas, px, py, color);
  }
}

function roundedRect(canvas, x, y, w, h, radius, color) {
  rect(canvas, x + radius, y, w - radius * 2, h, color);
  rect(canvas, x, y + radius, w, h - radius * 2, color);
  fillCircle(canvas, x + radius, y + radius, radius, color);
  fillCircle(canvas, x + w - radius, y + radius, radius, color);
  fillCircle(canvas, x + radius, y + h - radius, radius, color);
  fillCircle(canvas, x + w - radius, y + h - radius, radius, color);
}

function circleOutline(canvas, cx, cy, radius, color, width = 5) {
  for (let i = 0; i < 360; i += 1) {
    const angle = (Math.PI * i) / 180;
    fillCircle(canvas, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, width / 2, color);
  }
}

function png(canvas) {
  const scanlines = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    scanlines[rowStart] = 0;
    for (let x = 0; x < size; x += 1) {
      const source = (y * size + x) * 4;
      const target = rowStart + 1 + x * 4;
      scanlines[target] = canvas[source];
      scanlines[target + 1] = canvas[source + 1];
      scanlines[target + 2] = canvas[source + 2];
      scanlines[target + 3] = canvas[source + 3];
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const icons = {
  home(canvas, color) {
    line(canvas, 18, 40, 40, 21, color, 7);
    line(canvas, 40, 21, 63, 40, color, 7);
    line(canvas, 25, 39, 25, 62, color, 7);
    line(canvas, 56, 39, 56, 62, color, 7);
    line(canvas, 25, 62, 56, 62, color, 7);
    roundedRect(canvas, 36, 47, 10, 16, 4, color);
  },
  order(canvas, color) {
    roundedRect(canvas, 20, 18, 42, 48, 8, color);
    roundedRect(canvas, 30, 12, 22, 12, 5, color);
    rect(canvas, 28, 34, 26, 5, [16, 17, 20, 255]);
    rect(canvas, 28, 48, 18, 5, [16, 17, 20, 255]);
  },
  track(canvas, color) {
    circleOutline(canvas, 32, 31, 13, color, 6);
    line(canvas, 32, 45, 40, 62, color, 7);
    line(canvas, 40, 62, 52, 43, color, 7);
    circleOutline(canvas, 54, 34, 10, color, 5);
    fillCircle(canvas, 32, 31, 4, [16, 17, 20, 255]);
  },
  orders(canvas, color) {
    roundedRect(canvas, 17, 17, 47, 49, 8, color);
    rect(canvas, 28, 29, 26, 5, [16, 17, 20, 255]);
    rect(canvas, 28, 42, 26, 5, [16, 17, 20, 255]);
    rect(canvas, 28, 55, 18, 5, [16, 17, 20, 255]);
    fillCircle(canvas, 23, 31, 3, [16, 17, 20, 255]);
    fillCircle(canvas, 23, 44, 3, [16, 17, 20, 255]);
    fillCircle(canvas, 23, 57, 3, [16, 17, 20, 255]);
  },
  profile(canvas, color) {
    fillCircle(canvas, 40, 28, 13, color);
    roundedRect(canvas, 22, 45, 37, 23, 14, color);
  },
};

for (const [name, draw] of Object.entries(icons)) {
  for (const [state, color] of [["normal", normal], ["active", active]]) {
    const canvas = createCanvas();
    draw(canvas, color);
    writeFileSync(path.join(outputDir, `${name}-${state}.png`), png(canvas));
  }
}

console.log(`Generated ${Object.keys(icons).length * 2} tabBar icons in ${path.relative(root, outputDir)}`);
