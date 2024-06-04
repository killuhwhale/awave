const fs = require('fs');
const path = require('path');
const config = require("./config.json");


function getAllFiles(dirPath, rootDir, arrayOfFiles) {
    files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach((file) => {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        arrayOfFiles = getAllFiles(fullPath, rootDir, arrayOfFiles);
      } else {
        const relativePath = path.relative(rootDir, fullPath);
        arrayOfFiles.push(relativePath);
      }
    });

    return arrayOfFiles;
}

function writeSongs(songs){
    const output = config["songFile"]
    const data = songs.join('\n') + '\n';
    fs.writeFile(output, data, 'utf8', (err) => {
      if (err) {
        console.error(`Error writing to file: ${err}`);
        return;
      }
      console.log(`Successfully wrote to ${output}`);
    });
}



const songs = []
const rootDir = config['musicDir']
const allFiles = getAllFiles(rootDir, rootDir, songs)

writeSongs(allFiles)
console.log("all songs ", allFiles)