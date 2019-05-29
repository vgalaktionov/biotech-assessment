import express = require("express");
import bodyParser = require("body-parser");

const api = express()
  .use(bodyParser.json())
  .post("/rna", (req, res) => {})
  .get("/rna/search", (req, res) => {});

export default api;
