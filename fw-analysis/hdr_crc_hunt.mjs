// hdr_crc_hunt.mjs - hunt for LOAD header field 0xd63d5811 (0x04) and u16 @0x2E
import fs from 'node:fs';

const src = process.argv[2];
const fd = fs.openSync(src, 'r');
const size = fs.statSync(src).size;
const head = Buffer.alloc(0x30);
fs.readSync(fd, head, 0, 0x30, 0);
const t32 = head.readUInt32BE(0x04);
console.log('target @0x04 = 0x' + t32.toString(16) + ' | @0x2E u16 = 0x' + head.readUInt16BE(0x2E).toString(16) + ' | @0x2C u32 = 0x' + head.readUInt32BE(0x2C).toString(16));

const TNR = [];
for (let n = 0; n < 256; n++) { let c = n << 24; for (let k = 0; k < 8; k++) c = (c & 0x80000000) ? (((c << 1) ^ 0x04C11DB7) >>> 0) : ((c << 1) >>> 0); TNR[n] = c >>> 0; }
const TR = [];
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? ((c >>> 1) ^ 0xEDB88320) : (c >>> 1); TR[n] = c >>> 0; }
function crcNR(buf, c) { for (let i = 0; i < buf.length; i++) c = ((c << 8) ^ TNR[((c >>> 24) ^ buf[i]) & 0xff]) >>> 0; return c >>> 0; }
function crcR(buf, c) { for (let i = 0; i < buf.length; i++) c = ((c >>> 8) ^ TR[(c ^ buf[i]) & 0xff]) >>> 0; return c >>> 0; }

// big-range variants: name, start, end, mode('mpeg2'|'zlib'), zeroFieldOff or -1
const big = [
  ['[0,size) mpeg2, zero@4', 0, size, 'mpeg2', 4],
  ['[0,size) zlib, zero@4', 0, size, 'zlib', 4],
  ['[8,size) mpeg2', 8, size, 'mpeg2', -1],
  ['[8,size) zlib', 8, size, 'zlib', -1],
  ['[0x30,size) mpeg2', 0x30, size, 'mpeg2', -1],
  ['[0x30,size) zlib', 0x30, size, 'zlib', -1],
];
const B = Buffer.alloc(8 << 20);
for (const [name, start, end, mode, zf] of big) {
  let c = 0xFFFFFFFF;
  const fx = mode === 'mpeg2' ? crcNR : crcR;
  for (let off = start; off < end; off += B.length) {
    const n = Math.min(B.length, end - off);
    fs.readSync(fd, B, 0, n, off);
    if (zf >= 0 && off <= zf && zf + 4 <= off + n) B.fill(0, zf - off, zf - off + 4);
    c = fx(B.subarray(0, n), c);
  }
  const fin = c >>> 0;
  console.log(`  ${name}: 0x${fin.toString(16)}${fin === t32 ? '  <<< MATCH' : ''}`);
}
// small ranges: header variants
const smalls = [
  ['[0,0x2C) zero@4', 0, 0x2C, 4],
  ['[0,0x30) zero@4', 0, 0x30, 4],
  ['[0x04,0x30)', 0x04, 0x30, -1],
  ['[0x08,0x30)', 0x08, 0x30, -1],
  ['[0x00,0x2E) zero@4', 0, 0x2E, 4],
];
for (const [name, start, end, zf] of smalls) {
  const buf = Buffer.alloc(end - start);
  fs.readSync(fd, buf, 0, buf.length, start);
  if (zf >= 0) buf.fill(0, zf - start, zf - start + 4);
  for (const [mn, fx] of [['mpeg2', crcNR], ['zlib', crcR]]) {
    const v = fx(buf, 0xFFFFFFFF) >>> 0;
    if (v === t32) console.log(`  MATCH32! ${mn} over ${name}`);
  }
  // u16 candidates over small ranges
  const T16 = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? ((c >>> 1) ^ 0xA001) : (c >>> 1); T16[n] = c & 0xffff; }
  for (const [cn, init] of [['crc16-arc-0', 0], ['crc16-arc-ffff', 0xffff], ['crc16-modbus', 0xffff]]) {
    let c = init;
    for (let i = 0; i < buf.length; i++) c = (T16[(c ^ buf[i]) & 0xff] ^ (c >>> 8)) & 0xffff;
    if ((c & 0xffff) === head.readUInt16BE(0x2E)) console.log(`  MATCH16! ${cn} over ${name} -> 0x${c.toString(16)}`);
  }
  // simple byte sum / word sum
  let s = 0, sw = 0;
  for (let i = 0; i < buf.length; i++) s = (s + buf[i]) & 0xffff;
  for (let i = 0; i + 1 < buf.length; i += 2) sw = (sw + buf.readUInt16BE(i)) & 0xffff;
  if (s === head.readUInt16BE(0x2E)) console.log(`  MATCH16! byteSum over ${name}`);
  if (sw === head.readUInt16BE(0x2E)) console.log(`  MATCH16! wordSum over ${name}`);
}
console.log('hunt done');
fs.closeSync(fd);
