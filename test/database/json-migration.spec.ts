import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bootstrapDatabase } from "../../src/database/bootstrap";
import { migrateJsonToSqlite } from "../../src/database/json-migration";
import { DatabaseSchema } from "../../src/database/schema";
import { SqliteDatabase } from "../../src/database/sqlite-database";
import { SqliteEmployeeRepository } from "../../src/repositories/sqlite-employee.repository";
import { SqliteVacationRepository } from "../../src/repositories/sqlite-vacation.repository";
import { EmployeeService } from "../../src/services/employee.service";

// Archivo en el mismo formato que escribía la versión JSON de la aplicación.
const legacyData = (): DatabaseSchema => ({
  sequences: { employees: 5, vacations: 3 },
  employees: [
    {
      id: "1",
      document: "123456789",
      firstName: "Laura",
      lastName: "Gómez",
      fullName: "Laura Gómez",
      position: "Lider",
      salary: 3000000.5,
      status: "activo",
      contract: { startDate: "2026-01-15", type: "indefinido", status: "vigente" },
      history: [
        { type: "cargo", previousValue: "Analista", newValue: "Lider", changedAt: "2026-02-01" },
        { type: "salario", previousValue: "2500000", newValue: "3000000.5", changedAt: "2026-02-01" },
      ],
    },
    {
      id: "4",
      document: "987654321",
      firstName: "Carlos",
      lastName: "Perez",
      fullName: "Carlos Perez",
      position: "Analista",
      salary: 0,
      status: "inactivo",
      contract: { startDate: "2025-03-01", type: "fijo", status: "finalizado" },
      history: [],
    },
  ],
  vacations: [
    { id: "2", employeeId: "1", startDate: "2026-07-01", endDate: "2026-07-10", status: "aprobada" },
    { id: "3", employeeId: "1", startDate: "2026-08-01", endDate: "2026-08-05", status: "rechazada" },
  ],
});

