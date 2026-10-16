import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonDatabase } from "../../src/database/json-database";
import { AppException } from "../../src/exceptions/app.exception";
import { JsonEmployeeRepository } from "../../src/repositories/json-employee.repository";
import { JsonVacationRepository } from "../../src/repositories/json-vacation.repository";
import { EmployeeService } from "../../src/services/employee.service";

function buildService(filePath: string) {
  const database = new JsonDatabase(filePath);
  return new EmployeeService(
    new JsonEmployeeRepository(database),
    new JsonVacationRepository(database)
  );
}

const employeeRequest = (document: string) => ({
  document,
  firstName: "Laura",
  lastName: "Gomez",
  position: "Analista",
  salary: 2500000,
  contract: { startDate: "2026-01-15", type: "indefinido" as const },
});

describe("JSON database", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "empleados-"));
    file = path.join(dir, "nested", "db.json");
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("should create the file and folders on first write", async () => {
    const service = buildService(file);
    await service.createEmployee(employeeRequest("1"));

    const content = JSON.parse(await fs.readFile(file, "utf-8"));
    expect(content.employees).toHaveLength(1);
    expect(content.sequences.employees).toBe(1);
  });

  it("should keep data and ids after restarting the service", async () => {
    await buildService(file).createEmployee(employeeRequest("1"));

    const restarted = buildService(file);
    const found = await restarted.getEmployee("1");
    const second = await restarted.createEmployee(employeeRequest("2"));

    expect(found.document).toBe("1");
    expect(second.id).toBe("2");
  });

  it("should persist updates and vacations", async () => {
    const service = buildService(file);
    await service.createEmployee(employeeRequest("1"));
    await service.updateEmployee("1", { position: "Lider" });
    const vacation = await service.requestVacation("1", {
      startDate: "2026-07-01",
      endDate: "2026-07-10",
    });
    await service.resolveVacation(vacation.id, { decision: "aprobar" });

    const content = JSON.parse(await fs.readFile(file, "utf-8"));
    expect(content.employees[0].position).toBe("Lider");
    expect(content.employees[0].history).toHaveLength(1);
    expect(content.vacations[0].status).toBe("aprobada");
  });

  it("should not create concurrent duplicates", async () => {
    const service = buildService(file);

    const results = await Promise.allSettled([
      service.createEmployee(employeeRequest("1")),
      service.createEmployee(employeeRequest("1")),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect((rejected.reason as AppException).code).toBe("DOCUMENT_ALREADY_EXISTS");
  });

  it("should assign unique ids on concurrent creations", async () => {
    const service = buildService(file);

    const created = await Promise.all(
      ["1", "2", "3", "4", "5"].map((doc) => service.createEmployee(employeeRequest(doc)))
    );

    expect(new Set(created.map((e) => e.id)).size).toBe(5);
  });

  it("should treat an empty file as an empty database", async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, "");

    const created = await buildService(file).createEmployee(employeeRequest("1"));
    expect(created.id).toBe("1");
  });

  it("should fail without overwriting a corrupt file", async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, "{ no es json");

    await expect(buildService(file).getEmployee("1")).rejects.toThrow(/JSON válido/);
    expect(await fs.readFile(file, "utf-8")).toBe("{ no es json");
  });
});
