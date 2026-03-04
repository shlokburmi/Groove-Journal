const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');

const idRegex = /id=["']([^"']+)["']/g;
const htmlIds = new Set();
let match;
while ((match = idRegex.exec(html)) !== null) {
    htmlIds.add(match[1]);
}

const selectRegex = /\$\(["']([^"']+)["']\)/g;
const jsIds = new Set();
while ((match = selectRegex.exec(js)) !== null) {
    jsIds.add(match[1]);
}

const missing = [];
for (const id of jsIds) {
    if (!htmlIds.has(id)) {
        missing.push(id);
    }
}

console.log('Missing IDs in HTML:', missing);
