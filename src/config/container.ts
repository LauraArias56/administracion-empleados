import path from "path";
import { asClass, asValue, createContainer, InjectionMode } from "awilix";
import { EmployeeController } from "../controllers/employee.controller";
import { SqliteDatabase } from "../database/sqlite-database";
import { SqliteEmployeeRepository } from "../repositories/sqlite-employee.repository";
import { SqliteVacationRepository } from "../repositories/sqlite-vacation.repository";
import { EmployeeService } from "../services/employee.service";

// Ubicación del archivo SQLite que hace de base de datos.
// Se puede cambiar con la variable de entorno SQLITE_DB_FILE.
export const DATABASE_FILE =
  process.env.SQLITE_DB_FILE ?? path.resolve(process.cwd(), "data", "employees.db");

// JSON de la versión anterior; si existe y la base está vacía, se importa al arrancar.
// Se puede cambiar con LEGACY_JSON_FILE (vacío = no migrar).
export const LEGACY_JSON_FILE =
  process.env.LEGACY_JSON_FILE ?? path.resolve(process.cwd(), "data", "db.json");

export const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
});

container.register({
  database: asValue(new SqliteDatabase(DATABASE_FILE)),
  employeeRepository: asClass(SqliteEmployeeRepository).singleton(),
  vacationRepository: asClass(SqliteVacationRepository).singleton(),
  employeeService: asClass(EmployeeService).singleton(),
  employeeController: asClass(EmployeeController).scoped(),
});
