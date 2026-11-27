import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PostgresDatabase } from "../../src/database/postgres-database";
import { PostgresEmployeeRepository } from "../../src/repositories/postgres-employee.repository";
import { PostgresVacationRepository } from "../../src/repositories/postgres-vacation.repository";
import type { NewEmployee } from "../../src/repositories/interfaces/employee.repository.interface";

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? "";

function newEmployee(document: string): NewEmployee {
  return {
    document,
    firstName: "Laura",
    lastName: "Gomez",
    fullName: "Laura Gomez",
    position: "Analista",
    salary: 2500000,
    status: "activo",
    contract: { startDate: "2026-01-15", type: "indefinido", status: "vigente" },
    history: [],
  };
}

describe.skipIf(!testDatabaseUrl)("PostgreSQL repositories", () => {
  let database: PostgresDatabase;
  let employees: PostgresEmployeeRepository;
  let vacations: PostgresVacationRepository;

  beforeEach(async () => {
    const schema = `test_repositories_${randomUUID().replaceAll("-", "")}`;
    database = new PostgresDatabase(testDatabaseUrl, schema);
    await database.initialize();
    employees = new PostgresEmployeeRepository(database);
    vacations = new PostgresVacationRepository(database);
  });

  afterEach(async () => {
    try {
      await database.query(`DROP SCHEMA IF EXISTS "${database.schema}" CASCADE`);
    } finally {
      await database.close();
    }
  });

  it("lists persisted employees and their ordered history after reopening the schema", async () => {
    const first = await employees.create(newEmployee("100"));
    const second = await employees.create(newEmployee("200"));
    const updated = await employees.update({
      ...first,
      position: "Lider",
      salary: 3000000.5,
      history: [
        { type: "cargo", previousValue: "Analista", newValue: "Lider", changedAt: "2026-06-01" },
        { type: "salario", previousValue: "2500000", newValue: "3000000.5", changedAt: "2026-06-01" },
      ],
    });

    const reopened = new PostgresDatabase(testDatabaseUrl, database.schema);
    try {
      await reopened.initialize();
      const repository = new PostgresEmployeeRepository(reopened);
      expect(await repository.findAll()).toEqual([updated, second]);
      expect(await repository.findById(first.id)).toEqual(updated);
      expect(await repository.findByDocument(first.document)).toEqual(updated);
      expect(await repository.findByDocument("missing")).toBeNull();
    } finally {
      await reopened.close();
    }
  });

  it("appends history without replacing existing entries and accepts a shorter history", async () => {
    const employee = await employees.create({
      ...newEmployee("100"),
      history: [{ type: "cargo", previousValue: "Auxiliar", newValue: "Analista", changedAt: "2026-06-01" }],
    });
    const historyIds = async () => {
      const { rows } = await database.query<{ id: string }>(
        `SELECT id FROM "${database.schema}".employee_history ORDER BY id`
      );
      return rows.map(({ id }) => id);
    };
    const originalIds = await historyIds();

    const updated = await employees.update({
      ...employee,
      status: "inactivo",
      history: [
        ...employee.history,
        { type: "estado", previousValue: "activo", newValue: "inactivo", changedAt: "2026-06-02" },
      ],
    });
    const appendedIds = await historyIds();
    expect(appendedIds).toHaveLength(2);
    expect(appendedIds.slice(0, 1)).toEqual(originalIds);

    await employees.update({ ...updated, history: employee.history });
    expect(await employees.findById(employee.id)).toMatchObject({ history: employee.history });
    expect(await historyIds()).toHaveLength(1);
  });

  it("maps duplicate documents to conflicts and rejects missing or noncanonical IDs", async () => {
    const first = await employees.create(newEmployee("100"));
    const second = await employees.create(newEmployee("200"));

    await expect(employees.create(newEmployee(first.document)))
      .rejects.toMatchObject({ code: "DOCUMENT_ALREADY_EXISTS", statusCode: 409 });
    await expect(employees.update({ ...second, document: first.document }))
      .rejects.toMatchObject({ code: "DOCUMENT_ALREADY_EXISTS", statusCode: 409 });
    expect(await employees.findAll()).toEqual([first, second]);

    for (const id of ["0", "01", "abc", "9007199254740992", "999"]) {
      expect(await employees.findById(id)).toBeNull();
    }
    for (const id of ["01", "999"]) {
      await expect(employees.update({ ...first, id }))
        .rejects.toMatchObject({ code: "EMPLOYEE_NOT_FOUND", statusCode: 404 });
    }
  });

  it("lists vacation requests by employee and preserves resolution changes", async () => {
    const first = await employees.create(newEmployee("100"));
    const second = await employees.create(newEmployee("200"));
    const pending = await vacations.create({
      employeeId: first.id, startDate: "2026-07-01", endDate: "2026-07-10", status: "pendiente",
    });
    const another = await vacations.create({
      employeeId: second.id, startDate: "2026-07-01", endDate: "2026-07-05", status: "pendiente",
    });
    const approved = await vacations.update({ ...pending, status: "aprobada" });

    expect(await vacations.findById(pending.id)).toEqual({ ...pending, status: "aprobada" });
    expect(await vacations.findByEmployeeId(first.id)).toEqual([approved]);
    expect(await vacations.findAll()).toEqual([approved, another]);
    expect(await vacations.findByEmployeeId("01")).toEqual([]);
    expect(await vacations.findById("01")).toBeNull();
    expect(await vacations.findById("999")).toBeNull();

    await expect(vacations.update({ ...approved, id: "999" }))
      .rejects.toMatchObject({ code: "VACATION_NOT_FOUND", statusCode: 404 });
    await expect(vacations.update({ ...approved, employeeId: "01" }))
      .rejects.toMatchObject({ code: "VACATION_NOT_FOUND", statusCode: 404 });
  });

  it("rolls back a write when a transaction fails and releases the connection", async () => {
    const employee = await employees.create(newEmployee("100"));

    await expect(database.transaction(async (client) => {
      await client.query(`DELETE FROM "${database.schema}".employees WHERE id = $1`, [employee.id]);
      throw new Error("Transaction interrupted");
    })).rejects.toThrow("Transaction interrupted");

    expect(await employees.findById(employee.id)).toEqual(employee);
  });
});
