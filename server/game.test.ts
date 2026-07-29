import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "./db.js";
import { GameError, GameService } from "./game.js";
import { displayDurationMs, Slideshow } from "./slideshow.js";
import { hash, now } from "./utils.js";

let db: ReturnType<typeof openDatabase>;
let game: GameService;

beforeEach(() => {
  db = openDatabase(":memory:");
  game = new GameService(db);
  db.prepare("UPDATE events SET phase='ASSEMBLY'").run();
});
afterEach(() => db.close());

function roster(teamId: string, size: number) {
  const insert = db.prepare(`INSERT INTO participants
    (id,display_name,team_id,session_hash,scan_token_hash,checked_in_at,created_at,last_seen_at)
    VALUES(?,?,?,?,?,?,?,?)`);
  const stamp = now();
  for (let index = 0; index < size; index++) {
    insert.run(`p-${index}`, `Person ${index}`, teamId, hash(`session-${index}`), hash(`scan-${index}`), stamp, stamp, stamp);
  }
}

describe("allocation and restoration", () => {
  it("keeps public registration closed until the host enters ASSEMBLY", () => {
    db.prepare("UPDATE events SET phase='SETUP'").run();
    expect(() => game.createParticipant("Early Student")).toThrowError("Registration has not opened yet");
    db.prepare("UPDATE events SET phase='ASSEMBLY'").run();
    expect(game.createParticipant("On-time Student").participant.id).toBeTruthy();
  });

  it("keeps 550 joins balanced with max skew <= 1", () => {
    const sessions: string[] = [];
    for (let index = 0; index < 550; index++) sessions.push(game.createParticipant(`Student ${index}`).sessionToken);
    const counts = game.teams().map(team => Number(team.participants));
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(counts.reduce((sum, value) => sum + value, 0)).toBe(550);
    expect(game.restoreParticipant(sessions[0]).id).toBeTruthy();
  });

  it("restores the exact same participant and team", () => {
    const joined = game.createParticipant("Aparna");
    const restored = game.restoreParticipant(joined.sessionToken);
    expect(restored.id).toBe(joined.participant.id);
    expect(restored.team.id).toBe(joined.participant.team.id);
  });
});

describe("team-scoped scanning", () => {
  it("rejects a wrong-team credential without changing check-in", () => {
    const joined = game.createParticipant("Nandu");
    const wrong = game.teams().find(team => team.id !== joined.participant.team.id)!;
    expect(() => game.scan(String(wrong.id), joined.scanToken)).toThrowError(GameError);
    expect(game.restoreParticipant(joined.sessionToken).checkedIn).toBe(false);
  });

  it("makes duplicate scans idempotent", () => {
    const joined = game.createParticipant("Devika");
    const first = game.scan(String(joined.participant.team.id), joined.scanToken);
    const second = game.scan(String(joined.participant.team.id), joined.scanToken);
    expect(first.status).toBe("FOUND");
    expect(second.status).toBe("ALREADY_CHECKED_IN");
  });
});

