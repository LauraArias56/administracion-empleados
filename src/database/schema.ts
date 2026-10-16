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
 * Estructura completa del archivo JSON.
 * `sequences` guarda el último id entregado para que los ids
 * no se repitan después de reiniciar el servidor.
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
