export type FieldErrors = Record<string, string>;

/** Raised when user input violates a domain rule. Carries per-field messages for forms. */
export class ValidationError extends Error {
  constructor(public readonly fieldErrors: FieldErrors) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

/** Raised when an operation conflicts with existing data (e.g. deleting a referenced record). */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} "${id}" was not found`);
    this.name = "NotFoundError";
  }
}

/** Raised when the request has no valid credentials (HTTP 401). */
export class UnauthorizedError extends Error {
  constructor(message = "Your session has expired. Please sign in again.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Raised when the signed-in user may not perform the action (HTTP 403). */
export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertValid(errors: FieldErrors): void {
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

/** Blocks a delete while other records still reference the entity. */
export function assertNoDependents(
  count: number,
  message: (count: number) => string,
): void {
  if (count > 0) throw new ConflictError(message(count));
}
