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

export function assertValid(errors: FieldErrors): void {
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}
