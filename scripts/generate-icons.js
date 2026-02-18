#!/usr/bin/env node

/**
 * Generate application icons from SVG source
 * Creates icon.icns (macOS), icon.ico (Windows), and PNG files (Linux)
 */

const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const iconGen = require('icon-gen');

const ICONS_DIR = path.join(__dirname, '../build/icons');
const SVG_PATH = path.join(__dirname, '../icons/ast-icon-512.svg');

// Icon sizes needed for different platforms
const SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];

async function generatePNGs() {
  console.log('📦 Generating PNG files from SVG...');

  const svgContent = fs.readFileSync(SVG_PATH, 'utf-8');

  for (const size of SIZES) {
    console.log(`  → Creating ${size}x${size} PNG...`);

    // Render SVG to PNG at specific size
    const resvg = new Resvg(svgContent, {
      fitTo: {
        mode: 'width',
        value: size,
      },
    });

    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    // Save PNG file
    const pngPath = path.join(ICONS_DIR, `${size}x${size}.png`);
    fs.writeFileSync(pngPath, pngBuffer);
  }

  console.log('✅ PNG files generated');
}

async function generateIcons() {
  console.log('🎨 Generating platform-specific icon formats...');

  // Use the 1024x1024 PNG as source for icon generation
  const sourcePNG = path.join(ICONS_DIR, '1024x1024.png');

  try {
    await iconGen(sourcePNG, ICONS_DIR, {
      type: 'png',
      names: {
        icns: 'icon',
        ico: 'icon',
      },
      modes: ['icns', 'ico'],
      icns: {
        name: 'icon',
        sizes: [16, 32, 64, 128, 256, 512, 1024],
      },
      ico: {
        name: 'icon',
        sizes: [16, 32, 48, 64, 128, 256],
      },
    });

    console.log('✅ icon.icns generated (macOS)');
    console.log('✅ icon.ico generated (Windows)');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting icon generation...\n');
  console.log(`Source: ${SVG_PATH}`);
  console.log(`Output: ${ICONS_DIR}\n`);

  try {
    // Step 1: Generate PNG files at various sizes
    await generatePNGs();

    console.log('');

    // Step 2: Generate .icns and .ico from the largest PNG
    await generateIcons();

    console.log('');
    console.log('🎉 All icons generated successfully!');
    console.log('');
    console.log('📋 Generated files:');
    console.log('   - icon.icns (macOS)');
    console.log('   - icon.ico (Windows)');
    console.log('   - PNG files: 16, 32, 48, 64, 128, 256, 512, 1024');

  } catch (error) {
    console.error('❌ Icon generation failed:', error);
    process.exit(1);
  }
}

main();
