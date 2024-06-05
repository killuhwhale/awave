// import express, { Request, Response } from "express";

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const config = require("../../../config.json");
const { readFileSync } = require("fs");
const app = express();
const host = config["host"];
const port = 3001;

const admin = require('firebase-admin');
const serviceAccount = require('./awave_service_account.json');


// Example for Windows, assuming 'E' is the drive letter and 'MyFiles' is the directory
// app.use(express.static('E:\\MyFiles'));

// Example for macOS/Linux, assuming the drive is mounted under '/Volumes/myDrive' and 'MyFiles' is the directory
app.use(express.static(config["musicDir"]));

app.use(cors({
  origin: 'http://localhost:3000' // Replace with the origin you want to allow
}));




admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://awave-45940.firebaseio.com'
});

const db = admin.firestore();



async function saveSongs(songs){
  const collectionName = `music/${config['deviceName']}/songs`
  const songDocs = Object.keys(songs).map(key => {
    const fileName = key
    const artist = songs[key]
    let name = fileName.split("/").slice(-1)[0].split(".").slice(0, -1).join(".");
    return db.collection(collectionName).doc(name).set({
      name, fileName, artist,
    })
  })

  try{
    const res = await Promise.all(songDocs)
    console.log("Done setting all docs: ", res.length)
    return true
  }catch(err){
    console.log("Err:", err)
  }
  return false
}


function getSongs(){
  try{
    const data = fs.readFileSync(config["songFile"], "utf-8")
    return JSON.parse(data)
  }catch(err){
    console.log("err getSongs; ", err)
  }
}

async function deleteCollection(collectionPath, batchSize) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve, reject);
  });
}

async function deleteQueryBatch(query, resolve, reject) {
  query.get()
    .then((snapshot) => {
      if (snapshot.size === 0) {
        return 0;
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      return batch.commit().then(() => {
        return snapshot.size;
      });
    })
    .then((numDeleted) => {
      if (numDeleted === 0) {
        resolve();
        return;
      }

      process.nextTick(() => {
        deleteQueryBatch(query, resolve, reject);
      });
    })
    .catch(reject);
}



// Saves list of songs to firebase for mobile client
// Manually run by me each time music is updated on a device.
// node server.js
// Change device name in ../../config.js
// curl http://localhost:3001/save
//  curl http://localhost:3001/clear
app.get("/save", async  (req, res) => {
  const success =  await saveSongs(getSongs())
  return res.json({success})
})

app.get("/clear", async  (req, res) => {
  const collectionName = `music/${config['deviceName']}/songs`
  const success = await deleteCollection(collectionName, 250)
  return res.json({success})
})


// For music player, retuns lsit of songs
app.get("/", (req, res) => {
  return res.json(getSongs())
});

app.listen(port, host, () => {
  console.log(
    `File server ${config["musicDir"]} listening at http://${host}:${port}`
  );
});
