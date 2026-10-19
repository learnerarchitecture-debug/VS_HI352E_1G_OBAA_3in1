// xattr_probe.mjs - inspect inode raw bytes / xattrs / sb state of an ext4 image
import fs from 'node:fs';

const img = process.argv[2];
const targets = process.argv.slice(3); // inner paths, e.g. /system/build.prop

const fd = fs.openSync(img, 'r');
const sb = Buffer.alloc(1024);
fs.readSync(fd, sb, 0, 1024, 1024);
if (sb.readUInt16LE(0x38) !== 0xEF53) { console.error('not ext4'); process.exit(1); }
const bs = 1024 << sb.readUInt32LE(0x18);
const first = sb.readUInt32LE(0x14);
const incompat = sb.readUInt32LE(0x60);
const rocompat = sb.readUInt32LE(0x64);
const blocks = sb.readUInt32LE(4) + ((incompat & 0x80) ? sb.readUInt32LE(0x150) * 2 ** 32 : 0);
const ipg = sb.readUInt32LE(0x28);
const isize = sb.readUInt16LE(0x58) || 128;
const descSize = (incompat & 0x80) ? (sb.readUInt16LE(0xFE) || 64) : 32;
const groups = Math.ceil((blocks - first) / sb.readUInt32LE(0x20));
const gdt = Buffer.alloc(Math.max(1, groups * descSize));
fs.readSync(fd, gdt, 0, gdt.length, (first + 1) * bs);

console.log('sb: state=0x' + sb.readUInt16LE(0x3A).toString(16), 'errors=0x' + sb.readUInt16LE(0x3C).toString(16),
  'mnt_count=' + sb.readUInt16LE(0x34), 'max_mnt=' + sb.readUInt16LE(0x36), 'lastcheck=' + sb.readUInt32LE(0x40),
  'isize=' + isize, 'extra_isize_feat=' + !!(rocompat & 0x40), 'jrnl_inum=' + sb.readUInt32LE(0xE0));
console.log('uuid=' + sb.subarray(0x68, 0x78).toString('hex'));

function tableBlock(g) {
  const o = g * descSize;
  let t = gdt.readUInt32LE(o + 8);
  if (descSize > 32) t += gdt.readUInt32LE(o + 0x28) * 2 ** 32;
  return t;
}
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
        const leaf = buf.readUInt32LE(eo + 4) + buf.readUInt16LE(eo + 8) * 2 ** 32;
        const nb = Buffer.alloc(bs);
        fs.readSync(fd, nb, 0, bs, leaf * bs);
        walk(nb);
      }
    } else {
      for (let i = 0; i < entries; i++) {
        const eo = 12 + i * 12;
        let len = buf.readUInt16LE(eo + 4);
        if (len > 32768) len -= 32768;
        out.push({ lb: buf.readUInt32LE(eo), len, pb: buf.readUInt32LE(eo + 8) + buf.readUInt16LE(eo + 6) * 2 ** 32 });
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
    if (!hit) { console.error('not found: ' + part); process.exit(1); }
    ino = hit.ino;
  }
  return ino;
}
function hexdump(buf, base) {
  for (let o = 0; o < buf.length; o += 16) {
    const row = [];
    for (let k = 0; k < 16 && o + k < buf.length; k++) row.push(buf[o + k].toString(16).padStart(2, '0'));
    const asc = buf.slice(o, o + 16).toString('latin1').replace(/[^\x20-\x7e]/g, '.');
    console.log('0x' + (base + o).toString(16).padStart(3, '0') + ': ' + row.join(' ').padEnd(47) + '  ' + asc);
  }
}
function parseXattr(hdr, areaStart) {
  if (hdr.readUInt32LE(0) !== 0xEA020000) return null;
  const res = [];
  let o = 4;
  while (o + 16 <= hdr.length) {
    const nameLen = hdr[o];
    if (nameLen === 0 || nameLen > 255) break;
    const nameIndex = hdr[o + 1];
    const valueOffs = hdr.readUInt16LE(o + 2);
    const valueInum = hdr.readUInt32LE(o + 4);
    const valueSize = hdr.readUInt32LE(o + 8);
    const name = hdr.toString('latin1', o + 16, o + 16 + nameLen);
    if (nameLen === 0) break;
    res.push({ nameIndex, name, valueOffs, valueInum, valueSize });
    o += 16 + Math.ceil(nameLen / 4) * 4;
    if (nameLen === 0) break;
  }
  return res;
}

for (const t of targets) {
  const ino = resolve(t);
  const ib = readInode(ino);
  const mode = ib.readUInt16LE(0);
  const extraIsize = ib.readUInt16LE(0x80);
  console.log(`\n=== ${t}  ino=${ino} mode=0${(mode & 0xFFF).toString(8)} size=${ib.readUInt32LE(4)} flags=0x${ib.readUInt32LE(0x20).toString(16)} file_acl=0x${ib.readUInt32LE(0x68).toString(16)} extra_isize=${extraIsize} ===`);
  hexdump(ib, 0);
  // try ibody xattr at 128+extraIsize
  for (const start of [0x64, 128 + extraIsize, 0xA0]) {
    if (start + 4 <= ib.length && ib.readUInt32LE(start) === 0xEA020000) {
      console.log('  ibody xattr found at 0x' + start.toString(16));
      const ents = parseXattr(ib.subarray(start), start);
      if (ents) {
        for (const e of ents) {
          const v = ib.subarray(start + e.valueOffs, start + e.valueOffs + e.valueSize);
          console.log(`    idx=${e.nameIndex} name="${e.name}" inum=${e.valueInum} size=${e.valueSize} value=[${v.toString('latin1')}]`);
          console.log('      value hex: ' + v.toString('hex'));
        }
      }
    }
  }
}
fs.closeSync(fd);
