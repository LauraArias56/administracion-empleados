import { SqliteDatabase } from "../database/sqlite-database";
import { VacationRecord } from "../database/schema";
import { VacationStatus } from "../dto/employee.dto";
import { AppException } from "../exceptions/app.exception";
import { AppError } from "../exceptions/errors/app.error";
import { IVacationRepository, NewVacation } from "./interfaces/vacation.repository.interface";
import { parseId } from "./sqlite-id";

interface VacationRow {
  id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  status: VacationStatus;
}

export class SqliteVacationRepository implements IVacationRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async findById(id: string): Promise<VacationRecord | null> {
    const numericId = parseId(id);
    if (numericId === null) {
      return null;
    }

    const row = this.database.db
      .prepare("SELECT * FROM vacations WHERE id = ?")
      .get(numericId) as unknown as VacationRow | undefined;

    return row ? this.toRecord(row) : null;
  }

  async findByEmployeeId(employeeId: string): Promise<VacationRecord[]> {
    const numericId = parseId(employeeId);
    if (numericId === null) {
      return [];
    }

    const rows = this.database.db
      .prepare("SELECT * FROM vacations WHERE employee_id = ? ORDER BY id")
      .all(numericId) as unknown as VacationRow[];

    return rows.map((row) => this.toRecord(row));
  }

  async create(newVacation: NewVacation): Promise<VacationRecord> {
    return this.database.transaction(() => {
      const result = this.database.db
        .prepare(
          `INSERT INTO vacations (employee_id, start_date, end_date, status)
           VALUES (?, ?, ?, ?)`
        )
        .run(
          parseId(newVacation.employeeId) as number,
          newVacation.startDate,
          newVacation.endDate,
          newVacation.status
        );

      return this.readRecord(Number(result.lastInsertRowid));
    });
  }

  async update(vacation: VacationRecord): Promise<VacationRecord> {
    return this.database.transaction(() => {
      const id = parseId(vacation.id);
      const employeeId = parseId(vacation.employeeId);
      const notFound = AppError.VACATION_NOT_FOUND;
      if (id === null || employeeId === null) {
        throw new AppException(notFound.code, notFound.statusCode, notFound.message);
      }

      const { changes } = this.database.db
        .prepare(
          `UPDATE vacations
              SET employee_id = ?, start_date = ?, end_date = ?, status = ?
            WHERE id = ?`
        )
        .run(employeeId, vacation.startDate, vacation.endDate, vacation.status, id);

      if (Number(changes) === 0) {
        throw new AppException(notFound.code, notFound.statusCode, notFound.message);
      }

      return this.readRecord(id);
    });
  }

  private readRecord(id: number): VacationRecord {
    const row = this.database.db
      .prepare("SELECT * FROM vacations WHERE id = ?")
      .get(id) as unknown as VacationRow;
    return this.toRecord(row);
  }

  private toRecord(row: VacationRow): VacationRecord {
    return {
      id: String(row.id),
      employeeId: String(row.employee_id),
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
    };
  }
}
