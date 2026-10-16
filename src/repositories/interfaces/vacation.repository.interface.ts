import { VacationRecord } from "../../database/schema";

export type NewVacation = Omit<VacationRecord, "id">;

export interface IVacationRepository {
  findById(id: string): Promise<VacationRecord | null>;
  findByEmployeeId(employeeId: string): Promise<VacationRecord[]>;
  /** Asigna el id de la solicitud. */
  create(vacation: NewVacation): Promise<VacationRecord>;
  /** Lanza VACATION_NOT_FOUND si la solicitud no existe. */
  update(vacation: VacationRecord): Promise<VacationRecord>;
}
