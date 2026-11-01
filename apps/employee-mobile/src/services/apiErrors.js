export class ApiError extends Error {
  constructor(message, code = "REQUEST_FAILED", status = 0) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}
