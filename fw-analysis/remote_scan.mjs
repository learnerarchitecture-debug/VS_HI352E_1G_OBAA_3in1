// remote_scan: hunt for NEC-style IR code tables (aa ~aa cc ~cc) + complement-pair density
import fs from 'node:fs';
const buf = fs.readFileSync(process.argv[2]);
const outDir = process.argv[3] || '.';
const size = buf.length;
const L = []; const P = s => L.push(s);

// 2-byte complement pair density per 4KB
const pairPer4k = new Array(Math.ceil(size / 0x1000)).fill(0);
let pairTotal = 0;
for (let i = 0; i + 1 < size; i++) {
  if (buf[i + 1] === (buf[i] ^ 0xff)) { pairPer4k[(i / 0x1000) | 0]++; pairTotal++; }
}
P('2-byte complement pairs (b[i+1] == ~b[i]): total ' + pairTotal + ' (random baseline ~' + Math.round(size / 256) + ')');
const order = pairPer4k.map((v, k) => [v, k]).sort((a, b) => b[0] - a[0]).slice(0, 24);
P('top 4KB blocks by pair density:');
for (const [v, k] of order) P('  0x' + (k * 0x1000).toString(16) + '  ' + v + ' pairs (' + (v / 4096 * 100).toFixed(2) + '% of bytes)');

// 4-byte NEC-style record scan
const hitPos = [];
let nec = 0;
for (let i = 0; i + 3 < size; i++) {
  if (buf[i + 1] === (buf[i] ^ 0xff) && buf[i + 3] === (buf[i + 2] ^ 0xff)) { hitPos.push(i); nec++; i += 2; }
}
P('');
P('4-byte NEC-style records (aa ~aa cc ~cc): ' + nec + ' (random baseline ~' + Math.round(size / 65536) + ')');
const clusters = [];
let cur = null;
for (const p of hitPos) {
  if (cur && p - cur.end <= 128) { cur.end = p; cur.n++; cur.codes.push(p); }
  else { cur = { start: p, end: p, n: 1, codes: [p] }; clusters.push(cur); }
}
clusters.sort((a, b) => b.n - a.n);
P('clusters (gap<=128B), top 40:');
for (const c of clusters.slice(0, 40)) {
  const samples = c.codes.slice(0, 6).map(p => buf.subarray(p, p + 4).toString('hex')).join(' ');
  P('  0x' + c.start.toString(16) + '-0x' + c.end.toString(16) + '  n=' + c.n + '  e.g. ' + samples);
}
fs.writeFileSync(outDir + '/remote_scan_report.txt', L.join('\n'));
console.log(L.join('\n'));
