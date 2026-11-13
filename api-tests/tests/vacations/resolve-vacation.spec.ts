import { test, expect } from "../../fixtures/employee.fixture";
import { getEmployee, requestVacation } from "../../services/employees.services";
import { resolveVacation } from "../../services/vacations.services";
import { ERRORS, MISSING_ID, expectApiError } from "../../support/errors";

test.describe("PATCH /api/v1/vacations/:id", () => {
  test("should approve a pending vacation", async ({ request, employee, makeVacation }) => {
    const vacation = await makeVacation(employee.id, "2026-07-01", "2026-07-10");

    const response = await resolveVacation(request, vacation.id, { decision: "aprobar" });

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(await response.json()).toEqual({
      id: vacation.id,
      employeeId: employee.id,
      startDate: "2026-07-01",
      endDate: "2026-07-10",
      status: "aprobada",
    });
  });

  test("should reject a pending vacation", async ({ request, employee, makeVacation }) => {
    const vacation = await makeVacation(employee.id, "2026-07-01", "2026-07-10");

    const response = await resolveVacation(request, vacation.id, { decision: "rechazar" });

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ id: vacation.id, status: "rechazada" });
  });

  test("should keep the dates blocked after approving", async ({ request, employee, makeVacation }) => {
    const vacation = await makeVacation(employee.id, "2026-07-01", "2026-07-10");
    await resolveVacation(request, vacation.id, { decision: "aprobar" });

    const response = await requestVacation(request, employee.id, {
      startDate: "2026-07-05",
      endDate: "2026-07-06",
    });

    await expectApiError(response, ERRORS.VACATION_OVERLAP);
  });

  test("should free the dates after rejecting", async ({ request, employee, makeVacation }) => {
    const vacation = await makeVacation(employee.id, "2026-07-01", "2026-07-10");
    await resolveVacation(request, vacation.id, { decision: "rechazar" });

    const response = await requestVacation(request, employee.id, {
      startDate: "2026-07-05",
      endDate: "2026-07-06",
    });

    expect(response.status()).toBe(201);
  });

  test("should not change the employee", async ({ request, employee, makeVacation }) => {
    const vacation = await makeVacation(employee.id, "2026-07-01", "2026-07-10");
    await resolveVacation(request, vacation.id, { decision: "aprobar" });

    const stored = await (await getEmployee(request, employee.id)).json();

    expect(stored).toEqual(employee);
  });

  const resolvedCases = [
    ["approved", "aprobar", "aprobar"],
    ["approved", "aprobar", "rechazar"],
    ["rejected", "rechazar", "aprobar"],
    ["rejected", "rechazar", "rechazar"],
  ] as const;

  for (const [state, first, second] of resolvedCases) {
    test(`should not allow to ${second} a vacation already ${state}`, async ({
      request,
      employee,
      makeVacation,
    }) => {
      const vacation = await makeVacation(employee.id, "2026-07-01", "2026-07-10", first);

      const response = await resolveVacation(request, vacation.id, { decision: second });

      await expectApiError(response, ERRORS.VACATION_ALREADY_RESOLVED);
    });
  }

  test("should return 404 when the vacation does not exist", async ({ request }) => {
    await expectApiError(
      await resolveVacation(request, MISSING_ID, { decision: "aprobar" }),
      ERRORS.VACATION_NOT_FOUND
    );
  });

  test("should return 404 when the id is not numeric", async ({ request }) => {
    await expectApiError(
      await resolveVacation(request, "abc", { decision: "aprobar" }),
      ERRORS.VACATION_NOT_FOUND
    );
  });

  test("should require the vacation id", async ({ request }) => {
    await expectApiError(
      await resolveVacation(request, "%20", { decision: "aprobar" }),
      ERRORS.VACATION_ID_MANDATORY
    );
  });

  const invalidDecisions = [
    ["an unknown decision", { decision: "cancelar" }],
    ["a decision with different case", { decision: "APROBAR" }],
    ["a missing decision", {}],
    ["a null decision", { decision: null }],
  ] as const;

  for (const [name, data] of invalidDecisions) {
    test(`should reject ${name} and keep the vacation pending`, async ({
      request,
      employee,
      makeVacation,
    }) => {
      const vacation = await makeVacation(employee.id, "2026-07-01", "2026-07-10");

      await expectApiError(await resolveVacation(request, vacation.id, data), ERRORS.DECISION_INVALID);

      const retry = await resolveVacation(request, vacation.id, { decision: "aprobar" });
      expect(retry.status()).toBe(200);
      expect((await retry.json()).status).toBe("aprobada");
    });
  }
});
