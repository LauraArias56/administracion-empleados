import {
  ContractStatus,
  ContractType,
  CreateEmployeeRequestDTO,
  EmployeeResponseDTO,
  EmploymentStatus,
  RequestVacationDTO,
  ResolveVacationDTO,
  UpdateEmployeeRequestDTO,
  VacationResponseDTO,
} from "../dto/employee.dto";
import { EmployeeRecord, VacationRecord } from "../database/schema";
import { AppException } from "../exceptions/app.exception";
import { AppError } from "../exceptions/errors/app.error";
import { IEmployeeRepository } from "../repositories/interfaces/employee.repository.interface";
import { IVacationRepository } from "../repositories/interfaces/vacation.repository.interface";
import { IEmployeeService } from "./interfaces/employee.interface";

const CONTRACT_TYPES: ContractType[] = ["indefinido", "fijo", "obra_labor"];
const CONTRACT_STATUSES: ContractStatus[] = ["vigente", "finalizado"];
const EMPLOYMENT_STATUSES: EmploymentStatus[] = ["activo", "inactivo"];

export class EmployeeService implements IEmployeeService {
  constructor(
    private readonly employeeRepository: IEmployeeRepository,
    private readonly vacationRepository: IVacationRepository
  ) {}

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

    const duplicated = await this.employeeRepository.findByDocument(document);
    if (duplicated) {
      this.fail(AppError.DOCUMENT_ALREADY_EXISTS);
    }

    const employee = await this.employeeRepository.create({
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
    });

    return this.toEmployeeResponse(employee);
  }

  async getEmployee(id: string): Promise<EmployeeResponseDTO> {
    return this.toEmployeeResponse(await this.findEmployee(id));
  }

  async updateEmployee(
    id: string,
    request: UpdateEmployeeRequestDTO
  ): Promise<EmployeeResponseDTO> {
    const employee = await this.findEmployee(id);
    const changedAt = new Date().toISOString().slice(0, 10);

    let changed = false;
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
      changed = true;
    }

    if (request.salary !== undefined && request.salary !== employee.salary) {
      employee.history.push({
        type: "salario",
        previousValue: String(employee.salary),
        newValue: String(request.salary),
        changedAt,
      });
      employee.salary = request.salary;
      changed = true;
    }

    if (request.status !== undefined && request.status !== employee.status) {
      employee.history.push({
        type: "estado",
        previousValue: employee.status,
        newValue: request.status,
        changedAt,
      });
      employee.status = request.status;
      changed = true;
    }

    if (!changed) {
      return this.toEmployeeResponse(employee);
    }

    const saved = await this.employeeRepository.update(employee);
    return this.toEmployeeResponse(saved);
  }

  async requestVacation(
    employeeId: string,
    request: RequestVacationDTO
  ): Promise<VacationResponseDTO> {
    const employee = await this.findEmployee(employeeId);

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

    const employeeVacations = await this.vacationRepository.findByEmployeeId(employee.id);
    const overlap = employeeVacations.find(
      (vacation) =>
        vacation.status !== "rechazada" &&
        request.startDate <= vacation.endDate &&
        vacation.startDate <= request.endDate
    );

    if (overlap) {
      this.fail(AppError.VACATION_OVERLAP);
    }

    const vacation = await this.vacationRepository.create({
      employeeId: employee.id,
      startDate: request.startDate,
      endDate: request.endDate,
      status: "pendiente",
    });

    return this.toVacationResponse(vacation);
  }

  async resolveVacation(
    vacationId: string,
    request: ResolveVacationDTO
  ): Promise<VacationResponseDTO> {
    if (!vacationId || vacationId.trim() === "") {
      this.fail(AppError.VACATION_ID_MANDATORY);
    }

    const vacation = await this.vacationRepository.findById(vacationId);
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

    const saved = await this.vacationRepository.update(vacation);
    return this.toVacationResponse(saved);
  }

  private async findEmployee(id: string): Promise<EmployeeRecord> {
    if (!id || id.trim() === "") {
      this.fail(AppError.EMPLOYEE_ID_MANDATORY);
    }

    const employee = await this.employeeRepository.findById(id);
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

  private toEmployeeResponse(employee: EmployeeRecord): EmployeeResponseDTO {
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

  private toVacationResponse(vacation: VacationRecord): VacationResponseDTO {
    return {
      id: vacation.id,
      employeeId: vacation.employeeId,
      startDate: vacation.startDate,
      endDate: vacation.endDate,
      status: vacation.status,
    };
  }

  private fail(error: { code: string; statusCode: number; message: string }): never {
    throw new AppException(error.code, error.statusCode, error.message);
  }
}
