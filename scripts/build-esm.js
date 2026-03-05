#!/usr/bin/env node
/**
 * Build script for ESM bundle
 * Concatenates all source files with ESM intro/outro
 */

const fs = require('fs');
const path = require('path');

// Get version
const pkg = require('../package.json');
const VERSION = pkg.version;

// Source files in order (matching Makefile)
const sources = [
  './src/jquery-shim.js',
  './src/intro.esm.js',
  './node_modules/pjs/src/p.js',
  './src/tree.js',
  './src/cursor.js',
  './src/controller.js',
  './src/publicapi.js',
  './src/services/parser.util.js',
  './src/services/saneKeyboardEvents.util.js',
  './src/services/exportText.js',
  './src/services/focusBlur.js',
  './src/services/keystroke.js',
  './src/services/latex.js',
  './src/services/mouse.js',
  './src/services/scrollHoriz.js',
  './src/services/textarea.js',
  './src/commands/math.js',
  './src/commands/text.js',
  './src/commands/math/LatexCommandInput.js',
  './src/commands/math/advancedSymbols.js',
  './src/commands/math/basicSymbols.js',
  './src/commands/math/commands.js',
  './src/outro.esm.js',
];

console.log('Building ESM bundle...');

// Read all source files
let content = sources.map((file) => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    console.log(`  - ${file}`);
    return fs.readFileSync(fullPath, 'utf-8');
  } else {
    console.warn(`  ! Missing: ${file}`);
    return '';
  }
}).join('\n\n');

// Replace version placeholder
content = content.replace(/{VERSION}/g, `v${VERSION}`);

// Write output
const outputPath = path.join(__dirname, '../build/mathquill.esm.js');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, content);

console.log(`✅ Built: build/mathquill.esm.js`);
console.log(`   Size: ${Math.round(content.length / 1024)}KB`);