describe("mystery invariants", () => {
  it("atomically pairs both users and immediately unlocks distinct tiles", () => {
    roster("team-lion", 28);
    game.setPhase("MYSTERY");
    const pair = db.prepare("SELECT * FROM qa_pairs LIMIT 1").get() as any;
    const result = game.match(pair.question_participant_id, pair.answer_key);
    const question = game.participantSnapshotById(pair.question_participant_id);
    const answer = game.participantSnapshotById(pair.answer_participant_id);
    const indices = db.prepare("SELECT puzzle_index FROM participants WHERE id IN (?,?) ORDER BY id")
      .all(pair.question_participant_id, pair.answer_participant_id) as Array<{ puzzle_index: number }>;
    expect(result.status).toBe("MATCH_FOUND");
    expect(question.mystery.tileUrl).toBe("/api/participant/tile");
    expect(answer.mystery.tileUrl).toBe("/api/participant/tile");
    expect(indices[0].puzzle_index).not.toBe(indices[1].puzzle_index);
    expect(() => game.match(pair.question_participant_id, pair.answer_key)).not.toThrow();
  });

  it("does not leak the correct answer on a wrong key and blocks key reuse", () => {
    roster("team-lion", 28);
    game.setPhase("MYSTERY");
    const pairs = db.prepare("SELECT * FROM qa_pairs LIMIT 2").all() as any[];
    expect(() => game.match(pairs[0].question_participant_id, pairs[1].answer_key))
      .toThrowError("WRONG AAL — iniyum nokku.");
    game.match(pairs[0].question_participant_id, pairs[0].answer_key);
    expect(() => game.match(pairs[1].question_participant_id, pairs[0].answer_key))
      .toThrowError("WRONG AAL — iniyum nokku.");
  });

  it("uses every 7x4 puzzle position when a team has 28 active participants", () => {
    roster("team-lion", 28);
    game.setPhase("MYSTERY");
    const indices = (db.prepare("SELECT puzzle_index FROM participants WHERE team_id='team-lion' ORDER BY puzzle_index").all() as Array<{ puzzle_index: number }>).map(row => row.puzzle_index);
    expect(indices).toEqual(Array.from({ length: 28 }, (_, index) => index));
  });

  it("creates exactly one clue-less Detective for an odd roster", () => {
    roster("team-lion", 27);
    game.setPhase("MYSTERY");
    const detectives = db.prepare("SELECT id,puzzle_index,qa_pair_id FROM participants WHERE qa_role='DETECTIVE'").all() as any[];
    expect(detectives).toHaveLength(1);
    const snapshot = game.participantSnapshotById(detectives[0].id);
    expect(snapshot.mystery.role).toBe("DETECTIVE");
    expect(snapshot.mystery.question).toBeNull();
    expect(snapshot.mystery.answer).toBeNull();
    expect(snapshot.mystery.tileUrl).toBeNull();
    expect(detectives[0].puzzle_index).toBeNull();
    const tileIndices = (db.prepare("SELECT puzzle_index FROM participants WHERE team_id='team-lion' AND qa_role!='DETECTIVE' ORDER BY puzzle_index").all() as Array<{ puzzle_index: number }>).map(row => row.puzzle_index);
    expect(tileIndices).toHaveLength(26);
    expect(new Set(tileIndices).size).toBe(26);
    expect(tileIndices).not.toContain(0);
    expect(tileIndices).not.toContain(27);
  });

  it("allows early theory lock and still accepts later matches", () => {
    roster("team-lion", 28);
    game.setPhase("MYSTERY");
    const pairs = db.prepare("SELECT * FROM qa_pairs LIMIT 2").all() as any[];
    game.match(pairs[0].question_participant_id, pairs[0].answer_key);
    const theory = game.submitTheory("team-lion", "Professor attendance register thirichu pidikkan odunnu.");
    expect(theory.locked).toBe(true);
    expect(() => game.match(pairs[1].question_participant_id, pairs[1].answer_key)).not.toThrow();
    expect(() => game.submitTheory("team-lion", "Changed")).toThrowError("already locked");
  });

  it("deactivating a missing participant frees the unmatched counterpart", () => {
    roster("team-lion", 28);
    game.setPhase("MYSTERY");
    const pair = db.prepare("SELECT * FROM qa_pairs LIMIT 1").get() as any;
    game.deactivateParticipant(pair.answer_participant_id, false);
    const counterpart = game.participantSnapshotById(pair.question_participant_id);
    expect(counterpart.mystery.role).toBe("DETECTIVE");
    expect(db.prepare("SELECT id FROM qa_pairs WHERE id=?").get(pair.id)).toBeUndefined();
    const reactivated = game.deactivateParticipant(pair.answer_participant_id, true);
    expect(reactivated.mystery.role).toBe("DETECTIVE");
    expect(reactivated.mystery.question).toBeNull();
    expect(reactivated.mystery.answerKey).toBeNull();
  });

  it("reconstructs an authoritative snapshot after reconnect/service restart", () => {
    const joined = game.createParticipant("Reconnect Student");
    game.scan(String(joined.participant.team.id), joined.scanToken);
    const restartedService = new GameService(db);
    const team = restartedService.publicSnapshot().teams.find(item => item.id === joined.participant.team.id)!;
    expect(team.checkedIn).toBe(1);
  });
});

