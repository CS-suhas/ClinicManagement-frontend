import { ApiError } from "./api";

export function getErrorMessage(e: unknown): string {
  if (e instanceof ApiError && e.fieldErrors)
    return "Please fix the highlighted fields.";
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}
