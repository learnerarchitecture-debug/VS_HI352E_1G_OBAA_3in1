// extract_product.mjs - extract /system/product from original system.img and create product.img
import fs from 'node:fs';

const origImg = 'C:\\Users\\techn\\OneDrive\\Desktop\\VS_HI352E_1G_extracted\\system.img';
const workDir = 'C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work';
const productImg = `${workDir}\\product.img`;

const fd = fs.openSync(origImg, 'r');
const sb = Buffer.alloc(1024);
fs.readSync(fd, sb, 0, 1024, 1024);
const bs = 1024 << sb.readUInt32LE(0x18);
const first = sb.readUInt32LE(0x14);
const incompat = sb.readUInt32LE(0x60);
const blocks = sb.readUInt32LE(4) + ((incompat & 0x80) ? sb.readUInt32LE(0x150) * 2 ** 32 : 0);
const bpg = sb.readUInt32LE(0x20);
const ipg = sb.readUInt32LE(0x28);
const isize = sb.readUInt16LE(0x58) || 128;
const descSize = (incompat & 0x80) ? (sb.readUInt16LE(0xFE) || 64) : 32;
const groups = Math.ceil((blocks - first) / bpg);
const gdt = Buffer.alloc(groups * descSize);
fs.readSync(fd, gdt, 0, gdt.length, (first + 1) * bs);

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
            if (ino && nl > 0) ents.push({ ino, name: data.toString('latin1', o + 8, o + 8 + nl), ft: data[o + 7] });
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

function extractDir(ino, srcPath, dstPath) {
    if (!fs.existsSync(dstPath)) fs.mkdirSync(dstPath, { recursive: true });
    const ents = listDir(readInode(ino));
    for (const e of ents) {
        if (e.name === '.' || e.name === '..') continue;
        const childIno = e.ino;
        const childIb = readInode(e.ino);
        const childMode = childIb.readUInt16LE(0);
        const childType = childMode & 0xF000;
        const srcChild = srcPath + '/' + e.name;
        const dstChild = dstPath + '/' + e.name;
        if ((childMode & 0xF000) === 0x4000) { // directory
            extractDir(e.ino, srcChild, dstChild);
        } else if ((childMode & 0xF000) === 0x8000) { // file
            const data = readData(readInode(e.ino));
            fs.writeFileSync(dstChild, data);
            console.log('  extracted: ' + srcChild + ' (' + data.length + ' bytes)');
        }
    }
}

console.log('Extracting /system/product from original system.img...');
const productIno = resolve('/system/product');
if (!productIno) { console.error('Failed to resolve /system/product'); process.exit(1); }

const extractRoot = 'C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\product_extract';
if (fs.existsSync(extractRoot)) fs.rmSync(extractRoot, { recursive: true });
fs.mkdirSync(extractRoot, { recursive: true });

extractDir(productIno, '/system/product', 'C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\product_extract');

console.log('Extraction complete. Files at: C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\product_extract');