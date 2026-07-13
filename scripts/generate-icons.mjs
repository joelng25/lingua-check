import { createWriteStream } from "node:fs";
import { deflateSync } from "node:zlib";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "../src/icons");

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function createPng(size, color) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowSize = size * 4 + 1;
  const raw = Buffer.alloc(rowSize * size);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0;
    for (let x = 0; x < size; x += 1) {
      const i = rowStart + 1 + x * 4;
      const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1;
      raw[i] = edge ? 255 : color[0];
      raw[i + 1] = edge ? 255 : color[1];
      raw[i + 2] = edge ? 255 : color[2];
      raw[i + 3] = 255;
    }
  }

  const compressed = deflateSync(raw);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

await mkdir(iconsDir, { recursive: true });

const sizes = [16, 48, 128];
for (const size of sizes) {
  const file = path.join(iconsDir, `icon${size}.png`);
  const png = createPng(size, [37, 99, 235]);
  await new Promise((resolve, reject) => {
    const stream = createWriteStream(file);
    stream.on("finish", () => resolve());
    stream.on("error", reject);
    stream.end(png);
  });
}

console.log("Icons generated in src/icons");
