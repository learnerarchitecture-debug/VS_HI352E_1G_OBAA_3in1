// crc_brute.mjs - try many CRC variants/inputs until one matches header crc of blobs
import fs from 'node:fs';

const src = process.argv[2];
const fd = fs.openSync(src, 'r');
const toc = Buffer.alloc(0x400);
fs.readSync(fd, toc, 0, 0x400, 0);

console.log('--- raw TOC header 0x00..0x80 ---');
for (let o = 0; o < 0x80; o += 16) {
  const row = [];
  for (let k = 0; k < 16; k++) row.push(toc[o + k].toString(16).padStart(2, '0'));
  console.log('0x' + o.toString(16).padStart(3, '0') + ': ' + row.join(' ') + '   ' + toc.slice(o, o + 16).toString('latin1').replace(/[^\x20-\x7e]/g, '.'));
}

const names = ['fastboot','bootargs','bootargsbak','slaveboot','recovery','panelparam','deviceinfo','logo','boot','dtbo','atf','securestore','misc','bootmusic','bootmusicsec','tconparam','system','vendor','atv','log','cache','userdata'];
const entries = [];
for (let i = 0; i < 40; i++) {
  const o = 0x30 + i * 32;
  const f = [0,1,2,3,4,5,6,7].map(k => toc.readUInt32BE(o + k * 4));
  if (f[7] !== 2 || f[6] <= f[4] || f[6] > 0x800000000) break;
  entries.push({ idx: i, name: names[i], crc: f[0], size: f[1], off: f[2], start: f[4], end: f[6] });
}

// --- CRC implementations ---
const TBL_R = [], TBL_NR = [], TBL_C = [], TBL_CNR = [];
function mktbl(poly, tbl) {
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (poly ^ (c >>> 1)) : (c >>> 1);
    tbl[n] = c >>> 0;
  }
}
function mktblNR(poly, tbl) {
  for (let n = 0; n < 256; n++) {
    let c = n << 24;
    for (let k = 0; k < 8; k++) c = (c & 0x80000000) ? ((c << 1) ^ poly) : (c << 1);
    tbl[n] = c >>> 0;
  }
}
mktbl(0xEDB88320, TBL_R);
mktblNR(0x04C11DB7, TBL_NR);
mktbl(0x82F63B78, TBL_C);
mktblNR(0x1EDC6F41, TBL_CNR);

function crcR(tbl, init, xorout, buf) {
  let c = init >>> 0;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ tbl[(c ^ buf[i]) & 0xff];
  return (c ^ xorout) >>> 0;
}
function crcNR(tbl, init, xorout, buf) {
  let c = init >>> 0;
  for (let i = 0; i < buf.length; i++) c = ((c << 8) ^ tbl[((c >>> 24) ^ buf[i]) & 0xff]) >>> 0;
  return (c ^ xorout) >>> 0;
}

const variants = [];
for (const [name, tbl, ref] of [['refl-edb8', TBL_R, 1], ['nonrefl-04c1', TBL_NR, 0], ['refl-82f6(c)', TBL_C, 1], ['nonrefl-1edc(c)', TBL_CNR, 0]]) {
  for (const init of [0xFFFFFFFF, 0x00000000]) {
    for (const xorout of [0xFFFFFFFF, 0x00000000]) {
      variants.push({
        name: `${name} init=${init.toString(16)} xor=${xorout.toString(16)}`,
        fn: (buf) => ref ? crcR(tbl, init, xorout, buf) : crcNR(tbl, init, xorout, buf)
      });
    }
  }
}
// extra: swap32 before crc32
variants.push({
  name: 'zlib-crc32(swap32)',
  fn: (buf) => {
    const b2 = Buffer.from(buf);
    for (let i = 0; i + 4 <= b2.length; i += 4) { const t = b2[i]; b2[i] = b2[i+3]; b2[i+3] = t; const u = b2[i+1]; b2[i+1] = b2[i+2]; b2[i+2] = u; }
    return crcR(TBL_R, 0xFFFFFFFF, 0xFFFFFFFF, b2);
  }
});
// 16-bit word swap
variants.push({
  name: 'zlib-crc32(swap16)',
  fn: (buf) => {
    const b2 = Buffer.from(buf);
    for (let i = 0; i + 2 <= b2.length; i += 2) { const t = b2[i]; b2[i] = b2[i+1]; b2[i+1] = t; }
    return crcR(TBL_R, 0xFFFFFFFF, 0xFFFFFFFF, b2);
  }
});

// inputs for the tiny blobs
const target = entries.find(e => e.name === 'misc');
const hdr = Buffer.alloc(8);
fs.readSync(fd, hdr, 0, 8, target.off);
const hCrc = hdr.readUInt32BE(4);
const hSize = hdr.readUInt32BE(0);
const payload = Buffer.alloc(hSize);
fs.readSync(fd, payload, 0, hSize, target.off + 8);

console.log(`\n--- brute force on blob "${target.name}" size=${hSize} target hdr.crc=0x${hCrc.toString(16)} ---`);

const sizeBE = Buffer.alloc(4); sizeBE.writeUInt32BE(hSize);
const sizeLE = Buffer.alloc(4); sizeLE.writeUInt32LE(hSize);

const inputs = [
  ['payload', payload],
  ['sizeBE+payload', Buffer.concat([sizeBE, payload])],
  ['sizeLE+payload', Buffer.concat([sizeLE, payload])],
  ['payload+sizeBE', Buffer.concat([payload, sizeBE])],
];
for (const pad of [4, 16, 512, 4096, 65536, 0x100000, 0x200000]) {
  if (pad > hSize) {
    const p = Buffer.alloc(pad);
    payload.copy(p);
    inputs.push([`payload padded to ${pad}`, p]);
  }
}

let matched = 0;
for (const [iname, ibuf] of inputs) {
  for (const v of variants) {
    const c = v.fn(ibuf);
    if (c === hCrc || c === target.crc) {
      console.log(`MATCH! input=${iname} variant=${v.name} -> 0x${c.toString(16)} (hdr)${c === target.crc ? ' (toc too)' : ''}`);
      matched++;
    }
  }
}
if (!matched) console.log('no match among ' + variants.length * inputs.length + ' combinations');
fs.closeSync(fd);
