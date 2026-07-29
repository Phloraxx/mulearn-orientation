import { access, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { TEAMS } from "../server/content.js";

const outputRoot = resolve(process.argv[2] ?? "content/generated-assets/mysteries");
const photoRoot = resolve("content/mystery-photos");

for (const team of TEAMS) {
  const input = resolve(photoRoot, `${team.slug}.webp`);
  await access(input);
  const metadata = await sharp(input).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 1400 || metadata.height < 1400) {
    throw new Error(`${input} must be at least 1400×1400.`);
  }
  const ratio = metadata.width / metadata.height;
  if (ratio < 0.96 || ratio > 1.04) throw new Error(`${input} must be approximately square.`);

  const teamDir = resolve(outputRoot, team.slug);
  await mkdir(teamDir, { recursive: true });
  await sharp(input)
    .resize(1960, 1960, { fit: "cover", position: "centre" })
    .webp({ quality: 92 })
    .toFile(resolve(teamDir, "source.webp"));
}

console.log(`Installed ${TEAMS.length} real-photo mystery sources from ${photoRoot}.`);
