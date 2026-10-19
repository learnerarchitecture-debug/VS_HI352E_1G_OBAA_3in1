// unsparse.mjs - carve LOAD-package blobs and decode Android sparse images
// usage: node unsparse.mjs <src.bin> <outDir> [skip1,skip2,...]
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
const outDir = process.argv[3];
const skip = (process.argv[4] || 'userdata').split(',').map(s => s.trim()).filter(Boolean);
fs.mkdirSync(outDir, { recursive: true });

const size = fs.statSync(src).size;
const fd = fs.openSync(src, 'r');
const L = [];
const P = s => { L.push(s); console.log(s); };

P('== unsparse ==');
P('src: ' + src + '  size: ' + size);

// --- parse TOC ---
const toc = Buffer.alloc(0x400);
fs.readSync(fd, toc, 0, 0x400, 0);
const names = ['fastboot','bootargs','bootargsbak','slaveboot','recovery','panelparam','deviceinfo','logo','boot','dtbo','atf','securestore','misc','bootmusic','bootmusicsec','tconparam','system','vendor','atv','log','cache','userdata'];
const entries = [];
for (let i = 0; i < 40; i++) {
  const o = 0x30 + i * 32;
  const f = [0,1,2,3,4,5,6,7].map(k => toc.readUInt32BE(o + k * 4));
  if (f[7] !== 2 || f[6] <= f[4] || f[6] > 0x800000000) break;
  entries.push({ idx: i, name: names[i] || ('part' + i), crc: f[0], size: f[1], off: f[2], start: f[4], end: f[6] });
}
P('TOC entries: ' + entries.length);

function copyRange(inOff, outFd, outOff, len) {
  const B = Buffer.alloc(Math.min(len, 4 << 20));
  let p = 0;
  while (p < len) {
    const n = Math.min(B.length, len - p);
    const r = fs.readSync(fd, B, 0, n, inOff + p);
    if (r <= 0) throw new Error('unexpected EOF at 0x' + (inOff + p).toString(16));
    fs.writeSync(outFd, B, 0, r, outOff + p);
    p += r;
  }
}
function copyFile(inOff, outPath, len) {
  const o = fs.openSync(outPath, 'w');
  copyRange(inOff, o, 0, len);
  fs.closeSync(o);
}

function unsparse(payloadOff, outPath) {
  const h = Buffer.alloc(28);
  fs.readSync(fd, h, 0, 28, payloadOff);
  if (h.readUInt32LE(0) !== 0xED26FF3A) return false;
  const fileHdrSz = h.readUInt16LE(8);
  const chunkHdrSz = h.readUInt16LE(10);
  const blkSz = h.readUInt32LE(12);
  const totalBlks = h.readUInt32LE(16);
  const totalChunks = h.readUInt32LE(20);
  P('  sparse: blkSize=' + blkSz + ' totalBlks=' + totalBlks + ' (' + (totalBlks * blkSz / 1048576).toFixed(1) + ' MiB raw) chunks=' + totalChunks);
  const out = fs.openSync(outPath, 'w');
  let inPos = payloadOff + fileHdrSz;
  let outPos = 0;
  const ch = Buffer.alloc(16);
  let blocks = 0;
  for (let c = 0; c < totalChunks; c++) {
    fs.readSync(fd, ch, 0, chunkHdrSz, inPos);
    const type = ch.readUInt16LE(0);
    const csz = ch.readUInt32LE(4);
    const dataLen = csz * blkSz;
    if (type === 0xCAC1) {
      copyRange(inPos + chunkHdrSz, out, outPos, dataLen);
      inPos += chunkHdrSz + dataLen;
      outPos += dataLen;
    } else if (type === 0xCAC2) {
      const fv = Buffer.alloc(4);
      fs.readSync(fd, fv, 0, 4, inPos + chunkHdrSz);
      const pat = Buffer.alloc(4); fv.copy(pat);
      const B = Buffer.alloc(Math.min(dataLen, 1 << 20));
      for (let k = 0; k + 4 <= B.length; k += 4) pat.copy(B, k);
      let rem = dataLen;
      while (rem > 0) { const n = Math.min(B.length, rem); fs.writeSync(out, B, 0, n, outPos); outPos += n; rem -= n; }
      inPos += chunkHdrSz + 4;
    } else if (type === 0xCAC3) {
      // dontcare: leave a hole (sparse file)
      outPos += dataLen;
      inPos += chunkHdrSz;
    } else if (type === 0xCAC4) {
      inPos += chunkHdrSz + 4;
    } else {
      P('  !! unknown chunk type 0x' + type.toString(16) + ' at chunk ' + c);
      break;
    }
    blocks += csz;
  }
  fs.ftruncateSync(out, outPos);
  fs.closeSync(out);
  P('  -> ' + path.basename(outPath) + '  written=' + (outPos / 1048576).toFixed(1) + ' MiB  blocks=' + blocks + '/' + totalBlks);
  return true;
}

for (const e of entries) {
  P('');
  P('# ' + e.name + '  off=0x' + e.off.toString(16) + '  hdrsize=0x' + e.size.toString(16) + ' (' + (e.size / 1048576).toFixed(2) + ' MiB)  target=0x' + e.start.toString(16) + '-0x' + e.end.toString(16));
  if (skip.includes(e.name)) { P('  skipped (user request)'); continue; }
  const hdr = Buffer.alloc(8);
  fs.readSync(fd, hdr, 0, 8, e.off);
  P('  blob hdr: size=0x' + hdr.readUInt32BE(0).toString(16) + ' crc=0x' + hdr.readUInt32BE(4).toString(16));
  const payloadOff = e.off + 8;
  const first = Buffer.alloc(16);
  fs.readSync(fd, first, 0, 16, payloadOff);
  const tag = first.toString('latin1').replace(/[^\x20-\x7e]/g, '.').slice(0, 16);
  P('  payload[0..16]: ' + tag);
  if (first.readUInt32LE(0) === 0xED26FF3A) {
    unsparse(payloadOff, path.join(outDir, e.name + '.img'));
  } else {
    const ext = first.toString('latin1').startsWith('ANDROID!') ? '.img' : '.bin';
    const outPath = path.join(outDir, e.name + ext);
    copyFile(payloadOff, outPath, e.size);
    P('  -> ' + path.basename(outPath) + ' (' + (e.size / 1048576).toFixed(2) + ' MiB)');
  }
}

fs.writeFileSync(path.join(outDir, 'unsparse_report.txt'), L.join('\n'));
P('');
P('done.');
