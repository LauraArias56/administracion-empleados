import { asClass, createContainer, InjectionMode } from "awilix";
import { EmployeeController } from "../controllers/employee.controller";
import { EmployeeService } from "../services/employee.service";

export const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
});

container.register({
  employeeService: asClass(EmployeeService).singleton(),
  employeeController: asClass(EmployeeController).scoped(),
});
