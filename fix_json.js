import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'public', 'assets', 'maps', 'level1.json');
let content = fs.readFileSync(filePath, 'utf8');

// Create a backup
fs.writeFileSync(`${filePath}.bak`, content);
console.log('Created backup file');

// Try to identify and fix common JSON syntax errors
function fixJson(json) {
    // Remove trailing junk
    json = json.replace(/\}\}%\s*$/, '}');

    // Fix double closing braces (but not in string literals)
    json = json.replace(/([^"'])\}\}/g, '$1}');

    // Fix missing commas in arrays
    json = json.replace(/(\d+|\btrue\b|\bfalse\b|\bnull\b|\"[^\"]*\"|\'[^\']*\')\s*\n\s*(\d+|\btrue\b|\bfalse\b|\bnull\b|\"[^\"]*\"|\'[^\']*\')/g, '$1,\n$2');

    // Fix trailing commas in arrays
    json = json.replace(/,(\s*[\]}])/g, '$1');

    return json;
}

// Try multiple passes of fixes
let fixedContent = content;
let validJson = false;

for (let i = 0; i < 5; i++) {
    fixedContent = fixJson(fixedContent);
    try {
        JSON.parse(fixedContent);
        validJson = true;
        console.log(`JSON fixed after ${i + 1} passes`);
        break;
    } catch (e) {
        console.log(`Pass ${i + 1} failed: ${e.message}`);
    }
}

if (validJson) {
    fs.writeFileSync(filePath, fixedContent);
    console.log('Fixed JSON file written');
} else {
    console.error('Failed to fix JSON after multiple attempts');
    process.exit(1);
} 