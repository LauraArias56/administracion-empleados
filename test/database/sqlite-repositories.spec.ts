import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SqliteDatabase } from "../../src/database/sqlite-database";
import { AppException } from "../../src/exceptions/app.exception";
import { SqliteEmployeeRepository } from "../../src/repositories/sqlite-employee.repository";
import { SqliteVacationRepository } from "../../src/repositories/sqlite-vacation.repository";
import { EmployeeService } from "../../src/services/employee.service";

const employeeRequest = (document: string) => ({
  document,
  firstName: "Laura",
  lastName: "Gomez",
  position: "Analista",
  salary: 2500000,
  contract: { startDate: "2026-01-15", type: "indefinido" as const },
});

describe("SQLite database", () => {
  let dir: string;
  let file: string;
  let opened: SqliteDatabase[];

  // Cada "arranque" de la aplicación abre su propia conexión al mismo archivo.
  const open = () => {
    const database = new SqliteDatabase(file);
    opened.push(database);
    const service = new EmployeeService(
      new SqliteEmployeeRepository(database),
      new SqliteVacationRepository(database)
    );
    return { database, service };
  };

  beforeEach(async () => {
    opened = [];
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "empleados-"));
    file = path.join(dir, "nested", "employees.db");
  });

  afterEach(async () => {
    // En Windows no se puede borrar un .db con la conexión abierta.
    opened.forEach((database) => database.close());
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("should not touch the disk until it is used", () => {
    open();
    return expect(fs.access(file)).rejects.toThrow();
  });

  it("should create the file, folders and tables on initialize", async () => {
    const { database } = open();
    database.initialize();

    await fs.access(file);
    const tables = database.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all()
      .map((row) => row.name);
    expect(tables).toEqual(["employee_history", "employees", "vacations"]);
  });

  it("should be safe to initialize more than once", async () => {
    const first = open();
    first.database.initialize();
    await first.service.createEmployee(employeeRequest("1"));

    const second = open();
    second.database.initialize();
    expect(await second.service.getEmployee("1")).toMatchObject({ document: "1" });
  });

  it("should keep data and ids after reopening the file", async () => {
    const first = open();
    await first.service.createEmployee(employeeRequest("1"));
    first.database.close();

    const restarted = open();
    const found = await restarted.service.getEmployee("1");
    const second = await restarted.service.createEmployee(employeeRequest("2"));

    expect(found.document).toBe("1");
    expect(second.id).toBe("2");
  });

  it("should not reuse ids", async () => {
    const { database, service } = open();
    await service.createEmployee(employeeRequest("1"));
    await service.createEmployee(employeeRequest("2"));
    database.db.exec("DELETE FROM employees WHERE id = 2");

    const next = await service.createEmployee(employeeRequest("3"));
    expect(next.id).toBe("3");
  });

  it("should persist updates, history and vacations", async () => {
    const first = open();
    await first.service.createEmployee(employeeRequest("1"));
    await first.service.updateEmployee("1", { position: "Lider", salary: 3000000.5 });
    await first.service.updateEmployee("1", { status: "inactivo" });
    first.database.close();

    const second = open();
    const vacation = await second.service.requestVacation("1", {
      startDate: "2026-07-01",
      endDate: "2026-07-10",
    }).catch((error: AppException) => error);
    expect((vacation as AppException).code).toBe("EMPLOYEE_INACTIVE");

    await second.service.updateEmployee("1", { status: "activo" });
    const created = await second.service.requestVacation("1", {
      startDate: "2026-07-01",
      endDate: "2026-07-10",
    });
    await second.service.resolveVacation(created.id, { decision: "aprobar" });
    second.database.close();

    const third = open();
    const employee = await third.service.getEmployee("1");
    expect(employee.position).toBe("Lider");
    expect(employee.salary).toBe(3000000.5);
    expect(employee.history.map((entry) => entry.type)).toEqual([
      "cargo",
      "salario",
      "estado",
      "estado",
    ]);
    expect(employee.history[1]).toMatchObject({ previousValue: "2500000", newValue: "3000000.5" });

    const overlap = await third.service
      .requestVacation("1", { startDate: "2026-07-05", endDate: "2026-07-06" })
      .catch((error: AppException) => error);
    expect((overlap as AppException).code).toBe("VACATION_OVERLAP");
  });

  it("should not create concurrent duplicates", async () => {
    const { service } = open();

    const results = await Promise.allSettled([
      service.createEmployee(employeeRequest("1")),
      service.createEmployee(employeeRequest("1")),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect((rejected.reason as AppException).code).toBe("DOCUMENT_ALREADY_EXISTS");
  });

  it("should reject duplicates at the database level", async () => {
    const { database } = open();
    const repository = new SqliteEmployeeRepository(database);
    const newEmployee = {
      document: "1",
      firstName: "Laura",
      lastName: "Gomez",
      fullName: "Laura Gomez",
      position: "Analista",
      salary: 1,
      status: "activo" as const,
      contract: { startDate: "2026-01-15", type: "fijo" as const, status: "vigente" as const },
      history: [],
    };

    await repository.create(newEmployee);
    await expect(repository.create(newEmployee)).rejects.toMatchObject({
      code: "DOCUMENT_ALREADY_EXISTS",
      statusCode: 409,
    });
  });

  it("should assign unique ids on concurrent creations", async () => {
    const { service } = open();

    const created = await Promise.all(
      ["1", "2", "3", "4", "5"].map((doc) => service.createEmployee(employeeRequest(doc)))
    );

    expect(new Set(created.map((e) => e.id)).size).toBe(5);
  });

  it("should treat non canonical ids as not found", async () => {
    const { service } = open();
    await service.createEmployee(employeeRequest("1"));

    for (const id of ["abc", "01", "1.0", "-1", "0", "99999999999999999999"]) {
      await expect(service.getEmployee(id)).rejects.toMatchObject({ code: "EMPLOYEE_NOT_FOUND" });
    }
  });

  it("should roll back a failed transaction", () => {
    const { database } = open();
    expect(() =>
      database.transaction(() => {
        database.db.exec(
          "INSERT INTO employees (document, first_name, last_name, position, salary, status, contract_start_date, contract_type, contract_status) VALUES ('X','Ana','Lopez','Dev',1,'activo','2026-01-01','fijo','vigente')"
        );
        throw new Error("boom");
      })
    ).toThrow("boom");

    const row = database.db.prepare("SELECT COUNT(*) AS total FROM employees").get();
    expect(row?.total).toBe(0);
  });

  it("should enforce the schema constraints", () => {
    const { database } = open();
    const insert = (status: string, salary: number) =>
      database.db
        .prepare(
          "INSERT INTO employees (document, first_name, last_name, position, salary, status, contract_start_date, contract_type, contract_status) VALUES (?, 'Ana', 'Lopez', 'Dev', ?, ?, '2026-01-01', 'fijo', 'vigente')"
        )
        .run(`doc-${status}-${salary}`, salary, status);

    expect(() => insert("desconocido", 1)).toThrow();
    expect(() => insert("activo", -1)).toThrow();
    expect(() =>
      database.db
        .prepare("INSERT INTO vacations (employee_id, start_date, end_date, status) VALUES (999, '2026-01-01', '2026-01-02', 'pendiente')")
        .run()
    ).toThrow(/FOREIGN KEY/);
  });
});
