// create_product_img.mjs - create ext4 product.img from extracted files
import fs from 'node:fs';

const extractRoot = 'C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\product_extract';
const productImg = 'C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\product.img';

// Simple ext4 creation using a minimal approach
// We'll create a basic ext4 image with the extracted files

// For now, let's use a simpler approach: create a sparse image using the ext4w tool
// But ext4w is for modifying existing images. Let me create a new ext4 image from scratch.

const bs = 4096; // block size
const extractDir = 'C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\product_extract';

// Calculate total size needed
function getDirSize(dir) {
    let size = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = dir + '\\' + entry.name;
        if (entry.isDirectory()) {
            size += getDirSize(fullPath);
        } else {
            size += fs.statSync(fullPath).size;
        }
    }
    return size;
}

const totalBytes = getDirSize('C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\product_extract');
console.log('Total data size:', totalBytes, 'bytes');

// Estimate blocks needed (add 20% overhead for metadata)
const dataBlocks = Math.ceil(totalBytes / 4096);
const metadataBlocks = Math.ceil(dataBlocks * 0.15) + 100; // 15% + inode table, bitmaps, etc
const totalBlocks = dataBlocks + metadataBlocks;

// Round up to multiple of block group size (32768 blocks = 128MB)
const bgSize = 32768;
const totalBGs = Math.ceil(totalBlocks / bgSize);
const finalBlocks = totalBGs * bgSize;

console.log('Data blocks:', dataBlocks, 'Metadata blocks:', metadataBlocks, 'Total blocks:', finalBlocks);

// Create blank image
const imgSize = finalBlocks * 4096;
fs.writeFileSync('C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\product.img', Buffer.alloc(imgSize));
console.log('Created blank image:', imgSize, 'bytes');

// This is a complex task. For now, let's use a simpler approach:
// Use the ext4w tool to create a new ext4 image by copying from the original system.img's product partition
// But the original product is a directory within system.img, not a separate partition.

// Alternative: Use the ext4w tool to create a new ext4 image and populate it
// This is complex. Let me use a different approach.

console.log('Product image creation requires building a new ext4 filesystem.');
console.log('This requires implementing a full ext4 writer. Using a simpler approach...');

// For now, let's create a minimal product.img by using the ext4w tool's sparse encoding
// We'll copy the product partition from the original system.img by carving it out

console.log('\nAlternative: Use the original system.img product partition as a base.');
console.log('The product partition in the original system.img is a directory, not a separate partition.');
console.log('We need to create a new ext4 image from the extracted files.');