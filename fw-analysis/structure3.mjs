// structure3: focused zone analysis (all local)
import fs from 'node:fs';
const inPath = process.argv[2];
const buf = fs.readFileSync(inPath);
const outDir = process.argv[3] || '.';
const L = []; const P = s => L.push(s);
const size = buf.length;

const A = Buffer.from('802c5d5b9bf30615e3b19fc239a5d3a2', 'hex');
const B = Buffer.from('c0284d4b9ae30625c3b59e42a9a553a0', 'hex');

function hexdump(off, len) {
  const end = Math.min(size, off + len);
  for (let o = off; o < end; o += 16) {
    const row = [...buf.subarray(o, Math.min(o + 16, end))];
    const hx = row.map(x => x.toString(16).padStart(2, '0')).join(' ');
    const asc = row.map(x => x >= 0x20 && x <= 0x7e ? String.fromCharCode(x) : '.').join('');
    P('  ' + o.toString(16).padStart(6, '0') + '  ' + hx + '  ' + asc);
  }
}
function bitdiff(b1, b2) { let d = 0; for (let i = 0; i < b1.length; i++) { let x = b1[i] ^ b2[i]; while (x) { d += x & 1; x >>= 1; } } return d; }

// 1. A-zone: dump 12 entries of 96 bytes
P('== A-zone dump 0x375eb0 (+0x480) ==');
hexdump(0x375eb0, 0x480);

// 2. variable blocks of 96-byte entries (var at +80)
P('');
P('== A-zone variable blocks (entry=96B, var at +80) ==');
for (let n = 0; n < 40; n++) {
  const e = 0x375eb0 + n * 96;
  if (e + 96 > size) break;
  const v = buf.subarray(e + 80, e + 96);
  const blocksA = [0, 1, 2, 3, 4].every(k => buf.subarray(e + k * 16, e + k * 16 + 16).equals(A));
  P('  entry ' + n + ' @0x' + e.toString(16) + '  var=' + v.toString('hex') + (v.equals(A) ? ' (A)' : '') + (blocksA ? ' [head=A x5]' : ' [head mixed]'));
}

// 3. end-zone dumps
P('');
P('== end-zone dumps ==');
P('-- 0x3f0780-0x3f08a0 (gap between B runs) --'); hexdump(0x3f0780, 0x120);
P('-- 0x3e0500-0x3e0580 (12-block run start) --'); hexdump(0x3e0500, 0x80);
P('-- 0x3e2000-0x3e2100 --'); hexdump(0x3e2000, 0x100);
P('-- 0x3a5f40-0x3a5fc0 --'); hexdump(0x3a5f40, 0x80);
P('-- 0x3ef580-0x3ef600 --'); hexdump(0x3ef580, 0x80);
P('-- 0x3f2000-0x3f2100 --'); hexdump(0x3f2000, 0x100);
P('-- last bytes 0x3fffc0-0x400000 --'); hexdump(0x3fffc0, 0x40);

// 4. first 16 records bitdiff vs B
P('');
P('== first 16 records @0x0: bitdiff vs B ==');
for (let i = 0; i < 16; i++) { const r = buf.subarray(i * 16, i * 16 + 16); P('  rec ' + i + ': ' + r.toString('hex') + '  diff=' + bitdiff(r, B)); }

// 5. occurrence counts of notable records
P('');
P('== occurrence of notable records ==');
for (const hexs of ['e0285d4b9ae30625d3b48a40b92751e5', 'c0284d4b9ae30625edb47666a19c9413', 'c0284d4b9ae30625c3b59e42a9a553a0']) {
  const pat = Buffer.from(hexs, 'hex'); const hits = []; let i = 0;
  while (hits.length < 60) { const j = buf.indexOf(pat, i); if (j < 0) break; hits.push(j); i = j + 1; }
  P('  ' + hexs.slice(0, 16) + '.. hits(first60)=' + hits.length + ' @ ' + hits.map(o => '0x' + o.toString(16)).join(' '));
}

