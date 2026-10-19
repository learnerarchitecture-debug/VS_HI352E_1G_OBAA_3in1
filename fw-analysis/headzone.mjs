// headzone: record-level views of head/settings zones + near-B map + carve candidates
import fs from 'node:fs';
const buf = fs.readFileSync(process.argv[2]);
const outDir = process.argv[3] || '.';
const deskDir = process.argv[4] || '';
const L = []; const P = s => L.push(s);
const size = buf.length;
const B = Buffer.from('c0284d4b9ae30625c3b59e42a9a553a0', 'hex');
function bd(a) { let d = 0; for (let i = 0; i < 16; i++) { let x = a[i] ^ B[i]; while (x) { d += x & 1; x >>= 1; } } return d; }
function rows(start, len) { for (let o = start; o < start + len && o + 16 <= size; o += 16) { const r = buf.subarray(o, o + 16); P('  ' + o.toString(16).padStart(6, '0') + ' ' + r.toString('hex') + '  dB=' + String(bd(r)).padStart(2)); } }

P('== 0x0-0x800 rows =='); rows(0, 0x800);
P(''); P('== 0x10000-0x10400 rows =='); rows(0x10000, 0x400);
P(''); P('== 0x10f00-0x11280 rows =='); rows(0x10f00, 0x380);
P(''); P('== 0x4900-0x4a00 rows =='); rows(0x4900, 0x100);
P(''); P('== 0x73c80-0x74020 rows =='); rows(0x73c80, 0x3a0);
P(''); P('== 0x3e0000-0x3e0500 rows =='); rows(0x3e0000, 0x500);
P(''); P('== 0x3f9000-0x3fa000 rows =='); rows(0x3f9000, 0x1000);

P(''); P('== near-B (dB<=32) fraction per 4KB block; 1024 cells, 8 lines of 128 ==');
P('legend: # >=75%, * >=40%, + >=15%, : >=5%, . >0, space =0');
let line = '';
for (let off = 0; off + 0x1000 <= size; off += 0x1000) {
  let good = 0, n = 0;
  for (let o = off; o < off + 0x1000; o += 16) { n++; if (bd(buf.subarray(o, o + 16)) <= 32) good++; }
  const pct = good / n;
  line += pct >= 0.75 ? '#' : pct >= 0.4 ? '*' : pct >= 0.15 ? '+' : pct >= 0.05 ? ':' : pct > 0 ? '.' : ' ';
  if (line.length === 128) { P('0x' + (off + 0x1000 - line.length * 0x1000).toString(16).padStart(7, '0') + ' |' + line + '|'); line = ''; }
}
if (line) P('      end |' + line + '|');

fs.writeFileSync(outDir + '/headzone_report.txt', L.join('\n'));
console.log('report: ' + outDir + '/headzone_report.txt');

if (deskDir) {
  const carves = [
    ['candidate_HEAD_config_0x0000-0x11220.bin', 0, 0x11220],
    ['candidate_TAIL_assets_0x368000-0x3CB900.bin', 0x368000, 0x63900],
    ['candidate_END_slots_0x3E0000-0x3FA000.bin', 0x3e0000, 0xc000]
  ];
  for (const [nm, st, len] of carves) { fs.writeFileSync(deskDir + '/' + nm, buf.subarray(st, st + len)); console.log('carved ' + nm + ' (' + len + ' bytes)'); }
}
