const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const apiDir = path.join(rootDir, 'api');
const libDir = path.join(rootDir, 'lib');

if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir);
}

// Move Folders & Files safely
function moveSafe(oldPath, newPath) {
    if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
    }
}

moveSafe(path.join(apiDir, 'models'), path.join(libDir, 'models'));
moveSafe(path.join(apiDir, 'services'), path.join(libDir, 'services'));
moveSafe(path.join(apiDir, 'controllers'), path.join(libDir, 'controllers'));
moveSafe(path.join(apiDir, 'db.js'), path.join(libDir, 'db.js'));

// Function to recursively find all JS files
function getAllJSFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllJSFiles(filePath, fileList);
        } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

// Update imports
const allFiles = [...getAllJSFiles(apiDir), ...getAllJSFiles(libDir), ...getAllJSFiles(path.join(rootDir, 'components')), ...getAllJSFiles(path.join(rootDir, 'pages'))];

allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    let changed = false;

    // For files inside /api/ (e.g. api/analytics.js)
    if (file.includes(path.sep + 'api' + path.sep)) {
        if (content.includes("require('./db')")) { content = content.replace(/require\('\.\/db'\)/g, "require('../lib/db')"); changed = true; }
        if (content.includes("require('./models/")) { content = content.replace(/require\('\.\/models\//g, "require('../lib/models/"); changed = true; }
        if (content.includes("require('./services/")) { content = content.replace(/require\('\.\/services\//g, "require('../lib/services/"); changed = true; }
        if (content.includes("require('./controllers/")) { content = content.replace(/require\('\.\/controllers\//g, "require('../lib/controllers/"); changed = true; }
    }
    
    // For files inside /lib/controllers/ or /lib/services/
    if (file.includes(path.sep + 'lib' + path.sep)) {
        if (content.includes("require('../models/")) { /* unchanged */ }
        if (content.includes("require('../services/")) { /* unchanged */ }
        // Except db.js is now in root of lib, so controllers looking for db.js would be require('../db')
    }

    if (changed) {
        fs.writeFileSync(file, content);
    }
});

console.log("Refactoring complete.");
