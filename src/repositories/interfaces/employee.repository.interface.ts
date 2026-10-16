import { EmployeeRecord } from "../../database/schema";

export type NewEmployee = Omit<EmployeeRecord, "id">;

export interface IEmployeeRepository {
  findById(id: string): Promise<EmployeeRecord | null>;
  findByDocument(document: string): Promise<EmployeeRecord | null>;
  /** Asigna el id y lanza DOCUMENT_ALREADY_EXISTS si el documento ya existe. */
  create(employee: NewEmployee): Promise<EmployeeRecord>;
  /** Lanza EMPLOYEE_NOT_FOUND si el empleado no existe. */
  update(employee: EmployeeRecord): Promise<EmployeeRecord>;
}
