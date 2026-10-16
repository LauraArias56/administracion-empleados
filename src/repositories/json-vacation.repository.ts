import { JsonDatabase } from "../database/json-database";
import { VacationRecord } from "../database/schema";
import { AppException } from "../exceptions/app.exception";
import { AppError } from "../exceptions/errors/app.error";
import { IVacationRepository, NewVacation } from "./interfaces/vacation.repository.interface";

export class JsonVacationRepository implements IVacationRepository {
  constructor(private readonly database: JsonDatabase) {}

  async findById(id: string): Promise<VacationRecord | null> {
    const data = await this.database.read();
    return data.vacations.find((vacation) => vacation.id === id) ?? null;
  }

  async findByEmployeeId(employeeId: string): Promise<VacationRecord[]> {
    const data = await this.database.read();
    return data.vacations.filter((vacation) => vacation.employeeId === employeeId);
  }

  create(newVacation: NewVacation): Promise<VacationRecord> {
    return this.database.transaction((data) => {
      data.sequences.vacations += 1;
      const vacation: VacationRecord = {
        ...newVacation,
        id: String(data.sequences.vacations),
      };

      data.vacations.push(vacation);
      return structuredClone(vacation);
    });
  }

  update(vacation: VacationRecord): Promise<VacationRecord> {
    return this.database.transaction((data) => {
      const index = data.vacations.findIndex((item) => item.id === vacation.id);
      if (index === -1) {
        throw new AppException(
          AppError.VACATION_NOT_FOUND.code,
          AppError.VACATION_NOT_FOUND.statusCode,
          AppError.VACATION_NOT_FOUND.message
        );
      }

      data.vacations[index] = structuredClone(vacation);
      return structuredClone(vacation);
    });
  }
}
