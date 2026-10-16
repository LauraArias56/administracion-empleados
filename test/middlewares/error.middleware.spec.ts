import { describe, expect, it, vi } from "vitest";
import { Request, Response } from "express";
import { AppException } from "../../src/exceptions/app.exception";
import { errorMiddleware } from "../../src/middlewares/error.middleware";

function createResponse(headersSent = false) {
  return {
    headersSent,
    statusCode: 0,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.payload = body;
      return this;
    },
  };
}

describe("errorMiddleware", () => {
  it("should respond with the application error", () => {
    const response = createResponse();
    const error = new AppException("EMPLOYEE_NOT_FOUND", 404, "Empleado no encontrado");

    errorMiddleware(
      error,
      {} as Request,
      response as unknown as Response,
      vi.fn()
    );

    expect(response.statusCode).toBe(404);
    expect(response.payload).toEqual({
      code: "EMPLOYEE_NOT_FOUND",
      message: "Empleado no encontrado",
    });
  });

  it("should use status when statusCode is missing", () => {
    const response = createResponse();

    errorMiddleware(
      { status: 422, code: "USER_INVALID_DATA", message: "Datos inválidos" },
      {} as Request,
      response as unknown as Response,
      vi.fn()
    );

    expect(response.statusCode).toBe(422);
    expect(response.payload).toEqual({
      code: "USER_INVALID_DATA",
      message: "Datos inválidos",
    });
  });

  it("should respond 500 when the error has no status", () => {
    const response = createResponse();

    errorMiddleware({}, {} as Request, response as unknown as Response, vi.fn());

    expect(response.statusCode).toBe(500);
    expect(response.payload).toEqual({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
    });
  });

  it("should do nothing when the response was already sent", () => {
    const response = createResponse(true);

    errorMiddleware(
      new AppException("EMPLOYEE_NOT_FOUND", 404, "Empleado no encontrado"),
      {} as Request,
      response as unknown as Response,
      vi.fn()
    );

    expect(response.statusCode).toBe(0);
    expect(response.payload).toBeUndefined();
  });
});
