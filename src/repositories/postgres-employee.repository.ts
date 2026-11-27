import { PoolClient } from "pg";
import { PostgresDatabase } from "../database/postgres-database";
import { EmployeeRecord } from "../database/schema";
import { ContractStatus, ContractType, EmploymentStatus, HistoryType } from "../dto/employee.dto";
import { AppException } from "../exceptions/app.exception";
import { AppError } from "../exceptions/errors/app.error";
import { IEmployeeRepository, NewEmployee } from "./interfaces/employee.repository.interface";
import { parseId } from "./postgres-id";

type Row = { id: string; document: string; first_name: string; last_name: string; position: string; salary: number; status: EmploymentStatus; contract_start_date: string; contract_type: ContractType; contract_status: ContractStatus };
type HistoryRow = { type: HistoryType; previous_value: string; new_value: string; changed_at: string };
const failWith = (error: { code: string; statusCode: number; message: string }): never => { throw new AppException(error.code, error.statusCode, error.message); };

export class PostgresEmployeeRepository implements IEmployeeRepository {
  constructor(private readonly database: PostgresDatabase) {}
  private get table() { return `"${this.database.schema}".employees`; }
  private get historyTable() { return `"${this.database.schema}".employee_history`; }
  async findAll(): Promise<EmployeeRecord[]> {
    const { rows } = await this.database.query<Row & { history: HistoryRow[] }>(`
      SELECT employee.*, COALESCE(
        json_agg(json_build_object(
          'type', history.type,
          'previous_value', history.previous_value,
          'new_value', history.new_value,
          'changed_at', history.changed_at
        ) ORDER BY history.id) FILTER (WHERE history.id IS NOT NULL),
        '[]'::json
      ) AS history
      FROM ${this.table} AS employee
      LEFT JOIN ${this.historyTable} AS history ON history.employee_id = employee.id
      GROUP BY employee.id
      ORDER BY employee.id
    `);
    return rows.map((row) => this.toRecord(row, row.history));
  }
  async findById(id: string): Promise<EmployeeRecord | null> {
    const parsed = parseId(id); if (!parsed) return null;
    const { rows } = await this.database.query<Row>(`SELECT * FROM ${this.table} WHERE id = $1`, [parsed]);
    return rows[0] ? this.readRecord(rows[0]) : null;
  }
  async findByDocument(document: string): Promise<EmployeeRecord | null> {
    const { rows } = await this.database.query<Row>(`SELECT * FROM ${this.table} WHERE document = $1`, [document]);
    return rows[0] ? this.readRecord(rows[0]) : null;
  }
  async create(employee: NewEmployee): Promise<EmployeeRecord> {
    try {
      return await this.database.transaction(async (client) => {
        const { rows } = await client.query<Row>(`INSERT INTO ${this.table} (document, first_name, last_name, position, salary, status, contract_start_date, contract_type, contract_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [employee.document, employee.firstName, employee.lastName, employee.position, employee.salary, employee.status, employee.contract.startDate, employee.contract.type, employee.contract.status]);
        const row = rows[0]; if (!row) throw new Error("PostgreSQL no devolvió el empleado creado.");
        await this.replaceHistory(client, row.id, employee.history);
        return this.readRecord(row, client);
      });
    } catch (error) { if ((error as { code?: string }).code === "23505") failWith(AppError.DOCUMENT_ALREADY_EXISTS); throw error; }
  }
  async update(employee: EmployeeRecord): Promise<EmployeeRecord> {
    const parsedId = parseId(employee.id); if (!parsedId) failWith(AppError.EMPLOYEE_NOT_FOUND);
    const id = parsedId as string;
    try {
      return await this.database.transaction(async (client) => {
        const { rows } = await client.query<Row>(`UPDATE ${this.table} SET document=$1, first_name=$2, last_name=$3, position=$4, salary=$5, status=$6, contract_start_date=$7, contract_type=$8, contract_status=$9 WHERE id=$10 RETURNING *`, [employee.document, employee.firstName, employee.lastName, employee.position, employee.salary, employee.status, employee.contract.startDate, employee.contract.type, employee.contract.status, id]);
        if (!rows[0]) failWith(AppError.EMPLOYEE_NOT_FOUND);
        await this.replaceHistory(client, id, employee.history);
        return this.readRecord(rows[0]!, client);
      });
    } catch (error) { if ((error as { code?: string }).code === "23505") failWith(AppError.DOCUMENT_ALREADY_EXISTS); throw error; }
  }
  private async replaceHistory(client: PoolClient, id: string, history: EmployeeRecord["history"]): Promise<void> {
    const stored = await client.query<{ total: string }>(`SELECT COUNT(*) AS total FROM ${this.historyTable} WHERE employee_id=$1`, [id]);
    const count = Number(stored.rows[0]?.total ?? 0);
    const pending = history.length >= count ? history.slice(count) : history;
    if (history.length < count) await client.query(`DELETE FROM ${this.historyTable} WHERE employee_id=$1`, [id]);
    for (const entry of pending) await client.query(`INSERT INTO ${this.historyTable} (employee_id,type,previous_value,new_value,changed_at) VALUES ($1,$2,$3,$4,$5)`, [id, entry.type, entry.previousValue, entry.newValue, entry.changedAt]);
  }

  private async readRecord(row: Row, client?: PoolClient): Promise<EmployeeRecord> {
    const sql = `SELECT type, previous_value, new_value, changed_at FROM ${this.historyTable}
      WHERE employee_id = $1 ORDER BY id`;
    const values = [row.id];
    const { rows } = client
      ? await client.query<HistoryRow>(sql, values)
      : await this.database.query<HistoryRow>(sql, values);
    return this.toRecord(row, rows);
  }

  private toRecord(row: Row, history: HistoryRow[]): EmployeeRecord {
    return {
      id: String(row.id),
      document: row.document,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`,
      position: row.position,
      salary: Number(row.salary),
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
