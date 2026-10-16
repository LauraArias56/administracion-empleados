export type EmploymentStatus = "activo" | "inactivo";
export type ContractType = "indefinido" | "fijo" | "obra_labor";
export type ContractStatus = "vigente" | "finalizado";
export type VacationStatus = "pendiente" | "aprobada" | "rechazada";
export type VacationDecision = "aprobar" | "rechazar";
export type HistoryType = "cargo" | "salario" | "estado";

export interface ContractDTO {
  startDate: string;
  type: ContractType;
  status: ContractStatus;
}

export interface HistoryEntryDTO {
  type: HistoryType;
  previousValue: string;
  newValue: string;
  changedAt: string;
}

export interface CreateEmployeeRequestDTO {
  document: string;
  firstName: string;
  lastName: string;
  position: string;
  salary: number;
  status?: EmploymentStatus;
  contract: {
    startDate: string;
    type: ContractType;
    status?: ContractStatus;
  };
}

export interface UpdateEmployeeRequestDTO {
  position?: string;
  salary?: number;
  status?: EmploymentStatus;
}

export interface EmployeeResponseDTO {
  id: string;
  document: string;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string;
  salary: number;
  status: EmploymentStatus;
  contract: ContractDTO;
  history: HistoryEntryDTO[];
}

export interface RequestVacationDTO {
  startDate: string;
  endDate: string;
}

export interface VacationResponseDTO {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: VacationStatus;
}

export interface ResolveVacationDTO {
  decision: VacationDecision;
}
