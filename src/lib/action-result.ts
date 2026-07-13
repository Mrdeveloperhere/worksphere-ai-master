// Every server action returns this instead of throwing for expected failures
// (validation errors, permission denials). Callers must explicitly check
// `.success` — there's no hidden control flow via thrown exceptions.
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function fail<T = never>(error: string): ActionResult<T> {
  return { success: false, error };
}

export function isPrismaUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}
