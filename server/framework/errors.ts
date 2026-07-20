/**
 * Typed errors used across the platform. Routes translate these into HTTP
 * responses; connectors throw them so the API layer stays vendor-agnostic.
 */

export class ApiError extends Error {
  /** HTTP status to surface to the client. */
  readonly statusCode: number;
  /** Stable machine code, e.g. `not_found`, `upstream_auth`. */
  readonly code: string;
  /** Optional safe-to-expose detail (never contains secrets). */
  readonly detail?: unknown;

  constructor(statusCode: number, code: string, message: string, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.detail = detail;
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found', detail?: unknown) {
    super(404, 'not_found', message, detail);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Bad request', detail?: unknown) {
    super(400, 'bad_request', message, detail);
    this.name = 'BadRequestError';
  }
}
