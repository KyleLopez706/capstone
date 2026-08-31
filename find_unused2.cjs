const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/src');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      if (filePath.match(/\.(js|jsx|ts|tsx)$/)) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

const allFiles = getAllFiles(srcDir);
const unusedFiles = [];

for (const file of allFiles) {
  const filename = path.basename(file);
  // Entry points and configs
  if (['main.jsx', 'App.jsx', 'supabaseClient.js', 'toast.jsx'].includes(filename)) continue;
  
  let isUsed = false;
  
  // Create variations of how this file might be imported
  const ext = path.extname(file);
  const baseNoExt = path.basename(file, ext);
  
  for (const otherFile of allFiles) {
    if (file === otherFile) continue;
    const content = fs.readFileSync(otherFile, 'utf8');
    
    // Simplistic check: look for "baseNoExt" as a full word, maybe in an import
    // But since it's an import, it should be like `import ... from '.../baseNoExt'`
    // or just the word baseNoExt
    const regex = new RegExp(`\\b${baseNoExt}\\b`);
    if (regex.test(content)) {
      isUsed = true;
      break;
    }
  }
  
  if (!isUsed) {
    unusedFiles.push(path.relative(srcDir, file));
  }
}

console.log(JSON.stringify(unusedFiles, null, 2));