describe("meme assignment shape", () => {
  it("does not exclude active juniors from later rounds just because a volunteer scan was missed", () => {
    const stamp = now();
    db.prepare(`INSERT INTO participants
      (id,display_name,team_id,session_hash,scan_token_hash,checked_in_at,created_at,last_seen_at)
      VALUES(?,?,?,?,?,?,?,?)`).run("unscanned", "Unscanned Junior", "team-lion", hash("unscanned-session"), hash("unscanned-scan"), null, stamp, stamp);
    game.setPhase("MEME");
    expect(game.participantSnapshotById("unscanned").meme).not.toBeNull();
    game.setPhase("MYSTERY");
    expect(game.participantSnapshotById("unscanned").mystery.role).toBe("DETECTIVE");
  });

  it("gives a one-person rehearsal team a visible meme instead of an endless waiting state", () => {
    const stamp = now();
    db.prepare(`INSERT INTO participants
      (id,display_name,team_id,session_hash,scan_token_hash,created_at,last_seen_at)
      VALUES(?,?,?,?,?,?,?)`).run("solo", "Solo Tester", "team-lion", hash("solo-session"), hash("solo-scan"), stamp, stamp);
    game.setPhase("MEME");
    const meme = game.participantSnapshotById("solo").meme;
    expect(meme).not.toBeNull();
    expect(meme!.groupSize).toBe(1);
    expect(meme!.instruction.length).toBeGreaterThan(5);
  });

  it("creates 14 pairs for 28 and 12 pairs plus one trio for 27", () => {
    roster("team-lion", 28);
    const stamp = now();
    const insert = db.prepare(`INSERT INTO participants
      (id,display_name,team_id,session_hash,scan_token_hash,checked_in_at,created_at,last_seen_at)
      VALUES(?,?,?,?,?,?,?,?)`);
    for (let index = 0; index < 27; index++) {
      insert.run(`panda-${index}`, `Panda ${index}`, "team-panda", hash(`panda-session-${index}`),
        hash(`panda-scan-${index}`), stamp, stamp, stamp);
    }
    game.generateMemeAssignments();
    const lion = db.prepare("SELECT group_size,template_id FROM meme_assignments WHERE team_id='team-lion'").all() as
      Array<{ group_size: number; template_id: string }>;
    const panda = db.prepare("SELECT group_size FROM meme_assignments WHERE team_id='team-panda'").all() as Array<{ group_size: number }>;
    expect(lion).toHaveLength(14);
    expect(lion.every(group => group.group_size === 2)).toBe(true);
    expect(new Set(lion.map(group => group.template_id)).size).toBe(14);
    expect(panda.filter(group => group.group_size === 2)).toHaveLength(12);
    expect(panda.filter(group => group.group_size === 3)).toHaveLength(1);
  });
});

describe("adaptive endless slideshow", () => {
  it("prioritises unseen, speeds up with backlog, and obeys the 1.5s floor", () => {
    const slides = Array.from({ length: 30 }, (_, index) => ({ id: String(index), createdAt: String(index) }));
    const slideshow = new Slideshow(slides, 12, () => 0);
    expect(slideshow.next()!.slide.id).toBe("0");
    expect(displayDurationMs(1)).toBe(5000);
    expect(displayDurationMs(8)).toBe(3750);
    expect(displayDurationMs(100)).toBe(1500);
  });

  it("recycles history forever and avoids an immediate repeat when possible", () => {
    const slideshow = new Slideshow([
      { id: "a", createdAt: "1" }, { id: "b", createdAt: "2" }, { id: "c", createdAt: "3" }
    ], 2, () => 0);
    const first = [slideshow.next()!.slide.id, slideshow.next()!.slide.id, slideshow.next()!.slide.id];
    const recycled = [slideshow.next()!.slide.id, slideshow.next()!.slide.id];
    expect(first).toEqual(["a", "b", "c"]);
    expect(recycled[0]).not.toBe("c");
    expect(recycled[1]).not.toBe(recycled[0]);
  });
});
