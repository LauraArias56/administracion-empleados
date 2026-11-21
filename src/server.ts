import express from "express";
import { scopePerRequest } from "awilix-express";
import { container } from "./config/container";
import { errorMiddleware } from "./middlewares/error.middleware";
import V1Routes from "./routes/v1/index";

export const createServer = () => {
  const app = express();

  app.use(express.json());
  app.use((req, res, next) => {
    const origin = process.env.CORS_ORIGIN ?? "http://localhost:5173";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use(scopePerRequest(container));
  app.use("/api", V1Routes);
  app.use(errorMiddleware);

  return app;
};
