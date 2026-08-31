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
      if (filePath.match(/\.(js|jsx|ts|tsx|css|png|jpg|jpeg|svg)$/)) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

const allFiles = getAllFiles(srcDir);
const unusedFiles = [];

for (const file of allFiles) {
  // Skip entry points and global files
  const filename = path.basename(file);
  if (['main.jsx', 'index.css', 'App.jsx', 'vite-env.d.ts'].includes(filename)) continue;

  let isUsed = false;
  
  // Create a relative path to search for
  const relativePath = path.relative(srcDir, file).replace(/\\/g, '/');
  
  // We'll search for the basename without extension, or just the file name
  const basename = path.basename(file, path.extname(file));
  
  for (const otherFile of allFiles) {
    if (file === otherFile) continue;
    
    // Only search in JS/JSX files
    if (!otherFile.match(/\.(js|jsx|ts|tsx)$/)) continue;
    
    const content = fs.readFileSync(otherFile, 'utf8');
    
    // Check if imported
    if (content.includes(basename) || content.includes(relativePath)) {
      isUsed = true;
      break;
    }
  }
  
  if (!isUsed) {
    unusedFiles.push(relativePath);
  }
}

console.log(JSON.stringify(unusedFiles, null, 2));
