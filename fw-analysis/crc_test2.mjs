// crc_test2.mjs - confirm MPEG2 CRC across all blobs; investigate fastboot f0 and header word 0x168ba
import fs from 'node:fs';

const src = process.argv[2];
const fd = fs.openSync(src, 'r');
const toc = Buffer.alloc(0x400);
fs.readSync(fd, toc, 0, 0x400, 0);

// --- MPEG2 crc (non-reflected, poly 0x04C11DB7, init 0xFFFFFFFF, xorout 0) ---
const TBL = [];
for (let n = 0; n < 256; n++) {
  let c = n << 24;
  for (let k = 0; k < 8; k++) c = (c & 0x80000000) ? (((c << 1) ^ 0x04C11DB7) >>> 0) : ((c << 1) >>> 0);
  TBL[n] = c >>> 0;
}
function mpeg2Range(off, len) {
  const B = Buffer.alloc(Math.min(len, 8 << 20));
  let p = 0, c = 0xFFFFFFFF;
  while (p < len) {
    const n = Math.min(B.length, len - p);
    const r = fs.readSync(fd, B, 0, n, off + p);
    for (let i = 0; i < r; i++) c = ((c << 8) ^ TBL[((c >>> 24) ^ B[i]) & 0xff]) >>> 0;
    p += r;
  }
  return c >>> 0;
}
function mpeg2Buf(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = ((c << 8) ^ TBL[((c >>> 24) ^ buf[i]) & 0xff]) >>> 0;
  return c >>> 0;
}

const names = ['fastboot','bootargs','bootargsbak','slaveboot','recovery','panelparam','deviceinfo','logo','boot','dtbo','atf','securestore','misc','bootmusic','bootmusicsec','tconparam','system','vendor','atv','log','cache','userdata'];
const entries = [];
for (let i = 0; i < 40; i++) {
  const o = 0x30 + i * 32;
  const f = [0,1,2,3,4,5,6,7].map(k => toc.readUInt32BE(o + k * 4));
  if (f[7] !== 2 || f[6] <= f[4] || f[6] > 0x800000000) break;
  entries.push({ idx: i, name: names[i], crc: f[0], size: f[1], off: f[2], start: f[4], end: f[6] });
}

console.log('MPEG2 crc of payloads vs header crc:');
for (const e of entries) {
  const hdr = Buffer.alloc(8);
  fs.readSync(fd, hdr, 0, 8, e.off);
  const hCrc = hdr.readUInt32BE(4);
  const calc = mpeg2Range(e.off + 8, e.size);
  console.log(`  ${e.name.padEnd(14)} hdr=0x${hCrc.toString(16).padStart(8, '0')} calc=0x${calc.toString(16).padStart(8, '0')} ${hCrc === calc ? 'MATCH' : 'NO'}   toc.f0=0x${e.crc.toString(16)}`);
}

// ---- fastboot f0 investigation (f0 = 0x39f70016) ----
const fb = entries[0];
const fbHdr = Buffer.alloc(8);
fs.readSync(fd, fbHdr, 0, 8, fb.off);
const fbPayload = Buffer.alloc(fb.size);
fs.readSync(fd, fbPayload, 0, fb.size, fb.off + 8);
console.log(`\nfastboot: hdr.crc=0x${fbHdr.readUInt32BE(4).toString(16)} toc.f0=0x${fb.crc.toString(16)}`);

// candidate inputs for f0
const cands = [];
cands.push(['payload', fbPayload]);
for (const fill of [0x00, 0xFF]) {
  const padded = Buffer.alloc(fb.end - fb.start, fill); // full partition extent 1 MiB
  fbPayload.copy(padded);
  cands.push([`payload padded to extent(${fill === 0 ? '00' : 'FF'})`, padded]);
}
// also whole 1MiB with payload at offset start (start=0 so same)
for (const [n, b] of cands) {
  console.log(`  f0? mpeg2(${n}) = 0x${mpeg2Buf(b).toString(16)}`);
}

// ---- header word 0x168ba (bytes 0x2c..0x2f = 00 01 68 ba) ----
// try CRC16 variants over ranges
function crc16(tbl, init, xorout, buf) {
  let c = init & 0xffff;
  for (let i = 0; i < buf.length; i++) c = (tbl[(c ^ buf[i]) & 0xff] ^ (c >> 8)) & 0xffff;
  return (c ^ xorout) & 0xffff;
}
function crc16nr(tbl, init, xorout, buf) {
  let c = init & 0xffff;
  for (let i = 0; i < buf.length; i++) c = (((c << 8) & 0xffff) ^ tbl[((c >> 8) ^ buf[i]) & 0xff]) & 0xffff;
  return (c ^ xorout) & 0xffff;
}
function mktbl16(poly) {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? ((c >>> 1) ^ poly) : (c >>> 1);
    t[n] = c & 0xffff;
  }
  return t;
}
function mktbl16nr(poly) {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n << 8;
    for (let k = 0; k < 8; k++) c = (c & 0x8000) ? (((c << 1) ^ poly) & 0xffff) : ((c << 1) & 0xffff);
    t[n] = c & 0xffff;
  }
  return t;
}
const T_A001 = mktbl16(0xA001), T_1021r = mktbl16(0x8408), T_1021 = mktbl16nr(0x1021), T_8005 = mktbl16nr(0x8005);
const c16 = [
  ['arc(ibm)', (b) => crc16(T_A001, 0, 0, b)],
  ['modbus', (b) => crc16(T_A001, 0xffff, 0, b)],
  ['xmodem', (b) => crc16nr(T_1021, 0, 0, b)],
  ['ccitt-false', (b) => crc16nr(T_1021, 0xffff, 0, b)],
  ['x25', (b) => { let c = crc16nr(T_1021, 0xffff, 0xffff, b); return (~c) & 0xffff; }],
  ['crc16-kermit', (b) => crc16(T_1021r, 0, 0, b)],
  ['crc16-buypop', (b) => crc16(T_1021r, 0xffff, 0, b)],
  ['crc16-8005-nr', (b) => crc16nr(T_8005, 0, 0, b)],
];
// ranges:
const hdrRange = toc.slice(0, 0x2c);
const tocRange = toc.slice(0x30, entries[entries.length - 1].off + entries[entries.length - 1].size); // nah, use 0x30..0x2f0
const tocRegion = Buffer.alloc(0x2f0 - 0x30);
fs.readSync(fd, tocRegion, 0, tocRegion.length, 0x30);
const hdr2c2e = toc.slice(0, 0x2e);
const targets = [0x168ba];
console.log('\nCRC16 hunt for 0x168ba:');
let found = 0;
for (const [rn, rb] of [['hdr 0x00..0x2c', hdrRange], ['hdr 0x00..0x2e', hdr2c2e], ['toc 0x30..0x2f0', tocRegion]]) {
  for (const [cn, fn] of c16) {
    const v = fn(rb);
    if (targets.includes(v)) { console.log(`  MATCH ${cn} over ${rn} -> 0x${v.toString(16)}`); found++; }
  }
}
if (!found) console.log('  none');
fs.closeSync(fd);
