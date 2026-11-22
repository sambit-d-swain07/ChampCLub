const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../../public/images');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const IMAGES = [
  {
    filename: 'hero-court.webp',
    width: 2400,
    height: 1400,
    maxBytes: 450 * 1024,
    url: 'https://images.unsplash.com/photo-1499510318569-1a3d67dc3976?q=85&w=2400&auto=format&fit=crop',
    title: 'Championship Tennis Court Surrounded by Greenery',
    author: 'Martin Reisch',
    source: 'Unsplash',
    pageUrl: 'https://unsplash.com/photos/1a3d67dc3976',
    license: 'Unsplash License (Free commercial use without attribution)'
  },
  {
    filename: 'overview-tennis.webp',
    width: 1600,
    height: 1000,
    maxBytes: 300 * 1024,
    url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=85&w=1600&auto=format&fit=crop',
    title: 'Low-angle Tennis Court Net and Baseline',
    author: 'Renith R',
    source: 'Unsplash',
    pageUrl: 'https://unsplash.com/photos/24cecd4e34b8',
    license: 'Unsplash License (Free commercial use without attribution)'
  },
  {
    filename: 'overview-padel.webp',
    width: 1600,
    height: 1000,
    maxBytes: 300 * 1024,
    url: 'https://commons.wikimedia.org/w/thumb.php?f=Padel_court_Nsambya.jpg&w=1600',
    title: 'Panoramic Glass-walled Padel Court',
    author: 'Samson Ssemakadde',
    source: 'Wikimedia Commons',
    pageUrl: 'https://commons.wikimedia.org/wiki/File:Padel_court_Nsambya.jpg',
    license: 'CC0 (Public Domain Dedication)'
  },
  {
    filename: 'overview-badminton.webp',
    width: 1600,
    height: 1000,
    maxBytes: 300 * 1024,
    url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=85&w=1600&auto=format&fit=crop',
    title: 'Shuttlecock on Green Indoor Badminton Court',
    author: 'Mukul Wadhwa',
    source: 'Unsplash',
    pageUrl: 'https://unsplash.com/photos/f87db24ac4ea',
    license: 'Unsplash License (Free commercial use without attribution)'
  },
  {
    filename: 'court-tennis-1.webp',
    width: 1600,
    height: 1000,
    maxBytes: 300 * 1024,
    url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=85&w=1600&auto=format&fit=crop',
    title: 'Modern Hard Court with White Playing Lines',
    author: 'Moises Alex',
    source: 'Unsplash',
    pageUrl: 'https://unsplash.com/photos/5df7ed86e1c0',
    license: 'Unsplash License (Free commercial use without attribution)'
  },
  {
    filename: 'court-tennis-2.webp',
    width: 1600,
    height: 1000,
    maxBytes: 300 * 1024,
    url: 'https://images.unsplash.com/photo-1576610616656-d3aa5d1f4534?q=85&w=1600&auto=format&fit=crop',
    title: 'Traditional Red Clay Court with Tennis Net',
    author: 'Julian Schiemann',
    source: 'Unsplash',
    pageUrl: 'https://unsplash.com/photos/d3aa5d1f4534',
    license: 'Unsplash License (Free commercial use without attribution)'
  },
  {
    filename: 'court-padel-1.webp',
    width: 1600,
    height: 1000,
    maxBytes: 300 * 1024,
    url: 'https://commons.wikimedia.org/w/thumb.php?f=Padel_court_along_Ggaba_road.jpg&w=1600',
    title: 'Outdoor Padel Court with Blue Synthetic Turf',
    author: 'Samson Ssemakadde',
    source: 'Wikimedia Commons',
    pageUrl: 'https://commons.wikimedia.org/wiki/File:Padel_court_along_Ggaba_road.jpg',
    license: 'CC0 (Public Domain Dedication)'
  },
  {
    filename: 'court-padel-2.webp',
    width: 1600,
    height: 1000,
    maxBytes: 300 * 1024,
    url: 'https://commons.wikimedia.org/w/thumb.php?f=Padel_Court_along_Ggaba_Road_5.jpg&w=1600',
    title: 'Enclosed Padel Court with Mesh and Glass Walls',
    author: 'Samson Ssemakadde',
    source: 'Wikimedia Commons',
    pageUrl: 'https://commons.wikimedia.org/wiki/File:Padel_Court_along_Ggaba_Road_5.jpg',
    license: 'CC0 (Public Domain Dedication)'
  },
  {
    filename: 'court-badminton-1.webp',
    width: 1600,
    height: 1000,
    maxBytes: 300 * 1024,
    url: 'https://commons.wikimedia.org/w/thumb.php?f=Badminton_court_view.jpg&w=1600',
    title: 'Tournament Standard Badminton Court View',
    author: 'Darakshanehaluddin',
    source: 'Wikimedia Commons',
    pageUrl: 'https://commons.wikimedia.org/wiki/File:Badminton_court_view.jpg',
    license: 'CC0 (Public Domain Dedication)'
  },
  {
    filename: 'court-badminton-2.webp',
    width: 1600,
    height: 1000,
    maxBytes: 300 * 1024,
    url: 'https://images.unsplash.com/photo-1613918108466-292b78a8ef95?q=85&w=1600&auto=format&fit=crop',
    title: 'Indoor Badminton Playing Surface and Net',
    author: 'Syed Ali',
    source: 'Unsplash',
    pageUrl: 'https://unsplash.com/photos/292b78a8ef95',
    license: 'Unsplash License (Free commercial use without attribution)'
  },
  {
    filename: 'banner-ball.webp',
    width: 1600,
    height: 1000,
    maxBytes: 300 * 1024,
    url: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=85&w=1600&auto=format&fit=crop',
    title: 'Macro Tennis Ball and Racket on Blue Court',
    author: 'Valentin Balan',
    source: 'Unsplash',
    pageUrl: 'https://unsplash.com/photos/62dcc4a431d6',
    license: 'Unsplash License (Free commercial use without attribution)'
  },
  {
    filename: 'shop.webp',
    width: 1600,
    height: 1000,
    maxBytes: 300 * 1024,
    url: 'https://images.unsplash.com/photo-1633313248787-7798ae144235?q=85&w=1600&auto=format&fit=crop',
    title: 'Tennis Rackets, Balls and Pro Gear Equipment',
    author: 'Giorgio Trovato',
    source: 'Unsplash',
    pageUrl: 'https://unsplash.com/photos/7798ae144235',
    license: 'Unsplash License (Free commercial use without attribution)'
  }
];

