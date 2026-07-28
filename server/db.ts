import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { TEAMS } from "./content.js";
import { hash, id, now } from "./utils.js";

export type OrientationDb = DatabaseSync;

export function openDatabase(path = process.env.DATABASE_PATH ?? resolve("data/orientation.sqlite")) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  migrate(db);
  seedCore(db);
  return db;
}

export function migrate(db: OrientationDb) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, phase TEXT NOT NULL DEFAULT 'SETUP',
      mystery_ends_at TEXT, reveal_team_id TEXT, reveal_step TEXT NOT NULL DEFAULT 'THEORY',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, emoji TEXT NOT NULL,
      color TEXT NOT NULL, display_order INTEGER NOT NULL, target_capacity INTEGER NOT NULL,
      volunteer_name TEXT NOT NULL, volunteer_token_hash TEXT NOT NULL, mystery_description TEXT NOT NULL,
      theory TEXT, theory_submitted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY, display_name TEXT NOT NULL, team_id TEXT NOT NULL REFERENCES teams(id),
      session_hash TEXT UNIQUE NOT NULL, scan_token_hash TEXT UNIQUE NOT NULL, checked_in_at TEXT,
      active INTEGER NOT NULL DEFAULT 1, meme_assignment_id TEXT, qa_role TEXT NOT NULL DEFAULT 'NONE',
      qa_pair_id TEXT, puzzle_index INTEGER, paired_at TEXT, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_participant_team ON participants(team_id);
    CREATE INDEX IF NOT EXISTS idx_participant_name ON participants(display_name);
    CREATE TABLE IF NOT EXISTS staff_sessions (
      id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, role TEXT NOT NULL, team_id TEXT,
      expires_at TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meme_assignments (
      id TEXT PRIMARY KEY, team_id TEXT NOT NULL REFERENCES teams(id), template_id TEXT NOT NULL,
      title TEXT NOT NULL, group_size INTEGER NOT NULL, captured_media_id TEXT, captured_at TEXT
    );
    CREATE TABLE IF NOT EXISTS qa_pairs (
      id TEXT PRIMARY KEY, team_id TEXT NOT NULL REFERENCES teams(id), question_text TEXT NOT NULL,
      answer_text TEXT NOT NULL, answer_key TEXT NOT NULL, question_participant_id TEXT NOT NULL,
      answer_participant_id TEXT NOT NULL, matched_at TEXT, UNIQUE(team_id, answer_key)
    );
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY, team_id TEXT NOT NULL, assignment_id TEXT NOT NULL, relative_path TEXT NOT NULL,
      mime_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'READY', shown_at TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL,
      target TEXT, details TEXT, created_at TEXT NOT NULL
    );
  `);
}

export function seedCore(db: OrientationDb) {
  const event = db.prepare("SELECT id FROM events LIMIT 1").get() as { id: string } | undefined;
  if (!event) {
    const created = now();
    db.prepare("INSERT INTO events(id,name,phase,created_at,updated_at) VALUES(?,?,?,?,?)")
      .run("event-main", "µLearn SCET Orientation", "SETUP", created, created);
  }
  const count = (db.prepare("SELECT COUNT(*) AS n FROM teams").get() as { n: number }).n;
  if (count === 0) {
    const insert = db.prepare(`INSERT INTO teams
      (id,slug,name,emoji,color,display_order,target_capacity,volunteer_name,volunteer_token_hash,mystery_description)
      VALUES(?,?,?,?,?,?,?,?,?,?)`);
    TEAMS.forEach((team, index) => insert.run(
      `team-${team.slug}`, team.slug, team.name, team.emoji, team.color, index,
      index < 10 ? 28 : 27, team.volunteer,
      hash(`${process.env.VOLUNTEER_TOKEN_PREFIX ?? "volunteer-demo"}-${team.slug}`),
      team.mystery
    ));
  }
}

export function transaction<T>(db: OrientationDb, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function audit(db: OrientationDb, actor: string, action: string, target?: string, details?: unknown) {
  db.prepare("INSERT INTO audit(actor,action,target,details,created_at) VALUES(?,?,?,?,?)")
    .run(actor, action, target ?? null, details ? JSON.stringify(details) : null, now());
}

export function makeId(prefix: string) {
  return `${prefix}-${id()}`;
}
