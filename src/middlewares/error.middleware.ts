import { Request, Response, NextFunction } from "express";

interface HttpError {
  code?: string;
  status?: number;
  statusCode?: number;
  message?: string;
}

export const errorMiddleware = (
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (res.headersSent) {
    return;
  }

  console.error(err);
  const status = err.statusCode || err.status || 500;

  res.status(status).json({
    code: err.code || "INTERNAL_SERVER_ERROR",
    message: err.message || "Internal Server Error",
  });
};
