const express = require("express");
const path = require("path");
const app = require("./backend");
const v1Routes = require("./dist/routes/v1").default;

const staticDir = path.join(__dirname, "frontend", "dist");

app.use((req, res, next) => {
  res.setHeader("X-Build", "datos-1");
  next();
});
app.use("/datos", v1Routes);
app.use(express.static(staticDir));

const stack = (app.router || app._router).stack;
const added = stack.splice(stack.length - 3, 3);
stack.unshift(...added);

module.exports = app;
