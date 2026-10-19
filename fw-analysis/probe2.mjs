// probe2.mjs - raw GDT dump + locate real file data groups
import fs from 'node:fs';

const img = process.argv[2];
const fd = fs.openSync(img, 'r');
const sb = Buffer.alloc(1024);
fs.readSync(fd, sb, 0, 1024, 1024);
const bs = 1024 << sb.readUInt32LE(0x18);
const first = sb.readUInt32LE(0x14);
const incompat = sb.readUInt32LE(0x60);
const rocompat = sb.readUInt32LE(0x64);
const blocks = sb.readUInt32LE(4) + ((incompat & 0x80) ? sb.readUInt32LE(0x150) * 2 ** 32 : 0);
const bpg = sb.readUInt32LE(0x20);
const ipg = sb.readUInt32LE(0x28);
const isize = sb.readUInt16LE(0x58) || 128;
const descSize = (incompat & 0x80) ? (sb.readUInt16LE(0xFE) || 64) : 32;
const groups = Math.ceil((blocks - first) / bpg);
console.log(`bpg=${bpg} ipg=${ipg} isize=${isize} descSize=${descSize} groups=${groups} rocompat=0x${rocompat.toString(16)} incompat=0x${incompat.toString(16)}`);
console.log(`sb free_blocks=${sb.readUInt32LE(0x0C)} free_inodes=${sb.readUInt32LE(0x10)} s_state=0x${sb.readUInt16LE(0x3A).toString(16)}`);

const gdt = Buffer.alloc(groups * descSize);
fs.readSync(fd, gdt, 0, gdt.length, (first + 1) * bs);
console.log('\nraw GDT first 64 bytes:');
for (let o = 0; o < Math.min(64, gdt.length); o += 16) {
  console.log('0x' + o.toString(16).padStart(3, '0') + ': ' + [...gdt.subarray(o, o + 16)].map(b => b.toString(16).padStart(2, '0')).join(' '));
}
console.log('\nparsed desc fields:');
for (let g = 0; g < groups; g++) {
  const o = g * descSize;
  console.log(`  g${g}: bb=${gdt.readUInt32LE(o)} ib=${gdt.readUInt32LE(o + 4)} it=${gdt.readUInt32LE(o + 8)} freeB=${gdt.readUInt16LE(o + 0x0C)} freeI=${gdt.readUInt16LE(o + 0x0E)} dirs=${gdt.readUInt16LE(o + 0x10)} flags=0x${gdt.readUInt16LE(o + 0x12).toString(16)} csum=0x${gdt.readUInt16LE(o + 0x1E).toString(16)}`);
}

function tableBlock(g) { return gdt.readUInt32LE(g * descSize + 8); }
function readInode(ino) {
  const g = Math.floor((ino - 1) / ipg), idx = (ino - 1) % ipg;
  const b = Buffer.alloc(isize);
  fs.readSync(fd, b, 0, isize, tableBlock(g) * bs + idx * isize);
  return b;
}
function extents(ib) {
  const out = [];
  const walk = buf => {
    if (buf.readUInt16LE(0) !== 0xF30A) return;
    const entries = buf.readUInt16LE(2);
    const d = buf.readUInt16LE(6);
    if (d > 0) {
      for (let i = 0; i < entries; i++) {
        const eo = 12 + i * 12;
        const leaf = buf.readUInt32LE(eo + 4);
        const nb = Buffer.alloc(bs);
        fs.readSync(fd, nb, 0, bs, leaf * bs);
        walk(nb);
      }
    } else {
      for (let i = 0; i < entries; i++) {
        const eo = 12 + i * 12;
        let len = buf.readUInt16LE(eo + 4);
        if (len > 32768) len -= 32768;
        out.push({ lb: buf.readUInt32LE(eo), len, pb: buf.readUInt32LE(eo + 8) });
      }
    }
  };
  walk(ib.subarray(0x28, 0x64));
  return out;
}
function readData(ib) {
  const mode = ib.readUInt16LE(0);
  let size = ib.readUInt32LE(4);
  if ((mode & 0xF000) === 0x8000) size += ib.readUInt32LE(0x6C) * 2 ** 32;
  const out = Buffer.alloc(size);
  for (const e of extents(ib)) {
    for (let i = 0; i < e.len; i++) {
      const dest = (e.lb + i) * bs;
      if (dest >= size) break;
      const n = Math.min(bs, size - dest);
      fs.readSync(fd, out, dest, n, (e.pb + i) * bs);
    }
  }
  return out;
}
function listDir(ib) {
  const data = readData(ib);
  const ents = [];
  for (let b0 = 0; b0 < data.length; b0 += bs) {
    let o = b0;
    const bmax = Math.min(b0 + bs, data.length);
    while (o + 8 <= bmax) {
      const ino = data.readUInt32LE(o);
      const rec = data.readUInt16LE(o + 4);
      const nl = data[o + 6];
      if (rec < 8 || rec % 4 !== 0) break;
      if (ino && nl > 0) ents.push({ ino, name: data.toString('latin1', o + 8, o + 8 + nl) });
      if (o + rec >= bmax) break;
      o += rec;
    }
  }
  return ents;
}
function resolve(p) {
  let ino = 2;
  for (const part of p.split('/').filter(Boolean)) {
    const hit = listDir(readInode(ino)).find(e => e.name === part);
    if (!hit) { console.error('not found: ' + part); return null; }
    ino = hit.ino;
  }
  return ino;
}

console.log('\nfile data groups:');
for (const p of ['/system/priv-app/Katniss3.7.0/Katniss3.7.0.apk', '/system/build.prop', '/system/framework/framework.jar', '/system/priv-app/TvSettings/TvSettings.apk']) {
  const ino = resolve(p);
  if (ino === null) continue;
  const ib = readInode(ino);
  const ex = extents(ib);
  const gs = new Set(ex.map(e => Math.floor((e.pb - first) / bpg)));
  console.log(`  ${p} ino=${ino} size=${ib.readUInt32LE(4)} extents=${ex.length} blocks=${ex.reduce((a, e) => a + e.len, 0)} groups={${[...gs].join(',')}} first pb=${ex[0]?.pb}`);
  console.log(`    first extents: ${ex.slice(0, 5).map(e => `lb=${e.lb} len=${e.len} pb=${e.pb}`).join(' | ')}`);
}
fs.closeSync(fd);
