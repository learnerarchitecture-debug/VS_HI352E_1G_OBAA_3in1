// verify_pack.mjs - full verification of a repacked LOAD package
// 1) TOC parse + header fields
// 2) every blob: size fields consistent + MPEG2(payload) == header crc
// 3) system blob: sparse decode -> SHA256 vs expected raw file + size
import fs from 'node:fs';
import crypto from 'node:crypto';

const names = ['fastboot','bootargs','bootargsbak','slaveboot','recovery','panelparam','deviceinfo','logo','boot','dtbo','atf','securestore','misc','bootmusic','bootmusicsec','tconparam','system','vendor','atv','log','cache','userdata'];
const src = process.argv[2];
const expectRaw = process.argv[3]; // optional raw image to compare against (system)
const fd = fs.openSync(src, 'r');
const size = fs.statSync(src).size;

const TBL = [];
for (let n = 0; n < 256; n++) { let c = n << 24; for (let k = 0; k < 8; k++) c = (c & 0x80000000) ? (((c << 1) ^ 0x04C11DB7) >>> 0) : ((c << 1) >>> 0); TBL[n] = c >>> 0; }
function mpeg2Range(off, len, sink) {
  const B = Buffer.alloc(8 << 20);
  let c = 0xFFFFFFFF, p = 0;
  while (p < len) {
    const n = Math.min(B.length, len - p);
    const r = fs.readSync(fd, B, 0, n, off + p);
    if (r <= 0) break;
    if (sink) sink(B.subarray(0, r));
    for (let i = 0; i < r; i++) c = ((c << 8) ^ TBL[((c >>> 24) ^ B[i]) & 0xff]) >>> 0;
    p += r;
  }
  return c >>> 0;
}

const head = Buffer.alloc(0x30);
fs.readSync(fd, head, 0, 0x30, 0);
console.log('magic:', head.toString('latin1', 0, 4), ' size@0x10: 0x' + head.readUInt32BE(0x10).toString(16) + (head.readUInt32BE(0x10) === size ? ' == actual size OK' : ' != actual ' + size + ' MISMATCH'));
console.log('magic@0x04: 0x' + head.readUInt32BE(4).toString(16) + '  const@0x2C: 0x' + head.readUInt32BE(0x2C).toString(16));

const toc = Buffer.alloc(0x400);
fs.readSync(fd, toc, 0, 0x400, 0);
const entries = [];
for (let i = 0; i < 40; i++) {
  const o = 0x30 + i * 32;
  const f = [0,1,2,3,4,5,6,7].map(k => toc.readUInt32BE(o + k * 4));
  if (f[7] !== 2 || f[6] <= f[4] || f[6] > 0x800000000) break;
  entries.push({ idx: i, name: names[i], crc: f[0], size: f[1], off: f[2], start: f[4], end: f[6] });
}

let bad = 0;
for (const e of entries) {
  const bh = Buffer.alloc(8);
  fs.readSync(fd, bh, 0, 8, e.off);
  const hSize = bh.readUInt32BE(0), hCrc = bh.readUInt32BE(4);
  const calc = mpeg2Range(e.off + 8, e.size);
  const okSz = hSize === e.size;
  const okCrc = calc === hCrc;
  if (!okSz || !okCrc) bad++;
  console.log(`  ${e.name.padEnd(14)} size=0x${e.size.toString(16).padStart(9, '0')} szOK=${okSz ? 'Y' : 'N'} crc=0x${hCrc.toString(16).padStart(8, '0')} calc=${okCrc ? 'OK' : 'MISMATCH 0x' + calc.toString(16)}`);
}

// last blob end == file size?
const last = entries[entries.length - 1];
console.log(`last blob end: 0x${(last.off + 8 + last.size).toString(16)}  file: 0x${size.toString(16)}  ${last.off + 8 + last.size === size ? 'OK' : 'MISMATCH'}`);

// sparse decode of system + hash compare
const sys = entries.find(e => e.name === 'system');
if (sys) {
  const h = Buffer.alloc(28);
  fs.readSync(fd, h, 0, 28, sys.off + 8);
  const magic = h.readUInt32LE(0);
  if (magic === 0xED26FF3A) {
    const blkSz = h.readUInt32LE(12), totalBlks = h.readUInt32LE(16), totalChunks = h.readUInt32LE(20), csum = h.readUInt32LE(24);
    console.log(`system sparse: blk=${blkSz} blks=${totalBlks} chunks=${totalChunks} csum=0x${csum.toString(16)}`);
    const hash = crypto.createHash('sha256');
    const dn = Buffer.alloc(blkSz);
    let pos = sys.off + 8 + 28, decodedBlks = 0, rawBytes = 0;
    for (let ci = 0; ci < totalChunks; ci++) {
      const ch = Buffer.alloc(12);
      fs.readSync(fd, ch, 0, 12, pos);
      const type = ch.readUInt32LE(0), blocks = ch.readUInt32LE(4), totalSz = ch.readUInt32LE(8);
      pos += 12;
      if (type === 0xCAC1) { // raw
        let rem = blocks * blkSz;
        const B = Buffer.alloc(4 << 20);
        while (rem > 0) {
          const n = Math.min(B.length, rem);
          fs.readSync(fd, B, 0, n, pos);
          hash.update(B.subarray(0, n));
          pos += n; rem -= n;
        }
      } else if (type === 0xCAC2) { // fill
        const v = ch.readUInt32LE(0); // not used; fill value is in the NEXT 4 bytes
        const fv = Buffer.alloc(4);
        fs.readSync(fd, fv, 0, 4, pos);
        pos += 4;
        const fill = Buffer.alloc(blkSz);
        for (let i = 0; i < blkSz; i += 4) fv.copy(fill, i, 0, Math.min(4, blkSz - i));
        for (let i = 0; i < blocks; i++) hash.update(fill);
      } else { // dont care
        const zeros = Buffer.alloc(blkSz);
        for (let i = 0; i < blocks; i++) hash.update(zeros);
      }
      decodedBlks += blocks;
      rawBytes = decodedBlks * blkSz;
    }
    const dig = hash.digest('hex').toUpperCase();
    console.log(`  decoded: ${decodedBlks}/${totalBlks} blks (${rawBytes} bytes)`);
    console.log(`  sha256(decoded) = ${dig}`);
    if (expectRaw) {
      const h2 = crypto.createHash('sha256');
      const efd = fs.openSync(expectRaw, 'r');
      const eSize = fs.statSync(expectRaw).size;
      const EB = Buffer.alloc(8 << 20);
      let ep = 0;
      while (ep < eSize) {
        const n = Math.min(EB.length, eSize - ep);
        fs.readSync(efd, EB, 0, n, ep);
        h2.update(EB.subarray(0, n));
        ep += n;
      }
      fs.closeSync(efd);
      const dig2 = h2.digest('hex').toUpperCase();
      console.log(`  sha256(expected) = ${dig2}`);
      console.log(dig === dig2 ? '  SYSTEM IMAGE MATCH OK' : '  SYSTEM IMAGE MISMATCH!!');
    }
  } else {
    console.log('system blob is not sparse!');
  }
}
console.log(bad === 0 ? 'ALL BLOBS OK' : `${bad} BLOB PROBLEMS`);
fs.closeSync(fd);
