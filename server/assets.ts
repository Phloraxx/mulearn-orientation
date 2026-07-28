import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { MEME_TEMPLATES, TEAMS } from "./content.js";
import { isProduction } from "./config.js";

export type AssetManifest = {
  version: number;
  mode: "demo" | "approved";
  memeReferencePattern: string;
  mysterySourcePattern: string;
  puzzleTilePattern: string;
  privateFields?: string[];
  runtimeCaptureDirectory?: string;
};

export type ResolvedAsset = {
  path: string;
  contentType: string;
};

const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

export class AssetStore {
  readonly root: string;
  readonly manifestPath: string;
  readonly manifest: AssetManifest | null;
  readonly manifestError: string | null;

  constructor(
    root = process.env.CONTENT_DIR ?? (isProduction() ? "/content" : resolve("content")),
    private env: NodeJS.ProcessEnv = process.env
  ) {
    this.root = resolve(root);
    this.manifestPath = resolve(this.root, "asset-manifest.json");
    try {
      this.manifest = JSON.parse(readFileSync(this.manifestPath, "utf8")) as AssetManifest;
      this.manifestError = null;
    } catch (error) {
      this.manifest = null;
      this.manifestError = `Cannot load ${this.manifestPath}: ${(error as Error).message}`;
    }
  }

  placeholdersAllowed() {
    return !isProduction(this.env);
  }

  memeReference(teamSlug: string, templateId: string) {
    return this.resolveAsset("memeReferencePattern", { teamSlug, templateId });
  }

  puzzleTile(teamSlug: string, tileIndex: number) {
    return this.resolveAsset("puzzleTilePattern", {
      teamSlug,
      tileIndex: String(tileIndex).padStart(2, "0")
    });
  }

  mysterySource(teamSlug: string) {
    return this.resolveAsset("mysterySourcePattern", { teamSlug });
  }

  readinessErrors() {
    if (!isProduction(this.env)) return [];
    const errors: string[] = [];
    if (this.manifestError) return [this.manifestError];
    if (this.manifest?.mode !== "approved") {
      return ["asset-manifest.json must set mode=approved in production"];
    }
    for (const team of TEAMS) {
      for (const template of MEME_TEMPLATES) {
        if (!this.memeReference(team.slug, template.id)) {
          errors.push(`Missing meme reference: ${team.slug}/${template.id}`);
        }
      }
      if (!this.mysterySource(team.slug)) errors.push(`Missing mystery source: ${team.slug}`);
      for (let index = 0; index < 28; index++) {
        if (!this.puzzleTile(team.slug, index)) {
          errors.push(`Missing puzzle tile: ${team.slug}/${String(index).padStart(2, "0")}`);
        }
      }
    }
    return errors;
  }

  private resolveAsset(
    patternKey: "memeReferencePattern" | "mysterySourcePattern" | "puzzleTilePattern",
    replacements: Record<string, string>
  ): ResolvedAsset | null {
    if (!this.manifest || (isProduction(this.env) && this.manifest.mode !== "approved")) return null;
    let relativePath = this.manifest[patternKey];
    for (const [key, value] of Object.entries(replacements)) {
      if (!/^[a-z0-9-]+$/i.test(value)) return null;
      relativePath = relativePath.replaceAll(`{${key}}`, value);
    }
    if (relativePath.includes("{")) return null;
    const path = resolve(this.root, relativePath);
    if (path !== this.root && !path.startsWith(`${this.root}${sep}`)) return null;
    if (!existsSync(path) || !statSync(path).isFile()) return null;
    const contentType = contentTypes[extname(path).toLowerCase()];
    return contentType ? { path, contentType } : null;
  }
}
