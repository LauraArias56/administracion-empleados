const express = require("express");
const path = require("path");
const app = require("./backend");

const staticDir = path.join(__dirname, "frontend", "dist");
app.use(express.static(staticDir));

module.exports = app;
