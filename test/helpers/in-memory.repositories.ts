import { EmployeeRecord, VacationRecord } from "../../src/database/schema";
import { AppException } from "../../src/exceptions/app.exception";
import { AppError } from "../../src/exceptions/errors/app.error";
import {
  IEmployeeRepository,
  NewEmployee,
} from "../../src/repositories/interfaces/employee.repository.interface";
import {
  IVacationRepository,
  NewVacation,
} from "../../src/repositories/interfaces/vacation.repository.interface";
import { EmployeeService } from "../../src/services/employee.service";

export class InMemoryEmployeeRepository implements IEmployeeRepository {
  private items: EmployeeRecord[] = [];
  private sequence = 0;

  async findById(id: string) {
    const found = this.items.find((item) => item.id === id);
    return found ? structuredClone(found) : null;
  }

  async findByDocument(document: string) {
    const found = this.items.find((item) => item.document === document);
    return found ? structuredClone(found) : null;
  }

  async create(newEmployee: NewEmployee) {
    if (this.items.some((item) => item.document === newEmployee.document)) {
      const e = AppError.DOCUMENT_ALREADY_EXISTS;
      throw new AppException(e.code, e.statusCode, e.message);
    }
    this.sequence += 1;
    const employee: EmployeeRecord = { ...newEmployee, id: String(this.sequence) };
    this.items.push(employee);
    return structuredClone(employee);
  }

  async update(employee: EmployeeRecord) {
    const index = this.items.findIndex((item) => item.id === employee.id);
    if (index === -1) {
      const e = AppError.EMPLOYEE_NOT_FOUND;
      throw new AppException(e.code, e.statusCode, e.message);
    }
    this.items[index] = structuredClone(employee);
    return structuredClone(employee);
  }
}

export class InMemoryVacationRepository implements IVacationRepository {
  private items: VacationRecord[] = [];
  private sequence = 0;

  async findById(id: string) {
    const found = this.items.find((item) => item.id === id);
    return found ? structuredClone(found) : null;
  }

  async findByEmployeeId(employeeId: string) {
    return this.items
      .filter((item) => item.employeeId === employeeId)
      .map((item) => structuredClone(item));
  }

  async create(newVacation: NewVacation) {
    this.sequence += 1;
    const vacation: VacationRecord = { ...newVacation, id: String(this.sequence) };
    this.items.push(vacation);
    return structuredClone(vacation);
  }

  async update(vacation: VacationRecord) {
    const index = this.items.findIndex((item) => item.id === vacation.id);
    if (index === -1) {
      const e = AppError.VACATION_NOT_FOUND;
      throw new AppException(e.code, e.statusCode, e.message);
    }
    this.items[index] = structuredClone(vacation);
    return structuredClone(vacation);
  }
}

export function createTestService(): EmployeeService {
  return new EmployeeService(new InMemoryEmployeeRepository(), new InMemoryVacationRepository());
}
