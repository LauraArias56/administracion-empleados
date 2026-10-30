import { APIResponse, expect } from "@playwright/test";

export interface ExpectedError {
  status: number;
  code: string;
  message: string;
}

/** Contrato de errores de la API, escrito a mano a propósito (no se importa de src). */
export const ERRORS = {
  DOCUMENT_REQUIRED: { status: 400, code: "DOCUMENT_REQUIRED", message: "El documento es obligatorio" },
  FIRST_NAME_REQUIRED: { status: 400, code: "FIRST_NAME_REQUIRED", message: "El nombre es obligatorio" },
  FIRST_NAME_TOO_SHORT: {
    status: 400,
    code: "FIRST_NAME_TOO_SHORT",
    message: "El nombre debe tener al menos 3 caracteres",
  },
  LAST_NAME_REQUIRED: { status: 400, code: "LAST_NAME_REQUIRED", message: "El apellido es obligatorio" },
  POSITION_REQUIRED: { status: 400, code: "POSITION_REQUIRED", message: "El cargo es obligatorio" },
  SALARY_INVALID: {
    status: 400,
    code: "SALARY_INVALID",
    message: "El salario debe ser un número mayor o igual a cero",
  },
  EMPLOYMENT_STATUS_INVALID: {
    status: 400,
    code: "EMPLOYMENT_STATUS_INVALID",
    message: "El estado laboral no es válido",
  },
  CONTRACT_TYPE_INVALID: {
    status: 400,
    code: "CONTRACT_TYPE_INVALID",
    message: "El tipo de contrato no es válido",
  },
  CONTRACT_STATUS_INVALID: {
    status: 400,
    code: "CONTRACT_STATUS_INVALID",
    message: "El estado del contrato no es válido",
  },
  CONTRACT_DATE_INVALID: {
    status: 400,
    code: "CONTRACT_DATE_INVALID",
    message: "La fecha de inicio del contrato no es válida",
  },
  DOCUMENT_ALREADY_EXISTS: {
    status: 409,
    code: "DOCUMENT_ALREADY_EXISTS",
    message: "Ya existe un empleado con ese documento",
  },
  EMPLOYEE_ID_MANDATORY: {
    status: 400,
    code: "EMPLOYEE_ID_MANDATORY",
    message: "El id del empleado es obligatorio",
  },
  EMPLOYEE_NOT_FOUND: { status: 404, code: "EMPLOYEE_NOT_FOUND", message: "Empleado no encontrado" },
  EMPLOYEE_INACTIVE: { status: 409, code: "EMPLOYEE_INACTIVE", message: "El empleado no está activo" },
  VACATION_DATES_INVALID: {
    status: 400,
    code: "VACATION_DATES_INVALID",
    message: "Las fechas de vacaciones no son válidas",
  },
  VACATION_OVERLAP: {
    status: 409,
    code: "VACATION_OVERLAP",
    message: "Las vacaciones se solapan con otra solicitud",
  },
  VACATION_ID_MANDATORY: {
    status: 400,
    code: "VACATION_ID_MANDATORY",
    message: "El id de la vacación es obligatorio",
  },
  VACATION_NOT_FOUND: {
    status: 404,
    code: "VACATION_NOT_FOUND",
    message: "Solicitud de vacaciones no encontrada",
  },
  VACATION_ALREADY_RESOLVED: {
    status: 409,
    code: "VACATION_ALREADY_RESOLVED",
    message: "La solicitud de vacaciones ya fue resuelta",
  },
  DECISION_INVALID: {
    status: 400,
    code: "DECISION_INVALID",
    message: "La decisión debe ser aprobar o rechazar",
  },
} satisfies Record<string, ExpectedError>;

/** Verifica código HTTP y cuerpo `{ code, message }` de una respuesta de error. */
export async function expectApiError(response: APIResponse, error: ExpectedError): Promise<void> {
  expect(response.status()).toBe(error.status);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(await response.json()).toEqual({ code: error.code, message: error.message });
}

/** Id con formato válido que nunca existe en la base de pruebas (que empieza vacía). */
export const MISSING_ID = "999999999";
