import { asClass, asValue, createContainer, InjectionMode } from "awilix";
import { EmployeeController } from "../controllers/employee.controller";
import { PostgresDatabase } from "../database/postgres-database";
import { PostgresEmployeeRepository } from "../repositories/postgres-employee.repository";
import { PostgresVacationRepository } from "../repositories/postgres-vacation.repository";
import { EmployeeService } from "../services/employee.service";

try { process.loadEnvFile(); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Falta DATABASE_URL. Configura la conexión PostgreSQL en el archivo .env.");
export const DB_SCHEMA = process.env.DB_SCHEMA || "public";

export const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
});

container.register({
  database: asValue(new PostgresDatabase(databaseUrl, DB_SCHEMA)),
  employeeRepository: asClass(PostgresEmployeeRepository).singleton(),
  vacationRepository: asClass(PostgresVacationRepository).singleton(),
  employeeService: asClass(EmployeeService).singleton(),
  employeeController: asClass(EmployeeController).scoped(),
});
