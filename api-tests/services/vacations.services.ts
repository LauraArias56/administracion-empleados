import { APIRequestContext, APIResponse } from "@playwright/test";

export async function resolveVacation(
  request: APIRequestContext,
  vacationId: string,
  data: unknown
): Promise<APIResponse> {
  return await request.patch(`v1/vacations/${vacationId}`, { data });
}
