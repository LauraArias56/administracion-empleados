import { JsonDatabase } from "../database/json-database";
import { EmployeeRecord } from "../database/schema";
import { AppException } from "../exceptions/app.exception";
import { AppError } from "../exceptions/errors/app.error";
import { IEmployeeRepository, NewEmployee } from "./interfaces/employee.repository.interface";

export class JsonEmployeeRepository implements IEmployeeRepository {
  constructor(private readonly database: JsonDatabase) {}

  async findById(id: string): Promise<EmployeeRecord | null> {
    const data = await this.database.read();
    return data.employees.find((employee) => employee.id === id) ?? null;
  }

  async findByDocument(document: string): Promise<EmployeeRecord | null> {
    const data = await this.database.read();
    return data.employees.find((employee) => employee.document === document) ?? null;
  }

  create(newEmployee: NewEmployee): Promise<EmployeeRecord> {
    return this.database.transaction((data) => {
      // Se valida dentro de la transacción para que dos creaciones
      // simultáneas con el mismo documento no pasen ambas.
      if (data.employees.some((employee) => employee.document === newEmployee.document)) {
        throw new AppException(
          AppError.DOCUMENT_ALREADY_EXISTS.code,
          AppError.DOCUMENT_ALREADY_EXISTS.statusCode,
          AppError.DOCUMENT_ALREADY_EXISTS.message
        );
      }

      data.sequences.employees += 1;
      const employee: EmployeeRecord = {
        ...newEmployee,
        id: String(data.sequences.employees),
      };

      data.employees.push(employee);
      return structuredClone(employee);
    });
  }

  update(employee: EmployeeRecord): Promise<EmployeeRecord> {
    return this.database.transaction((data) => {
      const index = data.employees.findIndex((item) => item.id === employee.id);
      if (index === -1) {
        throw new AppException(
          AppError.EMPLOYEE_NOT_FOUND.code,
          AppError.EMPLOYEE_NOT_FOUND.statusCode,
          AppError.EMPLOYEE_NOT_FOUND.message
        );
      }

      data.employees[index] = structuredClone(employee);
      return structuredClone(employee);
    });
  }
}
