/**
 * Arranque del backend para Vercel.
 * Si existe DATABASE_URL, todos los empleados quedan en Supabase.
 * Sin esa variable, en el computador se usa data/employees.db.
 */
if (process.env.VERCEL && !process.env.DATABASE_URL && !process.env.SQLITE_DB_FILE) {
  process.env.SQLITE_DB_FILE = "/tmp/employees.db";
  process.env.LEGACY_JSON_FILE = "";
}

const { container, LEGACY_JSON_FILE } = require("../dist/config/container");
const { bootstrapDatabase } = require("../dist/database/bootstrap");
const { createServer } = require("../dist/server");

const database = container.resolve("database");
const ready = database.pool
  ? database.initialize()
  : Promise.resolve(bootstrapDatabase(database, LEGACY_JSON_FILE));

const app = createServer();
app.use((req, res, next) => {
  ready.then(() => next()).catch(next);
});
const stack = (app.router || app._router).stack;
stack.unshift(stack.pop());

module.exports = app;
