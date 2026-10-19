// make_product_img.mjs - create product.img using a minimal ext4 template
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const extractDir = 'C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\product_extract';
const productImg = 'C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\product.img';

console.log('Creating product.img using a minimal ext4 template approach...');

// We'll create a minimal ext4 image by using a small template
// First, let's check if we can use the system.img's superblock as a template

// Actually, the simplest approach: create a raw image file and use a known ext4 template
// We'll create a 64MB ext4 image (enough for product partition)

const imgSize = 64 * 1024 * 1024; // 64MB
const imgPath = 'C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\product.img';

// Create a sparse file
fs.writeFileSync(productImg, Buffer.alloc(64 * 1024 * 1024));
console.log('Created 64MB blank image');

// Now we need to initialize it as ext4. 
// Since we don't have mkfs.ext4, let's use a different approach:
// Copy the superblock/GDT structure from the original system.img and adapt it

console.log('\nUsing a practical approach: copy superblock/GDT from original system.img');

// Read original system.img superblock and GDT
const fs_mod = require('node:fs');
const origFd = fs_mod.openSync('C:\\Users\\techn\\OneDrive\\Desktop\\VS_HI352E_1G_extracted\\system.img', 'r');
const sb = Buffer.alloc(1024);
fs_mod.readSync(origFd, sb, 0, 1024, 1024);

const bs = 1024 << sb.readUInt32LE(0x18);
const first = sb.readUInt32LE(0x14);
const incompat = sb.readUInt32LE(0x60);
const descSize = (incompat & 0x80) ? (sb.readUInt16LE(0xFE) || 64) : 32;
const groups = Math.ceil((sb.readUInt32LE(4) - first) / sb.readUInt32LE(0x20));

// Read GDT
const gdt = Buffer.alloc(15 * 32); // 15 groups * 32 bytes
fs_mod.readSync(origFd, gdt, 0, gdt.length, (first + 1) * 4096);
fs_mod.closeSync(origFd);

console.log('Block size:', 4096);
console.log('Groups in original:', 15);
console.log('Block size from sb:', bs);

// Now create a minimal product image with 1 block group (32768 blocks = 128MB)
const bs_new = 4096;
const blocksPerGroup = 32768;
const inodesPerGroup = 8192;
const inodeSize = 256;

// We need: 1 block group = 32768 blocks = 128MB (plenty for product)
// Structure:
// Block 0: superblock (at offset 1024)
// Block 1: GDT
// Block 2: block bitmap
// Block 3: inode bitmap
// Block 3-...: inode table (512 blocks for 8192 inodes * 256 bytes / 4096)
// Block 512+: data blocks

// Let's create the image
const totalBlocks = 32768; // 1 block group = 128MB
const imgSize = 32768 * 4096; // 128MB
const imgPath = 'C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\product.img';

const img = Buffer.alloc(32768 * 4096);

// 1. Superblock at offset 1024
const sbNew = Buffer.alloc(1024);
const crc32 = (data) => {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (c >>> 1) ^ 0xEDB88320 : (c >>> 1);
        table[i] = c;
    }
    for (let i = 0; i < data.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
    }
    return crc ^ 0xFFFFFFFF;
};

const sbOut = Buffer.alloc(1024);
const write32 = (buf, off, val) => buf.writeUInt32LE(val, off);
const write16 = (buf, off, val) => buf.writeUInt16LE(val, off);

const sb = Buffer.alloc(1024);
write32(sb, 0, 0xEF53); // magic
write16(sb, 0x38, 1); // rev
write32(sb, 4, 32768); // blocks count
write32(sb, 8, 0); // r_blocks
write32(sb, 0xC, 32768 - 100); // free blocks (approx)
write32(sb, 0x10, 8192 - 10); // free inodes
write32(sb, 0x14, 0); // first data block
write32(sb, 0x18, 12); // log block size (4096 = 1024 << 12)
write32(sb, 0x1C, 12); // log frag size
write32(sb, 0x20, 32768); // blocks per group
write32(sb, 0x24, 32768); // frags per group
write32(sb, 0x28, 8192); // inodes per group
write32(sb, 0x2C, Math.floor(Date.now() / 1000)); // mtime
write32(sb, 0x30, 0); // wtime
write16(sb, 0x38, 1); // mnt count
write16(sb, 0x3A, 0xFFFF); // max mnt count
write16(sb, 0x3C, 0xEF53); // magic
write16(sb, 0x3E, 1); // state
write16(sb, 0x40, 1); // errors
write16(sb, 0x42, 1); // minor rev
write32(sb, 0x44, 0); // lastcheck
write32(sb, 0x48, 0); // checkinterval
write32(sb, 0x4C, 0); // creator os
write32(sb, 0x50, 1); // rev level
write16(sb, 0x54, 0); // def_resuid
write16(sb, 0x56, 0); // def_resgid
write32(sb, 0x58, 256); // inode size
write16(sb, 0x5C, 0); // req_gid
write32(sb, 0x60, 0x400); // compat: has_journal
write32(sb, 0x64, 0x242); // incompat: extents, filetype, 64bit?
write32(sb, 0x68, 0); // ro_compat
// UUID
for (let i = 0; i < 16; i++) sb[0x68 + i] = Math.floor(Math.random() * 256);
const volName = 'product   ';
for (let i = 0; i < 16; i++) sb[0x78 + i] = 'product   '.charCodeAt(i) || 0;
write32(sb, 0x88, 0x40); // journal inum
write32(sb, 0x8C, 0x200); // feature incompat
write32(sb, 0x90, 0); // feature ro_compat
// Journal info
for (let i = 0; i < 68; i++) sb[0x94 + i] = 0;

