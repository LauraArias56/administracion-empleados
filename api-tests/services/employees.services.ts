import { APIRequestContext, APIResponse } from "@playwright/test";

export async function createEmployee(
  request: APIRequestContext,
  data: unknown
): Promise<APIResponse> {
  return await request.post("v1/employees", { data });
}

export async function getEmployee(
  request: APIRequestContext,
  employeeId: string
): Promise<APIResponse> {
  return await request.get(`v1/employees/${employeeId}`);
}

export async function updateEmployee(
  request: APIRequestContext,
  employeeId: string,
  data: unknown
): Promise<APIResponse> {
  return await request.patch(`v1/employees/${employeeId}`, { data });
}

export async function requestVacation(
  request: APIRequestContext,
  employeeId: string,
  data: unknown
): Promise<APIResponse> {
  return await request.post(`v1/employees/${employeeId}/vacations`, { data });
}
