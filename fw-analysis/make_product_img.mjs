// make_product_img.mjs - create product.img from extracted files using ext4w tool
import fs from 'node:fs';

const extractDir = 'C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\product_extract';
const productImg = 'C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\product.img';

// Step 1: Create a minimal ext4 image (128MB = 32768 blocks)
const bs = 4096;
const totalBlocks = 32768; // 1 block group = 128MB
const imgPath = 'C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\product.img';

// Create blank image
fs.writeFileSync(imgPath, Buffer.alloc(32768 * 4096));
console.log('Created blank image:', imgPath);

// Step 2: Write minimal ext4 structures to make it a valid ext4 image
// We'll write the superblock, GDT, bitmaps, inode tables manually

const img = fs.readFileSync(imgPath);

// 1. Superblock at offset 1024
const sb = Buffer.alloc(1024);
const write32 = (buf, off, val) => buf.writeUInt32LE(val, off);
const write16 = (buf, off, val) => buf.writeUInt16LE(val, off);

write32(sb, 0, 0xEF53); // magic
write16(sb, 0x38, 1); // rev 1
write32(sb, 4, 32768); // blocks count
write32(sb, 8, 0); // r_blocks
write32(sb, 0xC, 32768 - 600); // free blocks
write32(sb, 0x10, 8192 - 20); // free inodes
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
write32(sb, 0x64, 0x242); // incompat: extents, filetype, 64bit
write32(sb, 0x68, 0); // ro_compat
// UUID
for (let i = 0; i < 16; i++) sb[0x68 + i] = Math.floor(Math.random() * 256);
const volName = 'product   ';
for (let i = 0; i < 16; i++) sb[0x78 + i] = 'product   '.charCodeAt(i) || 0;
write32(sb, 0x88, 0x40); // journal inum
write32(sb, 0x8C, 0x200); // feature incompat
write32(sb, 0x90, 0); // feature ro_compat
for (let i = 0; i < 68; i++) sb[0x94 + i] = 0;

sb.copy(img, 1024);

// 2. GDT at block 1 (offset 4096) - 1 group * 64 bytes
const gdt = Buffer.alloc(64);
write32(gdt, 0, 3); // block bitmap
write32(gdt, 4, 4); // inode bitmap
write32(gdt, 8, 5); // inode table
write16(gdt, 0xC, 32768 - 600); // free blocks
write16(gdt, 0xE, 8192 - 20); // free inodes
write16(gdt, 0x10, 1); // used dirs (root)
write16(gdt, 0x12, 0); // flags
write32(gdt, 0x14, 0);
write32(gdt, 0x18, 0);
write32(gdt, 0x1C, 0);
write32(gdt, 0x20, 0);
write32(gdt, 0x24, 0);
gdt.copy(img, 4096);

// 3. Block bitmap at block 3
const bb = Buffer.alloc(4096);
bb[0] = 0xFF; // block 0 (superblock)
bb[1] = 0x07; // blocks 1,2,3 (GDT, block bitmap, inode bitmap)
for (let i = 5; i < 5 + 512; i++) { // inode table (512 blocks)
    const byte = i >> 3;
    const bit = i & 7;
    bb[byte] |= 1 << bit;
}
const rootDirBlock = 5 + 512;
bb[rootDirBlock >> 3] |= 1 << (rootDirBlock & 7);
bb.copy(img, 3 * 4096);

// 4. Inode bitmap at block 4
const ib = Buffer.alloc(4096);
ib[0] = 0x03; // inodes 1,2
ib.copy(img, 4 * 4096);

// 5. Inode table at block 5 (512 blocks = 8192 inodes * 256 / 4096)
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
rootInodeBuf.copy(img, 5 * 4096 + 1 * 256);

// Root directory block
const rootDirBlockNum = 5 + 512;
const rootDirData = Buffer.alloc(4096);
let off = 0;
write32le(img, rootDirBlockNum * 4096 + off, 2); // inode
write16le(img, rootDirBlockNum * 4096 + off + 4, 12); // rec_len
img[rootDirBlockNum * 4096 + off + 6] = 1; // name_len
img[rootDirBlockNum * 4096 + off + 7] = 2; // file_type (dir)
img.write('.', rootDirBlockNum * 4096 + off + 8, 'latin1');
// .. entry
off += 12;
write32le(img, rootDirBlockNum * 4096 + off, 2); // inode
write16le(img, rootDirBlockNum * 4096 + off + 4, 4084); // rec_len
img[rootDirBlockNum * 4096 + off + 6] = 2; // name_len
img[rootDirBlockNum * 4096 + off + 7] = 2; // file_type
img.write('..', rootDirBlockNum * 4096 + off + 8, 'latin1');

fs.writeFileSync('C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\product.img', img);
console.log('Created minimal product.img with basic ext4 structure');
console.log('Size:', 32768 * 4096, 'bytes (128MB)');
console.log('\nNow we need to populate it with the extracted files using ext4w.');
console.log('Run: node fw-analysis\\ext4w.mjs mkdirp ... etc.');