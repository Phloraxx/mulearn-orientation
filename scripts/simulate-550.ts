import { makeId, openDatabase } from "../server/db.js";
import { GameService } from "../server/game.js";
import { now } from "../server/utils.js";

const started = performance.now();
const db = openDatabase(":memory:");
const game = new GameService(db);
db.prepare("UPDATE events SET phase='ASSEMBLY'").run();
let deliveredEvents = 0;
const disconnectors = Array.from({ length: 572 }, () => game.bus.subscribe(() => { deliveredEvents++; }));

const joined: Array<{ scanToken: string; teamId: string }> = [];
for (let index = 0; index < 550; index++) {
  const result = game.createParticipant(`Sim Student ${index + 1}`);
  joined.push({ scanToken: result.scanToken, teamId: String(result.participant.team.id) });
}
for (const participant of joined) game.scan(participant.teamId, participant.scanToken);
const counts = game.teams().map(team => Number(team.participants));
if (Math.max(...counts) - Math.min(...counts) > 1) throw new Error(`Allocation skew failed: ${counts.join(",")}`);

game.setPhase("MEME");
const assignments = db.prepare("SELECT id,team_id FROM meme_assignments").all() as Array<{ id: string; team_id: string }>;
for (const assignment of assignments) {
  const mediaId = makeId("sim-media");
  db.prepare(`INSERT INTO media(id,team_id,assignment_id,relative_path,mime_type,status,created_at)
    VALUES(?,?,?,?,?,'READY',?)`).run(mediaId, assignment.team_id, assignment.id, `${mediaId}.jpg`, "image/jpeg", now());
  game.bus.emit("meme.photo_added", { teamId: assignment.team_id, mediaId });
}

game.setPhase("MYSTERY");
const teams = db.prepare("SELECT id FROM teams").all() as Array<{ id: string }>;
let matched = 0;
for (const team of teams) {
  const pairs = db.prepare("SELECT * FROM qa_pairs WHERE team_id=? ORDER BY rowid").all(team.id) as any[];
  if (pairs[0]) {
    game.match(pairs[0].question_participant_id, pairs[0].answer_key);
    matched++;
    game.submitTheory(team.id, `Simulated early theory for ${team.id}`);
  }
  for (const pair of pairs.slice(1)) {
    game.match(pair.question_participant_id, pair.answer_key);
    matched++;
  }
}
const summary = game.publicSnapshot();
if (summary.teams.some(team => !team.theoryLocked || team.matchedPairs !== team.totalPairs)) {
  throw new Error("Theory lock or late matching failed.");
}
const detectiveCount = Number((db.prepare("SELECT COUNT(*) AS n FROM participants WHERE qa_role='DETECTIVE'").get() as { n: number }).n);
if (detectiveCount !== counts.filter(count => count % 2 === 1).length) throw new Error("Detective allocation failed.");
const elapsedMs = Math.round(performance.now() - started);
disconnectors.forEach(disconnect => disconnect());
console.log(JSON.stringify({
  participants: 550,
  volunteers: 20,
  teamRange: [Math.min(...counts), Math.max(...counts)],
  memeGroups: assignments.length,
  qaPairsMatched: matched,
  detectives: detectiveCount,
  simulatedSseClients: 572,
  eventDeliveries: deliveredEvents,
  elapsedMs
}, null, 2));
db.close();
