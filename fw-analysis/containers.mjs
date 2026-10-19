// Container/marker structure analysis
import fs from 'node:fs';
const inPath = process.argv[2];
const buf = fs.readFileSync(inPath);
const size = buf.length;
const outDir = process.argv[3] || '.';
const L = []; const P = s => L.push(s);

function find(pat, from = 0, cap = 2000) { const p = Buffer.from(pat); const hits = []; let i = from; while (hits.length < cap) { const j = buf.indexOf(p, i); if (j < 0) break; hits.push(j); i = j + 1; } return hits; }
function hexdump(off, len) { const end = Math.min(size, off + len); for (let o = off; o < end; o += 16) { const row = [...buf.subarray(o, Math.min(o + 16, end))]; const hx = row.map(x => x.toString(16).padStart(2, '0')).join(' '); const asc = row.map(x => x >= 0x20 && x <= 0x7e ? String.fromCharCode(x) : '.').join(''); P('  ' + o.toString(16).padStart(6, '0') + '  ' + hx + '  ' + asc); } }

// 1. exact block B hits and deltas
const B = 'c0284d4b9ae30625c3b59e42a9a553a0';
const hitsB = find(Buffer.from(B, 'hex'));
P('== exact block B hits: ' + hitsB.length + ' ==');
P(hitsB.slice(0, 200).map(o => '0x' + o.toString(16)).join(' '));
if (hitsB.length > 1) { const d = []; for (let i = 1; i < hitsB.length; i++) d.push(hitsB[i] - hitsB[i - 1]); P('deltas: ' + d.slice(0, 80).join(' ')); P('delta min/max/avg: ' + Math.min(...d) + '/' + Math.max(...d) + '/' + Math.round(d.reduce((a, b) => a + b, 0) / d.length)); }

// 2. partial markers
for (const bytes of [8, 12]) {
  const pat = Buffer.from(B.slice(0, bytes * 2), 'hex');
  const h = find(pat);
  P(''); P('== partial B (' + bytes + ' bytes) hits: ' + h.length + ' ==');
  P(h.slice(0, 100).map(o => '0x' + o.toString(16)).join(' '));
  if (h.length > 1) { const d = []; for (let i = 1; i < h.length; i++) d.push(h[i] - h[i - 1]); P('deltas: ' + d.slice(0, 80).join(' ')); }
}

// 3. context around first B hits
P(''); P('== context around first B hits ==');
for (const off of hitsB.slice(0, 4)) { P('@0x' + off.toString(16) + '  (-64..+96 bytes):'); hexdump(Math.max(0, off - 64), 160); }

// 4. region stride-16 equality
function stride16(start, end) { let m = 0, n = 0; for (let i = start; i + 16 < end; i++) { n++; if (buf[i] === buf[i + 16]) m++; } return 100 * m / n; }
P(''); P('== stride-16 equality by region ==');
P('head 0-0x368000: ' + stride16(0, 0x368000).toFixed(3) + '%');
P('tail 0x368000-0x3cb900: ' + stride16(0x368000, 0x3cb900).toFixed(3) + '%');

// 5. eyeball views
P(''); P('== eyeball 0x000000 (512 bytes) =='); hexdump(0, 512);
P(''); P('== eyeball @0x200000 (512 bytes) =='); hexdump(0x200000, 512);

// 6. 32-bit word histograms
function topwords(start, len, le) { const m = new Map(); for (let o = start; o + 4 <= start + len; o += 4) { const w = le ? buf.readUInt32LE(o) : buf.readUInt32BE(o); m.set(w, (m.get(w) || 0) + 1); } return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10); }
P(''); P('== top LE32 words head[0x100000..+256KB] ==');
for (const [w, c] of topwords(0x100000, 262144, true)) P('  0x' + w.toString(16).padStart(8, '0') + ' x' + c);
P('== top LE32 words tail[0x368000..+256KB] ==');
for (const [w, c] of topwords(0x368000, 262144, true)) P('  0x' + w.toString(16).padStart(8, '0') + ' x' + c);

fs.writeFileSync(outDir + '/containers_report.txt', L.join('\n'));
console.log('written: ' + outDir + '/containers_report.txt');