// 6. transform battery
function metrics(b) {
  const rows = Math.floor(b.length / 16);
  const recs = new Set();
  for (let r = 0; r < rows; r++) recs.add(b.subarray(r * 16, r * 16 + 16).toString('hex'));
  let maxrun = 0, run = 1, prev = null, cnt3 = 0;
  for (let r = 0; r < rows; r++) {
    const k = b.subarray(r * 16, r * 16 + 16).toString('hex');
    if (k === prev) { run++; if (run === 3) cnt3++; } else { if (run > maxrun) maxrun = run; run = 1; prev = k; }
  }
  if (run > maxrun) maxrun = run;
  let maj = 0;
  for (let p = 0; p < 16; p++) {
    const c = new Map();
    for (let r = 0; r < rows; r++) { const v = b[r * 16 + p]; c.set(v, (c.get(v) || 0) + 1); }
    let mx = 0; for (const v of c.values()) if (v > mx) mx = v;
    maj += mx / rows;
  }
  maj = 100 * maj / 16;
  let str = 0, cur = 0;
  for (let i = 0; i < b.length; i++) { const c = b[i]; if (c >= 0x20 && c <= 0x7e) cur++; else { if (cur >= 6) str++; cur = 0; } }
  if (cur >= 6) str++;
  return 'uniq=' + recs.size + '/' + rows + ' maxrun=' + maxrun + ' runs3+=' + cnt3 + ' maj=' + maj.toFixed(1) + '% str6=' + str;
}
function transform(b, name) {
  const n = b.length; const o = Buffer.alloc(n);
  if (name === 'raw') return b;
  if (name === 'swap16') { for (let i = 0; i + 1 < n; i += 2) { o[i] = b[i + 1]; o[i + 1] = b[i]; } return o; }
  if (name === 'swap32') { for (let i = 0; i + 3 < n; i += 4) { o[i] = b[i + 3]; o[i + 1] = b[i + 2]; o[i + 2] = b[i + 1]; o[i + 3] = b[i]; } return o; }
  if (name === 'bitrev8') { for (let i = 0; i < n; i++) { let v = b[i], r = 0; for (let k = 0; k < 8; k++) { r = (r << 1) | (v & 1); v >>= 1; } o[i] = r; } return o; }
  if (name === 'nibswap') { for (let i = 0; i < n; i++) o[i] = ((b[i] >> 4) | (b[i] << 4)) & 255; return o; }
  if (name === 'bitrev16') { for (let i = 0; i + 1 < n; i += 2) { let v = b[i] | (b[i + 1] << 8), r = 0; for (let k = 0; k < 16; k++) { r = (r << 1) | (v & 1); v >>= 1; } o[i] = r & 255; o[i + 1] = r >> 8; } return o; }
  if (name === 'bitrev32') { for (let i = 0; i + 3 < n; i += 4) { let v = b.readUInt32LE(i), r = 0; for (let k = 0; k < 32; k++) { r = ((r << 1) | (v & 1)) >>> 0; v >>>= 1; } o.writeUInt32LE(r >>> 0, i); } return o; }
  if (name === 'deint2') { let w = 0; for (let i = 0; i < n; i += 2) o[w++] = b[i]; for (let i = 1; i < n; i += 2) o[w++] = b[i]; return o; }
  if (name === 'deint4') { let w = 0; for (let k = 0; k < 4; k++) for (let i = k; i < n; i += 4) if (w < n) o[w++] = b[i]; return o; }
  if (name === 'nibplanes') { let w = 0; for (let i = 0; i < n; i++) if (w < n / 2) o[w++] = b[i] & 15; for (let i = 0; i < n && w < n; i++) o[w++] = b[i] >> 4; return o; }
  return b;
}
P('');
P('== transform battery (64KB samples) ==');
for (const [nm, off] of [['Azone', 0x376000], ['endzone', 0x3f0000], ['head', 0x0]]) {
  const sample = buf.subarray(off, off + 65536);
  P('sample ' + nm + ' @0x' + off.toString(16));
  for (const t of ['raw', 'swap16', 'swap32', 'bitrev8', 'nibswap', 'bitrev16', 'bitrev32', 'deint2', 'deint4', 'nibplanes']) {
    P('  ' + t.padEnd(10) + ' ' + metrics(transform(sample, t)));
  }
}

// 7. bitdiff-to-B histogram
P('');
P('== bitdiff-to-B histogram ==');
function hist(start, len, label) {
  const buckets = [0, 1, 9, 17, 33, 65];
  const cnt = [0, 0, 0, 0, 0, 0];
  const rows = Math.floor(len / 16);
  for (let r = 0; r < rows; r++) {
    const d = bitdiff(buf.subarray(start + r * 16, start + r * 16 + 16), B);
    let bi = 0; for (let i = 0; i < buckets.length; i++) if (d >= buckets[i]) bi = i;
    cnt[bi]++;
  }
  P('  ' + label + ' : d0=' + cnt[0] + ' d1-8=' + cnt[1] + ' d9-16=' + cnt[2] + ' d17-32=' + cnt[3] + ' d33-64=' + cnt[4] + ' d65+=' + cnt[5] + ' (n=' + rows + ')');
}
hist(0, 0x100, '0x0-0x100');
hist(0x376000, 0x10000, '0x376000');
hist(0x3f0000, 0x10000, '0x3f0000');
hist(0x200000, 0x10000, '0x200000');

fs.writeFileSync(outDir + '/structure3_report.txt', L.join('\n'));
console.log(L.join('\n'));
