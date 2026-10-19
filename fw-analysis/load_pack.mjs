// load_pack.mjs - HiSilicon/Vestel LOAD package tool (dump / pack)
// dump: node load_pack.mjs dump <src.bin>
// pack: node load_pack.mjs pack <src.bin> <out.bin> <replacements.json>
//   replacements.json: { "system": "C:\\path\\system.img", ... }  (raw ext4 images; sparse-encoded automatically)
import fs from 'node:fs';

const names = ['fastboot','bootargs','bootargsbak','slaveboot','recovery','panelparam','deviceinfo','logo','boot','dtbo','atf','securestore','misc','bootmusic','bootmusicsec','tconparam','system','vendor','atv','log','cache','userdata'];

// ---------- MPEG2 CRC (poly 0x04C11DB7, init 0xFFFFFFFF, xorout 0) ----------
const TBL = [];
for (let n = 0; n < 256; n++) {
  let c = n << 24;
  for (let k = 0; k < 8; k++) c = (c & 0x80000000) ? (((c << 1) ^ 0x04C11DB7) >>> 0) : ((c << 1) >>> 0);
  TBL[n] = c >>> 0;
}
function mpeg2Update(c, buf) {
  for (let i = 0; i < buf.length; i++) c = ((c << 8) ^ TBL[((c >>> 24) ^ buf[i]) & 0xff]) >>> 0;
  return c;
}
function mpeg2File(path, size) {
  const fd = fs.openSync(path, 'r');
  const B = Buffer.alloc(8 << 20);
  let c = 0xFFFFFFFF, p = 0;
  while (p < size) {
    const n = Math.min(B.length, size - p);
    const r = fs.readSync(fd, B, 0, n, p);
    if (r <= 0) break;
    c = mpeg2Update(c, B.subarray(0, r));
    p += r;
  }
  fs.closeSync(fd);
  return c >>> 0;
}

function parseToc(fd) {
  const toc = Buffer.alloc(0x400);
  fs.readSync(fd, toc, 0, 0x400, 0);
  const entries = [];
  for (let i = 0; i < 40; i++) {
    const o = 0x30 + i * 32;
    const f = [0,1,2,3,4,5,6,7].map(k => toc.readUInt32BE(o + k * 4));
    if (f[7] !== 2 || f[6] <= f[4] || f[6] > 0x800000000) break;
    const bh = Buffer.alloc(8);
    fs.readSync(fd, bh, 0, 8, f[2]);
    entries.push({ idx: i, name: names[i], crc: f[0], size: f[1], off: f[2], f3: f[3], start: f[4], f5: f[5], end: f[6], f7: f[7], hdrSize: bh.readUInt32BE(0), hdrCrc: bh.readUInt32BE(4) });
  }
  return { toc, entries };
}

