// verify_gdtcsum.mjs - validate our crc16-based group descriptor checksum vs stored values
import fs from 'node:fs';

const img = process.argv[2];
const fd = fs.openSync(img, 'r');
const sb = Buffer.alloc(1024);
fs.readSync(fd, sb, 0, 1024, 1024);
const bs = 1024 << sb.readUInt32LE(0x18);
const first = sb.readUInt32LE(0x14);
const incompat = sb.readUInt32LE(0x60);
const rocompat = sb.readUInt32LE(0x64);
const blocks = sb.readUInt32LE(4) + ((incompat & 0x80) ? sb.readUInt32LE(0x150) * 2 ** 32 : 0);
const bpg = sb.readUInt32LE(0x20);
const descSize = (incompat & 0x80) ? (sb.readUInt16LE(0xFE) || 64) : 32;
const groups = Math.ceil((blocks - first) / bpg);
const uuid = sb.subarray(0x68, 0x78);
const gdt = Buffer.alloc(groups * descSize);
fs.readSync(fd, gdt, 0, gdt.length, (first + 1) * bs);

const T16 = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? ((c >>> 1) ^ 0xA001) : (c >>> 1);
  T16[n] = c & 0xffff;
}
function crc16(crc, buf) {
  let c = crc & 0xffff;
  for (let i = 0; i < buf.length; i++) c = (T16[(c ^ buf[i]) & 0xff] ^ (c >>> 8)) & 0xffff;
  return c;
}

console.log('gdt_csum feature: ' + !!(rocompat & 0x10) + ', metadata_csum: ' + !!(rocompat & 0x100));
let ok = 0, bad = 0;
for (let g = 0; g < groups; g++) {
  const o = g * descSize;
  let crc = 0xffff;
  crc = crc16(crc, uuid);
  const g4 = Buffer.alloc(4); g4.writeUInt32LE(g);
  crc = crc16(crc, g4);
  crc = crc16(crc, gdt.subarray(o, o + 0x1E));
  const stored = gdt.readUInt16LE(o + 0x1E);
  if (crc === stored) ok++; else { bad++; console.log(`  g${g}: MISMATCH stored=0x${stored.toString(16)} calc=0x${crc.toString(16)}`); }
}
console.log(`checksum verification: ${ok} OK, ${bad} mismatch`);
fs.closeSync(fd);
