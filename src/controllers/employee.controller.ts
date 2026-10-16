import { Request, Response } from "express";
import {
  CreateEmployeeRequestDTO,
  EmployeeResponseDTO,
  RequestVacationDTO,
  ResolveVacationDTO,
  UpdateEmployeeRequestDTO,
  VacationResponseDTO,
} from "../dto/employee.dto";
import { IEmployeeService } from "../services/interfaces/employee.interface";

export class EmployeeController {
  constructor(readonly employeeService: IEmployeeService) {}

  createEmployee = async (req: Request, res: Response): Promise<void> => {
    const request = req.body as CreateEmployeeRequestDTO;

    const result: EmployeeResponseDTO =
      await this.employeeService.createEmployee(request);

    res.status(201).json(result);
  };

  getEmployee = async (req: Request, res: Response): Promise<void> => {
    const employeeId = req.params.id as string;
    const result: EmployeeResponseDTO = await this.employeeService.getEmployee(employeeId);
    res.status(200).json(result);
  };

  updateEmployee = async (req: Request, res: Response): Promise<void> => {
    const request = req.body as UpdateEmployeeRequestDTO;
    const employeeId = req.params.id as string;
    const result: EmployeeResponseDTO = await this.employeeService.updateEmployee(
      employeeId,
      request
    );
    res.status(200).json(result);
  };

  requestVacation = async (req: Request, res: Response): Promise<void> => {
    const request = req.body as RequestVacationDTO;
    const employeeId = req.params.id as string;
    const result: VacationResponseDTO = await this.employeeService.requestVacation(
      employeeId,
      request
    );
    res.status(201).json(result);
  };

  resolveVacation = async (req: Request, res: Response): Promise<void> => {
    const request = req.body as ResolveVacationDTO;
    const vacationId = req.params.id as string;
    const result: VacationResponseDTO = await this.employeeService.resolveVacation(
      vacationId,
      request
    );
    res.status(200).json(result);
  };
}