describe("JSON to SQLite migration", () => {
  let dir: string;
  let jsonFile: string;
  let opened: SqliteDatabase[];

  const openDatabase = () => {
    const database = new SqliteDatabase(path.join(dir, "employees.db"));
    opened.push(database);
    return database;
  };

  const writeJson = (data: unknown) => fs.writeFile(jsonFile, JSON.stringify(data, null, 2), "utf-8");

  const buildService = (database: SqliteDatabase) =>
    new EmployeeService(new SqliteEmployeeRepository(database), new SqliteVacationRepository(database));

  const count = (database: SqliteDatabase, table: string) =>
    database.db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get()?.total;

  beforeEach(async () => {
    opened = [];
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "migracion-"));
    jsonFile = path.join(dir, "db.json");
  });

  afterEach(async () => {
    opened.forEach((database) => database.close());
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("should import employees, history and vacations keeping the original ids", async () => {
    await writeJson(legacyData());
    const database = openDatabase();

    const report = migrateJsonToSqlite(database, jsonFile);

    expect(report).toEqual({
      employeesImported: 2,
      employeesSkipped: 0,
      vacationsImported: 2,
      vacationsSkipped: 0,
    });

    const service = buildService(database);
    expect(await service.getEmployee("1")).toEqual({
      id: "1",
      document: "123456789",
      firstName: "Laura",
      lastName: "Gómez",
      fullName: "Laura Gómez",
      position: "Lider",
      salary: 3000000.5,
      status: "activo",
      contract: { startDate: "2026-01-15", type: "indefinido", status: "vigente" },
      history: legacyData().employees[0]?.history,
    });
    expect(await service.getEmployee("4")).toMatchObject({ document: "987654321", status: "inactivo" });
  });

  it("should continue the id sequences after the legacy ones", async () => {
    await writeJson(legacyData());
    const database = openDatabase();
    migrateJsonToSqlite(database, jsonFile);
    const service = buildService(database);

    const employee = await service.createEmployee({
      document: "555",
      firstName: "Marta",
      lastName: "Ruiz",
      position: "Dev",
      salary: 1,
      contract: { startDate: "2026-01-01", type: "fijo" },
    });
    const vacation = await service.requestVacation(employee.id, {
      startDate: "2026-09-01",
      endDate: "2026-09-02",
    });

    expect(employee.id).toBe("6");
    expect(vacation.id).toBe("4");
  });

  it("should be safe to run more than once without duplicating data", async () => {
    await writeJson(legacyData());
    const database = openDatabase();

    migrateJsonToSqlite(database, jsonFile);
    const second = migrateJsonToSqlite(database, jsonFile);
    const third = migrateJsonToSqlite(database, jsonFile);

    expect(second).toEqual({ employeesImported: 0, employeesSkipped: 2, vacationsImported: 0, vacationsSkipped: 2 });
    expect(third).toEqual(second);
    expect(count(database, "employees")).toBe(2);
    expect(count(database, "employee_history")).toBe(2);
    expect(count(database, "vacations")).toBe(2);
  });

  it("should not touch the JSON file", async () => {
    await writeJson(legacyData());
    const before = await fs.readFile(jsonFile, "utf-8");

    migrateJsonToSqlite(openDatabase(), jsonFile);

    expect(await fs.readFile(jsonFile, "utf-8")).toBe(before);
  });

  it("should import nothing when a record conflicts with existing data", async () => {
    const database = openDatabase();
    const service = buildService(database);
    await service.createEmployee({
      document: "987654321",
      firstName: "Otra",
      lastName: "Persona",
      position: "Dev",
      salary: 1,
      contract: { startDate: "2026-01-01", type: "fijo" },
    });
    await writeJson(legacyData());

    expect(() => migrateJsonToSqlite(database, jsonFile)).toThrow(/conflicto/);
    expect(count(database, "employees")).toBe(1);
    expect(count(database, "vacations")).toBe(0);
  });

  it("should import nothing when a record is invalid", async () => {
    const data = legacyData();
    const invalid = data.vacations[0];
    if (invalid) invalid.employeeId = "99";
    await writeJson(data);
    const database = openDatabase();

    expect(() => migrateJsonToSqlite(database, jsonFile)).toThrow(/Vacación id=2/);
    expect(count(database, "employees")).toBe(0);
  });

  it("should fail with a clear message on a corrupt file", async () => {
    await fs.writeFile(jsonFile, "{ no es json");

    expect(() => migrateJsonToSqlite(openDatabase(), jsonFile)).toThrow(/JSON válido/);
    expect(await fs.readFile(jsonFile, "utf-8")).toBe("{ no es json");
  });

  it("should treat an empty file as an empty database", async () => {
    await fs.writeFile(jsonFile, "");

    const report = migrateJsonToSqlite(openDatabase(), jsonFile);

    expect(report.employeesImported).toBe(0);
  });

  describe("bootstrapDatabase", () => {
    it("should migrate on the first start and not again afterwards", async () => {
      await writeJson(legacyData());

      const first = openDatabase();
      bootstrapDatabase(first, jsonFile);
      expect(count(first, "employees")).toBe(2);
      first.close();

      // Un empleado nuevo no debe verse afectado por un segundo arranque.
      const second = openDatabase();
      bootstrapDatabase(second, jsonFile);
      await buildService(second).updateEmployee("1", { position: "Director" });
      second.close();

      const third = openDatabase();
      bootstrapDatabase(third, jsonFile);
      expect(count(third, "employees")).toBe(2);
      expect((await buildService(third).getEmployee("1")).position).toBe("Director");
    });

    it("should just create the tables when there is no JSON file", () => {
      const database = openDatabase();

      bootstrapDatabase(database, path.join(dir, "no-existe.json"));
      bootstrapDatabase(database, undefined);

      expect(count(database, "employees")).toBe(0);
    });
  });
});
