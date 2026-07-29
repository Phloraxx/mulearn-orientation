import type { OrientationDb } from "./db.js";
import { audit, makeId, transaction } from "./db.js";
import { PAIR_MEME_TEMPLATES, PHASES, QA_BANK, TRIO_MEME_TEMPLATE, type Phase } from "./content.js";
import { hash, now, shuffle, token } from "./utils.js";

type Row = Record<string, string | number | null>;

const PUZZLE_OMISSION_ORDER = [0, 27, 6, 21, 1, 26, 5, 22, 7, 20, 13, 14];
function puzzlePositions(count: number) {
  const safeCount = Math.max(0, Math.min(28, count));
  const omitted = new Set(PUZZLE_OMISSION_ORDER.slice(0, 28 - safeCount));
  return Array.from({ length: 28 }, (_, index) => index).filter(index => !omitted.has(index));
}

export class GameError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

export class EventBus {
  private listeners = new Set<(event: string, data: unknown) => void>();
  subscribe(listener: (event: string, data: unknown) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit(event: string, data: unknown = {}) {
    this.listeners.forEach(listener => listener(event, data));
  }
}

export class GameService {
  private failedMatches = new Map<string, { count: number; blockedUntil: number }>();
  constructor(public db: OrientationDb, public bus = new EventBus()) {}

  event() {
    return this.db.prepare("SELECT * FROM events LIMIT 1").get() as Row;
  }

  teams() {
    return this.db.prepare(`
      SELECT t.id,t.slug,t.name,t.emoji,t.color,t.display_order,t.target_capacity,t.volunteer_name,
        t.theory IS NOT NULL AS theory_locked,
        COUNT(p.id) AS participants,
        SUM(CASE WHEN p.checked_in_at IS NOT NULL AND p.active=1 THEN 1 ELSE 0 END) AS checked_in,
        (SELECT COUNT(*) FROM qa_pairs q WHERE q.team_id=t.id) AS total_pairs,
        (SELECT COUNT(*) FROM qa_pairs q WHERE q.team_id=t.id AND q.matched_at IS NOT NULL) AS matched_pairs,
        (SELECT COUNT(*) FROM participants px WHERE px.team_id=t.id AND px.paired_at IS NOT NULL AND px.active=1) AS tiles_unlocked
      FROM teams t LEFT JOIN participants p ON p.team_id=t.id AND p.active=1
      GROUP BY t.id ORDER BY t.display_order
    `).all() as Row[];
  }

  publicSnapshot() {
    const event = this.event();
    return {
      event: {
        phase: event.phase,
        mysteryEndsAt: event.mystery_ends_at,
        revealTeamId: event.reveal_team_id,
        revealStep: event.reveal_step
      },
      teams: this.teams().map(team => ({
        id: team.id, slug: team.slug, name: team.name, emoji: team.emoji, color: team.color,
        order: team.display_order, participants: Number(team.participants), checkedIn: Number(team.checked_in),
        target: Number(team.target_capacity), totalPairs: Number(team.total_pairs),
        matchedPairs: Number(team.matched_pairs), tilesUnlocked: Number(team.tiles_unlocked),
        theoryLocked: Boolean(team.theory_locked)
      }))
    };
  }

