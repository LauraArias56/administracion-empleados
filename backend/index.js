const { container } = require("../dist/config/container");
const { PostgresDatabase } = require("../dist/database/postgres-database");
const { createServer } = require("../dist/server");

const database = container.resolve("database");
if (!(database instanceof PostgresDatabase)) throw new Error("Configuración de base de datos inválida");
let ready;
const app = createServer((_req, _res, next) => {
  ready ??= database.initialize().catch((error) => {
    ready = undefined;
    throw error;
  });
  void ready.then(() => next(), next);
});

module.exports = app;
