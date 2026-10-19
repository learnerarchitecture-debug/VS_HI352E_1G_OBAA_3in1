// diff_blocks.mjs - compare two image files at 4K-block granularity, report changed blocks
// usage: node diff_blocks.mjs <imgA> <imgB> [blockSize]
import fs from 'node:fs';

const A = process.argv[2], B = process.argv[3];
const BLK = Number(process.argv[4] || 4096);
const CHUNK = 16 << 20; // 16 MiB

const fa = fs.openSync(A, 'r');
const fb = fs.openSync(B, 'r');
const sizeA = fs.statSync(A).size, sizeB = fs.statSync(B).size;
const size = Math.min(sizeA, sizeB);
if (sizeA !== sizeB) console.log(`size differs: A=${sizeA} B=${sizeB}`);

const ba = Buffer.alloc(CHUNK), bb = Buffer.alloc(CHUNK);
const changed = [];
for (let off = 0; off < size; off += CHUNK) {
  const n = Math.min(CHUNK, size - off);
  fs.readSync(fa, ba, 0, n, off);
  fs.readSync(fb, bb, 0, n, off);
  if (ba.subarray(0, n).equals(bb.subarray(0, n))) continue;
  for (let o = 0; o < n; o += BLK) {
    const m = Math.min(BLK, n - o);
    if (!ba.subarray(o, o + m).equals(bb.subarray(o, o + m))) {
      changed.push(Math.floor((off + o) / BLK));
    }
  }
}
// compress to ranges
const ranges = [];
for (const b of changed) {
  const last = ranges[ranges.length - 1];
  if (last && b === last[1] + 1) last[1] = b; else ranges.push([b, b]);
}
console.log(`changed blocks: ${changed.length} in ${ranges.length} range(s)`);
console.log(ranges.map(([a, z]) => a === z ? `${a}` : `${a}-${z}`).join(' ') || '(none)');
fs.closeSync(fa); fs.closeSync(fb);
