import { createHash, randomBytes, randomUUID } from "node:crypto";

export const now = () => new Date().toISOString();
export const id = () => randomUUID();
export const token = (bytes = 24) => randomBytes(bytes).toString("base64url");
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export const safeEqual = (a: string, b: string) => hash(a) === hash(b);

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, char => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;", "'": "&apos;"
  })[char]!);
}
