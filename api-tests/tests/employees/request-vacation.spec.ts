import { test, expect } from "../../fixtures/employee.fixture";
import { requestVacation, updateEmployee } from "../../services/employees.services";
import { ERRORS, MISSING_ID, expectApiError } from "../../support/errors";

test.describe("POST /api/v1/employees/:id/vacations", () => {
  test("should create a pending vacation request", async ({ request, employee }) => {
    const response = await requestVacation(request, employee.id, {
      startDate: "2026-07-01",
      endDate: "2026-07-10",
    });

    expect(response.status()).toBe(201);
    expect(response.headers()["content-type"]).toContain("application/json");
    const body = await response.json();
    expect(typeof body.id).toBe("string");
    expect(body).toEqual({
      id: body.id,
      employeeId: employee.id,
      startDate: "2026-07-01",
      endDate: "2026-07-10",
      status: "pendiente",
    });
  });

  test("should assign a different id to each request", async ({ employee, makeVacation }) => {
    const first = await makeVacation(employee.id, "2026-07-01", "2026-07-02");
    const second = await makeVacation(employee.id, "2026-08-01", "2026-08-02");

    expect(first.id).not.toBe(second.id);
  });

  test("should allow a one day vacation", async ({ request, employee }) => {
    const response = await requestVacation(request, employee.id, {
      startDate: "2026-07-01",
      endDate: "2026-07-01",
    });

    expect(response.status()).toBe(201);
  });

  test("should allow the same dates for different employees", async ({ makeEmployee, makeVacation }) => {
    const first = await makeEmployee();
    const second = await makeEmployee();

    await makeVacation(first.id, "2026-07-01", "2026-07-10");
    const vacation = await makeVacation(second.id, "2026-07-01", "2026-07-10");

    expect(vacation.employeeId).toBe(second.id);
  });

  test("should allow a request right after an existing one", async ({ employee, makeVacation }) => {
    await makeVacation(employee.id, "2026-07-01", "2026-07-10");

    const next = await makeVacation(employee.id, "2026-07-11", "2026-07-15");

    expect(next.status).toBe("pendiente");
  });

  test("should allow a request over dates of a rejected one", async ({ employee, makeVacation }) => {
    await makeVacation(employee.id, "2026-07-01", "2026-07-10", "rechazar");

    const again = await makeVacation(employee.id, "2026-07-05", "2026-07-06");

    expect(again.status).toBe("pendiente");
  });

  const overlapCases = [
    ["a partial overlap at the start", "2026-06-28", "2026-07-02"],
    ["a partial overlap at the end", "2026-07-09", "2026-07-20"],
    ["a request inside the existing one", "2026-07-03", "2026-07-04"],
    ["a request that contains the existing one", "2026-06-01", "2026-08-01"],
    ["the same dates", "2026-07-01", "2026-07-10"],
    ["a request ending on the first day of the existing one", "2026-06-25", "2026-07-01"],
    ["a request starting on the last day of the existing one", "2026-07-10", "2026-07-12"],
  ] as const;

  for (const decision of [undefined, "aprobar"] as const) {
    const label = decision ? "approved" : "pending";
    for (const [name, startDate, endDate] of overlapCases) {
      test(`should reject ${name} with a ${label} vacation`, async ({
        request,
        employee,
        makeVacation,
      }) => {
        await makeVacation(employee.id, "2026-07-01", "2026-07-10", decision);

        const response = await requestVacation(request, employee.id, { startDate, endDate });

        await expectApiError(response, ERRORS.VACATION_OVERLAP);
      });
    }
  }

  test("should return 404 when the employee does not exist", async ({ request }) => {
    await expectApiError(
      await requestVacation(request, MISSING_ID, { startDate: "2026-07-01", endDate: "2026-07-10" }),
      ERRORS.EMPLOYEE_NOT_FOUND
    );
  });

  test("should return 404 when the id is not numeric", async ({ request }) => {
    await expectApiError(
      await requestVacation(request, "abc", { startDate: "2026-07-01", endDate: "2026-07-10" }),
      ERRORS.EMPLOYEE_NOT_FOUND
    );
  });

  test("should require the employee id", async ({ request }) => {
    await expectApiError(
      await requestVacation(request, "%20", { startDate: "2026-07-01", endDate: "2026-07-10" }),
      ERRORS.EMPLOYEE_ID_MANDATORY
    );
  });

  test("should reject vacations for an employee created as inactive", async ({ request, makeEmployee }) => {
    const inactive = await makeEmployee({ status: "inactivo" });

    await expectApiError(
      await requestVacation(request, inactive.id, { startDate: "2026-07-01", endDate: "2026-07-10" }),
      ERRORS.EMPLOYEE_INACTIVE
    );
  });

  test("should reject vacations for an employee deactivated later", async ({ request, employee }) => {
    await updateEmployee(request, employee.id, { status: "inactivo" });

    await expectApiError(
      await requestVacation(request, employee.id, { startDate: "2026-07-01", endDate: "2026-07-10" }),
      ERRORS.EMPLOYEE_INACTIVE
    );
  });

  const invalidDates = [
    ["an end date before the start date", { startDate: "2026-07-10", endDate: "2026-07-01" }],
    ["a start date with the wrong format", { startDate: "01/07/2026", endDate: "2026-07-10" }],
    ["an end date with the wrong format", { startDate: "2026-07-01", endDate: "10-07-2026" }],
    ["a date that does not exist", { startDate: "2026-02-30", endDate: "2026-03-05" }],
    ["a missing end date", { startDate: "2026-07-01" }],
    ["a missing start date", { endDate: "2026-07-10" }],
    ["an empty body", {}],
  ] as const;

  for (const [name, data] of invalidDates) {
    test(`should reject ${name}`, async ({ request, employee }) => {
      await expectApiError(await requestVacation(request, employee.id, data), ERRORS.VACATION_DATES_INVALID);
    });
  }
});
