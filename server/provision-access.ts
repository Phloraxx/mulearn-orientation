import { openDatabase } from "./db.js";
import { hash } from "./utils.js";

const prefix = process.env.VOLUNTEER_TOKEN_PREFIX;
const site = process.env.SITE_URL;
if (!prefix || prefix.length < 24) throw new Error("VOLUNTEER_TOKEN_PREFIX must be at least 24 characters.");
if (!site) throw new Error("SITE_URL is required.");
const db = openDatabase();
const teams = db.prepare("SELECT id,slug,name FROM teams ORDER BY display_order").all() as
  Array<{ id: string; slug: string; name: string }>;
for (const team of teams) {
  const raw = `${prefix}-${team.slug}`;
  db.prepare("UPDATE teams SET volunteer_token_hash=? WHERE id=?").run(hash(raw), team.id);
  console.log(`${team.name}: ${site}/volunteer/${team.slug}?t=${raw}`);
}
console.log(`Host: ${site}/host?t=${process.env.HOST_BOOTSTRAP_SECRET ?? "<set HOST_BOOTSTRAP_SECRET>"}`);
console.log(`Projector: ${site}/projector?t=${process.env.PROJECTOR_BOOTSTRAP_SECRET ?? "<set PROJECTOR_BOOTSTRAP_SECRET>"}`);
db.close();
