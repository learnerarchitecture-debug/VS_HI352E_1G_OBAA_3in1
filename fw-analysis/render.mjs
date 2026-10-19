// Pure-Node PNG renderer: visualize flash regions as grayscale images
import fs from 'node:fs';
import zlib from 'node:zlib';
const inPath = process.argv[2];
const outDir = process.argv[3] || '.';
const buf = fs.readFileSync(inPath);
const size = buf.length;

const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) { const t = Buffer.from(type, 'latin1'); const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0); return Buffer.concat([len, t, data, crc]); }
function writePNG(path, width, height, pixels) {
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width + 1)] = 0; pixels.copy(raw, y * (width + 1) + 1, y * width, Math.min(y * width + width, pixels.length)); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 0;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(path, png);
  return png.length;
}
function render(name, start, len, width, pad) {
  const h = Math.ceil(len / width);
  const px = Buffer.alloc(width * h, pad === undefined ? 0 : pad);
  const src = buf.subarray(start, Math.min(size, start + len));
  src.copy(px);
  const bytes = writePNG(outDir + '/' + name, width, h, px);
  console.log(name + '  ' + width + 'x' + h + '  ' + bytes + ' bytes');
}
render('whole_2048.png', 0, size, 2048);
render('tail_all_2048.png', 0x368000, 0x98000, 2048);
render('tail_struct_2048.png', 0x368000, 0x63900, 2048, 40);
render('endzone_1024.png', 0x3C0000, 0x40000, 1024);
render('head_64k_512.png', 0, 0x10000, 512);
render('head_4k_64.png', 0, 0x1000, 64);