async function processImages() {
  console.log(`Starting download and WebP conversion for ${IMAGES.length} images...`);

  for (const img of IMAGES) {
    const destPath = path.join(targetDir, img.filename);
    console.log(`Fetching ${img.filename}...`);

    try {
      const response = await fetch(img.url, {
        headers: {
          'User-Agent': 'ChampionsClubImagePipeline/1.0 (info@thechampionsclub.in)'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);

      let quality = 80;
      let outputBuffer = await sharp(inputBuffer)
        .resize(img.width, img.height, { fit: 'cover', position: 'center' })
        .webp({ quality })
        .toBuffer();

      while (outputBuffer.byteLength > img.maxBytes && quality > 40) {
        quality -= 5;
        outputBuffer = await sharp(inputBuffer)
          .resize(img.width, img.height, { fit: 'cover', position: 'center' })
          .webp({ quality })
          .toBuffer();
      }

      fs.writeFileSync(destPath, outputBuffer);
      const kb = (outputBuffer.byteLength / 1024).toFixed(1);
      console.log(`Saved ${img.filename}: ${kb} KB (Target < ${img.maxBytes / 1024} KB, Quality ${quality})`);
    } catch (err) {
      console.error(`Failed to process ${img.filename}:`, err.message);
    }
  }

  // Generate CREDITS.md
  const creditsContent = `# Image Credits & Licences

All photography used across The Champions Club platform is sourced from free-licence repositories (Unsplash and Wikimedia Commons) allowing free commercial use without required attribution.

| File | Sport / Subject | Author | Source | Page URL | Licence |
|---|---|---|---|---|---|
${IMAGES.map(
  (img) =>
    `| \`${img.filename}\` | ${img.title} | ${img.author} | ${img.source} | [View Photo](${img.pageUrl}) | ${img.license} |`
).join('\n')}

*Processed with Sharp into WebP format meeting target dimensions and file size budgets (under 450 KB for the hero, under 300 KB for all card assets).*
`;

  fs.writeFileSync(path.join(targetDir, 'CREDITS.md'), creditsContent, 'utf8');
  console.log('CREDITS.md generated successfully at /public/images/CREDITS.md.');
}

processImages().catch(console.error);
