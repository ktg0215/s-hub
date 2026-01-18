import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join, parse } from 'path';
import { existsSync } from 'fs';

const directories = ['./public/ext-icons', './public/images'];

async function optimizeImages() {
  for (const dir of directories) {
    if (!existsSync(dir)) {
      console.log(`⚠ Skipping ${dir} (not found)`);
      continue;
    }

    const files = await readdir(dir);

    for (const file of files) {
      if (file.match(/\.(png|jpg|jpeg)$/i) && !file.endsWith('.webp')) {
        const inputPath = join(dir, file);
        const { name } = parse(file);
        const outputPath = join(dir, `${name}.webp`);

        try {
          await sharp(inputPath)
            .webp({ quality: 80 })
            .toFile(outputPath);

          console.log(`✓ ${file} → ${name}.webp`);
        } catch (err) {
          console.error(`✗ Failed to convert ${file}: ${err.message}`);
        }
      }
    }
  }
  console.log('\n画像最適化完了');
}

optimizeImages().catch(console.error);
