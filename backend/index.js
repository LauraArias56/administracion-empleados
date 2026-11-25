const { container } = require("../dist/config/container");
const { PostgresDatabase } = require("../dist/database/postgres-database");
const { createServer } = require("../dist/server");

const database = container.resolve("database");
if (!(database instanceof PostgresDatabase)) throw new Error("Configuración de base de datos inválida");
const ready = database.initialize();

const app = createServer();
app.use((req, res, next) => {
  ready.then(() => next()).catch(next);
});
const stack = (app.router || app._router).stack;
stack.unshift(stack.pop());

module.exports = app;