  createParticipant(displayName: string) {
    const name = displayName.trim().slice(0, 60);
    if (name.length < 2) throw new GameError("NAME_REQUIRED", "Please enter your name.");
    if (String(this.event().phase) !== "ASSEMBLY") {
      throw new GameError("JOIN_CLOSED", "Registration has not opened yet. Wait for the host to show the join QR.", 409);
    }
    const sessionToken = token();
    const scanToken = token(16);
    const participantId = makeId("participant");
    const created = now();
    const team = transaction(this.db, () => {
      const candidates = this.db.prepare(`
        SELECT t.id,t.slug,t.name,t.emoji,t.color,t.volunteer_name,
          COUNT(p.id) AS count
        FROM teams t LEFT JOIN participants p ON p.team_id=t.id AND p.active=1
        GROUP BY t.id ORDER BY count ASC, RANDOM()
      `).all() as Row[];
      const available = candidates.filter(candidate => Number(candidate.count) < 29);
      if (!available.length) throw new GameError("EVENT_FULL", "All animal teams are full. Ask the host for help.", 409);
      const minimum = Math.min(...available.map(candidate => Number(candidate.count)));
      const eligible = available.filter(candidate => Number(candidate.count) === minimum);
      const selected = eligible[Math.floor(Math.random() * eligible.length)];
      this.db.prepare(`INSERT INTO participants
        (id,display_name,team_id,session_hash,scan_token_hash,created_at,last_seen_at)
        VALUES(?,?,?,?,?,?,?)`).run(
        participantId, name, selected.id, hash(sessionToken), hash(scanToken), created, created
      );
      return selected;
    });
    audit(this.db, participantId, "participant.joined", String(team.id));
    this.bus.emit("team.progress", { teamId: team.id });
    return { sessionToken, scanToken, participant: this.participantSnapshotById(participantId) };
  }

  restoreParticipant(sessionToken: string) {
    const row = this.db.prepare("SELECT id FROM participants WHERE session_hash=?").get(hash(sessionToken)) as Row | undefined;
    if (!row) throw new GameError("SESSION_INVALID", "Participant session not found.", 401);
    this.db.prepare("UPDATE participants SET last_seen_at=? WHERE id=?").run(now(), row.id);
    return this.participantSnapshotById(String(row.id));
  }

  participantSnapshotById(participantId: string) {
    const participant = this.db.prepare(`
      SELECT p.*,t.slug AS team_slug,t.name AS team_name,t.emoji,t.color,t.volunteer_name,
        ma.title AS meme_title,ma.template_id,ma.group_size,
        q.question_text,q.answer_text,q.answer_key,q.matched_at
      FROM participants p JOIN teams t ON t.id=p.team_id
      LEFT JOIN meme_assignments ma ON ma.id=p.meme_assignment_id
      LEFT JOIN qa_pairs q ON q.id=p.qa_pair_id
      WHERE p.id=?
    `).get(participantId) as Row | undefined;
    if (!participant) throw new GameError("PARTICIPANT_NOT_FOUND", "Participant not found.", 404);
    const event = this.event();
    const group = participant.meme_assignment_id ? this.db.prepare(`
      SELECT p.display_name FROM participants p WHERE p.meme_assignment_id=? AND p.active=1 ORDER BY p.display_name
    `).all(participant.meme_assignment_id) as Row[] : [];
    return {
      id: participant.id,
      displayName: participant.display_name,
      active: Boolean(participant.active),
      checkedIn: Boolean(participant.checked_in_at),
      team: {
        id: participant.team_id, slug: participant.team_slug, name: participant.team_name,
        emoji: participant.emoji, color: participant.color, volunteer: participant.volunteer_name
      },
      phase: event.phase,
      meme: participant.meme_assignment_id ? {
        title: participant.meme_title,
        instruction: Number(participant.group_size) === 1
          ? "Solo rehearsal fallback: copy the reference pose yourself."
          : (PAIR_MEME_TEMPLATES.find(item => item.id === participant.template_id) ?? TRIO_MEME_TEMPLATE)?.instruction ?? "Copy the reference pose with your group.",
        groupSize: Number(participant.group_size),
        group: group.map(item => item.display_name),
        referenceUrl: `/api/participant/meme-reference`
      } : null,
      mystery: {
        role: participant.qa_role,
        question: participant.qa_role === "QUESTION" ? participant.question_text : null,
        answer: participant.qa_role === "ANSWER" ? participant.answer_text : null,
        answerKey: participant.qa_role === "ANSWER" ? participant.answer_key : null,
        paired: Boolean(participant.paired_at),
        tileUrl: participant.paired_at ? "/api/participant/tile" : null
      }
    };
  }

