/**
 * Levanta la aplicación real (versión compilada en dist/) para las pruebas de API:
 * - usa una base SQLite propia (data/test/employees.test.db), que se recrea vacía en cada ejecución;
 * - no importa nunca el JSON anterior ni toca la base de la presentación;
 * - escucha en TEST_PORT (por defecto 3100).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const entry = path.join(root, "dist", "main.js");

if (!fs.existsSync(entry)) {
  console.error("No existe dist/main.js. Ejecuta primero: npm run build (o usa npm run test:api, que compila antes).");
  process.exit(1);
}

const dbFile = path.join(root, "data", "test", "employees.test.db");
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  fs.rmSync(dbFile + suffix, { force: true });
}

// El middleware de errores de la app imprime cada error (incluidos los 4xx que las pruebas provocan
// a propósito). Aquí solo se silencian esos 4xx esperados; los errores 5xx sí se muestran.
const logError = console.error.bind(console);
console.error = (...args) => {
  const error = args[0];
  if (error && typeof error === "object" && error.statusCode >= 400 && error.statusCode < 500) {
    return;
  }
  logError(...args);
};

process.env.SQLITE_DB_FILE = dbFile;
process.env.LEGACY_JSON_FILE = "";
process.env.PORT = process.env.TEST_PORT || "3100";

require(entry);
