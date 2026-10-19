// render2: bitmap-mode renders (1bpp/4bpp/RGB565) + FF/00 band map
import fs from 'node:fs';
import zlib from 'node:zlib';
const inPath = process.argv[2];
const outDir = process.argv[3] || '.';
const buf = fs.readFileSync(inPath);
const size = buf.length;

const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) { const t = Buffer.from(type, 'latin1'); const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0); return Buffer.concat([len, t, data, crc]); }
function writePNG(path, width, height, channels, pixels) {
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (stride + 1)] = 0; pixels.copy(raw, y * (stride + 1) + 1, y * stride, Math.min(y * stride + stride, pixels.length)); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = channels === 3 ? 2 : 0;
  fs.writeFileSync(path, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}

function render1bpp(name, start, len, width) {
  const nbits = len * 8, h = Math.ceil(nbits / width);
  const px = Buffer.alloc(width * h, 128);
  let w = 0;
  for (let i = 0; i < len; i++) {
    const v = buf[start + i];
    for (let b = 7; b >= 0; b--) { const x = w % width, y = (w / width) | 0; px[y * width + x] = (v >> b) & 1 ? 0 : 255; w++; }
  }
  writePNG(outDir + '/' + name, width, h, 1, px);
  console.log(name + ' ' + width + 'x' + h);
}
function render4bpp(name, start, len, width) {
  const npix = len * 2, h = Math.ceil(npix / width);
  const px = Buffer.alloc(width * h, 128);
  let w = 0;
  for (let i = 0; i < len; i++) {
    const hi = (buf[start + i] >> 4) & 15, lo = buf[start + i] & 15;
    for (const v of [hi, lo]) { const x = w % width, y = (w / width) | 0; px[y * width + x] = v * 17; w++; }
  }
  writePNG(outDir + '/' + name, width, h, 1, px);
  console.log(name + ' ' + width + 'x' + h);
}
function render565(name, start, len, width, be) {
  const npix = len >> 1, h = Math.ceil(npix / width);
  const px = Buffer.alloc(width * h * 3, 0);
  for (let p = 0; p < npix; p++) {
    const a = buf[start + p * 2], b = buf[start + p * 2 + 1];
    const v = be ? ((a << 8) | b) : ((b << 8) | a);
    let r = (v >> 11) & 31, g = (v >> 5) & 63, bl = v & 31;
    r = (r << 3) | (r >> 2); g = (g << 2) | (g >> 4); bl = (bl << 3) | (bl >> 2);
    const x = p % width, y = (p / width) | 0, o = (y * width + x) * 3;
    px[o] = r; px[o + 1] = g; px[o + 2] = bl;
  }
  writePNG(outDir + '/' + name, width, h, 3, px);
  console.log(name + ' ' + width + 'x' + h);
}

// FF/00 band map
function bandMap(label, start, end) {
  console.log('== band map ' + label + ' (256B cells; #=data .=FF ~=00 +=mixed) ==');
  let line = '';
  const total = end - start;
  for (let o = start; o < end; o += 256) {
    const c = buf.subarray(o, Math.min(o + 256, end));
    let ff = 0, z = 0;
    for (const v of c) { if (v === 0xff) ff++; else if (v === 0) z++; }
    let ch = '#';
    if (ff > c.length * 0.95) ch = '.'; else if (ff > c.length * 0.5) ch = ':'; else if (z > c.length * 0.5) ch = '~';
    line += ch;
    if (line.length === 128) { console.log('0x' + (o + 256 - line.length * 256).toString(16) + ' ' + line); line = ''; }
  }
  if (line) console.log('.. ' + line);
  void total;
}
bandMap('0x300000-0x400000', 0x300000, 0x400000);

// 1bpp variants
render1bpp('b1_azone_512.png', 0x368000, 0x63900, 512);
render1bpp('b1_azone_1024.png', 0x368000, 0x63900, 1024);
render1bpp('b1_azone_1920.png', 0x368000, 0x63900, 1920);
render1bpp('b1_end_512.png', 0x3c0000, 0x40000, 512);
render1bpp('b1_end_1024.png', 0x3c0000, 0x40000, 1024);
render1bpp('b1_end_1920.png', 0x3c0000, 0x40000, 1920);
render1bpp('b1_head_512.png', 0, 0x20000, 512);
render1bpp('b1_head_1024.png', 0, 0x20000, 1024);

// 4bpp variants
render4bpp('b4_azone_512.png', 0x368000, 0x63900, 512);
render4bpp('b4_azone_1024.png', 0x368000, 0x63900, 1024);
render4bpp('b4_end_512.png', 0x3c0000, 0x40000, 512);
render4bpp('b4_end_1024.png', 0x3c0000, 0x40000, 1024);
render4bpp('b4_head_512.png', 0, 0x20000, 512);

// RGB565 variants
render565('rgb_azone_512.png', 0x368000, 0x63900, 512, true);
render565('rgb_end_512.png', 0x3c0000, 0x40000, 512, true);
render565('rgb_end_512_le.png', 0x3c0000, 0x40000, 512, false);
render565('rgb_head_512.png', 0, 0x20000, 512, true);
