import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAW_DIR = path.resolve(__dirname, '../raw-images');
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const IMAGES = [
  'article-corner-banner.png',
  'author-card-banner.png',
  'author-card-banner-sticky.png'
];

function main() {
  if (!fs.existsSync(RAW_DIR)) {
    fs.mkdirSync(RAW_DIR, { recursive: true });
    console.log(`Created raw-images directory at ${RAW_DIR}. Please place raw PNG files there.`);
  }

  // Obfuscate files from raw-images to public
  for (const img of IMAGES) {
    const rawPath = path.join(RAW_DIR, img);
    if (!fs.existsSync(rawPath)) {
      console.warn(`Warning: Raw image not found in raw-images/: ${img}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(rawPath);
    const bytes = new Uint8Array(fileBuffer);
    
    // Reverse bytes to obfuscate
    bytes.reverse();

    const datFileName = img.replace('.png', '.dat');
    const datPath = path.join(PUBLIC_DIR, datFileName);

    fs.writeFileSync(datPath, bytes);
    console.log(`Successfully obfuscated ${img} -> public/${datFileName}`);

    // If the PNG still exists in public, delete it to prevent leak
    const publicPngPath = path.join(PUBLIC_DIR, img);
    if (fs.existsSync(publicPngPath)) {
      fs.unlinkSync(publicPngPath);
      console.log(`Cleaned up public/${img}`);
    }
  }
}

main();
