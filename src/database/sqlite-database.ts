import fs from "fs";
import path from "path";
import type { DatabaseSync } from "node:sqlite";
import { SCHEMA_SQL } from "./sqlite-schema";

const MEMORY_DATABASE = ":memory:";

/**
 * Carga el módulo `node:sqlite` que viene incluido en Node.js (no es una
 * dependencia de npm ni requiere compilar nada). Existe desde Node 22.5 y no
 * necesita flags desde Node 22.13.
 */
function loadSqliteModule(): typeof import("node:sqlite") {
  const sqlite = process.getBuiltinModule?.("node:sqlite");
  if (!sqlite) {
    throw new Error(
      `Esta aplicación usa el módulo SQLite incluido en Node.js (node:sqlite), que requiere Node.js 22.13 o superior. Versión actual: ${process.version}`
    );
  }
  return sqlite;
}

/**
 * Base de datos respaldada por un archivo SQLite local.
 *
 * - La conexión se abre en la primera consulta (o en `initialize()`); el
 *   constructor no toca el disco.
 * - `initialize()` crea la carpeta, el archivo y las tablas si no existen, por lo
 *   que es seguro llamarlo en cada arranque.
 * - Modo WAL + `synchronous = NORMAL`: cada transacción se confirma sin hacer
 *   fsync al disco (se hace al volcar el WAL), lo que multiplica el número de
 *   escrituras por segundo. Como `node:sqlite` es síncrono, con el modo por
 *   defecto cada commit bloqueaba el servidor mientras esperaba al disco y bajo
 *   carga dejaba de aceptar conexiones. Los datos siguen a salvo si la
 *   aplicación se cierra o se cae; solo un corte de energía puede perder los
 *   últimos commits (la base no se corrompe).
 *   Mientras la app corre aparecen `employees.db-wal` y `employees.db-shm`;
 *   al cerrarse limpiamente se vuelcan al `.db` y desaparecen.
 * - `node:sqlite` es síncrono: cada operación es atómica y no hace falta la cola
 *   de escrituras que usaba la versión JSON.
 */
export class SqliteDatabase {
  private connection: DatabaseSync | null = null;
  private transactionDepth = 0;

  constructor(private readonly filePath: string) {}

  get path(): string {
    return this.filePath;
  }

  get db(): DatabaseSync {
    if (!this.connection) {
      this.connection = this.open();
    }
    return this.connection;
  }

  initialize(): void {
    void this.db;
  }

  /**
   * Ejecuta `operation` dentro de una transacción. Si lanza un error se hace
   * ROLLBACK y no se guarda nada. Si ya hay una transacción abierta, se une a ella.
   */
  transaction<T>(operation: () => T): T {
    if (this.transactionDepth > 0) {
      return operation();
    }

    const db = this.db;
    db.exec("BEGIN IMMEDIATE");
    this.transactionDepth = 1;
    try {
      const result = operation();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    } finally {
      this.transactionDepth = 0;
    }
  }

  close(): void {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }

  private open(): DatabaseSync {
    if (this.filePath !== MEMORY_DATABASE) {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    }

    const { DatabaseSync: Database } = loadSqliteModule();
    const db = new Database(this.filePath);

    try {
      db.exec("PRAGMA foreign_keys = ON");
      db.exec("PRAGMA busy_timeout = 5000");
      db.exec("PRAGMA journal_mode = WAL");
      db.exec("PRAGMA synchronous = NORMAL");
      db.exec(SCHEMA_SQL);
    } catch (error) {
      db.close();
      throw error;
    }

    return db;
  }
}