  scan(teamId: string, rawScanToken: string) {
    const participant = this.db.prepare(`
      SELECT p.id,p.team_id,p.display_name,p.checked_in_at,p.active,t.name AS team_name
      FROM participants p JOIN teams t ON t.id=p.team_id WHERE p.scan_token_hash=?
    `).get(hash(rawScanToken.trim())) as Row | undefined;
    if (!participant) throw new GameError("UNKNOWN_QR", "This participant QR is not valid.", 404);
    if (!participant.active) throw new GameError("INACTIVE", "This participant is marked absent.", 409);
    if (participant.team_id !== teamId) {
      throw new GameError("TEAM_MISMATCH", `Wrong team — this participant belongs to ${participant.team_name}.`, 403);
    }
    if (participant.checked_in_at) {
      return { status: "ALREADY_CHECKED_IN", participant: participant.display_name, progress: this.teamProgress(teamId) };
    }
    this.db.prepare("UPDATE participants SET checked_in_at=? WHERE id=?").run(now(), participant.id);
    audit(this.db, `volunteer:${teamId}`, "participant.checked_in", String(participant.id));
    this.bus.emit("participant.checked_in", { teamId, participantId: participant.id });
    return { status: "FOUND", participant: participant.display_name, progress: this.teamProgress(teamId) };
  }

  teamProgress(teamId: string) {
    const row = this.db.prepare(`
      SELECT COUNT(*) AS total,SUM(CASE WHEN checked_in_at IS NOT NULL THEN 1 ELSE 0 END) AS checked
      FROM participants WHERE team_id=? AND active=1
    `).get(teamId) as Row;
    return { checked: Number(row.checked ?? 0), total: Number(row.total ?? 0) };
  }

  setPhase(phase: Phase, mysteryMinutes = 12) {
    if (!PHASES.includes(phase)) throw new GameError("BAD_PHASE", "Unknown phase.");
    if (phase === "MEME") this.generateMemeAssignments();
    if (phase === "MYSTERY") this.generateQaAssignments();
    const endsAt = phase === "MYSTERY" ? new Date(Date.now() + mysteryMinutes * 60_000).toISOString() : null;
    this.db.prepare("UPDATE events SET phase=?,mystery_ends_at=?,updated_at=?").run(phase, endsAt, now());
    audit(this.db, "host", "event.phase_changed", phase);
    this.bus.emit("phase.changed", { phase, mysteryEndsAt: endsAt });
    return this.publicSnapshot();
  }

  generateMemeAssignments(force = false) {
    return transaction(this.db, () => {
      if (force) {
        this.db.exec("DELETE FROM meme_assignments");
        this.db.exec("UPDATE participants SET meme_assignment_id=NULL");
      }
      const existing = Number((this.db.prepare("SELECT COUNT(*) AS n FROM meme_assignments").get() as Row).n);
      if (existing) return;
      const teams = this.db.prepare("SELECT id FROM teams ORDER BY display_order").all() as Row[];
      for (const team of teams) {
        const participants = shuffle(this.db.prepare(`
          SELECT id FROM participants WHERE team_id=? AND active=1
        `).all(team.id) as Row[]);
        const groupSizes: number[] = [];
        let remaining = participants.length;
        if (remaining === 1) {
          // Operational fallback for tiny rehearsal teams. Real event teams are 27–28.
          groupSizes.push(1);
        } else if (remaining % 2 === 1 && remaining >= 3) {
          while (remaining > 3) { groupSizes.push(2); remaining -= 2; }
          groupSizes.push(3);
        } else while (remaining >= 2) { groupSizes.push(2); remaining -= 2; }
        let offset = 0;
        groupSizes.forEach((size, index) => {
          const assignmentId = makeId("meme");
          const template = size === 3 ? TRIO_MEME_TEMPLATE : PAIR_MEME_TEMPLATES[index];
          if (!template) throw new GameError("MEME_CONTENT_MISSING", `No unique meme reference exists for group ${index + 1}.`, 500);
          this.db.prepare(`INSERT INTO meme_assignments(id,team_id,template_id,title,group_size)
            VALUES(?,?,?,?,?)`).run(assignmentId, team.id, template.id, template.title, size);
          for (const participant of participants.slice(offset, offset + size)) {
            this.db.prepare("UPDATE participants SET meme_assignment_id=? WHERE id=?").run(assignmentId, participant.id);
          }
          offset += size;
        });
      }
    });
  }

