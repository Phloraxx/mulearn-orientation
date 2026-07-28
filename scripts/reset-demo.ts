import { openDatabase } from "../server/db.js";

if (process.env.DEMO_MODE !== "1" || process.env.NODE_ENV === "production") {
  throw new Error("Refusing reset. Set DEMO_MODE=1 outside production.");
}
const db = openDatabase();
db.exec(`
  DELETE FROM audit;
  DELETE FROM media;
  DELETE FROM qa_pairs;
  DELETE FROM meme_assignments;
  DELETE FROM staff_sessions;
  DELETE FROM participants;
  UPDATE teams SET theory=NULL,theory_submitted_at=NULL;
  UPDATE events SET phase='SETUP',mystery_ends_at=NULL,reveal_team_id=NULL,reveal_step='THEORY';
`);
console.log("Demo event data reset. Team/volunteer provisioning was preserved.");
db.close();
