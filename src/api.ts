import express = require("express");
import bodyParser = require("body-parser");
import "express-async-errors";

import { create, search, ping } from "./db";

function validate(input: string): void {
  if (!/^(A|U|C|G)+$/.test(input)) {
    throw new HttpException("Invalid RNA string!", 400);
  }
}

class HttpException extends Error {
  constructor(
    public message: string = "Something went wrong",
    public status: number = 500
  ) {
    super(message);
  }
}

const api = express()
  .use(bodyParser.json())

  .get("/health", async (req: express.Request, res: express.Response) => {
    await ping();
    res.sendStatus(200);
  })

  .post("/rna", async (req: express.Request, res: express.Response) => {
    req.body.rna_strings.forEach((rs: string) => validate(rs));
    await create(...req.body.rna_strings);
    res.sendStatus(201);
  })

  .get("/rna/search", async (req: express.Request, res: express.Response) => {
    const { search_string, levenshtein } = req.query;
    validate(search_string);
    const results = await search(search_string, levenshtein || 0);
    res.json(results);
  })

  .use(
    (
      error: HttpException,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const status = error.status || 500;
      const message = error.message;
      res.status(status).json({
        status,
        message
      });
    }
  );

export default api;