// ---------- Android sparse ----------
const SPARSE_MAGIC = 0xED26FF3A;
const CHUNK_RAW = 0xCAC1, CHUNK_FILL = 0xCAC2, CHUNK_DONT = 0xCAC3;
function isZeroBlock(buf, off, len) {
  for (let i = 0; i < len; i += 4) if (buf.readUInt32LE(off + i) !== 0) return false;
  return true;
}
function sparseEncode(rawPath, outPath, blkSize) {
  const size = fs.statSync(rawPath).size;
  const totalBlks = Math.ceil(size / blkSize);
  const fd = fs.openSync(rawPath, 'r');
  const B = Buffer.alloc(16 << 20);
  // pass 1: classify blocks
  const zero = new Uint8Array(totalBlks);
  let blk = 0;
  while (blk < totalBlks) {
    const n = Math.min(B.length, (totalBlks - blk) * blkSize);
    const r = fs.readSync(fd, B, 0, n, blk * blkSize);
    const blks = Math.floor(r / blkSize);
    for (let i = 0; i < blks; i++) zero[blk + i] = isZeroBlock(B, i * blkSize, blkSize) ? 1 : 0;
    if (blks === 0) break;
    blk += blks;
  }
  // pass 2: build chunk list
  const chunks = [];
  let i = 0;
  while (i < totalBlks) {
    const z = zero[i];
    let j = i;
    while (j < totalBlks && zero[j] === z) j++;
    chunks.push({ type: z ? CHUNK_DONT : CHUNK_RAW, blocks: j - i, off: i * blkSize });
    i = j;
  }
  // write
  const wfd = fs.openSync(outPath, 'w');
  const hdr = Buffer.alloc(28);
  hdr.writeUInt32LE(SPARSE_MAGIC, 0);
  hdr.writeUInt16LE(1, 4); // major
  hdr.writeUInt16LE(0, 6); // minor
  hdr.writeUInt16LE(28, 8); // file_hdr_sz
  hdr.writeUInt16LE(12, 10); // chunk_hdr_sz
  hdr.writeUInt32LE(blkSize, 12);
  hdr.writeUInt32LE(totalBlks, 16);
  hdr.writeUInt32LE(chunks.length, 20);
  hdr.writeUInt32LE(0, 24); // image_checksum (not computed)
  fs.writeSync(wfd, hdr, 0, 28, 0);
  let pos = 28;
  const rd = fs.openSync(rawPath, 'r');
  const RB = Buffer.alloc(8 << 20);
  for (const c of chunks) {
    const dataLen = c.type === CHUNK_RAW ? c.blocks * blkSize : 0;
    const ch = Buffer.alloc(12);
    ch.writeUInt32LE(c.type, 0);
    ch.writeUInt32LE(c.blocks, 4);
    ch.writeUInt32LE(12 + dataLen, 8);
    fs.writeSync(wfd, ch, 0, 12, pos); pos += 12;
    if (c.type === CHUNK_RAW) {
      let remaining = dataLen, src = c.off;
      while (remaining > 0) {
        const n = Math.min(RB.length, remaining);
        fs.readSync(rd, RB, 0, n, src);
        fs.writeSync(wfd, RB, 0, n, pos);
        pos += n; src += n; remaining -= n;
      }
    }
  }
  fs.closeSync(rd); fs.closeSync(wfd); fs.closeSync(fd);
  const outSize = fs.statSync(outPath).size;
  return { totalBlks, chunks: chunks.length, rawBytes: size, sparseBytes: outSize, chunksList: chunks };
}
function sparseInfo(path, off) {
  const fd = fs.openSync(path, 'r');
  const h = Buffer.alloc(28);
  fs.readSync(fd, h, 0, 28, off);
  fs.closeSync(fd);
  if (h.readUInt32LE(0) !== SPARSE_MAGIC) return null;
  return {
    magic: h.readUInt32LE(0).toString(16), major: h.readUInt16LE(4), minor: h.readUInt16LE(6),
    fileHdrSz: h.readUInt16LE(8), chunkHdrSz: h.readUInt16LE(10), blkSz: h.readUInt32LE(12),
    totalBlks: h.readUInt32LE(16), totalChunks: h.readUInt32LE(20), checksum: '0x' + h.readUInt32LE(24).toString(16),
  };
}

// ---------- CLI ----------
const [, , cmd, src, a3, a4] = process.argv;

if (cmd === 'dump') {
  const fd = fs.openSync(src, 'r');
  const fileSize = fs.statSync(src).size;
  const { toc, entries } = parseToc(fd);
  console.log('header hex 0x00..0x30:');
  for (let o = 0; o < 0x30; o += 16) console.log('  0x' + o.toString(16).padStart(3, '0') + ': ' + [...toc.subarray(o, o + 16)].map(b => b.toString(16).padStart(2, '0')).join(' '));
  console.log(`file size: ${fileSize} (0x${fileSize.toString(16)})  entries: ${entries.length}`);
  console.log('idx name            crc        size         off          f3  start        f5  end          f7');
  for (const e of entries) {
    console.log(`${String(e.idx).padStart(3)} ${e.name.padEnd(14)} 0x${e.crc.toString(16).padStart(8, '0')} 0x${e.size.toString(16).padStart(8, '0')} 0x${e.off.toString(16).padStart(8, '0')} 0x${e.f3.toString(16).padStart(2, '0')}  0x${e.start.toString(16).padStart(8, '0')} 0x${e.f5.toString(16).padStart(2, '0')}  0x${e.end.toString(16).padStart(8, '0')}  ${e.f7}`);
    const si = sparseInfo(src, e.off + 8);
    if (si) console.log(`      sparse: blkSz=${si.blkSz} totalBlks=${si.totalBlks} chunks=${si.totalChunks} checksum=${si.checksum} hdr=${si.fileHdrSz}/${si.chunkHdrSz} v${si.major}.${si.minor}`);
    else console.log(`      (not sparse, first bytes: ${(() => { const b = Buffer.alloc(8); fs.readSync(fd, b, 0, 8, e.off + 8); return b.toString('hex'); })()})`);
  }
  // computed end vs file size
  const last = entries[entries.length - 1];
  console.log(`expected end of last blob: 0x${(last.off + 8 + last.size).toString(16)}  (file size 0x${fileSize.toString(16)})`);
  fs.closeSync(fd);
  process.exit(0);
}

