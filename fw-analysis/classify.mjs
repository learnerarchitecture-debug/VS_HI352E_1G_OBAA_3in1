// classify: parse the LOAD TOC and identify each blob
import fs from 'node:fs';
const path = process.argv[2]; const outDir = process.argv[3] || '.';
const fd = fs.openSync(path, 'r'); const size = fs.statSync(path).size;
const L = []; const P = s => L.push(s);
function hd(off, len) {
  if (off + len > size) len = size - off;
  const b = Buffer.alloc(len); fs.readSync(fd, b, 0, len, off);
  for (let o = 0; o < len; o += 16) {
    const row = [...b.subarray(o, o + 16)];
    P('  ' + (off + o).toString(16).padStart(9, '0') + '  ' + row.map(x => x.toString(16).padStart(2, '0')).join(' ') + '  ' + row.map(x => (x >= 32 && x < 127) ? String.fromCharCode(x) : '.').join(''));
  }
}
P('== TOC entries (@0x30, 32B, u32 BE) ==');
const toc = Buffer.alloc(0x800); fs.readSync(fd, toc, 0, 0x800, 0);
for (let i = 0; i < 60; i++) {
  const o = 0x30 + i * 32; if (o + 32 > 0x800) break;
  const f = [0, 1, 2, 3, 4, 5, 6, 7].map(k => toc.readUInt32BE(o + k * 4));
  const plaus = f[3] === 2 && f[0] <= 0x40000000 && f[2] >= f[0] && f[6] < size;
  P('  #' + String(i).padStart(2) + ' @0x' + o.toString(16) + '  ' + f.map(v => v.toString(16).padStart(8, '0')).join(' ') + (plaus ? '  start=' + (f[0] / 1048576).toFixed(1) + 'M end=' + (f[2] / 1048576).toFixed(1) + 'M size=0x' + f[5].toString(16) + ' data=0x' + f[6].toString(16) : '  ?'));
}
P('');
P('== blob dumps ==');
const offs = [0x79e34, 0x89e3c, 0x99e44, 0x11ee9e4, 0x11f5670, 0x13f5678, 0x1cda688, 0x1cde20a, 0x1ce7c5a, 0x1cf5cf6, 0x1cf650e, 0x1e12516, 0x1f2e51e, 0x1f2f79e, 0x4a77c89a, 0x4dc69936, 0x50e6993e, 0x50e7a9da, 0x50e8ea76];
for (const o of offs) { P(''); P('-- @0x' + o.toString(16) + ' --'); hd(o, 0x80); }
fs.writeFileSync(outDir + '/classify_report.txt', L.join('\n'));
console.log(L.join('\n'));
