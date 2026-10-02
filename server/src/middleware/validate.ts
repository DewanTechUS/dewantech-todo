import type { ZodTypeAny, z } from 'zod';
import { HttpError } from '../lib/errors.js';

/** Parses input with a zod schema, throwing a 400 with per-field messages on failure. */
export function parse<S extends ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      fields[key] ??= issue.message;
    }
    const first = Object.values(fields)[0];
    throw new HttpError(400, first ?? 'Invalid request.', { fields });
  }
  return result.data;
}
