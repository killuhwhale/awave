// import express, { Request, Response } from "express";

const express = require("express");
const path = require("path");
const config = require("../../../config.json");

const app = express();
const host = config["host"];
const port = 3001;

// Example for Windows, assuming 'E' is the drive letter and 'MyFiles' is the directory
// app.use(express.static('E:\\MyFiles'));

// Example for macOS/Linux, assuming the drive is mounted under '/Volumes/myDrive' and 'MyFiles' is the directory
app.use(express.static(config["musicDir"]));

// app.get("/", (req: Express.Request, res: Express.Response) => {

// });

app.listen(port, host, () => {
  console.log(
    `File server ${config["musicDir"]} listening at http://${host}:${port}`
  );
});
