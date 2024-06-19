const fs = require('fs');
const afs = require('fs/promises');
const { exec } = require('child_process');
const shellescape = require('shell-escape');


// const mm = require('music-metadata');
// import * as mm from 'music-metadata';
const path = require('path');
const config = require("./config.json");


// TODO()
/**
 *  When indexing songs, we need to create mulitple json objects to hold 5280 songs each.
 *
 * We have roughly 50k songs, so this will allow us to make about 10 document reqests,
 *    and be roughly at 80% of the 1MB Firebase document limit
 * This beats 47k document requests...
 *
 *
 * Each time we index, we should clear the current data stored.
 *
 * We need to have the same data stored everywhere to make life easiest.
 *
 *
 */


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


// recursive - 27s
// async function getAllFiles(dirPath, rootDir, songData = {}) {
//   try {
//     const files = await afs.readdir(dirPath);

//     for (const file of files) {
//       const fullPath = path.join(dirPath, file);
//       const stat = await afs.stat(fullPath);

//       if (stat.isDirectory()) {
//         songData = await getAllFiles(fullPath, rootDir, songData);
//       } else {
//         try {
//           const relativePath = path.relative(rootDir, fullPath);
//           const ext = relativePath.split('.').slice(-1)[0].toLowerCase();
//           const acceptedExt = ['wav', 'mp3', 'mp4', 'm4a', 'acc'];

//           if (acceptedExt.includes(ext)) {
//             const metadata = await getMetadata(fullPath);
//             // console.log('Metadata:', metadata);
//             songData[relativePath] = getArtist(metadata.common)
//           }
//         } catch (err) {
//           console.log('Failed to add song:', file, err);
//         }
//       }
//     }

//     return songData;
//   } catch (err) {
//     console.error('Error reading directory:', dirPath, err);
//     throw err;
//   }
// }

  // Function to execute shell command and return output as a promise
  function executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(`Error: ${stderr}`);
        } else {
          resolve(stdout.trim().split('\n'));
        }
      });
    });
  }

   // Get all subdirectory paths using the find command
   const getDirectories = async () => {
    const p = shellescape([config["musicDir"]])
    const command = `find ${p} -type d`;
    console.log("shell escape", command)
    return executeCommand(command);
  };


  // const processDirectories = async (directories, rootDir) => {
  //   const songData = {}
  //   const tasks = directories.map(async (directory) => {
  //     try {
  //       const files = await afs.readdir(directory);
  //       const fileTasks = files.map(async (file) => {
  //         const fullPath = path.join(directory, file);
  //         const stat = await afs.stat(fullPath);

  //         if (!stat.isDirectory()) {
  //           const relativePath = path.relative(rootDir, fullPath);
  //           const ext = relativePath.split('.').slice(-1)[0].toLowerCase();
  //           const acceptedExt = ['wav', 'mp3', 'mp4', 'm4a', 'aac'];

  //           if (acceptedExt.includes(ext)) {
  //             try {
  //               const metadata = await getMetadata(fullPath);
  //               songData[relativePath] = getArtist(metadata.common);
  //             } catch (err) {
  //               console.log('Failed to add song:', file, err);
  //             }
  //           }
  //         }
  //       });

  //       await Promise.all(fileTasks);
  //     } catch (err) {
  //       console.error('Error processing directory:', directory, err);
  //     }
  //   });

  //   await Promise.all(tasks);
  //   return songData
  // };


// Process directories in parallel -  56.231s
// async function getAllFilesV3(rootDir){
//   console.time("getAllFiles")
//   try {
//     const directories = await getDirectories();
//     const songData = await processDirectories(directories, rootDir);
//     console.timeEnd("getAllFiles")
//     return songData;
//   } catch (err) {
//     console.error('Error:', err);
//     throw err;
//   }

// }


//  20.021s with pre fetch dirs
// 19.902s without prefetch
async function getAllFiles(rootDir) {
  const songData = {};
  // const queue = await getDirectories();
  const queue = [rootDir];

  const acceptedExt = ['wav', 'mp3', 'mp4', 'm4a', 'aac'];

  while (queue.length > 0) {
    const currentDir = queue.shift();

    try {
      const files = await afs.readdir(currentDir);
      const tasks = files.map(async (file) => {
        const fullPath = path.join(currentDir, file);
        const stat = await afs.stat(fullPath);

        if (stat.isDirectory()) {
          queue.push(fullPath);
        } else {
          try {
            const relativePath = path.relative(rootDir, fullPath);
            const ext = relativePath.split('.').slice(-1)[0].toLowerCase();

            if (acceptedExt.includes(ext)) {
              const metadata = await getMetadata(fullPath);
              // console.log('Metadata:', metadata);
              songData[relativePath] = getArtist(metadata.common);
            }
          } catch (err) {
            console.log('Failed to add song:', file, err);
          }
        }
      });

      await Promise.all(tasks);

    } catch (err) {
      console.error('Error reading directory:', currentDir, err);
      throw err;
    }
  }

  return songData;
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

  console.time("getAllFiles")
  const allFiles =  await  getAllFiles(rootDir)
  // const allFiles =  await  getAllFilesV3(rootDir)
  console.timeEnd("getAllFiles")

  writeSongs(allFiles)
})()

