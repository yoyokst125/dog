// Generates the icons from the cat's head sprite:
//   assets/icon.png (32x32) and assets/tray.png (16x16) for the running app,
//   build/icon.png (256x256) and build/icon.ico for the packaged .exe.
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

function pngBuffer(size, scale) {
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
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function save(file, buf, label) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  console.log(`wrote ${path.relative(process.cwd(), file)} (${label})`);
}

// Windows .ico holding PNG images (supported since Windows Vista).
function icoBuffer(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, png } of images) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size; // 0 means 256
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0; // palette
    e[3] = 0; // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

const root = path.join(__dirname, '..');
// app window + tray (used at run time)
save(path.join(root, 'assets', 'icon.png'), pngBuffer(32, 2), '32x32');
save(path.join(root, 'assets', 'tray.png'), pngBuffer(16, 1), '16x16');
// packaged .exe icon (used by electron-builder)
const icoSizes = [
  { size: 256, scale: 20 },
  { size: 48, scale: 4 },
  { size: 32, scale: 2 },
  { size: 16, scale: 1 },
];
const icoImages = icoSizes.map(({ size, scale }) => ({ size, png: pngBuffer(size, scale) }));
save(path.join(root, 'build', 'icon.png'), icoImages[0].png, '256x256');
save(path.join(root, 'build', 'icon.ico'), icoBuffer(icoImages), icoSizes.map((s) => s.size).join('/'));
