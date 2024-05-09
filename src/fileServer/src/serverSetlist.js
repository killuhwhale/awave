/**
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *  Deprecated now since we are using Firebase to load setlists.
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */


const express = require("express");
const path = require("path");
const config = require("../../../config.json");
const cors = require('cors');

const fs = require("fs")

const app = express();
const host = config["host"];
const port = 3002;

// Enable CORS for all requests
app.use(cors());

// Example for Windows, assuming 'E' is the drive letter and 'MyFiles' is the directory
// app.use(express.static('E:\\MyFiles'));

// Example for macOS/Linux, assuming the drive is mounted under '/Volumes/myDrive' and 'MyFiles' is the directory
app.use(express.static(config["setlistDir"]));
const setlistDir = config["setlistDir"]
app.get("/", (req, res) => {
  const files = []

  try{
    fs.readdirSync(setlistDir)
    .forEach(fileName => {
      const filePath = path.join(setlistDir, fileName)
      console.log("Reading: ", filePath)
      const data = fs.readFileSync(filePath, "utf-8")
      console.log("Got data: ", data)
      const jdata = JSON.parse(data)

      jdata.songs.forEach(song => {
        const src = `http://${host}:3001/${encodeURIComponent(song["name"])}`
        console.log("Adding new source: ", src)
        song['src'] =  src
      })


      console.log("Got jdata: ", jdata)
      files.push(jdata)
    });
  }catch(err){
    console.log("Error getting filenames from setlist server: ", err)
  }

  console.log(files)
  return res.json({files})
});

app.listen(port, host, () => {
  console.log(
    `File server ${config["setlistDir"]} listening at http://${host}:${port}`
  );
});


