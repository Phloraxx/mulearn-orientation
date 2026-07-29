import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { TEAMS } from "../server/content.js";

const root = resolve(process.argv[2] ?? "content/generated-assets/mysteries");
const columns = 7;
const rows = 4;
const overlapRatio = 0.035;

for (const team of TEAMS) {
  const teamRoot = resolve(root, team.slug);
  const source = resolve(teamRoot, "source.webp");
  if (!existsSync(source)) {
    throw new Error(`Missing approved mystery source for ${team.slug}: ${source}`);
  }
  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Cannot read dimensions for ${source}`);
  if (metadata.width < 1400 || metadata.height < 1400) {
    throw new Error(`${source} is too small; approved mystery sources must be at least 1400×1400.`);
  }
  const ratio = metadata.width / metadata.height;
  if (ratio < 0.96 || ratio > 1.04) throw new Error(`${source} must be approximately square; got ${metadata.width}×${metadata.height}.`);
  const tilesDirectory = resolve(teamRoot, "tiles");
  await mkdir(tilesDirectory, { recursive: true });
  const cellWidth = metadata.width / columns;
  const cellHeight = metadata.height / rows;
  const cropWidth = Math.round(cellWidth * (1 + overlapRatio * 2));
  const cropHeight = Math.round(cropWidth * 7 / 4);
  const layout: Array<{ index: number; x: number; y: number }> = [];

  for (let index = 0; index < 28; index++) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const centerX = (column + 0.5) * cellWidth;
    const centerY = (row + 0.5) * cellHeight;
    let left = Math.round(centerX - cropWidth / 2);
    let top = Math.round(centerY - cropHeight / 2);
    left = Math.max(0, Math.min(metadata.width - cropWidth, left));
    top = Math.max(0, Math.min(metadata.height - cropHeight, top));
    await sharp(source)
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .resize(800, 1400, { fit: "fill" })
      .webp({ quality: 88 })
      .toFile(resolve(tilesDirectory, `${String(index).padStart(2, "0")}.webp`));
    layout.push({ index, x: column, y: row });
  }

  await writeFile(resolve(teamRoot, "private-layout.json"), JSON.stringify({
    private: true,
    columns,
    rows,
    tileCount: 28,
    overlapRatio,
    sourceWidth: metadata.width,
    sourceHeight: metadata.height,
    tiles: layout
  }, null, 2));
}

console.log(`Generated 560 production WebP puzzle tiles from 20 approved mystery sources under ${root}.`);
