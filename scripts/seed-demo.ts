import { openDatabase } from "../server/db.js";
import { GameService } from "../server/game.js";

const db = openDatabase();
const game = new GameService(db);
db.prepare("UPDATE events SET phase='ASSEMBLY'").run();
const existing = Number((db.prepare("SELECT COUNT(*) AS n FROM participants").get() as { n: number }).n);
if (!existing) {
  for (let index = 0; index < 60; index++) {
    const joined = game.createParticipant(`Demo Student ${String(index + 1).padStart(2, "0")}`);
    game.scan(String(joined.participant.team.id), joined.scanToken);
  }
}
console.log(`Demo ready with ${(db.prepare("SELECT COUNT(*) AS n FROM participants").get() as { n: number }).n} participants.`);
console.log("Volunteer token pattern: volunteer-demo-<team-slug>");
console.log("Host/admin/projector demo secrets: <role>-demo-secret");
db.close();
