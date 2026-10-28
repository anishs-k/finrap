import { env } from "../config/env.js";

export function notFoundMiddleware(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorMiddleware(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const payload = {
    message: error.message || "Internal server error"
  };

  if (error.details) {
    payload.details = error.details;
  }

  if (env.nodeEnv !== "production" && statusCode >= 500) {
    payload.stack = error.stack;
  }

  res.status(statusCode).json(payload);
}
