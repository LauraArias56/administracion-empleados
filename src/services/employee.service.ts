import {
  ContractStatus,
  ContractType,
  CreateEmployeeRequestDTO,
  EmployeeResponseDTO,
  EmploymentStatus,
  HistoryEntryDTO,
  RequestVacationDTO,
  ResolveVacationDTO,
  UpdateEmployeeRequestDTO,
  VacationResponseDTO,
  VacationStatus,
} from "../dto/employee.dto";
import { AppException } from "../exceptions/app.exception";
import { AppError } from "../exceptions/errors/app.error";
import { IEmployeeService } from "./interfaces/employee.interface";

interface EmployeeRecord {
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

interface VacationRecord {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: VacationStatus;
}

const CONTRACT_TYPES: ContractType[] = ["indefinido", "fijo", "obra_labor"];
const CONTRACT_STATUSES: ContractStatus[] = ["vigente", "finalizado"];
const EMPLOYMENT_STATUSES: EmploymentStatus[] = ["activo", "inactivo"];

export class EmployeeService implements IEmployeeService {
  private employees: EmployeeRecord[] = [];
  private vacations: VacationRecord[] = [];
  private employeeSequence = 1;
  private vacationSequence = 1;

  async createEmployee(request: CreateEmployeeRequestDTO): Promise<EmployeeResponseDTO> {
    const document = this.requiredText(request.document, AppError.DOCUMENT_REQUIRED);
    const firstName = this.requiredText(request.firstName, AppError.FIRST_NAME_REQUIRED);
    const lastName = this.requiredText(request.lastName, AppError.LAST_NAME_REQUIRED);
    const position = this.requiredText(request.position, AppError.POSITION_REQUIRED);

    if (firstName.length < 3) {
      this.fail(AppError.FIRST_NAME_TOO_SHORT);
    }

    this.assertSalary(request.salary);

    const status = request.status ?? "activo";
    if (!EMPLOYMENT_STATUSES.includes(status)) {
      this.fail(AppError.EMPLOYMENT_STATUS_INVALID);
    }

    if (!request.contract) {
      this.fail(AppError.CONTRACT_TYPE_INVALID);
    }

    const contractType = request.contract.type;
    if (!CONTRACT_TYPES.includes(contractType)) {
      this.fail(AppError.CONTRACT_TYPE_INVALID);
    }

    const contractStatus = request.contract.status ?? "vigente";
    if (!CONTRACT_STATUSES.includes(contractStatus)) {
      this.fail(AppError.CONTRACT_STATUS_INVALID);
    }

    if (!this.isValidDate(request.contract.startDate)) {
      this.fail(AppError.CONTRACT_DATE_INVALID);
    }

    const duplicated = this.employees.find((employee) => employee.document === document);
    if (duplicated) {
      this.fail(AppError.DOCUMENT_ALREADY_EXISTS);
    }

    const employee: EmployeeRecord = {
      id: String(this.employeeSequence),
      document,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      position,
      salary: request.salary,
      status,
      contract: {
        startDate: request.contract.startDate,
        type: contractType,
        status: contractStatus,
      },
      history: [],
    };

    this.employeeSequence += 1;
    this.employees.push(employee);
    return this.cloneEmployee(employee);
  }

  async getEmployee(id: string): Promise<EmployeeResponseDTO> {
    return this.cloneEmployee(this.findEmployee(id));
  }

