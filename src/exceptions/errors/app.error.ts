export const AppError = {
  DOCUMENT_REQUIRED: {
    code: "DOCUMENT_REQUIRED",
    statusCode: 400,
    message: "El documento es obligatorio",
  },
  FIRST_NAME_REQUIRED: {
    code: "FIRST_NAME_REQUIRED",
    statusCode: 400,
    message: "El nombre es obligatorio",
  },
  FIRST_NAME_TOO_SHORT: {
    code: "FIRST_NAME_TOO_SHORT",
    statusCode: 400,
    message: "El nombre debe tener al menos 3 caracteres",
  },
  LAST_NAME_REQUIRED: {
    code: "LAST_NAME_REQUIRED",
    statusCode: 400,
    message: "El apellido es obligatorio",
  },
  POSITION_REQUIRED: {
    code: "POSITION_REQUIRED",
    statusCode: 400,
    message: "El cargo es obligatorio",
  },
  SALARY_INVALID: {
    code: "SALARY_INVALID",
    statusCode: 400,
    message: "El salario debe ser un número mayor o igual a cero",
  },
  EMPLOYMENT_STATUS_INVALID: {
    code: "EMPLOYMENT_STATUS_INVALID",
    statusCode: 400,
    message: "El estado laboral no es válido",
  },
  CONTRACT_TYPE_INVALID: {
    code: "CONTRACT_TYPE_INVALID",
    statusCode: 400,
    message: "El tipo de contrato no es válido",
  },
  CONTRACT_STATUS_INVALID: {
    code: "CONTRACT_STATUS_INVALID",
    statusCode: 400,
    message: "El estado del contrato no es válido",
  },
  CONTRACT_DATE_INVALID: {
    code: "CONTRACT_DATE_INVALID",
    statusCode: 400,
    message: "La fecha de inicio del contrato no es válida",
  },
  DOCUMENT_ALREADY_EXISTS: {
    code: "DOCUMENT_ALREADY_EXISTS",
    statusCode: 409,
    message: "Ya existe un empleado con ese documento",
  },
  EMPLOYEE_ID_MANDATORY: {
    code: "EMPLOYEE_ID_MANDATORY",
    statusCode: 400,
    message: "El id del empleado es obligatorio",
  },
  EMPLOYEE_NOT_FOUND: {
    code: "EMPLOYEE_NOT_FOUND",
    statusCode: 404,
    message: "Empleado no encontrado",
  },
  EMPLOYEE_INACTIVE: {
    code: "EMPLOYEE_INACTIVE",
    statusCode: 409,
    message: "El empleado no está activo",
  },
  VACATION_DATES_INVALID: {
    code: "VACATION_DATES_INVALID",
    statusCode: 400,
    message: "Las fechas de vacaciones no son válidas",
  },
  VACATION_OVERLAP: {
    code: "VACATION_OVERLAP",
    statusCode: 409,
    message: "Las vacaciones se solapan con otra solicitud",
  },
  VACATION_ID_MANDATORY: {
    code: "VACATION_ID_MANDATORY",
    statusCode: 400,
    message: "El id de la vacación es obligatorio",
  },
  VACATION_NOT_FOUND: {
    code: "VACATION_NOT_FOUND",
    statusCode: 404,
    message: "Solicitud de vacaciones no encontrada",
  },
  VACATION_ALREADY_RESOLVED: {
    code: "VACATION_ALREADY_RESOLVED",
    statusCode: 409,
    message: "La solicitud de vacaciones ya fue resuelta",
  },
  DECISION_INVALID: {
    code: "DECISION_INVALID",
    statusCode: 400,
    message: "La decisión debe ser aprobar o rechazar",
  },
};
