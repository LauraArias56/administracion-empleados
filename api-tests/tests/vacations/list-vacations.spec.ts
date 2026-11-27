import { test, expect } from "../../fixtures/employee.fixture";
import { listVacations } from "../../services/vacations.services";

test.describe("GET /api/v1/vacations", () => {
  test("should return the vacation requests stored in PostgreSQL", async ({ request, employee, makeVacation }) => {
    const vacation = await makeVacation(employee.id, "2026-09-01", "2026-09-02");
    const response = await listVacations(request);

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
    const body = await response.json();
    expect(body).toEqual(expect.arrayContaining([vacation]));
  });
});
