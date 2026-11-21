const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../../public/images');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const images = [
  { name: 'hero-court.jpg', title: 'CHAMPIONS CLUB', width: 1440, height: 720 },
  { name: 'overview-tennis.jpg', title: 'TENNIS', width: 800, height: 500 },
  { name: 'overview-padel.jpg', title: 'PADEL', width: 800, height: 500 },
  { name: 'overview-badminton.jpg', title: 'BADMINTON', width: 800, height: 500 },
  { name: 'court-tennis-1.jpg', title: 'TENNIS COURT 1', width: 800, height: 600 },
  { name: 'court-tennis-2.jpg', title: 'TENNIS COURT 2', width: 800, height: 600 },
  { name: 'court-padel-1.jpg', title: 'PADEL COURT 1', width: 800, height: 600 },
  { name: 'court-padel-2.jpg', title: 'PADEL COURT 2', width: 800, height: 600 },
  { name: 'court-badminton-1.jpg', title: 'BADMINTON COURT 1', width: 800, height: 600 },
  { name: 'court-badminton-2.jpg', title: 'BADMINTON COURT 2', width: 800, height: 600 },
  { name: 'banner-ball.jpg', title: 'BOOK YOUR COURT', width: 1440, height: 600 },
  { name: 'shop.jpg', title: 'PRO SHOP', width: 800, height: 500 },
];

async function generate() {
  for (const img of images) {
    const svg = `
      <svg width="${img.width}" height="${img.height}" viewBox="0 0 ${img.width} ${img.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1F4A33" />
        <rect x="20" y="20" width="${img.width - 40}" height="${img.height - 40}" fill="none" stroke="#2D6346" stroke-width="2" />
        <line x1="${img.width / 2}" y1="20" x2="${img.width / 2}" y2="${img.height - 20}" stroke="#2D6346" stroke-width="2" stroke-dasharray="8 8" />
        <circle cx="${img.width / 2}" cy="${img.height / 2}" r="${Math.min(img.width, img.height) * 0.2}" fill="none" stroke="#2D6346" stroke-width="2" />
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="28" font-weight="700" letter-spacing="2" opacity="0.85">${img.title}</text>
      </svg>
    `;
    const outPath = path.join(targetDir, img.name);
    await sharp(Buffer.from(svg))
      .jpeg({ quality: 85 })
      .toFile(outPath);
    console.log('Generated:', img.name);
  }
}

generate().catch(console.error);
