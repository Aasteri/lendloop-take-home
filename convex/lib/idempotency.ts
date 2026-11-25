export type IdempotentInsert<T> = {
  created: boolean;
  record: T;
};

/**
 * Returns the existing record when the key has been seen, otherwise
 * calls `create`. Callers must persist with a unique index on the key
 * so two concurrent retries cannot both insert.
 */
export function resolveIdempotent<T>(
  existing: T | null,
  create: () => T,
): IdempotentInsert<T> {
  if (existing !== null) {
    return { created: false, record: existing };
  }
  return { created: true, record: create() };
}