  async updateEmployee(
    id: string,
    request: UpdateEmployeeRequestDTO
  ): Promise<EmployeeResponseDTO> {
    const employee = this.findEmployee(id);
    const changedAt = new Date().toISOString().slice(0, 10);

    let nextPosition: string | undefined;
    if (request.position !== undefined) {
      nextPosition = this.requiredText(request.position, AppError.POSITION_REQUIRED);
    }

    if (request.salary !== undefined) {
      this.assertSalary(request.salary);
    }

    if (request.status !== undefined && !EMPLOYMENT_STATUSES.includes(request.status)) {
      this.fail(AppError.EMPLOYMENT_STATUS_INVALID);
    }

    if (nextPosition !== undefined && nextPosition !== employee.position) {
      employee.history.push({
        type: "cargo",
        previousValue: employee.position,
        newValue: nextPosition,
        changedAt,
      });
      employee.position = nextPosition;
    }

    if (request.salary !== undefined && request.salary !== employee.salary) {
      employee.history.push({
        type: "salario",
        previousValue: String(employee.salary),
        newValue: String(request.salary),
        changedAt,
      });
      employee.salary = request.salary;
    }

    if (request.status !== undefined && request.status !== employee.status) {
      employee.history.push({
        type: "estado",
        previousValue: employee.status,
        newValue: request.status,
        changedAt,
      });
      employee.status = request.status;
    }

    return this.cloneEmployee(employee);
  }

  async requestVacation(
    employeeId: string,
    request: RequestVacationDTO
  ): Promise<VacationResponseDTO> {
    const employee = this.findEmployee(employeeId);

    if (employee.status !== "activo") {
      this.fail(AppError.EMPLOYEE_INACTIVE);
    }

    if (
      !this.isValidDate(request.startDate) ||
      !this.isValidDate(request.endDate) ||
      request.endDate < request.startDate
    ) {
      this.fail(AppError.VACATION_DATES_INVALID);
    }

    const overlap = this.vacations.find(
      (vacation) =>
        vacation.employeeId === employee.id &&
        vacation.status !== "rechazada" &&
        request.startDate <= vacation.endDate &&
        vacation.startDate <= request.endDate
    );

    if (overlap) {
      this.fail(AppError.VACATION_OVERLAP);
    }

    const vacation: VacationRecord = {
      id: String(this.vacationSequence),
      employeeId: employee.id,
      startDate: request.startDate,
      endDate: request.endDate,
      status: "pendiente",
    };

    this.vacationSequence += 1;
    this.vacations.push(vacation);
    return { ...vacation };
  }

  async resolveVacation(
    vacationId: string,
    request: ResolveVacationDTO
  ): Promise<VacationResponseDTO> {
    if (!vacationId || vacationId.trim() === "") {
      this.fail(AppError.VACATION_ID_MANDATORY);
    }

    const vacation = this.vacations.find((item) => item.id === vacationId);
    if (!vacation) {
      this.fail(AppError.VACATION_NOT_FOUND);
    }

    if (vacation.status !== "pendiente") {
      this.fail(AppError.VACATION_ALREADY_RESOLVED);
    }

    if (request.decision === "aprobar") {
      vacation.status = "aprobada";
    } else if (request.decision === "rechazar") {
      vacation.status = "rechazada";
    } else {
      this.fail(AppError.DECISION_INVALID);
    }

    return { ...vacation };
  }

  private findEmployee(id: string): EmployeeRecord {
    if (!id || id.trim() === "") {
      this.fail(AppError.EMPLOYEE_ID_MANDATORY);
    }

    const employee = this.employees.find((item) => item.id === id);
    if (!employee) {
      this.fail(AppError.EMPLOYEE_NOT_FOUND);
    }

    return employee;
  }

  private requiredText(
    value: string,
    error: { code: string; statusCode: number; message: string }
  ): string {
    if (!value || value.trim() === "") {
      this.fail(error);
    }
    return value.trim();
  }

  private assertSalary(salary: number): void {
    if (typeof salary !== "number" || !Number.isFinite(salary) || salary < 0) {
      this.fail(AppError.SALARY_INVALID);
    }
  }

  private isValidDate(value: string): boolean {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }

  private cloneEmployee(employee: EmployeeRecord): EmployeeResponseDTO {
    return {
      id: employee.id,
      document: employee.document,
      firstName: employee.firstName,
      lastName: employee.lastName,
      fullName: employee.fullName,
      position: employee.position,
      salary: employee.salary,
      status: employee.status,
      contract: { ...employee.contract },
      history: employee.history.map((entry) => ({ ...entry })),
    };
  }

  private fail(error: { code: string; statusCode: number; message: string }): never {
    throw new AppException(error.code, error.statusCode, error.message);
  }
}
