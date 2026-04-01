import type { Context } from 'hono';
import { z } from 'zod';

const redactEnvRecord = (
  env: Record<string, string> | undefined,
  includeSecrets = false
): Record<string, string> | undefined => {
  if (!env) {
    return undefined;
  }

  if (includeSecrets) {
    return env;
  }

  return Object.fromEntries(Object.keys(env).map((key) => [key, '[REDACTED]']));
};

export const serializeServer = <T extends { env?: Record<string, string> }>(
  server: T,
  includeSecrets = false
): T => {
  return {
    ...server,
    env: redactEnvRecord(server.env, includeSecrets),
  };
};

export const parseJsonBody = async <T>(
  c: Context,
  schema: z.ZodType<T>
): Promise<{ data: T } | { response: Response }> => {
  try {
    const body = await c.req.json();
    return { data: schema.parse(body) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        response: c.json({
          error: 'Invalid request body',
          details: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
        }, 400),
      };
    }

    if (error instanceof SyntaxError) {
      return { response: c.json({ error: 'Invalid JSON body' }, 400) };
    }

    throw error;
  }
};