  generateQaAssignments(force = false) {
    return transaction(this.db, () => {
      if (force) {
        this.db.exec("DELETE FROM qa_pairs");
        this.db.exec("UPDATE participants SET qa_role='NONE',qa_pair_id=NULL,puzzle_index=NULL,paired_at=NULL");
      }
      const existing = Number((this.db.prepare("SELECT COUNT(*) AS n FROM qa_pairs").get() as Row).n);
      if (existing) return;
      const teams = this.db.prepare("SELECT id FROM teams ORDER BY display_order").all() as Row[];
      for (const team of teams) {
        const participants = shuffle(this.db.prepare(`
          SELECT id FROM participants WHERE team_id=? AND active=1
        `).all(team.id) as Row[]);
        let ordinary = participants;
        if (participants.length % 2 === 1) {
          const detective = participants.at(-1)!;
          ordinary = participants.slice(0, -1);
          this.db.prepare("UPDATE participants SET qa_role='DETECTIVE' WHERE id=?").run(detective.id);
        }
        const tilePositions = shuffle(puzzlePositions(ordinary.length));
        ordinary.forEach((participant, index) => {
          this.db.prepare("UPDATE participants SET puzzle_index=? WHERE id=?").run(tilePositions[index], participant.id);
        });
        const half = ordinary.length / 2;
        const keySeed = Math.floor(Math.random() * 9000);
        const questions = ordinary.slice(0, half);
        const answers = ordinary.slice(half);
        questions.forEach((question, index) => {
          const answer = answers[index];
          const pairId = makeId("pair");
          const [questionText, answerText] = QA_BANK[index % QA_BANK.length];
          const key = String(1000 + ((keySeed + index * 617) % 9000));
          this.db.prepare(`INSERT INTO qa_pairs
            (id,team_id,question_text,answer_text,answer_key,question_participant_id,answer_participant_id)
            VALUES(?,?,?,?,?,?,?)`).run(pairId, team.id, questionText, answerText, key, question.id, answer.id);
          this.db.prepare("UPDATE participants SET qa_role='QUESTION',qa_pair_id=? WHERE id=?").run(pairId, question.id);
          this.db.prepare("UPDATE participants SET qa_role='ANSWER',qa_pair_id=? WHERE id=?").run(pairId, answer.id);
        });
      }
    });
  }

  match(participantId: string, key: string) {
    if (this.event().phase !== "MYSTERY") throw new GameError("NOT_MYSTERY", "Matching is not open.", 409);
    const attempts = this.failedMatches.get(participantId);
    if (attempts && attempts.blockedUntil > Date.now()) {
      throw new GameError("MATCH_COOLDOWN", "Kurachu slow aakku — 3 seconds kazhinju try cheyyu.", 429);
    }
    return transaction(this.db, () => {
      const participant = this.db.prepare(`
        SELECT id,team_id,qa_role,qa_pair_id,paired_at FROM participants WHERE id=? AND active=1
      `).get(participantId) as Row | undefined;
      if (!participant || participant.qa_role !== "QUESTION") {
        throw new GameError("QUESTION_ONLY", "Only the question holder enters the key.", 403);
      }
      if (participant.paired_at) return { status: "MATCH_FOUND", participant: this.participantSnapshotById(participantId) };
      const entered = this.db.prepare(`
        SELECT * FROM qa_pairs WHERE team_id=? AND answer_key=?
      `).get(participant.team_id, key.trim()) as Row | undefined;
      if (!entered || entered.id !== participant.qa_pair_id) {
        const failures = (attempts?.count ?? 0) + 1;
        this.failedMatches.set(participantId, {
          count: failures >= 5 ? 0 : failures,
          blockedUntil: failures >= 5 ? Date.now() + 3000 : 0
        });
        throw new GameError("WRONG_KEY", "WRONG AAL — iniyum nokku.", 422);
      }
      if (entered.matched_at) throw new GameError("PAIR_USED", "This pair is already locked.", 409);
      const answer = this.db.prepare("SELECT paired_at,active FROM participants WHERE id=?").get(entered.answer_participant_id) as Row;
      if (!answer.active || answer.paired_at) throw new GameError("PAIR_UNAVAILABLE", "This pair is no longer available.", 409);
      const matchedAt = now();
      this.db.prepare("UPDATE qa_pairs SET matched_at=? WHERE id=? AND matched_at IS NULL").run(matchedAt, entered.id);
      this.db.prepare("UPDATE participants SET paired_at=? WHERE id IN (?,?)")
        .run(matchedAt, participant.id, entered.answer_participant_id);
      audit(this.db, String(participant.id), "qa.pair_matched", String(entered.id));
      this.failedMatches.delete(participantId);
      this.bus.emit("qa.pair_matched", {
        teamId: participant.team_id,
        participantIds: [participant.id, entered.answer_participant_id]
      });
      return { status: "MATCH_FOUND", participant: this.participantSnapshotById(participantId) };
    });
  }

