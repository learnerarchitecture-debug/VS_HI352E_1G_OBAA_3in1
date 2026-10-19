// bitdump.mjs - print set-bit ranges of a group's block bitmap
// usage: node bitdump.mjs <img> <group> [maxRanges]
import fs from 'node:fs';

const img = process.argv[2];
const g = Number(process.argv[3]);
const maxRanges = Number(process.argv[4] || 200);

const fd = fs.openSync(img, 'r');
const sb = Buffer.alloc(1024);
fs.readSync(fd, sb, 0, 1024, 1024);
const bs = 1024 << sb.readUInt32LE(0x18);
const first = sb.readUInt32LE(0x14);
const incompat = sb.readUInt32LE(0x60);
const blocks = sb.readUInt32LE(4) + ((incompat & 0x80) ? sb.readUInt32LE(0x150) * 2 ** 32 : 0);
const bpg = sb.readUInt32LE(0x20);
const descSize = (incompat & 0x80) ? (sb.readUInt16LE(0xFE) || 64) : 32;
const groups = Math.ceil((blocks - first) / bpg);
const gdt = Buffer.alloc(groups * descSize);
fs.readSync(fd, gdt, 0, gdt.length, (first + 1) * bs);
const bb = gdt.readUInt32LE(g * descSize + 0);
const b = Buffer.alloc(bs);
fs.readSync(fd, b, 0, bs, bb * bs);
const total = Math.min(bpg, blocks - first - g * bpg);

const ranges = [];
let runStart = -1;
let usedCount = 0;
for (let bit = 0; bit < total; bit++) {
  const used = (b[bit >> 3] >> (bit & 7)) & 1;
  if (used) {
    usedCount++;
    if (runStart < 0) runStart = bit;
  } else if (runStart >= 0) {
    ranges.push([runStart, bit - 1]);
    runStart = -1;
  }
}
if (runStart >= 0) ranges.push([runStart, total - 1]);

console.log(`group ${g}: bitmap block ${bb}, total blocks ${total}, used ${usedCount}, free ${total - usedCount}`);
console.log(`ranges (${ranges.length}):`);
console.log(ranges.slice(0, maxRanges).map(([a, z]) => a === z ? `${a}` : `${a}-${z}`).join(' '));
fs.closeSync(fd);
