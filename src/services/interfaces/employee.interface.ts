import {
  CreateEmployeeRequestDTO,
  EmployeeResponseDTO,
  RequestVacationDTO,
  ResolveVacationDTO,
  UpdateEmployeeRequestDTO,
  VacationResponseDTO,
} from "../../dto/employee.dto";

export interface IEmployeeService {
  createEmployee(request: CreateEmployeeRequestDTO): Promise<EmployeeResponseDTO>;
  getEmployee(id: string): Promise<EmployeeResponseDTO>;
  updateEmployee(id: string, request: UpdateEmployeeRequestDTO): Promise<EmployeeResponseDTO>;
  requestVacation(employeeId: string, request: RequestVacationDTO): Promise<VacationResponseDTO>;
  resolveVacation(vacationId: string, request: ResolveVacationDTO): Promise<VacationResponseDTO>;
}
