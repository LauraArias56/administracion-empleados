import { test as base, expect } from "@playwright/test";
import type { EmployeeResponseDTO, VacationResponseDTO } from "../../src/dto/employee.dto";
import { createEmployee, requestVacation } from "../services/employees.services";
import { resolveVacation } from "../services/vacations.services";
import { validEmployee } from "../support/test-data";

interface Fixtures {
  /** Crea un empleado nuevo (documento único) vía la API real y lo devuelve. */
  makeEmployee: (overrides?: Record<string, unknown>) => Promise<EmployeeResponseDTO>;
  /** Empleado activo recién creado para esta prueba. */
  employee: EmployeeResponseDTO;
  /** Solicita vacaciones y, si se indica, las resuelve; devuelve la solicitud final. */
  makeVacation: (
    employeeId: string,
    startDate: string,
    endDate: string,
    decision?: "aprobar" | "rechazar"
  ) => Promise<VacationResponseDTO>;
}

export const test = base.extend<Fixtures>({
  makeEmployee: async ({ request }, use) => {
    await use(async (overrides = {}) => {
      const response = await createEmployee(request, validEmployee(overrides));
      expect(response.status(), await response.text()).toBe(201);
      return (await response.json()) as EmployeeResponseDTO;
    });
  },

  employee: async ({ makeEmployee }, use) => {
    await use(await makeEmployee());
  },

  makeVacation: async ({ request }, use) => {
    await use(async (employeeId, startDate, endDate, decision) => {
      const created = await requestVacation(request, employeeId, { startDate, endDate });
      expect(created.status(), await created.text()).toBe(201);
      let vacation = (await created.json()) as VacationResponseDTO;

      if (decision) {
        const resolved = await resolveVacation(request, vacation.id, { decision });
        expect(resolved.status(), await resolved.text()).toBe(200);
        vacation = (await resolved.json()) as VacationResponseDTO;
      }
      return vacation;
    });
  },
});

export { expect };
