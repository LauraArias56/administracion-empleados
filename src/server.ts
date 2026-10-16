import express from "express";
import { scopePerRequest } from "awilix-express";
import { container } from "./config/container";
import { errorMiddleware } from "./middlewares/error.middleware";
import V1Routes from "./routes/v1/index";

export const createServer = () => {
  const app = express();

  app.use(express.json());
  app.use(scopePerRequest(container));
  app.use("/api", V1Routes);
  app.use(errorMiddleware);

  return app;
};
