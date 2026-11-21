import { APIRequestContext, APIResponse } from "@playwright/test";

export async function listVacations(request: APIRequestContext): Promise<APIResponse> {
  return await request.get("v1/vacations");
}

export async function resolveVacation(
  request: APIRequestContext,
  vacationId: string,
  data: unknown
): Promise<APIResponse> {
  return await request.patch(`v1/vacations/${vacationId}`, { data });
}
