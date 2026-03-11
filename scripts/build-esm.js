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
    let fileContent = fs.readFileSync(fullPath, 'utf-8');
    // ESM build: skip P.js extension of $. The shim already has insDirOf/insAtDirEnd
    // on DOMCollection.prototype. P.js returns instances that break .children() etc.
    if (file === './src/tree.js') {
      fileContent = fileContent.replace(
        /var \$ = P\(jQuery, function\(_\) \{\s*\n\s*_.insDirOf = function\(dir, el\) \{\s*\n\s*return dir === L \?\s*\n\s*this\.insertBefore\(el\.first\(\)\) : this\.insertAfter\(el\.last\(\)\);\s*\n\s*};\s*\n\s*_.insAtDirEnd = function\(dir, el\) \{\s*\n\s*return dir === L \? this\.prependTo\(el\) : this\.appendTo\(el\);\s*\n\s*};\s*\n\}\);/,
        '// ESM: $ from shim has insDirOf/insAtDirEnd on prototype, skip P.js'
      );
    }
    return fileContent;
  } else {
    console.warn(`  ! Missing: ${file}`);
    return '';
  }
}).join('\n\n');

// Replace version placeholder
content = content.replace(/{VERSION}/g, `v${VERSION}`);

// Prepend CSS import - old CJS build loaded it via require(), ESM needs explicit import
content = "import './mathquill.css';\n\n" + content;

// Write output
const outputPath = path.join(__dirname, '../build/mathquill.esm.js');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, content);

console.log(`✅ Built: build/mathquill.esm.js`);
console.log(`   Size: ${Math.round(content.length / 1024)}KB`);
