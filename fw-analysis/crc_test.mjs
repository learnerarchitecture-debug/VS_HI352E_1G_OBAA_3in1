// crc_test.mjs - verify LOAD package CRC fields: crc32(payload) vs blob header vs TOC entry
import fs from 'node:fs';
import zlib from 'node:zlib';

const src = process.argv[2];
const fd = fs.openSync(src, 'r');
const toc = Buffer.alloc(0x400);
fs.readSync(fd, toc, 0, 0x400, 0);
const names = ['fastboot','bootargs','bootargsbak','slaveboot','recovery','panelparam','deviceinfo','logo','boot','dtbo','atf','securestore','misc','bootmusic','bootmusicsec','tconparam','system','vendor','atv','log','cache','userdata'];
const entries = [];
for (let i = 0; i < 40; i++) {
  const o = 0x30 + i * 32;
  const f = [0,1,2,3,4,5,6,7].map(k => toc.readUInt32BE(o + k * 4));
  if (f[7] !== 2 || f[6] <= f[4] || f[6] > 0x800000000) break;
  entries.push({ idx: i, name: names[i], crc: f[0], size: f[1], off: f[2], f3: f[3], start: f[4], f4: f[5], end: f[6] });
}

function crc32Range(off, len) {
  const B = Buffer.alloc(Math.min(len, 8 << 20));
  let p = 0, crc = 0;
  while (p < len) {
    const n = Math.min(B.length, len - p);
    const r = fs.readSync(fd, B, 0, n, off + p);
    if (r <= 0) throw new Error('EOF');
    crc = zlib.crc32 ? zlib.crc32(B.subarray(0, r), crc) : crcUpdate(crc, B.subarray(0, r));
    p += r;
  }
  return crc >>> 0;
}
// fallback table-based crc32 (same polynomial as zlib)
let TBL = null;
function makeTbl() {
  TBL = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    TBL[n] = c;
  }
}
function crcUpdate(crc, buf) {
  if (!TBL) makeTbl();
  crc = ~crc >>> 0;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ TBL[(crc ^ buf[i]) & 0xff];
  return ~crc >>> 0;
}

console.log('idx name            toc.crc     hdr.size    toc.size    hdr.crc     calc.crc    hdr==calc toc==calc');
for (const e of entries) {
  const hdr = Buffer.alloc(8);
  fs.readSync(fd, hdr, 0, 8, e.off);
  const hSize = hdr.readUInt32BE(0);
  const hCrc = hdr.readUInt32BE(4);
  // only test small ones to keep it fast; test system too (fast enough)
  const calc = crc32Range(e.off + 8, e.size);
  const ok1 = (hCrc === calc) ? 'OK' : 'NO';
  const ok2 = (e.crc === calc) ? 'OK' : 'NO';
  console.log(
    String(e.idx).padStart(3), e.name.padEnd(14),
    '0x' + e.crc.toString(16).padStart(8, '0'),
    '0x' + hSize.toString(16).padStart(8, '0'),
    '0x' + e.size.toString(16).padStart(8, '0'),
    '0x' + hCrc.toString(16).padStart(8, '0'),
    '0x' + calc.toString(16).padStart(8, '0'),
    ok1, ok2
  );
}
fs.closeSync(fd);
