import { PostgresDatabase } from "../database/postgres-database";
import { VacationRecord } from "../database/schema";
import { VacationStatus } from "../dto/employee.dto";
import { AppException } from "../exceptions/app.exception";
import { AppError } from "../exceptions/errors/app.error";
import { IVacationRepository, NewVacation } from "./interfaces/vacation.repository.interface";
type Row = { id: string; employee_id: string; start_date: string; end_date: string; status: VacationStatus };
const parseId = (id: string): string | null => /^\d+$/.test(id) && BigInt(id) > 0n ? id : null;
export class PostgresVacationRepository implements IVacationRepository {
  constructor(private readonly database: PostgresDatabase) {}
  private get table() { return `"${this.database.schema}".vacations`; }
  private toRecord(row: Row): VacationRecord { return { id: String(row.id), employeeId: String(row.employee_id), startDate: row.start_date, endDate: row.end_date, status: row.status }; }
  async findAll(): Promise<VacationRecord[]> { const { rows } = await this.database.query<Row>(`SELECT * FROM ${this.table} ORDER BY id`); return rows.map((row) => this.toRecord(row)); }
  async findById(id: string): Promise<VacationRecord | null> { const parsed = parseId(id); if (!parsed) return null; const { rows } = await this.database.query<Row>(`SELECT * FROM ${this.table} WHERE id=$1`, [parsed]); return rows[0] ? this.toRecord(rows[0]) : null; }
  async findByEmployeeId(employeeId: string): Promise<VacationRecord[]> { const parsed = parseId(employeeId); if (!parsed) return []; const { rows } = await this.database.query<Row>(`SELECT * FROM ${this.table} WHERE employee_id=$1 ORDER BY id`, [parsed]); return rows.map((row) => this.toRecord(row)); }
  async create(vacation: NewVacation): Promise<VacationRecord> { return this.database.transaction(async (client) => { const { rows } = await client.query<Row>(`INSERT INTO ${this.table} (employee_id,start_date,end_date,status) VALUES ($1,$2,$3,$4) RETURNING *`, [parseId(vacation.employeeId), vacation.startDate, vacation.endDate, vacation.status]); if (!rows[0]) throw new Error("PostgreSQL no devolvió las vacaciones creadas."); return this.toRecord(rows[0]); }); }
  async update(vacation: VacationRecord): Promise<VacationRecord> { const id = parseId(vacation.id); const employeeId = parseId(vacation.employeeId); const notFound = AppError.VACATION_NOT_FOUND; if (!id || !employeeId) throw new AppException(notFound.code, notFound.statusCode, notFound.message); return this.database.transaction(async (client) => { const { rows } = await client.query<Row>(`UPDATE ${this.table} SET employee_id=$1,start_date=$2,end_date=$3,status=$4 WHERE id=$5 RETURNING *`, [employeeId, vacation.startDate, vacation.endDate, vacation.status, id]); if (!rows[0]) throw new AppException(notFound.code, notFound.statusCode, notFound.message); return this.toRecord(rows[0]); }); }
}
