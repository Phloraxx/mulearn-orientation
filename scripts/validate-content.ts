import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MEME_TEMPLATES, QA_BANK, TEAMS } from "../server/content.js";
import { AssetStore, type AssetManifest } from "../server/assets.js";

const failures: string[] = [];
if (TEAMS.length !== 20) failures.push(`Expected 20 enabled teams; found ${TEAMS.length}.`);
if (new Set(TEAMS.map(team => team.slug)).size !== 20) failures.push("Team slugs are not unique.");
if (new Set(TEAMS.map(team => team.volunteer)).size !== 20) failures.push("Volunteer slots are not one-to-one.");
for (const team of TEAMS) {
  if (!team.volunteer) failures.push(`${team.slug} has no volunteer slot.`);
  if (!team.mystery) failures.push(`${team.slug} has no mystery description.`);
}
if (MEME_TEMPLATES.length !== 15) failures.push(`Expected exactly 15 meme templates; found ${MEME_TEMPLATES.length}.`);
if (MEME_TEMPLATES.filter(item => item.groupSize === 2).length !== 14) failures.push("Need exactly 14 unique pair meme templates.");
if (MEME_TEMPLATES.filter(item => item.groupSize === 3).length !== 1) failures.push("Need exactly one trio meme template.");
if (new Set(MEME_TEMPLATES.map(item => item.id)).size !== 15) failures.push("Meme template IDs are not unique.");
if (new Set(MEME_TEMPLATES.map(item => item.title)).size !== 15) failures.push("Meme template titles are not unique.");
if (new Set(QA_BANK.map(item => item[0])).size !== QA_BANK.length) failures.push("Duplicate question text.");
if (new Set(QA_BANK.map(item => item[1])).size !== QA_BANK.length) failures.push("Ambiguous/duplicate answer text.");

const contentRoot = process.env.CONTENT_DIR ?? "content";
const manifestPath = resolve(contentRoot, "asset-manifest.json");
if (!existsSync(manifestPath)) failures.push("Asset manifest is missing.");
else {
  const manifestText = readFileSync(manifestPath, "utf8");
  if (/content-input|sourcePhotos|volunteers\//i.test(manifestText)) failures.push("Public manifest exposes a private source-photo path.");
  const manifest = JSON.parse(manifestText) as AssetManifest;
  if (!["demo", "approved"].includes(manifest.mode)) failures.push(`Unknown asset manifest mode: ${manifest.mode}`);
  if (manifest.memeReferencePattern.includes("{teamSlug}")) {
    failures.push("Meme references must be shared assets; memeReferencePattern must not contain {teamSlug}.");
  }
  if (manifest.mode === "approved") {
    const assets = new AssetStore(contentRoot, { ...process.env, NODE_ENV: "development" });
    for (const template of MEME_TEMPLATES) {
      if (!assets.memeReference(TEAMS[0].slug, template.id)) failures.push(`Missing approved shared meme: ${template.id}`);
    }
    for (const team of TEAMS) {
      if (!assets.mysterySource(team.slug)) failures.push(`Missing approved mystery source: ${team.slug}`);
      for (let index = 0; index < 28; index++) {
        if (!assets.puzzleTile(team.slug, index)) failures.push(`Missing approved tile: ${team.slug}/${String(index).padStart(2, "0")}`);
      }
    }
  }
}
if (failures.length) {
  console.error(failures.map(item => `✗ ${item}`).join("\n"));
  process.exit(1);
}
console.log(`✓ 20 teams and 20 unique animal-volunteer slots`);
console.log(`✓ ${MEME_TEMPLATES.length} shared meme templates including trio support`);
console.log(`✓ ${QA_BANK.length} distinct Manglish Q&A pairs`);
console.log(`✓ private-safe asset manifest (${JSON.parse(readFileSync(manifestPath, "utf8")).mode} mode)`);