// Write superblock at offset 1024
const imgBuf = Buffer.alloc(32768 * 4096);
sb.copy(imgBuf, 1024);

// Group Descriptor Table at block 1 (offset 4096)
const gdt = Buffer.alloc(64); // 1 group * 64 bytes
// Group 0
const gdtOff = 4096;
const gdtBuf = Buffer.alloc(64);
write32(gdt, 0, 3); // block bitmap at block 3
write32(gdt, 4, 4); // inode bitmap at block 4
write32(gdt, 8, 5); // inode table at block 5
write16(gdt, 0xC, 32768 - 600); // free blocks
write16(gdt, 0xE, 8192 - 20); // free inodes
write16(gdt, 0x10, 1); // used dirs (root)
write16(gdt, 0x12, 0); // flags
write32(gdt, 0x14, 0); // exclude bitmap
write32(gdt, 0x18, 0); // block bitmap csum
write32(gdt, 0x1C, 0); // inode bitmap csum
write32(gdt, 0x20, 0); // itable unused
write32(gdt, 0x24, 0); // csum seed
gdt.copy(imgBuf, 4096);

// Block bitmap at block 3
const bb = Buffer.alloc(4096);
bb[0] = 0xFF; // block 0 (superblock)
bb[1] = 0x07; // blocks 1,2,3 (GDT, block bitmap, inode bitmap)
for (let i = 5; i < 5 + 512; i++) { // inode table blocks (512 blocks for 8192 inodes)
    const byte = i >> 3;
    const bit = i & 7;
    bb[byte] |= 1 << bit;
}
// Root dir gets a data block
const rootDirBlock = 5 + 512;
const rb = rootDirBlock >> 3;
const rbBit = rootDirBlock & 7;
bb[rb] |= 1 << rbBit;
const bbBuf = Buffer.alloc(4096);
for (let i = 0; i < 4096; i++) bbBuf[i] = bb[i] || 0;
bbBuf.copy(imgBuf, 3 * 4096);

// Inode bitmap at block 4
const ib = Buffer.alloc(4096);
ib[0] = 0x03; // inodes 1 (bad blocks), 2 (root)
ib.copy(imgBuf, 4 * 4096);

// Inode table at block 5 (512 blocks = 8192 inodes * 256 / 4096)
// Root inode (inode 2)
const rootInode = Buffer.alloc(256);
const write32le = (buf, off, val) => buf.writeUInt32LE(val, off);
const write16le = (buf, off, val) => buf.writeUInt16LE(val, off);
const rootInodeBuf = Buffer.alloc(256);
write16le(rootInodeBuf, 0, 0x41ED); // mode: dir | 0755
write16le(rootInodeBuf, 0x1A, 2); // links
write32le(rootInodeBuf, 0x1C, 0); // atime
write32le(rootInodeBuf, 0x18, 0); // ctime
write32le(rootInodeBuf, 0x14, Math.floor(Date.now()/1000)); // mtime
write32le(rootInodeBuf, 0x20, 0x80000); // flags: extent
write32le(rootInodeBuf, 0x28, 0); // file acl
write32le(rootInodeBuf, 0x30, 0); // size high
write32le(rootInodeBuf, 0x34, 0); // size low
// extent header
write16le(rootInodeBuf, 0x28, 0xF30A); // magic
write16le(rootInodeBuf, 0x2A, 1); // entries
write16le(rootInodeBuf, 0x2C, 1); // max entries
write16le(rootInodeBuf, 0x2E, 0); // depth
write32le(rootInodeBuf, 0x30, 0); // generation
// Extent: logical 0, len 1, physical rootDirBlock
write32le(rootInodeBuf, 0x38, 0); // ee_block
write16le(rootInodeBuf, 0x3C, 1); // ee_len
write16le(rootInodeBuf, 0x3E, 0); // ee_start_hi
write32le(rootInodeBuf, 0x40, rootDirBlock); // ee_start_lo

// Write root inode at inode table block 5, inode 2 (index 1)
const itableStart = 5 * 4096;
const inodeOffset = 1 * 256;
const rootInodeBufFull = Buffer.alloc(256);
rootInode.copy(rootInodeBufFull);
rootInodeBufFull.copy(imgBuf, 5 * 4096 + 1 * 256);

// Root directory block
const rootDirBlockNum = 5 + 512; // block after inode table
const rootDirData = Buffer.alloc(4096);
// . entry
let off = 0;
write32le(rootDirData, off, 2); // inode
write16le(rootDirData, off + 4, 12); // rec_len
rootDirData[off + 6] = 1; // name_len
rootDirData[off + 7] = 2; // file_type (dir)
rootDirData.write('.', off + 8, 'latin1');
// .. entry
off += 12;
write32le(rootDirData, off, 2); // inode
write16le(rootDirData, off + 4, 4084); // rec_len (rest of block)
rootDirData[off + 6] = 2; // name_len
rootDirData[off + 7] = 2; // file_type
rootDirData.write('..', off + 8, 'latin1');

const rootDirBlockNum2 = 5 + 512;
imgBuf.writeUInt32LE(0, rootDirBlockNum2 * 4096); // placeholder
rootDirData.copy(imgBuf, rootDirBlockNum2 * 4096);

// Write the image
const fs = require('node:fs');
fs.writeFileSync('C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\product.img', imgBuf);
console.log('Created minimal product.img with basic ext4 structure');
console.log('Size:', 32768 * 4096, 'bytes (128MB)');
console.log('\nThis is a minimal template. Now we need to populate it with the extracted files.');
console.log('This requires implementing file addition logic which is complex.');
console.log('\nGiven the complexity, let me use a different approach:');
console.log('Use the ext4w tool to add files to this minimal image.');