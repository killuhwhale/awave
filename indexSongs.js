const fs = require('fs');
const afs = require('fs/promises');

// const mm = require('music-metadata');
// import * as mm from 'music-metadata';
const path = require('path');
const config = require("./config.json");


async function getMetadata(src){
  const mm = await import('music-metadata');
  try {
    const metadata = await mm.parseFile(src);
    return metadata
  } catch (err) {
    console.error("Err getting metadata", err.message);
  }
  return {
    common: {
      track: { no: 0, of: null },
      disk: { no: null, of: null },
      movementIndex: {},
      artists: [ "" ],
      artist: "",
      album: '',
      genre: [ '' ],
      title: '',
      year: 0
    }
  }
}


function getArtist(metadata){
  // Return artist from meta data
  if(metadata.artist){
    return metadata.artist
  }else if(metadata.artists && metadata.artists.length > 0){
    return metadata.artists[0]
  }
  return "" // No artist found
}

async function getAllFiles(dirPath, rootDir, songData = {}) {
  try {
    const files = await afs.readdir(dirPath);

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = await afs.stat(fullPath);

      if (stat.isDirectory()) {
        songData = await getAllFiles(fullPath, rootDir, songData);
      } else {
        try {
          const relativePath = path.relative(rootDir, fullPath);
          const ext = relativePath.split('.').slice(-1)[0].toLowerCase();
          const acceptedExt = ['wav', 'mp3', 'mp4', 'm4a', 'acc'];

          if (acceptedExt.includes(ext)) {
            const metadata = await getMetadata(fullPath);
            // console.log('Metadata:', metadata);
            songData[relativePath] = getArtist(metadata.common)
          }
        } catch (err) {
          console.log('Failed to add song:', file, err);
        }
      }
    }

    return songData;
  } catch (err) {
    console.error('Error reading directory:', dirPath, err);
    throw err;
  }
}

function writeSongs(songs){
  // console.log("Songs", songs)
  const output = config["songFile"]
    const data = JSON.stringify(songs)
    fs.writeFile(output, data, 'utf8', (err) => {
      if (err) {
        console.error(`Error writing to file: ${err}`);
        return;
      }
      console.log(`Successfully wrote to ${output}`);
    });
}





(async () => {
  const songs = {}
  const rootDir = config['musicDir']
  const allFiles =  await  getAllFiles(rootDir, rootDir, songs)
  // console.log("all songs ", allFiles)
  writeSongs(allFiles)

})()

