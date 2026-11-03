// Generates assets/icon.png (32x32) and assets/tray.png (16x16) from the cat's head sprite.
// No dependencies: writes the PNG files by hand.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const S = require('../renderer/sprites.js');

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function writePng(file, size, scale) {
  const rows = S.head();
  const w = rows[0].length * scale;
  const h = rows.length * scale;
  const ox = Math.floor((size - w) / 2);
  const oy = Math.floor((size - h) / 2);

  const raw = Buffer.alloc((size * 4 + 1) * size); // filter byte + RGBA per row
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const sx = Math.floor((x - ox) / scale);
      const sy = Math.floor((y - oy) / scale);
      const ch = x >= ox && y >= oy && sy < rows.length && sx < rows[0].length ? rows[sy][sx] : '.';
      if (ch === '.') continue;
      const [r, g, b] = hexToRgb(S.PALETTE[ch]);
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png);
  console.log(`wrote ${path.relative(process.cwd(), file)} (${size}x${size})`);
}

const assets = path.join(__dirname, '..', 'assets');
writePng(path.join(assets, 'icon.png'), 32, 2);
writePng(path.join(assets, 'tray.png'), 16, 1);
