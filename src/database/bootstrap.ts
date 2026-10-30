import fs from "fs";
import { migrateJsonToSqlite } from "./json-migration";
import { SqliteDatabase } from "./sqlite-database";

/**
 * Prepara la base de datos al arrancar:
 * 1. Crea el archivo `.db` y las tablas si no existen.
 * 2. Si la base está vacía y existe el JSON de la versión anterior, importa sus datos.
 *    Como después de importar la base ya no está vacía, no vuelve a importar.
 *    (Para repetir la migración a propósito: `npm run migrate:json`, también idempotente.)
 */
export const bootstrapDatabase = (
  database: SqliteDatabase,
  legacyJsonFile: string | undefined
): void => {
  database.initialize();

  if (!legacyJsonFile || !fs.existsSync(legacyJsonFile)) {
    return;
  }

  const counts = database.db
    .prepare(
      "SELECT (SELECT COUNT(*) FROM employees) AS employees, (SELECT COUNT(*) FROM vacations) AS vacations"
    )
    .get() as { employees: number; vacations: number };

  if (counts.employees > 0 || counts.vacations > 0) {
    return;
  }

  try {
    const report = migrateJsonToSqlite(database, legacyJsonFile);
    console.log(
      `Migración JSON -> SQLite desde ${legacyJsonFile}: ` +
        `${report.employeesImported} empleados y ${report.vacationsImported} vacaciones importados`
    );
  } catch (error) {
    throw new Error(
      `No se pudo migrar ${legacyJsonFile} a SQLite (no se importó nada y el JSON no se modificó): ${
        (error as Error).message
      }. Corrige o renombra el archivo, o define LEGACY_JSON_FILE vacío para omitir la migración.`
    );
  }
};
