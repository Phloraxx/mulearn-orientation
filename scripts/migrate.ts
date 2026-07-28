import { openDatabase } from "../server/db.js";

const db = openDatabase();
const mode = db.prepare("PRAGMA journal_mode").get() as { journal_mode: string };
console.log(`Database ready; journal_mode=${mode.journal_mode}`);
db.close();
