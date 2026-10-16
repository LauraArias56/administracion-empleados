import { describe, expect, it } from "vitest";
import { Request, Response } from "express";
import { EmployeeController } from "../../src/controllers/employee.controller";
import {
  CreateEmployeeRequestDTO,
  EmployeeResponseDTO,
  RequestVacationDTO,
  ResolveVacationDTO,
  UpdateEmployeeRequestDTO,
  VacationResponseDTO,
} from "../../src/dto/employee.dto";
import { IEmployeeService } from "../../src/services/interfaces/employee.interface";

function createResponse() {
  return {
    statusCode: 0,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.payload = body;
      return this;
    },
  };
}

describe("EmployeeController", () => {
  const employee: EmployeeResponseDTO = {
    id: "1",
    document: "100",
    firstName: "Laura",
    lastName: "Gomez",
    fullName: "Laura Gomez",
    position: "Analista",
    salary: 1000,
    status: "activo",
    contract: {
      startDate: "2026-01-15",
      type: "indefinido",
      status: "vigente",
    },
    history: [],
  };

  const vacation: VacationResponseDTO = {
    id: "4",
    employeeId: "1",
    startDate: "2026-06-01",
    endDate: "2026-06-05",
    status: "pendiente",
  };

  function createController(): EmployeeController {
    const service: IEmployeeService = {
      async createEmployee(request: CreateEmployeeRequestDTO) {
        return { ...employee, document: request.document };
      },
      async getEmployee(id: string) {
        return { ...employee, id };
      },
      async updateEmployee(id: string, request: UpdateEmployeeRequestDTO) {
        return { ...employee, id, position: request.position ?? employee.position };
      },
      async requestVacation(employeeId: string, request: RequestVacationDTO) {
        return { ...vacation, employeeId, startDate: request.startDate };
      },
      async resolveVacation(vacationId: string, request: ResolveVacationDTO) {
        return {
          ...vacation,
          id: vacationId,
          status: request.decision === "aprobar" ? "aprobada" : "rechazada",
        };
      },
    };

    return new EmployeeController(service);
  }

  it("should create an employee with status 201", async () => {
    const controller = createController();
    const response = createResponse();

    await controller.createEmployee(
      { body: { document: "100" } } as Request,
      response as unknown as Response
    );

    expect(response.statusCode).toBe(201);
    expect(response.payload).toMatchObject({ document: "100", fullName: "Laura Gomez" });
  });

  it("should return an employee with status 200", async () => {
    const controller = createController();
    const response = createResponse();

    await controller.getEmployee(
      { params: { id: "7" } } as unknown as Request,
      response as unknown as Response
    );

    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({ id: "7" });
  });

  it("should update an employee with status 200", async () => {
    const controller = createController();
    const response = createResponse();

    await controller.updateEmployee(
      { params: { id: "1" }, body: { position: "Lider" } } as unknown as Request,
      response as unknown as Response
    );

    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({ position: "Lider" });
  });

  it("should request vacations with status 201", async () => {
    const controller = createController();
    const response = createResponse();

    await controller.requestVacation(
      {
        params: { id: "1" },
        body: { startDate: "2026-06-01", endDate: "2026-06-05" },
      } as unknown as Request,
      response as unknown as Response
    );

    expect(response.statusCode).toBe(201);
    expect(response.payload).toMatchObject({ employeeId: "1", status: "pendiente" });
  });

  it("should resolve a vacation with status 200", async () => {
    const controller = createController();
    const response = createResponse();

    await controller.resolveVacation(
      { params: { id: "4" }, body: { decision: "aprobar" } } as unknown as Request,
      response as unknown as Response
    );

    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({ id: "4", status: "aprobada" });
  });
});
