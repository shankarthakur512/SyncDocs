/**
 * Typed application errors for the auth/authorization layer.
 *
 * Using dedicated error classes (instead of throwing strings) lets the API
 * route handler map each failure to the correct HTTP status code in one place,
 * and keeps business logic free of HTTP concerns.
 */

/** Base class carrying an HTTP status + machine-readable code. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** 401 — no valid session. */
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

/** 403 — authenticated but lacking the required role/permission. */
export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, 403, "FORBIDDEN");
  }
}

/** 404 — resource missing OR hidden from this user (avoids leaking existence). */
export class NotFoundError extends AppError {
  constructor(message = "Resource not found.") {
    super(message, 404, "NOT_FOUND");
  }
}

/** 400 — request payload failed validation. */
export class ValidationError extends AppError {
  constructor(
    message = "Invalid request.",
    readonly details?: unknown,
  ) {
    super(message, 400, "VALIDATION_ERROR");
  }
}
