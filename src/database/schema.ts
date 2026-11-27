import { ContractStatus, ContractType, EmploymentStatus, HistoryEntryDTO, VacationStatus } from "../dto/employee.dto";
export interface EmployeeRecord {
  id: string; document: string; firstName: string; lastName: string; fullName: string; position: string; salary: number;
  status: EmploymentStatus;
  contract: { startDate: string; type: ContractType; status: ContractStatus };
  history: HistoryEntryDTO[];
}
export interface VacationRecord { id: string; employeeId: string; startDate: string; endDate: string; status: VacationStatus; }
