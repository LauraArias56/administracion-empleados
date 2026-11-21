/**
 * Arranque del backend para Vercel.
 * En el computador usa la misma base SQLite del proyecto (data/employees.db).
 * En Vercel el disco no conserva archivos: la base vive en /tmp y se crea vacía.
 */
if (process.env.VERCEL && !process.env.SQLITE_DB_FILE) {
  process.env.SQLITE_DB_FILE = "/tmp/employees.db";
  process.env.LEGACY_JSON_FILE = "";
}

const { container, LEGACY_JSON_FILE } = require("../dist/config/container");
const { bootstrapDatabase } = require("../dist/database/bootstrap");
const { createServer } = require("../dist/server");
const v1Routes = require("../dist/routes/v1").default;

const database = container.resolve("database");
bootstrapDatabase(database, LEGACY_JSON_FILE);

const app = createServer();
// Misma API en /backend: Vercel no deja pasar /api/v1/... hasta el programa.
app.use("/backend", v1Routes);

module.exports = app;
