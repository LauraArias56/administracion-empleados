/**
 * Importa manualmente el JSON de la versión anterior a SQLite.
 * Es seguro ejecutarlo varias veces: los registros ya importados se omiten y no se duplican.
 * Nunca modifica ni borra el JSON.
 *
 *   npm run migrate:json                      -> data/db.json  => data/employees.db
 *   npm run migrate:json -- ruta.json ruta.db  -> rutas personalizadas
 */
const path = require("path");

const root = path.resolve(__dirname, "..");
const { SqliteDatabase } = require(path.join(root, "dist", "database", "sqlite-database.js"));
const { migrateJsonToSqlite } = require(path.join(root, "dist", "database", "json-migration.js"));
const { DATABASE_FILE, LEGACY_JSON_FILE } = require(path.join(root, "dist", "config", "container.js"));

const jsonFile = path.resolve(process.argv[2] || LEGACY_JSON_FILE);
const dbFile = path.resolve(process.argv[3] || DATABASE_FILE);

if (!require("fs").existsSync(jsonFile)) {
  console.error(`No existe el archivo JSON: ${jsonFile}`);
  process.exit(1);
}

const database = new SqliteDatabase(dbFile);
try {
  database.initialize();
  const report = migrateJsonToSqlite(database, jsonFile);
  console.log(`JSON:   ${jsonFile}`);
  console.log(`SQLite: ${dbFile}`);
  console.log(
    `Empleados: ${report.employeesImported} importados, ${report.employeesSkipped} ya existían | ` +
      `Vacaciones: ${report.vacationsImported} importadas, ${report.vacationsSkipped} ya existían`
  );
} catch (error) {
  console.error(`Migración cancelada (no se importó nada): ${error.message}`);
  process.exitCode = 1;
} finally {
  database.close();
}
