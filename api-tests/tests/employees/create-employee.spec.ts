import { APIResponse } from "@playwright/test";
import { test, expect } from "../../fixtures/employee.fixture";
import { createEmployee, getEmployee } from "../../services/employees.services";
import { ERRORS, ExpectedError, expectApiError } from "../../support/errors";
import { uniqueDocument, validEmployee, without } from "../../support/test-data";

test.describe("POST /api/v1/employees", () => {
  test("should create an employee with default status and contract status", async ({ request }) => {
    const payload = validEmployee();
    let response: APIResponse;

    await test.step("send a valid employee", async () => {
      response = await createEmployee(request, payload);
    });

    await test.step("validate HTTP status code", async () => {
      expect(response.status()).toBe(201);
      expect(response.headers()["content-type"]).toContain("application/json");
    });

    await test.step("validate response body", async () => {
      const body = await response.json();

      expect(typeof body.id).toBe("string");
      expect(body.id).toMatch(/^[1-9]\d*$/);
      expect(body).toEqual({
        id: body.id,
        document: payload.document,
        firstName: "Laura",
        lastName: "Gomez",
        fullName: "Laura Gomez",
        position: "Analista",
        salary: 2500000,
        status: "activo",
        contract: { startDate: "2026-01-15", type: "indefinido", status: "vigente" },
        history: [],
      });
    });
  });

  test("should store the employee so it can be queried afterwards", async ({ request }) => {
    const created = await (await createEmployee(request, validEmployee())).json();

    const response = await getEmployee(request, created.id);

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual(created);
  });

  test("should assign a different id to each employee", async ({ makeEmployee }) => {
    const first = await makeEmployee();
    const second = await makeEmployee();

    expect(first.id).not.toBe(second.id);
  });

  test("should trim text fields and build the full name", async ({ request }) => {
    const document = uniqueDocument();

    const response = await createEmployee(
      request,
      validEmployee({
        document: `  ${document}  `,
        firstName: "  Laura ",
        lastName: " Gomez  ",
        position: "  Analista ",
      })
    );

    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({
      document,
      firstName: "Laura",
      lastName: "Gomez",
      fullName: "Laura Gomez",
      position: "Analista",
    });
  });

  test("should accept an explicit employment status and contract status", async ({ request }) => {
    const response = await createEmployee(
      request,
      validEmployee({
        status: "inactivo",
        contract: { startDate: "2025-03-01", type: "fijo", status: "finalizado" },
      })
    );

    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({
      status: "inactivo",
      contract: { startDate: "2025-03-01", type: "fijo", status: "finalizado" },
    });
  });

  for (const type of ["indefinido", "fijo", "obra_labor"]) {
    test(`should accept the contract type ${type}`, async ({ request }) => {
      const response = await createEmployee(
        request,
        validEmployee({ contract: { startDate: "2026-02-01", type } })
      );

      expect(response.status()).toBe(201);
      expect((await response.json()).contract.type).toBe(type);
    });
  }

  for (const salary of [0, 1234.5]) {
    test(`should accept a salary of ${salary}`, async ({ request }) => {
      const response = await createEmployee(request, validEmployee({ salary }));

      expect(response.status()).toBe(201);
      expect((await response.json()).salary).toBe(salary);
    });
  }

  test("should reject a duplicated document and keep the original employee", async ({
    request,
    employee,
  }) => {
    const response = await createEmployee(
      request,
      validEmployee({ document: employee.document, firstName: "Otra", lastName: "Persona" })
    );

    await expectApiError(response, ERRORS.DOCUMENT_ALREADY_EXISTS);

    const original = await (await getEmployee(request, employee.id)).json();
    expect(original).toEqual(employee);
  });

  test("should not create two employees with the same document at the same time", async ({
    request,
  }) => {
    const payload = validEmployee();

    const responses = await Promise.all([
      createEmployee(request, payload),
      createEmployee(request, payload),
    ]);

    const statuses = responses.map((response) => response.status()).sort();
    expect(statuses).toEqual([201, 409]);
  });

  const validationCases: Array<[string, (valid: ReturnType<typeof validEmployee>) => unknown, ExpectedError]> = [
    ["an empty document", (v) => ({ ...v, document: "" }), ERRORS.DOCUMENT_REQUIRED],
    ["a blank document", (v) => ({ ...v, document: "   " }), ERRORS.DOCUMENT_REQUIRED],
    ["a missing document", (v) => without(v, "document"), ERRORS.DOCUMENT_REQUIRED],
    ["an empty first name", (v) => ({ ...v, firstName: "" }), ERRORS.FIRST_NAME_REQUIRED],
    ["a missing first name", (v) => without(v, "firstName"), ERRORS.FIRST_NAME_REQUIRED],
    ["a first name shorter than 3 characters", (v) => ({ ...v, firstName: "Al" }), ERRORS.FIRST_NAME_TOO_SHORT],
    ["a first name that is too short once trimmed", (v) => ({ ...v, firstName: "  Al " }), ERRORS.FIRST_NAME_TOO_SHORT],
    ["an empty last name", (v) => ({ ...v, lastName: "" }), ERRORS.LAST_NAME_REQUIRED],
    ["a missing last name", (v) => without(v, "lastName"), ERRORS.LAST_NAME_REQUIRED],
    ["a blank position", (v) => ({ ...v, position: " " }), ERRORS.POSITION_REQUIRED],
    ["a missing position", (v) => without(v, "position"), ERRORS.POSITION_REQUIRED],
    ["a negative salary", (v) => ({ ...v, salary: -1 }), ERRORS.SALARY_INVALID],
    ["a salary sent as text", (v) => ({ ...v, salary: "2500000" }), ERRORS.SALARY_INVALID],
    ["a null salary", (v) => ({ ...v, salary: null }), ERRORS.SALARY_INVALID],
    ["a missing salary", (v) => without(v, "salary"), ERRORS.SALARY_INVALID],
    ["an unknown employment status", (v) => ({ ...v, status: "suspendido" }), ERRORS.EMPLOYMENT_STATUS_INVALID],
    ["a missing contract", (v) => without(v, "contract"), ERRORS.CONTRACT_TYPE_INVALID],
    [
      "an unknown contract type",
      (v) => ({ ...v, contract: { startDate: "2026-01-15", type: "temporal" } }),
      ERRORS.CONTRACT_TYPE_INVALID,
    ],
    [
      "a missing contract type",
      (v) => ({ ...v, contract: { startDate: "2026-01-15" } }),
      ERRORS.CONTRACT_TYPE_INVALID,
    ],
    [
      "an unknown contract status",
      (v) => ({ ...v, contract: { startDate: "2026-01-15", type: "fijo", status: "cancelado" } }),
      ERRORS.CONTRACT_STATUS_INVALID,
    ],
    [
      "a contract date with the wrong format",
      (v) => ({ ...v, contract: { startDate: "15/01/2026", type: "fijo" } }),
      ERRORS.CONTRACT_DATE_INVALID,
    ],
    [
      "a contract date that does not exist",
      (v) => ({ ...v, contract: { startDate: "2026-02-30", type: "fijo" } }),
      ERRORS.CONTRACT_DATE_INVALID,
    ],
    [
      "a contract date with an invalid month",
      (v) => ({ ...v, contract: { startDate: "2026-13-01", type: "fijo" } }),
      ERRORS.CONTRACT_DATE_INVALID,
    ],
    [
      "a missing contract date",
      (v) => ({ ...v, contract: { type: "fijo" } }),
      ERRORS.CONTRACT_DATE_INVALID,
    ],
  ];

  for (const [name, build, expected] of validationCases) {
    test(`should reject ${name}`, async ({ request }) => {
      const valid = validEmployee();

      const response = await createEmployee(request, build(valid));

      await expectApiError(response, expected);

      // Si el documento era válido, no debe haberse guardado nada con él.
      if (typeof valid.document === "string" && expected.code !== ERRORS.DOCUMENT_REQUIRED.code) {
        const retry = await createEmployee(request, valid);
        expect(retry.status()).toBe(201);
      }
    });
  }

  test("should respond with a client error when the body is not valid JSON", async ({ request }) => {
    const response = await request.post("v1/employees", {
      headers: { "content-type": "application/json" },
      data: "{ esto no es json",
    });

    expect(response.status()).toBe(400);
  });
});
