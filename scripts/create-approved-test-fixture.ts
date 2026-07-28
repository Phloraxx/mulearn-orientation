import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";
import { MEME_TEMPLATES, TEAMS } from "../server/content.js";

const argument = process.argv[2];
if (!argument) throw new Error("Pass an explicit temporary output directory.");
const root = resolve(argument);
if (root === resolve("content")) throw new Error("Refusing to overwrite the real content directory.");

const manifest = {
  version: 1,
  mode: "approved",
  notes: "TEST FIXTURE ONLY. Never deploy as event content.",
  memeReferencePattern: "generated-assets/meme-references/{templateId}.webp",
  mysterySourcePattern: "generated-assets/mysteries/{teamSlug}/source.webp",
  puzzleTilePattern: "generated-assets/mysteries/{teamSlug}/tiles/{tileIndex}.webp",
  privateFields: ["tileIndex", "layout"],
  runtimeCaptureDirectory: "/data/media/event-main"
};

await mkdir(root, { recursive: true });
await writeFile(resolve(root, "asset-manifest.json"), JSON.stringify(manifest, null, 2));
const fixtureImage = await sharp({
  create: { width: 64, height: 64, channels: 3, background: "#7c3aed" }
}).webp().toBuffer();

for (const template of MEME_TEMPLATES) {
  const path = resolve(root, "generated-assets", "meme-references", `${template.id}.webp`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, fixtureImage);
}

for (const team of TEAMS) {
  const mysteryRoot = resolve(root, "generated-assets", "mysteries", team.slug);
  await mkdir(resolve(mysteryRoot, "tiles"), { recursive: true });
  await writeFile(resolve(mysteryRoot, "source.webp"), fixtureImage);
  for (let index = 0; index < 28; index++) {
    await writeFile(resolve(mysteryRoot, "tiles", `${String(index).padStart(2, "0")}.webp`), fixtureImage);
  }
}

console.log(`Created a complete non-production approved-asset fixture at ${root}.`);
