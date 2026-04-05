const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'js-map') {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (file.endsWith('.js.map')) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

const workspacePath = '/workspace';
const outDir = path.join(workspacePath, 'js-map');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const mapFiles = getAllFiles(workspacePath);
console.log(`Found ${mapFiles.length} .js.map files.`);

mapFiles.forEach(mapFile => {
  try {
    const content = fs.readFileSync(mapFile, 'utf8');
    const mapData = JSON.parse(content);
    
    if (mapData.sources && mapData.sourcesContent) {
      const relMapPath = path.relative(workspacePath, mapFile); // e.g. webview/assets/abc.js.map
      
      mapData.sources.forEach((source, index) => {
        const sourceContent = mapData.sourcesContent[index];
        if (sourceContent) {
          // Resolve the source path. source can be like "webpack:///src/abc.ts" or "../src/abc.ts"
          // We will just use the source string, clean it up, and append it.
          let cleanSource = source.replace(/^webpack:\/\/\//, '').replace(/^webpack:\/\//, '').replace(/^\.\.\//g, '').replace(/^\.\//, '');
          // Remove query params or other weird characters if any
          cleanSource = cleanSource.split('?')[0];
          
          const targetPath = path.join(outDir, relMapPath, cleanSource);
          const targetDir = path.dirname(targetPath);
          
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          
          fs.writeFileSync(targetPath, sourceContent, 'utf8');
        }
      });
    }
  } catch (err) {
    console.error(`Error processing ${mapFile}: ${err.message}`);
  }
});

console.log('Unpacking complete.');