if (cmd === 'pack') {
  const out = a3;
  const reps = JSON.parse(fs.readFileSync(a4, 'utf8'));
  const fd = fs.openSync(src, 'r');
  const { toc, entries } = parseToc(fd);
  console.log('packing: ' + src + ' -> ' + out);
  console.log('replacements: ' + Object.keys(reps).join(', '));

  // prepare replacement payloads
  const tmpDir = process.env.TEMP || '.';
  const repl = {};
  for (const [key, spec] of Object.entries(reps)) {
    const rawPath = typeof spec === 'string' ? spec : spec.path;
    const useSparse = typeof spec === 'object' && spec.sparse === true;
    let artifact = rawPath, size, crc, st = null;
    if (useSparse) {
      const outSparse = `${tmpDir}\\obaa-sparse-${key}.img`;
      process.stdout.write(`  encoding ${key} (sparse) ... `);
      st = sparseEncode(rawPath, outSparse, 4096);
      artifact = outSparse; size = st.sparseBytes;
    } else {
      process.stdout.write(`  using ${key} (raw) ... `);
      size = fs.statSync(rawPath).size;
    }
    crc = mpeg2File(artifact, size);
    repl[key] = { path: artifact, size, crc };
    console.log(`${size} bytes crc 0x${crc.toString(16)}${st ? ` (raw ${st.rawBytes}, chunks ${st.chunks}, blks ${st.totalBlks})` : ''}`);
  }

  // build new entry table
  const newEntries = [];
  let dataOff = entries[0].off; // TOC area end (first blob offset) - stays the same
  for (const e of entries) {
    const r = repl[e.name];
    const size = r ? r.size : e.size;
    const hdrCrc = r ? r.crc : e.hdrCrc; // blob header crc: MPEG2 of payload
    newEntries.push({ ...e, size, hdrCrc, entryCrc: e.crc, dataOff }); // field0 (entryCrc) kept as in original
    dataOff += 8 + size;
  }
  const totalEnd = dataOff;

  // write output
  const wfd = fs.openSync(out, 'w');
  // header: copy original 0x00..0x2F0 verbatim, then rewrite TOC area
  const hdr = Buffer.from(toc.subarray(0, 0x2F0));
  fs.writeSync(wfd, hdr, 0, hdr.length, 0);
  // TOC
  const tocOut = Buffer.alloc(newEntries.length * 32 + 4); // + terminator
  for (let i = 0; i < newEntries.length; i++) {
    const e = newEntries[i];
    const o = i * 32;
    tocOut.writeUInt32BE(e.entryCrc >>> 0, o + 0);
    tocOut.writeUInt32BE(e.size >>> 0, o + 4);
    tocOut.writeUInt32BE(e.dataOff >>> 0, o + 8);
    tocOut.writeUInt32BE(e.f3 >>> 0, o + 12);
    tocOut.writeUInt32BE(e.start >>> 0, o + 16);
    tocOut.writeUInt32BE(e.f5 >>> 0, o + 20);
    tocOut.writeUInt32BE(e.end >>> 0, o + 24);
    tocOut.writeUInt32BE(e.f7 >>> 0, o + 28);
  }
  // terminator: 4 zero bytes (as original) -> check original bytes at 0x30+22*32 = 0x2F0..0x2F4
  tocOut.writeUInt32BE(0, newEntries.length * 32);
  fs.writeSync(wfd, tocOut, 0, tocOut.length, 0x30);

  // blobs
  const B = Buffer.alloc(8 << 20);
  let pos = entries[0].off;
  for (const e of newEntries) {
    const bh = Buffer.alloc(8);
    bh.writeUInt32BE(e.size >>> 0, 0);
    bh.writeUInt32BE(e.hdrCrc >>> 0, 4);
    fs.writeSync(wfd, bh, 0, 8, pos); pos += 8;
    // payload
    if (repl[e.name]) {
      const rfd = fs.openSync(repl[e.name].path, 'r');
      let p = 0;
      while (p < e.size) {
        const n = Math.min(B.length, e.size - p);
        fs.readSync(rfd, B, 0, n, p);
        fs.writeSync(wfd, B, 0, n, pos);
        pos += n; p += n;
      }
      fs.closeSync(rfd);
    } else {
      let q = e.off + 8;
      let rem = e.size;
      while (rem > 0) {
        const n = Math.min(B.length, rem);
        fs.readSync(fd, B, 0, n, q);
        fs.writeSync(wfd, B, 0, n, pos);
        pos += n; q += n; rem -= n;
      }
    }
  }
  // patch total file size into header field 0x10
  const szBuf = Buffer.alloc(4);
  szBuf.writeUInt32BE(pos >>> 0, 0);
  fs.writeSync(wfd, szBuf, 0, 4, 0x10);
  fs.closeSync(wfd);
  // trailing check
  const outSize = fs.statSync(out).size;
  console.log(`  done: ${out}  size ${outSize} (0x${outSize.toString(16)})`);
  const origSize = fs.statSync(src).size;
  if (origSize !== outSize) console.log(`  NOTE: original size ${origSize} (0x${origSize.toString(16)}), delta ${outSize - origSize}`);
  console.log(`  expected end: ${totalEnd} (0x${totalEnd.toString(16)})`);
  fs.closeSync(fd);
  process.exit(0);
}

console.error('usage: dump <src.bin> | pack <src.bin> <out.bin> <replacements.json>');
process.exit(1);
