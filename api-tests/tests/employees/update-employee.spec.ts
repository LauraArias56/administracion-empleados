import { test, expect } from "../../fixtures/employee.fixture";
import { getEmployee, updateEmployee } from "../../services/employees.services";
import { ERRORS, MISSING_ID, expectApiError } from "../../support/errors";
import { today } from "../../support/test-data";

test.describe("PATCH /api/v1/employees/:id", () => {
  test("should update the position and record it in the history", async ({ request, employee }) => {
    const before = today();

    const response = await updateEmployee(request, employee.id, { position: "Lider" });

    const after = today();
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.position).toBe("Lider");
    expect(body.history).toHaveLength(1);
    expect(body.history[0]).toMatchObject({ type: "cargo", previousValue: "Analista", newValue: "Lider" });
    expect([before, after]).toContain(body.history[0].changedAt);
  });

  test("should update the salary and record it in the history", async ({ request, employee }) => {
    const response = await updateEmployee(request, employee.id, { salary: 3000000 });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.salary).toBe(3000000);
    expect(body.history).toHaveLength(1);
    expect(body.history[0]).toMatchObject({
      type: "salario",
      previousValue: "2500000",
      newValue: "3000000",
    });
  });

  test("should update the employment status and record it in the history", async ({
    request,
    employee,
  }) => {
    const response = await updateEmployee(request, employee.id, { status: "inactivo" });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("inactivo");
    expect(body.history).toHaveLength(1);
    expect(body.history[0]).toMatchObject({
      type: "estado",
      previousValue: "activo",
      newValue: "inactivo",
    });
  });

  test("should record every change of one request in order", async ({ request, employee }) => {
    const response = await updateEmployee(request, employee.id, {
      status: "inactivo",
      salary: 4000000,
      position: "Gerente",
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.history.map((entry: { type: string }) => entry.type)).toEqual([
      "cargo",
      "salario",
      "estado",
    ]);
  });

  test("should accumulate the history over several updates", async ({ request, employee }) => {
    await updateEmployee(request, employee.id, { position: "Lider" });
    await updateEmployee(request, employee.id, { status: "inactivo" });
    const response = await updateEmployee(request, employee.id, { status: "activo" });

    const body = await response.json();
    expect(body.history).toHaveLength(3);
    expect(body.history[2]).toMatchObject({ type: "estado", previousValue: "inactivo", newValue: "activo" });
    expect(body.status).toBe("activo");
  });

  test("should persist the changes", async ({ request, employee }) => {
    await updateEmployee(request, employee.id, { position: "Lider", salary: 0 });

    const stored = await (await getEmployee(request, employee.id)).json();

    expect(stored.position).toBe("Lider");
    expect(stored.salary).toBe(0);
    expect(stored.history).toHaveLength(2);
  });

  test("should not change anything when the values are the same", async ({ request, employee }) => {
    const response = await updateEmployee(request, employee.id, {
      position: employee.position,
      salary: employee.salary,
      status: employee.status,
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual(employee);
  });

  test("should accept an empty update", async ({ request, employee }) => {
    const response = await updateEmployee(request, employee.id, {});

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual(employee);
  });

  test("should ignore fields that cannot be updated", async ({ request, employee }) => {
    const response = await updateEmployee(request, employee.id, {
      document: "OTRO-DOCUMENTO",
      firstName: "Otro",
      contract: { startDate: "2020-01-01", type: "fijo", status: "finalizado" },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual(employee);
  });

  test("should return 404 when the employee does not exist", async ({ request }) => {
    await expectApiError(
      await updateEmployee(request, MISSING_ID, { position: "Lider" }),
      ERRORS.EMPLOYEE_NOT_FOUND
    );
  });

  test("should return 404 when the id is not numeric", async ({ request }) => {
    await expectApiError(
      await updateEmployee(request, "abc", { position: "Lider" }),
      ERRORS.EMPLOYEE_NOT_FOUND
    );
  });

  test("should require the employee id", async ({ request }) => {
    await expectApiError(
      await updateEmployee(request, "%20", { position: "Lider" }),
      ERRORS.EMPLOYEE_ID_MANDATORY
    );
  });

  const invalidCases = [
    ["a blank position", { position: " " }, ERRORS.POSITION_REQUIRED],
    ["a negative salary", { salary: -1 }, ERRORS.SALARY_INVALID],
    ["a salary sent as text", { salary: "3000000" }, ERRORS.SALARY_INVALID],
    ["an unknown employment status", { status: "suspendido" }, ERRORS.EMPLOYMENT_STATUS_INVALID],
  ] as const;

  for (const [name, data, expected] of invalidCases) {
    test(`should reject ${name}`, async ({ request, employee }) => {
      await expectApiError(await updateEmployee(request, employee.id, data), expected);
    });
  }

  test("should not apply any change when one of the values is invalid", async ({
    request,
    employee,
  }) => {
    const response = await updateEmployee(request, employee.id, { position: "Lider", salary: -5 });

    await expectApiError(response, ERRORS.SALARY_INVALID);
    const stored = await (await getEmployee(request, employee.id)).json();
    expect(stored).toEqual(employee);
  });
});
