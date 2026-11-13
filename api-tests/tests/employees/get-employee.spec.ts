import { APIResponse } from "@playwright/test";
import { test, expect } from "../../fixtures/employee.fixture";
import { getEmployee, updateEmployee } from "../../services/employees.services";
import { ERRORS, MISSING_ID, expectApiError } from "../../support/errors";

test.describe("GET /api/v1/employees/:id", () => {
  test("should return the information of the employee", async ({ request, employee }) => {
    let response: APIResponse;

    await test.step("send employee id", async () => {
      response = await getEmployee(request, employee.id);
    });

    await test.step("validate HTTP status code", async () => {
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("application/json");
    });

    await test.step("validate response body", async () => {
      const body = await response.json();

      expect(body).toHaveProperty("document");
      expect(body.document).toBe(employee.document);
      expect(body).toEqual(employee);
    });
  });

  test("should return the contract and an empty history for a new employee", async ({
    request,
    employee,
  }) => {
    const body = await (await getEmployee(request, employee.id)).json();

    expect(body.contract).toEqual({ startDate: "2026-01-15", type: "indefinido", status: "vigente" });
    expect(body.history).toEqual([]);
  });

  test("should return the history of changes", async ({ request, employee }) => {
    await updateEmployee(request, employee.id, { position: "Lider" });

    const body = await (await getEmployee(request, employee.id)).json();

    expect(body.position).toBe("Lider");
    expect(body.history).toHaveLength(1);
    expect(body.history[0]).toMatchObject({ type: "cargo", previousValue: "Analista", newValue: "Lider" });
  });

  test("should return each employee with its own data", async ({ request, makeEmployee }) => {
    const first = await makeEmployee({ firstName: "Primero" });
    const second = await makeEmployee({ firstName: "Segundo" });

    expect((await (await getEmployee(request, first.id)).json()).firstName).toBe("Primero");
    expect((await (await getEmployee(request, second.id)).json()).firstName).toBe("Segundo");
  });

  test("should send an error message when the employee does not exist", async ({ request }) => {
    let response: APIResponse;

    await test.step("send an unknown employee id", async () => {
      response = await getEmployee(request, MISSING_ID);
    });

    await test.step("validate HTTP status code and response body", async () => {
      await expectApiError(response, ERRORS.EMPLOYEE_NOT_FOUND);
    });
  });

  for (const id of ["abc", "1.5", "-1", "0"]) {
    test(`should not find an employee with the id "${id}"`, async ({ request }) => {
      await expectApiError(await getEmployee(request, id), ERRORS.EMPLOYEE_NOT_FOUND);
    });
  }

  test("should not find an employee when the id has leading zeros", async ({ request, employee }) => {
    await expectApiError(await getEmployee(request, `0${employee.id}`), ERRORS.EMPLOYEE_NOT_FOUND);
  });

  test("should require the employee id", async ({ request }) => {
    await expectApiError(await getEmployee(request, "%20"), ERRORS.EMPLOYEE_ID_MANDATORY);
  });
});
