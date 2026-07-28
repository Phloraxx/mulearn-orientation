import { describe, expect, it } from "vitest";
import {
  assertProductionConfig,
  productionConfigErrors,
  staffBootstrapSecret,
  volunteerTokenPrefix
} from "./config.js";

const validProduction = {
  NODE_ENV: "production",
  SITE_URL: "https://orientation.mulearnscet.in",
  SESSION_SECRET: "session_abcdefghijklmnopqrstuvwxyz0123456789",
  HOST_BOOTSTRAP_SECRET: "host_abcdefghijklmnopqrstuvwxyz0123456789",
  ADMIN_BOOTSTRAP_SECRET: "admin_abcdefghijklmnopqrstuvwxyz0123456789",
  PROJECTOR_BOOTSTRAP_SECRET: "projector_abcdefghijklmnopqrstuvwxyz0123456789",
  VOLUNTEER_TOKEN_PREFIX: "volunteer_abcdefghijklmnopqrstuvwxyz0123456789"
};

describe("production configuration", () => {
  it("accepts complete strong production configuration", () => {
    expect(productionConfigErrors(validProduction)).toEqual([]);
    expect(() => assertProductionConfig(validProduction)).not.toThrow();
  });

  it("rejects missing, short, demo, placeholder, and local values", () => {
    const invalid = {
      NODE_ENV: "production",
      SITE_URL: "http://localhost:3000",
      SESSION_SECRET: "short",
      HOST_BOOTSTRAP_SECRET: "host-demo-secret",
      ADMIN_BOOTSTRAP_SECRET: "replace-with-strong-random-value",
      PROJECTOR_BOOTSTRAP_SECRET: "",
      VOLUNTEER_TOKEN_PREFIX: "volunteer-demo"
    };
    expect(productionConfigErrors(invalid).length).toBeGreaterThanOrEqual(6);
    expect(() => assertProductionConfig(invalid)).toThrowError("Invalid production configuration");
    expect(staffBootstrapSecret("host", invalid)).toBeUndefined();
    expect(() => volunteerTokenPrefix(invalid)).toThrow();
  });

  it("keeps predictable demo credentials limited to non-production environments", () => {
    const development = { NODE_ENV: "development" };
    expect(staffBootstrapSecret("host", development)).toBe("host-demo-secret");
    expect(volunteerTokenPrefix(development)).toBe("volunteer-demo");
  });
});
