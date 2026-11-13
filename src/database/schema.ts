import {
  ContractStatus,
  ContractType,
  EmploymentStatus,
  HistoryEntryDTO,
  VacationStatus,
} from "../dto/employee.dto";

export interface EmployeeRecord {
  id: string;
  document: string;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string;
  salary: number;
  status: EmploymentStatus;
  contract: {
    startDate: string;
    type: ContractType;
    status: ContractStatus;
  };
  history: HistoryEntryDTO[];
}

export interface VacationRecord {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: VacationStatus;
}

/**
 * Estructura del archivo JSON de la versión anterior. Ya no es la persistencia
 * de la aplicación (ahora es SQLite, ver `sqlite-schema.ts`); se conserva solo
 * para poder leer ese archivo en la migración (`json-migration.ts`).
 * `sequences` guarda el último id entregado.
 */
export interface DatabaseSchema {
  sequences: {
    employees: number;
    vacations: number;
  };
  employees: EmployeeRecord[];
  vacations: VacationRecord[];
}

export const createEmptyDatabase = (): DatabaseSchema => ({
  sequences: { employees: 0, vacations: 0 },
  employees: [],
  vacations: [],
});
