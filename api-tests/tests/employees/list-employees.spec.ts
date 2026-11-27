import { test, expect } from "../../fixtures/employee.fixture";
import { listEmployees, updateEmployee } from "../../services/employees.services";

test.describe("GET /api/v1/employees", () => {
  test("should return employees with and without history", async ({ request, employee, makeEmployee }) => {
    const anotherEmployee = await makeEmployee();
    const updated = await updateEmployee(request, anotherEmployee.id, {
      position: "Líder de pruebas",
      salary: anotherEmployee.salary + 100000,
    });
    expect(updated.status(), await updated.text()).toBe(200);
    const employeeWithHistory = await updated.json();

    const response = await listEmployees(request);

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toEqual(expect.arrayContaining([employee, employeeWithHistory]));
  });
});
