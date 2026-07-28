import { existsSync, readFileSync } from "node:fs";
import { MEME_TEMPLATES, QA_BANK, TEAMS } from "../server/content.js";

const failures: string[] = [];
if (TEAMS.length !== 20) failures.push(`Expected 20 enabled teams; found ${TEAMS.length}.`);
if (new Set(TEAMS.map(team => team.slug)).size !== 20) failures.push("Team slugs are not unique.");
if (new Set(TEAMS.map(team => team.volunteer)).size !== 20) failures.push("Volunteer slots are not one-to-one.");
for (const team of TEAMS) {
  if (!team.volunteer) failures.push(`${team.slug} has no volunteer.`);
  if (!team.mystery) failures.push(`${team.slug} has no mystery stand-in.`);
}
if (MEME_TEMPLATES.filter(item => item.groupSize === 2).length < 13) failures.push("Need at least 13 pair meme templates.");
if (!MEME_TEMPLATES.some(item => item.groupSize === 3)) failures.push("Need a trio meme template.");
if (new Set(QA_BANK.map(item => item[0])).size !== QA_BANK.length) failures.push("Duplicate question text.");
if (new Set(QA_BANK.map(item => item[1])).size !== QA_BANK.length) failures.push("Ambiguous/duplicate answer text.");
const manifestPath = "content/asset-manifest.json";
if (!existsSync(manifestPath)) failures.push("Asset manifest is missing.");
else {
  const manifestText = readFileSync(manifestPath, "utf8");
  if (/content-input|sourcePhotos|volunteers\//i.test(manifestText)) failures.push("Public manifest exposes a private source-photo path.");
  JSON.parse(manifestText);
}
if (failures.length) {
  console.error(failures.map(item => `✗ ${item}`).join("\n"));
  process.exit(1);
}
console.log(`✓ 20 teams and 20 unique volunteer slots`);
console.log(`✓ ${MEME_TEMPLATES.length} meme templates including trio support`);
console.log(`✓ ${QA_BANK.length} distinct Manglish Q&A pairs`);
console.log(`✓ 20 deterministic mystery stand-ins and private-safe manifest`);
