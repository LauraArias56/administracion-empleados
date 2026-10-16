export class AppException extends Error {
  public readonly status: number;

  constructor(
    public readonly code: string,
    public readonly statusCode: number = 400,
    message: string
  ) {
    super(message);
    this.status = statusCode;
    Object.setPrototypeOf(this, AppException.prototype);
  }
}
