// Structural deep-dive #2: record families, runs, checksums, descramble attempts
import fs from 'node:fs';
const inPath = process.argv[2];
const buf = fs.readFileSync(inPath);
const size = buf.length;
const outDir = process.argv[3] || '.';
const L = []; const P = s => L.push(s);

const A = Buffer.from('802c5d5b9bf30615e3b19fc239a5d3a2', 'hex');
const B = Buffer.from('c0284d4b9ae30625c3b59e42a9a553a0', 'hex');
function findAll(pat) { const hits = []; let i = 0; while (true) { const j = buf.indexOf(pat, i); if (j < 0) break; hits.push(j); i = j + 1; } return hits; }
function dump(off, len) { const end = Math.min(size, off + len); for (let o = off; o < end; o += 16) { const row = [...buf.subarray(o, Math.min(o + 16, end))]; const hx = row.map(x => x.toString(16).padStart(2, '0')).join(' '); const asc = row.map(x => x >= 0x20 && x <= 0x7e ? String.fromCharCode(x) : '.').join(''); P('  ' + o.toString(16).padStart(6, '0') + '  ' + hx + '  ' + asc); } }

// 1. full A/B counts + 64K-bin histograms
for (const [nm, pat] of [['A', A], ['B', B]]) {
  const hits = findAll(pat);
  P('== family ' + nm + ': ' + hits.length + ' occurrences ==');
  const bins = new Array(Math.ceil(size / 0x10000)).fill(0);
  for (const h of hits) bins[h >> 16]++;
  const nz = bins.map((c, i) => [i, c]).filter(x => x[1] > 0);
  P('64K bins: ' + nz.map(([i, c]) => '0x' + (i * 0x10000).toString(16) + ':' + c).join('  '));
}

// 2. runs of consecutive-16 hits
for (const [nm, pat] of [['A', A], ['B', B]]) {
  const hits = findAll(pat);
  const runs = []; let s = null, prev = null;
  for (const h of hits) { if (s === null) { s = h; prev = h; } else if (h - prev === 16) { prev = h; } else { runs.push([s, prev]); s = h; prev = h; } }
  if (s !== null) runs.push([s, prev]);
  const big = runs.filter(r => (r[1] - r[0]) / 16 >= 2);
  P(''); P('== ' + nm + ' runs (>=3 blocks): ' + big.length + ' ==');
  for (const [a, b] of big.slice(0, 60)) P('  0x' + a.toString(16) + ' .. 0x' + b.toString(16) + '  (' + ((b - a) / 16 + 1) + ' blocks)');
}

// 3. target dumps
P(''); P('== dump 0x367a60-0x367da0 (544-period cluster) =='); dump(0x367a60, 0x340);
P(''); P('== dump 0x372480-0x3725a0 (big B-run start) =='); dump(0x372480, 0x120);
P(''); P('== dump 0x372b30-0x372c60 (big B-run end) =='); dump(0x372b30, 0x130);
P(''); P('== dump 0x73cc0-0x73dc0 =='); dump(0x73cc0, 0x100);

// 4. checksum-relation pass rates
function relStats(start, len) {
  let n = 0, sum16 = 0, xor16 = 0, sum15 = 0, xor15 = 0, s8b8 = 0, x8b8 = 0, halves = 0;
  for (let o = start; o + 16 <= Math.min(start + len, size); o += 16) {
    const r = buf.subarray(o, o + 16); n++;
    let s = 0, x = 0; for (let i = 0; i < 16; i++) { s = (s + r[i]) & 255; x ^= r[i]; }
    if (s === 0) sum16++;
    if (x === 0) xor16++;
    let s15 = 0, x15 = 0; for (let i = 0; i < 15; i++) { s15 = (s15 + r[i]) & 255; x15 ^= r[i]; }
    if (s15 === r[15]) sum15++;
    if (x15 === r[15]) xor15++;
    let sa = 0, xa = 0; for (let i = 0; i < 8; i++) { sa = (sa + r[i]) & 255; xa ^= r[i]; }
    if (sa === r[8]) s8b8++;
    if (xa === r[8]) x8b8++;
    let sb = 0; for (let i = 8; i < 16; i++) sb = (sb + r[i]) & 255;
    if ((sa & 255) === sb) halves++;
  }
  const pc = v => (100 * v / n).toFixed(2) + '%';
  return `n=${n} sum16=0:${pc(sum16)} xor16=0:${pc(xor16)} sum15=b15:${pc(sum15)} xor15=b15:${pc(xor15)} sum8=b8:${pc(s8b8)} xor8=b8:${pc(x8b8)} halves:${pc(halves)}`;
}
P(''); P('== checksum relation pass rates ==');
P('Z1 0x0-0x10000:        ' + relStats(0, 0x10000));
P('Z2 0x1e0000-0x1f0000:  ' + relStats(0x1e0000, 0x10000));
P('Z3 0x368000-0x378000:  ' + relStats(0x368000, 0x10000));
P('Z4 0x200000-0x210000:  ' + relStats(0x200000, 0x10000));

