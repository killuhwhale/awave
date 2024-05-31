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

// Example for Windows, assuming 'E' is the drive letter and 'MyFiles' is the directory
// app.use(express.static('E:\\MyFiles'));

// Example for macOS/Linux, assuming the drive is mounted under '/Volumes/myDrive' and 'MyFiles' is the directory
app.use(express.static(config["musicDir"]));

app.use(cors({
  origin: 'http://localhost:3000' // Replace with the origin you want to allow
}));

app.get("/", (req, res) => {
  const songs = fs.readdirSync(config["musicDir"])
  return res.json(songs)
});

app.listen(port, host, () => {
  console.log(
    `File server ${config["musicDir"]} listening at http://${host}:${port}`
  );
});
