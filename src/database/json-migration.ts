import fs from "fs";
import { parseId } from "../repositories/sqlite-id";
import { createEmptyDatabase, DatabaseSchema, EmployeeRecord, VacationRecord } from "./schema";
import { SqliteDatabase } from "./sqlite-database";

export interface MigrationReport {
  employeesImported: number;
  employeesSkipped: number;
  vacationsImported: number;
  vacationsSkipped: number;
}

/** Lee el JSON legado con las mismas reglas de la versión anterior (vacío = base vacía). */
export const readLegacyJson = (filePath: string): DatabaseSchema => {
  const raw = fs.readFileSync(filePath, "utf-8");
  const empty = createEmptyDatabase();

  if (raw.trim() === "") {
    return empty;
  }

  let parsed: Partial<DatabaseSchema>;
  try {
    parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
  } catch {
    throw new Error(`El archivo JSON no contiene un JSON válido: ${filePath}`);
  }

  return {
    sequences: { ...empty.sequences, ...parsed.sequences },
    employees: parsed.employees ?? empty.employees,
    vacations: parsed.vacations ?? empty.vacations,
  };
};

const requireId = (value: string, label: string): number => {
  const id = parseId(String(value));
  if (id === null) {
    throw new Error(`${label}: el id "${value}" no es un número entero positivo`);
  }
  return id;
};

/**
 * Copia los datos del JSON legado a SQLite conservando los ids originales.
 *
 * Es idempotente: si un registro ya existe (mismo id y mismo documento / mismo
 * empleado y fechas) se omite, por lo que se puede ejecutar varias veces sin
 * duplicar datos. Si hay un conflicto real (mismo id con otros datos) o un
 * registro inválido, se cancela TODO (ROLLBACK) y no se importa nada.
 * El archivo JSON nunca se modifica ni se borra.
 */
export const migrateJsonToSqlite = (
  database: SqliteDatabase,
  jsonFilePath: string
): MigrationReport => {
  const legacy = readLegacyJson(jsonFilePath);

  return database.transaction(() => {
    const db = database.db;
    const report: MigrationReport = {
      employeesImported: 0,
      employeesSkipped: 0,
      vacationsImported: 0,
      vacationsSkipped: 0,
    };

    const findEmployeeById = db.prepare("SELECT document FROM employees WHERE id = ?");
    const findEmployeeByDocument = db.prepare("SELECT id FROM employees WHERE document = ?");
    const insertEmployee = db.prepare(
      `INSERT INTO employees
         (id, document, first_name, last_name, position, salary, status,
          contract_start_date, contract_type, contract_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertHistory = db.prepare(
      `INSERT INTO employee_history (employee_id, type, previous_value, new_value, changed_at)
       VALUES (?, ?, ?, ?, ?)`
    );

    for (const employee of legacy.employees as EmployeeRecord[]) {
      const label = `Empleado id=${employee.id}`;
      const id = requireId(employee.id, label);

      const sameId = findEmployeeById.get(id) as { document: string } | undefined;
      const sameDocument = findEmployeeByDocument.get(employee.document) as { id: number } | undefined;

      if (sameId || sameDocument) {
        if (sameId?.document === employee.document && sameDocument?.id === id) {
          report.employeesSkipped += 1;
          continue;
        }
        throw new Error(
          `${label} (documento ${employee.document}) entra en conflicto con un registro distinto que ya existe en SQLite`
        );
      }

      try {
        insertEmployee.run(
          id,
          employee.document,
          employee.firstName,
          employee.lastName,
          employee.position,
          employee.salary,
          employee.status,
          employee.contract.startDate,
          employee.contract.type,
          employee.contract.status
        );
        for (const entry of employee.history ?? []) {
          insertHistory.run(id, entry.type, entry.previousValue, entry.newValue, entry.changedAt);
        }
      } catch (error) {
        throw new Error(`${label}: registro inválido (${(error as Error).message})`);
      }
      report.employeesImported += 1;
    }

    const findVacationById = db.prepare(
      "SELECT employee_id, start_date, end_date FROM vacations WHERE id = ?"
    );
    const insertVacation = db.prepare(
      `INSERT INTO vacations (id, employee_id, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?)`
    );

    for (const vacation of legacy.vacations as VacationRecord[]) {
      const label = `Vacación id=${vacation.id}`;
      const id = requireId(vacation.id, label);
      const employeeId = requireId(vacation.employeeId, `${label} (employeeId)`);

      const existing = findVacationById.get(id) as
        | { employee_id: number; start_date: string; end_date: string }
        | undefined;

      if (existing) {
        if (
          existing.employee_id === employeeId &&
          existing.start_date === vacation.startDate &&
          existing.end_date === vacation.endDate
        ) {
          report.vacationsSkipped += 1;
          continue;
        }
        throw new Error(`${label} entra en conflicto con una solicitud distinta que ya existe en SQLite`);
      }

      try {
        insertVacation.run(id, employeeId, vacation.startDate, vacation.endDate, vacation.status);
      } catch (error) {
        throw new Error(`${label}: registro inválido (${(error as Error).message})`);
      }
      report.vacationsImported += 1;
    }

    // Los ids siguientes deben continuar después del último entregado en el JSON.
    const bumpSequence = (table: string, value: number): void => {
      const updated = db
        .prepare("UPDATE sqlite_sequence SET seq = MAX(seq, ?) WHERE name = ?")
        .run(value, table);
      if (Number(updated.changes) === 0 && value > 0) {
        db.prepare("INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)").run(table, value);
      }
    };
    bumpSequence("employees", Number(legacy.sequences.employees) || 0);
    bumpSequence("vacations", Number(legacy.sequences.vacations) || 0);

    return report;
  });
};