  submitTheory(teamId: string, theory: string) {
    const clean = theory.trim().slice(0, 500);
    if (!clean) throw new GameError("THEORY_REQUIRED", "Enter the team's theory.");
    if (this.event().phase !== "MYSTERY") throw new GameError("NOT_MYSTERY", "Theory submission is closed.", 409);
    const result = this.db.prepare(`
      UPDATE teams SET theory=?,theory_submitted_at=? WHERE id=? AND theory IS NULL
    `).run(clean, now(), teamId);
    if (Number(result.changes) !== 1) throw new GameError("THEORY_LOCKED", "This theory is already locked.", 409);
    audit(this.db, `volunteer:${teamId}`, "team.theory_submitted", teamId);
    this.bus.emit("team.theory_submitted", { teamId });
    return { theory: clean, locked: true };
  }

  deactivateParticipant(participantId: string, active: boolean) {
    return transaction(this.db, () => {
      const participant = this.db.prepare("SELECT * FROM participants WHERE id=?").get(participantId) as Row | undefined;
      if (!participant) throw new GameError("NOT_FOUND", "Participant not found.", 404);
      this.db.prepare("UPDATE participants SET active=? WHERE id=?").run(active ? 1 : 0, participantId);
      if (!active && participant.qa_pair_id && !participant.paired_at) {
        const pair = this.db.prepare("SELECT * FROM qa_pairs WHERE id=?").get(participant.qa_pair_id) as Row | undefined;
        if (pair) {
          const counterpartId = pair.question_participant_id === participantId
            ? String(pair.answer_participant_id) : String(pair.question_participant_id);
          this.db.prepare("UPDATE participants SET qa_role='DETECTIVE',qa_pair_id=NULL,puzzle_index=NULL WHERE id=? AND paired_at IS NULL")
            .run(counterpartId);
          this.db.prepare("DELETE FROM qa_pairs WHERE id=? AND matched_at IS NULL").run(participant.qa_pair_id);
        }
        this.db.prepare("UPDATE participants SET qa_role='DETECTIVE',qa_pair_id=NULL,puzzle_index=NULL WHERE id=? AND paired_at IS NULL")
          .run(participantId);
      }
      audit(this.db, "host", active ? "participant.activated" : "participant.deactivated", participantId);
      this.bus.emit("participant.updated", { participantId, teamId: participant.team_id });
      return this.participantSnapshotById(participantId);
    });
  }

  hostParticipants(search = "") {
    const term = `%${search.trim()}%`;
    return this.db.prepare(`
      SELECT p.id,p.display_name,p.active,p.checked_in_at,p.qa_role,p.paired_at,t.name AS team_name,t.emoji
      FROM participants p JOIN teams t ON t.id=p.team_id
      WHERE p.display_name LIKE ? OR p.id LIKE ? OR t.name LIKE ?
      ORDER BY p.created_at DESC LIMIT 100
    `).all(term, term, term);
  }
}
