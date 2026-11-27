import { test, expect } from "../../fixtures/employee.fixture";
import { listEmployees } from "../../services/employees.services";

test.describe("GET /api/v1/employees", () => {
  test("should return the employees stored in SQLite", async ({ request, employee }) => {
    const response = await listEmployees(request);

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toEqual(expect.arrayContaining([employee]));
  });
});
