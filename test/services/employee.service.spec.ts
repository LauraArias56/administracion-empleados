import { describe, expect, it } from "vitest";
import { CreateEmployeeRequestDTO } from "../../src/dto/employee.dto";
import { AppException } from "../../src/exceptions/app.exception";
import { EmployeeService } from "../../src/services/employee.service";

function validEmployee(
  overrides: Partial<CreateEmployeeRequestDTO> = {}
): CreateEmployeeRequestDTO {
  return {
    document: "100200300",
    firstName: "Laura",
    lastName: "Gomez",
    position: "Analista",
    salary: 2500000,
    contract: {
      startDate: "2026-01-15",
      type: "indefinido",
    },
    ...overrides,
  };
}

describe("EmployeeService", () => {
  it("should create an employee with contract and full name", async () => {
    const service = new EmployeeService();

    const result = await service.createEmployee(validEmployee());

    expect(result.id).toBe("1");
    expect(result.document).toBe("100200300");
    expect(result.firstName).toBe("Laura");
    expect(result.lastName).toBe("Gomez");
    expect(result.fullName).toBe("Laura Gomez");
    expect(result.position).toBe("Analista");
    expect(result.salary).toBe(2500000);
    expect(result.status).toBe("activo");
    expect(result.contract).toEqual({
      startDate: "2026-01-15",
      type: "indefinido",
      status: "vigente",
    });
    expect(result.history).toEqual([]);
  });

  it("should trim names and accept an explicit inactive status", async () => {
    const service = new EmployeeService();

    const result = await service.createEmployee(
      validEmployee({
        document: "  900  ",
        firstName: "  Ana  ",
        lastName: "  Ruiz ",
        status: "inactivo",
        contract: {
          startDate: "2026-03-01",
          type: "fijo",
          status: "finalizado",
        },
      })
    );

    expect(result.document).toBe("900");
    expect(result.fullName).toBe("Ana Ruiz");
    expect(result.status).toBe("inactivo");
    expect(result.contract.status).toBe("finalizado");
    expect(result.contract.type).toBe("fijo");
  });

  it("should assign incremental ids", async () => {
    const service = new EmployeeService();

    const first = await service.createEmployee(validEmployee());
    const second = await service.createEmployee(
      validEmployee({ document: "555", firstName: "Camilo" })
    );

    expect(first.id).toBe("1");
    expect(second.id).toBe("2");
  });

  it("should reject an empty document", async () => {
    const service = new EmployeeService();

    await expect(service.createEmployee(validEmployee({ document: "  " }))).rejects.toThrow(
      "El documento es obligatorio"
    );
  });

  it("should reject an empty first name", async () => {
    const service = new EmployeeService();

    await expect(service.createEmployee(validEmployee({ firstName: "" }))).rejects.toThrow(
      "El nombre es obligatorio"
    );
  });

  it("should reject a first name shorter than 3 characters", async () => {
    const service = new EmployeeService();

    await expect(service.createEmployee(validEmployee({ firstName: "Lu" }))).rejects.toThrow(
      "El nombre debe tener al menos 3 caracteres"
    );
  });

  it("should reject an empty last name", async () => {
    const service = new EmployeeService();

    await expect(service.createEmployee(validEmployee({ lastName: "" }))).rejects.toThrow(
      "El apellido es obligatorio"
    );
  });

  it("should reject an empty position", async () => {
    const service = new EmployeeService();

    await expect(service.createEmployee(validEmployee({ position: " " }))).rejects.toThrow(
      "El cargo es obligatorio"
    );
  });

  it("should accept a salary of zero", async () => {
    const service = new EmployeeService();

    const result = await service.createEmployee(validEmployee({ salary: 0 }));

    expect(result.salary).toBe(0);
  });

  it("should reject a negative salary", async () => {
    const service = new EmployeeService();

    await expect(service.createEmployee(validEmployee({ salary: -1 }))).rejects.toThrow(
      "El salario debe ser un número mayor o igual a cero"
    );
  });

  it("should reject a salary that is not a number", async () => {
    const service = new EmployeeService();

    await expect(
      service.createEmployee(validEmployee({ salary: "2500000" as unknown as number }))
    ).rejects.toThrow("El salario debe ser un número mayor o igual a cero");
  });

  it("should reject a request without a contract", async () => {
    const service = new EmployeeService();
    const request = validEmployee();
    delete (request as { contract?: CreateEmployeeRequestDTO["contract"] }).contract;

    await expect(service.createEmployee(request)).rejects.toThrow(
      "El tipo de contrato no es válido"
    );
  });

  it("should reject a non finite salary", async () => {
    const service = new EmployeeService();

    await expect(
      service.createEmployee(validEmployee({ salary: Number.NaN }))
    ).rejects.toThrow("El salario debe ser un número mayor o igual a cero");
  });

  it("should reject an invalid employment status", async () => {
    const service = new EmployeeService();

    await expect(
      service.createEmployee(validEmployee({ status: "retirado" as "activo" }))
    ).rejects.toThrow("El estado laboral no es válido");
  });

  it("should reject an invalid contract type", async () => {
    const service = new EmployeeService();

    await expect(
      service.createEmployee(
        validEmployee({
          contract: { startDate: "2026-01-15", type: "temporal" as "fijo" },
        })
      )
    ).rejects.toThrow("El tipo de contrato no es válido");
  });

  it("should reject an invalid contract status", async () => {
    const service = new EmployeeService();

    await expect(
      service.createEmployee(
        validEmployee({
          contract: {
            startDate: "2026-01-15",
            type: "obra_labor",
            status: "suspendido" as "vigente",
          },
        })
      )
    ).rejects.toThrow("El estado del contrato no es válido");
  });

  it("should reject an impossible contract date", async () => {
    const service = new EmployeeService();

    await expect(
      service.createEmployee(
        validEmployee({
          contract: { startDate: "2026-02-31", type: "indefinido" },
        })
      )
    ).rejects.toThrow("La fecha de inicio del contrato no es válida");
  });

  it("should reject a duplicated document", async () => {
    const service = new EmployeeService();
    await service.createEmployee(validEmployee());

    await expect(service.createEmployee(validEmployee({ firstName: "Maria" }))).rejects.toMatchObject({
      code: "DOCUMENT_ALREADY_EXISTS",
      statusCode: 409,
    });
  });

  it("should return the employee by id", async () => {
    const service = new EmployeeService();
    const created = await service.createEmployee(validEmployee());

    const result = await service.getEmployee(created.id);

    expect(result.fullName).toBe("Laura Gomez");
    expect(result.contract.type).toBe("indefinido");
  });

  it("should reject a missing employee id", async () => {
    const service = new EmployeeService();

    await expect(service.getEmployee(" ")).rejects.toThrow("El id del empleado es obligatorio");
  });

  it("should reject an unknown employee", async () => {
    const service = new EmployeeService();

    await expect(service.getEmployee("99")).rejects.toMatchObject({
      code: "EMPLOYEE_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("should record position, salary and status changes", async () => {
    const service = new EmployeeService();
    const created = await service.createEmployee(validEmployee());
    const changedAt = new Date().toISOString().slice(0, 10);

    const result = await service.updateEmployee(created.id, {
      position: "Lider",
      salary: 3200000,
      status: "inactivo",
    });

    expect(result.position).toBe("Lider");
    expect(result.salary).toBe(3200000);
    expect(result.status).toBe("inactivo");
    expect(result.history).toEqual([
      {
        type: "cargo",
        previousValue: "Analista",
        newValue: "Lider",
        changedAt,
      },
      {
        type: "salario",
        previousValue: "2500000",
        newValue: "3200000",
        changedAt,
      },
      {
        type: "estado",
        previousValue: "activo",
        newValue: "inactivo",
        changedAt,
      },
    ]);
  });

  it("should keep history empty when values do not change", async () => {
    const service = new EmployeeService();
    const created = await service.createEmployee(validEmployee());

    const result = await service.updateEmployee(created.id, {
      position: "Analista",
      salary: 2500000,
      status: "activo",
    });

    expect(result.history).toEqual([]);
  });

  it("should not change the employee when the salary is invalid", async () => {
    const service = new EmployeeService();
    const created = await service.createEmployee(validEmployee());

    await expect(
      service.updateEmployee(created.id, { position: "Lider", salary: -10 })
    ).rejects.toThrow("El salario debe ser un número mayor o igual a cero");

    const stored = await service.getEmployee(created.id);
    expect(stored.position).toBe("Analista");
    expect(stored.history).toEqual([]);
  });

  it("should reject an empty position on update", async () => {
    const service = new EmployeeService();
    const created = await service.createEmployee(validEmployee());

    await expect(service.updateEmployee(created.id, { position: " " })).rejects.toThrow(
      "El cargo es obligatorio"
    );
  });

  it("should reject an invalid status on update", async () => {
    const service = new EmployeeService();
    const created = await service.createEmployee(validEmployee());

    await expect(
      service.updateEmployee(created.id, { status: "licencia" as "activo" })
    ).rejects.toThrow("El estado laboral no es válido");
  });

  it("should request vacations for an active employee", async () => {
    const service = new EmployeeService();
    const created = await service.createEmployee(validEmployee());

    const vacation = await service.requestVacation(created.id, {
      startDate: "2026-06-01",
      endDate: "2026-06-10",
    });

    expect(vacation).toEqual({
      id: "1",
      employeeId: created.id,
      startDate: "2026-06-01",
      endDate: "2026-06-10",
      status: "pendiente",
    });
  });

  it("should allow a one day vacation", async () => {
    const service = new EmployeeService();
    const created = await service.createEmployee(validEmployee());

    const vacation = await service.requestVacation(created.id, {
      startDate: "2026-07-01",
      endDate: "2026-07-01",
    });

    expect(vacation.status).toBe("pendiente");
  });

  it("should reject vacations for an inactive employee", async () => {
    const service = new EmployeeService();
    const created = await service.createEmployee(validEmployee({ status: "inactivo" }));

    await expect(
      service.requestVacation(created.id, {
        startDate: "2026-06-01",
        endDate: "2026-06-05",
      })
    ).rejects.toMatchObject({ code: "EMPLOYEE_INACTIVE", statusCode: 409 });
  });

  it("should reject vacations when the end date is before the start date", async () => {
    const service = new EmployeeService();
    const created = await service.createEmployee(validEmployee());

    await expect(
      service.requestVacation(created.id, {
        startDate: "2026-06-10",
        endDate: "2026-06-01",
      })
    ).rejects.toThrow("Las fechas de vacaciones no son válidas");
  });

  it("should reject vacations with an invalid date", async () => {
    const service = new EmployeeService();
    const created = await service.createEmployee(validEmployee());

    await expect(
      service.requestVacation(created.id, {
        startDate: "01-06-2026",
        endDate: "2026-06-10",
      })
    ).rejects.toThrow("Las fechas de vacaciones no son válidas");
  });

  it("should reject overlapping pending or approved vacations", async () => {
    const service = new EmployeeService();
    const created = await service.createEmployee(validEmployee());
    const pending = await service.requestVacation(created.id, {
      startDate: "2026-06-01",
      endDate: "2026-06-10",
    });
    await service.resolveVacation(pending.id, { decision: "aprobar" });

    await expect(
      service.requestVacation(created.id, {
        startDate: "2026-06-10",
        endDate: "2026-06-12",
      })
    ).rejects.toMatchObject({ code: "VACATION_OVERLAP", statusCode: 409 });
  });

  it("should allow a new request when the previous one was rejected", async () => {
    const service = new EmployeeService();
    const created = await service.createEmployee(validEmployee());
    const pending = await service.requestVacation(created.id, {
      startDate: "2026-08-01",
      endDate: "2026-08-05",
    });
    await service.resolveVacation(pending.id, { decision: "rechazar" });

    const next = await service.requestVacation(created.id, {
      startDate: "2026-08-01",
      endDate: "2026-08-05",
    });

    expect(next.status).toBe("pendiente");
    expect(next.id).toBe("2");
  });

  it("should approve and reject a pending vacation", async () => {
    const service = new EmployeeService();
    const created = await service.createEmployee(validEmployee());
    const first = await service.requestVacation(created.id, {
      startDate: "2026-09-01",
      endDate: "2026-09-03",
    });
    const second = await service.requestVacation(created.id, {
      startDate: "2026-10-01",
      endDate: "2026-10-03",
    });

    const approved = await service.resolveVacation(first.id, { decision: "aprobar" });
    const rejected = await service.resolveVacation(second.id, { decision: "rechazar" });

    expect(approved.status).toBe("aprobada");
    expect(rejected.status).toBe("rechazada");
  });

  it("should reject an empty vacation id", async () => {
    const service = new EmployeeService();

    await expect(service.resolveVacation(" ", { decision: "aprobar" })).rejects.toThrow(
      "El id de la vacación es obligatorio"
    );
  });

  it("should reject an unknown vacation", async () => {
    const service = new EmployeeService();

    await expect(service.resolveVacation("40", { decision: "aprobar" })).rejects.toMatchObject({
      code: "VACATION_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("should reject resolving a vacation twice", async () => {
    const service = new EmployeeService();
    const created = await service.createEmployee(validEmployee());
    const vacation = await service.requestVacation(created.id, {
      startDate: "2026-11-01",
      endDate: "2026-11-02",
    });
    await service.resolveVacation(vacation.id, { decision: "aprobar" });

    await expect(service.resolveVacation(vacation.id, { decision: "rechazar" })).rejects.toMatchObject(
      { code: "VACATION_ALREADY_RESOLVED", statusCode: 409 }
    );
  });

  it("should reject an invalid decision", async () => {
    const service = new EmployeeService();
    const created = await service.createEmployee(validEmployee());
    const vacation = await service.requestVacation(created.id, {
      startDate: "2026-12-01",
      endDate: "2026-12-02",
    });

    await expect(
      service.resolveVacation(vacation.id, { decision: "cancelar" as "aprobar" })
    ).rejects.toThrow("La decisión debe ser aprobar o rechazar");
  });

  it("should expose the application error code", async () => {
    const service = new EmployeeService();

    await expect(service.createEmployee(validEmployee({ salary: -5 }))).rejects.toBeInstanceOf(
      AppException
    );
  });
});
