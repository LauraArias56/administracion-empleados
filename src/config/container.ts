import path from "path";
import { asClass, asValue, createContainer, InjectionMode } from "awilix";
import { EmployeeController } from "../controllers/employee.controller";
import { JsonDatabase } from "../database/json-database";
import { JsonEmployeeRepository } from "../repositories/json-employee.repository";
import { JsonVacationRepository } from "../repositories/json-vacation.repository";
import { EmployeeService } from "../services/employee.service";

// Ubicación del archivo JSON que hace de base de datos.
// Se puede cambiar con la variable de entorno DATABASE_FILE.
const DATABASE_FILE =
  process.env.DATABASE_FILE ?? path.resolve(process.cwd(), "data", "db.json");

export const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
});

container.register({
  database: asValue(new JsonDatabase(DATABASE_FILE)),
  employeeRepository: asClass(JsonEmployeeRepository).singleton(),
  vacationRepository: asClass(JsonVacationRepository).singleton(),
  employeeService: asClass(EmployeeService).singleton(),
  employeeController: asClass(EmployeeController).scoped(),
});
