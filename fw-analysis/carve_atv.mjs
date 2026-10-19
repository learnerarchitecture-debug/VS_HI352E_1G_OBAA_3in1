import fs from 'node:fs';
const bin = 'C:\\Users\\techn\\OneDrive\\Desktop\\SP3531E.5 VRVT\\VS_HI352E_1G.bin';
const out = 'C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\atv.img';
const fd = fs.openSync(bin, 'r');
const wfd = fs.openSync(out, 'w');
const off = 1304860982 + 8; // skip 8-byte blob header
const size = 52428800;
const B = Buffer.alloc(8 << 20);
let p = 0;
while (p < size) {
  const n = Math.min(B.length, size - p);
  fs.readSync(fd, B, 0, n, off + p);
  fs.writeSync(wfd, B, 0, n, p);
  p += n;
}
fs.closeSync(fd); fs.closeSync(wfd);
console.log('atv.img written:', size, 'bytes to', out);