// 5. simple address-XOR descramble scoring
function cntstr(b, min) { let cnt = 0, cur = 0; for (let i = 0; i < b.length; i++) { const c = b[i]; if (c >= 0x20 && c <= 0x7e) cur++; else { if (cur >= min) cnt++; cur = 0; } } if (cur >= min) cnt++; return cnt; }
function kw(b) { const t = b.toString('latin1'); let c = 0; for (const k of ['MBOOT', 'Linux', 'MIPS', 'inux', 'boot', 'bin', 'etc', 'dev']) { let i = 0; while ((i = t.indexOf(k, i)) >= 0) { c++; i += k.length; } } return c; }
P(''); P('== address-XOR descramble tests (64KB samples) ==');
const samples = [['head', 0], ['tail', 0x368000]];
for (const [nm, off] of samples) {
  const raw = buf.subarray(off, off + 65536);
  P('sample ' + nm + ' raw: strings>=6 ' + cntstr(raw, 6) + ' kw ' + kw(raw));
  for (const [kname, fn] of [
    ['i&255', i => i & 255],
    ['(i>>8)&255', i => (i >> 8) & 255],
    ['(i*0x5d)&255', i => (i * 0x5d) & 255],
    ['(i>>4)&255', i => (i >> 4) & 255],
  ]) {
    const t = Buffer.alloc(65536);
    for (let i = 0; i < 65536; i++) t[i] = raw[i] ^ fn(i + off);
    P('  ' + kname + ': strings>=6 ' + cntstr(t, 6) + ' kw ' + kw(t));
  }
}

// 6. per-position majority profile
function posProfile(start, len) {
  const rows = Math.floor(len / 16); const out = [];
  for (let p = 0; p < 16; p++) {
    const cnt = new Map();
    for (let r = 0; r < rows; r++) { const v = buf[start + r * 16 + p]; cnt.set(v, (cnt.get(v) || 0) + 1); }
    const top = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0];
    let lo = new Map(), hi = new Map();
    for (let r = 0; r < rows; r++) { const v = buf[start + r * 16 + p]; lo.set(v & 15, (lo.get(v & 15) || 0) + 1); hi.set(v >> 4, (hi.get(v >> 4) || 0) + 1); }
    const tl = [...lo.entries()].sort((a, b) => b[1] - a[1])[0];
    const th = [...hi.entries()].sort((a, b) => b[1] - a[1])[0];
    out.push('p' + p + ':' + top[0].toString(16).padStart(2, '0') + '(' + (100 * top[1] / rows).toFixed(0) + '%) lo=' + tl[0].toString(16) + '(' + (100 * tl[1] / rows).toFixed(0) + '%) hi=' + th[0].toString(16) + '(' + (100 * th[1] / rows).toFixed(0) + '%)');
  }
  return out.join('  ');
}
P(''); P('== per-position majority (byte / low-nibble / high-nibble) ==');
P('0x0-0x4000:      ' + posProfile(0, 0x4000));
P('0x0-0x100:       ' + posProfile(0, 0x100));
P('0x200000-0x204000: ' + posProfile(0x200000, 0x4000));
P('0x368000-0x36c000: ' + posProfile(0x368000, 0x4000));
P('0x3724e0-0x3728e0: ' + posProfile(0x3724e0, 0x4000));

// 7. 4-byte motif counts
P(''); P('== 4-byte motif counts ==');
for (const hex of ['9ae30625', 'c0284d4b', '802c5d5b', 'c3b59e42', 'a9a553a0', '39a5d3a2', 'a9a553', '06 25'.replace(' ', '') + '']) {
  const hits = findAll(Buffer.from(hex, 'hex'));
  P('  ' + hex + ': ' + hits.length + '  first@' + (hits.length ? '0x' + hits[0].toString(16) : '-'));
}

fs.writeFileSync(outDir + '/structure2_report.txt', L.join('\n'));
console.log('written: ' + outDir + '/structure2_report.txt');
