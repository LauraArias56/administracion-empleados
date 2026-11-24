const { container } = require("../dist/config/container");
const { PostgresDatabase } = require("../dist/database/postgres-database");
const { createServer } = require("../dist/server");
const v1Routes = require("../dist/routes/v1").default;

const database = container.resolve("database");
if (!(database instanceof PostgresDatabase)) throw new Error("Configuración de base de datos inválida");
const ready = database.initialize();

const app = createServer();
// Misma API en /backend: Vercel no deja pasar /api/v1/... hasta el programa.
app.use("/backend", (req, res, next) => { void ready.then(() => v1Routes(req, res, next)).catch(next); });

module.exports = app;
