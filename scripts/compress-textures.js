import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RAW_DIR = path.join(__dirname, '..', 'raw_textures');
const OUT_DIR = path.join(__dirname, '..', 'compressed_textures');

async function processTextures() {
  console.log('🖼️  SIX SIGMAPHIL — PBR Texture Compressor');
  
  try {
    // Read all files in the raw_textures folder
    const files = await fs.readdir(RAW_DIR);
    const images = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));

    if (images.length === 0) {
      console.log('⚠️  No PNG or JPG files found in the "raw_textures" folder.');
      console.log('   Please drop your heavy texture files in there and run this again.');
      return;
    }

    console.log(`Found ${images.length} images. Compressing to WebP...\n`);

    for (const file of images) {
      const inputPath = path.join(RAW_DIR, file);
      
      // Determine if it's a Normal Map. Normal maps shouldn't be compressed as heavily
      // to avoid breaking the lighting angles.
      const isNormalMap = file.toLowerCase().includes('normal');
      
      // Change extension to .webp
      const outName = path.parse(file).name + '.webp';
      const outputPath = path.join(OUT_DIR, outName);

      // Get original size for comparison
      const stats = await fs.stat(inputPath);
      const originalMB = (stats.size / (1024 * 1024)).toFixed(2);

      // Compress logic
      if (isNormalMap) {
        // High quality for normal maps to preserve detail
        await sharp(inputPath)
          .webp({ quality: 95, effort: 6 }) 
          .toFile(outputPath);
      } else {
        // Standard high-compression for color and roughness maps
        await sharp(inputPath)
          .webp({ quality: 80, effort: 6 }) 
          .toFile(outputPath);
      }

      // Get new size
      const newStats = await fs.stat(outputPath);
      const newMB = (newStats.size / (1024 * 1024)).toFixed(2);
      const savings = Math.round((1 - newStats.size / stats.size) * 100);

      console.log(`✅ ${file}`);
      console.log(`   Size: ${originalMB} MB ➡️  ${newMB} MB (Saved ${savings}%)`);
    }

    console.log(`\n🎉 All done! Your optimized textures are in the "compressed_textures" folder.`);
    console.log(`   You can now upload these .webp files to Supabase.`);

  } catch (err) {
    console.error('❌ Error processing textures:', err);
  }
}

processTextures();
