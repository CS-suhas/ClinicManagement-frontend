import { ValidationError } from "@/domain/errors";

export function getErrorMessage(e: unknown): string {
  if (e instanceof ValidationError) return "Please fix the highlighted fields.";
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}
