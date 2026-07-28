export const PRODUCTION_SECRET_KEYS = [
  "SESSION_SECRET",
  "HOST_BOOTSTRAP_SECRET",
  "ADMIN_BOOTSTRAP_SECRET",
  "PROJECTOR_BOOTSTRAP_SECRET",
  "VOLUNTEER_TOKEN_PREFIX"
] as const;

const STAFF_SECRET_KEYS = {
  host: "HOST_BOOTSTRAP_SECRET",
  admin: "ADMIN_BOOTSTRAP_SECRET",
  projector: "PROJECTOR_BOOTSTRAP_SECRET"
} as const;

const unsafeValue = /(demo|placeholder|replace|change-?me|example)/i;

export function isProduction(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV === "production";
}

export function productionConfigErrors(env: NodeJS.ProcessEnv = process.env) {
  if (!isProduction(env)) return [];
  const errors: string[] = [];
  for (const key of PRODUCTION_SECRET_KEYS) {
    const value = env[key]?.trim() ?? "";
    if (value.length < 32) errors.push(`${key} must be at least 32 characters`);
    else if (unsafeValue.test(value)) errors.push(`${key} contains a forbidden demo/placeholder marker`);
  }
  const siteUrl = env.SITE_URL?.trim() ?? "";
  try {
    const parsed = new URL(siteUrl);
    if (parsed.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(parsed.hostname)) {
      errors.push("SITE_URL must be a non-local HTTPS URL");
    }
  } catch {
    errors.push("SITE_URL must be a valid non-local HTTPS URL");
  }
  return errors;
}

export function assertProductionConfig(env: NodeJS.ProcessEnv = process.env) {
  const errors = productionConfigErrors(env);
  if (errors.length) throw new Error(`Invalid production configuration: ${errors.join("; ")}`);
}

export function staffBootstrapSecret(role: string, env: NodeJS.ProcessEnv = process.env) {
  const key = STAFF_SECRET_KEYS[role as keyof typeof STAFF_SECRET_KEYS];
  if (!key) return undefined;
  if (isProduction(env)) {
    if (productionConfigErrors(env).length) return undefined;
    return env[key];
  }
  return env[key] ?? `${role}-demo-secret`;
}

export function volunteerTokenPrefix(env: NodeJS.ProcessEnv = process.env) {
  if (isProduction(env)) {
    assertProductionConfig(env);
    return env.VOLUNTEER_TOKEN_PREFIX!;
  }
  return env.VOLUNTEER_TOKEN_PREFIX ?? "volunteer-demo";
}
