export class HttpError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function badRequest(message, details) {
  return new HttpError(400, message, details);
}

export function unauthorized(message = "Unauthorized") {
  return new HttpError(401, message);
}

export function forbidden(message = "Forbidden") {
  return new HttpError(403, message);
}

export function tooManyRequests(message = "Too many requests") {
  return new HttpError(429, message);
}

export function notFound(message = "Not found") {
  return new HttpError(404, message);
}

export function unprocessable(message, details) {
  return new HttpError(422, message, details);
}

export function serviceUnavailable(message = "Service unavailable") {
  return new HttpError(503, message);
}

export function internalServerError(message = "Internal server error") {
  return new HttpError(500, message);
}
