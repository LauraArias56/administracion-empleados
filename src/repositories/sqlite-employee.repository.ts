import { SqliteDatabase } from "../database/sqlite-database";
import { EmployeeRecord } from "../database/schema";
import { ContractStatus, ContractType, EmploymentStatus, HistoryType } from "../dto/employee.dto";
import { AppException } from "../exceptions/app.exception";
import { AppError } from "../exceptions/errors/app.error";
import { IEmployeeRepository, NewEmployee } from "./interfaces/employee.repository.interface";
import { isUniqueViolation, parseId } from "./sqlite-id";

interface EmployeeRow {
  id: number;
  document: string;
  first_name: string;
  last_name: string;
  position: string;
  salary: number;
  status: EmploymentStatus;
  contract_start_date: string;
  contract_type: ContractType;
  contract_status: ContractStatus;
}

interface HistoryRow {
  type: HistoryType;
  previous_value: string;
  new_value: string;
  changed_at: string;
}

const failWith = (error: { code: string; statusCode: number; message: string }): never => {
  throw new AppException(error.code, error.statusCode, error.message);
};

export class SqliteEmployeeRepository implements IEmployeeRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async findById(id: string): Promise<EmployeeRecord | null> {
    const numericId = parseId(id);
    if (numericId === null) {
      return null;
    }

    const row = this.database.db
      .prepare("SELECT * FROM employees WHERE id = ?")
      .get(numericId) as unknown as EmployeeRow | undefined;

    return row ? this.toRecord(row) : null;
  }

  async findByDocument(document: string): Promise<EmployeeRecord | null> {
    const row = this.database.db
      .prepare("SELECT * FROM employees WHERE document = ?")
      .get(document) as unknown as EmployeeRow | undefined;

    return row ? this.toRecord(row) : null;
  }

  async create(newEmployee: NewEmployee): Promise<EmployeeRecord> {
    return this.database.transaction(() => {
      let id: number;

      try {
        const result = this.database.db
          .prepare(
            `INSERT INTO employees
               (document, first_name, last_name, position, salary, status,
                contract_start_date, contract_type, contract_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            newEmployee.document,
            newEmployee.firstName,
            newEmployee.lastName,
            newEmployee.position,
            newEmployee.salary,
            newEmployee.status,
            newEmployee.contract.startDate,
            newEmployee.contract.type,
            newEmployee.contract.status
          );
        id = Number(result.lastInsertRowid);
      } catch (error) {
        // El UNIQUE de `document` cubre dos creaciones simultáneas con el mismo documento.
        if (isUniqueViolation(error, "employees.document")) {
          failWith(AppError.DOCUMENT_ALREADY_EXISTS);
        }
        throw error;
      }

      this.replaceHistory(id, newEmployee.history);
      return this.readRecord(id);
    });
  }

  async update(employee: EmployeeRecord): Promise<EmployeeRecord> {
    return this.database.transaction(() => {
      const id = parseId(employee.id);
      if (id === null) {
        failWith(AppError.EMPLOYEE_NOT_FOUND);
      }

      let changes: number | bigint;
      try {
        ({ changes } = this.database.db
          .prepare(
            `UPDATE employees
                SET document = ?, first_name = ?, last_name = ?, position = ?, salary = ?,
                    status = ?, contract_start_date = ?, contract_type = ?, contract_status = ?
              WHERE id = ?`
          )
          .run(
            employee.document,
            employee.firstName,
            employee.lastName,
            employee.position,
            employee.salary,
            employee.status,
            employee.contract.startDate,
            employee.contract.type,
            employee.contract.status,
            id as number
          ));
      } catch (error) {
        if (isUniqueViolation(error, "employees.document")) {
          failWith(AppError.DOCUMENT_ALREADY_EXISTS);
        }
        throw error;
      }

      if (Number(changes) === 0) {
        failWith(AppError.EMPLOYEE_NOT_FOUND);
      }

      this.replaceHistory(id as number, employee.history);
      return this.readRecord(id as number);
    });
  }

  /** El registro se reemplaza completo (igual que en la versión JSON), historial incluido. */
  private replaceHistory(employeeId: number, history: EmployeeRecord["history"]): void {
    this.database.db.prepare("DELETE FROM employee_history WHERE employee_id = ?").run(employeeId);

    const insert = this.database.db.prepare(
      `INSERT INTO employee_history (employee_id, type, previous_value, new_value, changed_at)
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const entry of history) {
      insert.run(employeeId, entry.type, entry.previousValue, entry.newValue, entry.changedAt);
    }
  }

  private readRecord(id: number): EmployeeRecord {
    const row = this.database.db
      .prepare("SELECT * FROM employees WHERE id = ?")
      .get(id) as unknown as EmployeeRow;
    return this.toRecord(row);
  }

  private toRecord(row: EmployeeRow): EmployeeRecord {
    const history = this.database.db
      .prepare(
        `SELECT type, previous_value, new_value, changed_at
           FROM employee_history WHERE employee_id = ? ORDER BY id`
      )
      .all(row.id) as unknown as HistoryRow[];

    return {
      id: String(row.id),
      document: row.document,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`,
      position: row.position,
      salary: row.salary,
      status: row.status,
      contract: {
        startDate: row.contract_start_date,
        type: row.contract_type,
        status: row.contract_status,
      },
      history: history.map((entry) => ({
        type: entry.type,
        previousValue: entry.previous_value,
        newValue: entry.new_value,
        changedAt: entry.changed_at,
      })),
    };
  }
}
