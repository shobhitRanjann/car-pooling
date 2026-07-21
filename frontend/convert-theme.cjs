const fs = require('fs');
const path = require('path');

const DIRECTORIES = ['src/pages', 'src/components', 'src'];

const REPLACEMENTS = [
  // Backgrounds
  { from: /bg-slate-950/g, to: 'bg-slate-50' },
  { from: /bg-slate-900\/80/g, to: 'bg-white/90' },
  { from: /bg-slate-900/g, to: 'bg-white' },
  { from: /bg-slate-800\/60/g, to: 'bg-slate-100/80' },
  { from: /bg-slate-800\/50/g, to: 'bg-slate-50' },
  { from: /bg-slate-800/g, to: 'bg-slate-100' },
  { from: /bg-slate-700/g, to: 'bg-slate-200' },
  { from: /bg-slate-600/g, to: 'bg-slate-300' },

  // Text colors
  { from: /text-slate-100/g, to: 'text-slate-900' },
  { from: /text-slate-200/g, to: 'text-slate-800' },
  { from: /text-slate-300/g, to: 'text-slate-700' },
  { from: /text-slate-400/g, to: 'text-slate-500' },
  // Need to be careful with text-slate-500 so we don't convert it to 400 and then back.
  // Actually, wait, let's just use exact word boundary for text colors.
];

// Refined regexes to avoid double replacement
const TEXT_REPLACEMENTS = [
  { from: /\btext-slate-100\b/g, to: 'text-slate-900' },
  { from: /\btext-slate-200\b/g, to: 'text-slate-800' },
  { from: /\btext-slate-300\b/g, to: 'text-slate-700' },
  { from: /\btext-slate-400\b/g, to: 'text-slate-600' },
  { from: /\btext-slate-500\b/g, to: 'text-slate-500' },
  
  { from: /\bborder-slate-800\b/g, to: 'border-slate-200' },
  { from: /\bborder-slate-700\b/g, to: 'border-slate-300' },
  { from: /\bborder-slate-600\b/g, to: 'border-slate-400' },
];

function processFile(filePath) {
  if (!filePath.endsWith('.jsx') && !filePath.endsWith('.js') && !filePath.endsWith('.css')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  REPLACEMENTS.forEach(r => content = content.replace(r.from, r.to));
  TEXT_REPLACEMENTS.forEach(r => content = content.replace(r.from, r.to));

  fs.writeFileSync(filePath, content, 'utf8');
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // processDirectory(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

DIRECTORIES.forEach(dir => processDirectory(dir));
console.log('Theme converted to Light Mode!');
