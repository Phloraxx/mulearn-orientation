import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { streamSSE } from "hono/streaming";
import { serveStatic } from "@hono/node-server/serve-static";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { OrientationDb } from "./db.js";
import { audit, makeId, transaction } from "./db.js";
import { GameError, GameService } from "./game.js";
import { Slideshow } from "./slideshow.js";
import { escapeXml, hash, now, safeEqual, token } from "./utils.js";
import { PHASES, TEAMS, type Phase } from "./content.js";
import { productionConfigErrors, staffBootstrapSecret } from "./config.js";
import { AssetStore, type ResolvedAsset } from "./assets.js";

type Staff = { role: string; teamId?: string | null };

function sceneMarkup(teamIndex: number) {
  const hue = (teamIndex * 43) % 360;
  return `
    <rect width="700" height="640" fill="hsl(${hue} 72% 18%)"/>
    <circle cx="560" cy="110" r="85" fill="hsl(${(hue + 45) % 360} 90% 65%)"/>
    <path d="M0 480 Q170 400 350 500 T700 450 V640 H0Z" fill="hsl(${(hue + 120) % 360} 55% 28%)"/>
    <g stroke="#fff" stroke-width="16" stroke-linecap="round" fill="none">
      <circle cx="245" cy="225" r="54" fill="#ffcf9d"/>
      <path d="M245 280 L220 420 M220 335 L120 295 M224 345 L345 300 M220 420 L130 535 M220 420 L330 520"/>
      <circle cx="450" cy="300" r="45" fill="#bfdbfe"/>
      <path d="M450 345 L485 455 M470 390 L570 345 M475 450 L410 550 M480 452 L565 530"/>
      <path d="M330 520 Q400 445 475 450" stroke="#facc15"/>
    </g>
    <text x="350" y="70" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="28" font-weight="800">MYSTERY ACTION</text>
  `;
}

function mysterySvg(teamSlug: string, tileIndex?: number) {
  const teamIndex = Math.max(0, TEAMS.findIndex(team => team.slug === teamSlug));
  const team = TEAMS[teamIndex];
  const viewBox = tileIndex === undefined
    ? "0 0 700 640"
    : `${(tileIndex % 7) * 100} ${Math.floor(tileIndex / 7) * 160} 100 160`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice">${sceneMarkup(teamIndex)}</svg>`;
}

function memeReferenceSvg(teamName: string, emoji: string, title: string, color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1100">
    <rect width="900" height="1100" fill="#0b0b14"/><circle cx="450" cy="360" r="260" fill="${escapeXml(color)}"/>
    <text x="450" y="450" text-anchor="middle" font-size="280">${escapeXml(emoji)}</text>
    <text x="450" y="760" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="900" font-size="58">${escapeXml(title)}</text>
    <text x="450" y="840" text-anchor="middle" fill="#c7d2fe" font-family="sans-serif" font-size="34">${escapeXml(teamName)} volunteer placeholder</text>
    <text x="450" y="950" text-anchor="middle" fill="#a1a1aa" font-family="sans-serif" font-size="28">Copy this pose with your assigned group</text>
  </svg>`;
}

export function createApp(db: OrientationDb, options: { assets?: AssetStore } = {}) {
  const app = new Hono();
  const game = new GameService(db);
  const assets = options.assets ?? new AssetStore();
  const dataDir = process.env.DATA_DIR ?? resolve("data");
  const mediaDir = join(dataDir, "media", "event-main");
  const secure = process.env.NODE_ENV === "production";
  const cookieOptions = { httpOnly: true, sameSite: "Lax" as const, secure, path: "/", maxAge: 60 * 60 * 18 };
  let slideshow = new Slideshow(loadSlides(db));

  app.onError((error, c) => {
    if (error instanceof GameError) return c.json({ error: error.code, message: error.message }, error.status as 400);
    console.error(error);
    return c.json({ error: "INTERNAL", message: "Something went wrong. Please retry." }, 500);
  });

  const rateBuckets = new Map<string, { count: number; resetAt: number }>();
  app.use("/api/*", async (c, next) => {
    if (c.req.method === "GET") return next();
    const forwarded = c.req.header("x-forwarded-for")?.split(",")[0].trim();
    const key = `${forwarded ?? c.req.header("x-real-ip") ?? "local"}:${c.req.path}`;
    const current = rateBuckets.get(key);
    const time = Date.now();
    if (!current || current.resetAt <= time) rateBuckets.set(key, { count: 1, resetAt: time + 10_000 });
    else {
      current.count++;
      const limit = c.req.path === "/api/auth/bootstrap" ? 40 : 1500;
      if (current.count > limit) throw new GameError("RATE_LIMITED", "Too many requests. Try again shortly.", 429);
    }
    await next();
  });

  const participantId = (c: any) => {
    const raw = getCookie(c, "participant_session");
    if (!raw) throw new GameError("SESSION_REQUIRED", "Join or restore this device first.", 401);
    const row = db.prepare("SELECT id FROM participants WHERE session_hash=?").get(hash(raw)) as { id: string } | undefined;
    if (!row) throw new GameError("SESSION_INVALID", "Participant session expired.", 401);
    return row.id;
  };

  const staff = (c: any, roles: string[]): Staff => {
    const raw = getCookie(c, "staff_session");
    if (!raw) throw new GameError("STAFF_REQUIRED", "Open your provisioned access link.", 401);
    const row = db.prepare(`
      SELECT role,team_id AS teamId FROM staff_sessions WHERE token_hash=? AND expires_at>?
    `).get(hash(raw), now()) as Staff | undefined;
    if (!row || !roles.includes(row.role)) throw new GameError("FORBIDDEN", "This role cannot perform that action.", 403);
    return row;
  };

  app.get("/health", c => c.json({ ok: true, version: process.env.APP_VERSION ?? "dev" }));
  app.get("/ready", async c => {
    const configErrors = productionConfigErrors();
    if (configErrors.length) {
      return c.json({ ready: false, configuration: "invalid", errors: configErrors }, 503);
    }
    const assetErrors = assets.readinessErrors();
    if (assetErrors.length) {
      return c.json({
        ready: false,
        assets: "invalid",
        errors: assetErrors.slice(0, 25),
        errorCount: assetErrors.length
      }, 503);
    }
    await mkdir(mediaDir, { recursive: true });
    const teamCount = Number((db.prepare("SELECT COUNT(*) AS n FROM teams").get() as { n: number }).n);
    const probe = join(mediaDir, ".write-probe");
    await writeFile(probe, "ok");
    return c.json({ ready: teamCount === 20, database: "ok", media: "writable", teams: teamCount }, teamCount === 20 ? 200 : 503);
  });

  app.post("/api/join", async c => {
    const body = await c.req.json<{ displayName?: string }>();
    const result = game.createParticipant(body.displayName ?? "");
    setCookie(c, "participant_session", result.sessionToken, cookieOptions);
    return c.json({ participant: result.participant, scanToken: result.scanToken }, 201);
  });

  app.post("/api/participant/restore", async c => {
    const body: { sessionToken?: string; scanToken?: string } =
      await c.req.json<{ sessionToken?: string; scanToken?: string }>().catch(() => ({}));
    if (body.sessionToken) setCookie(c, "participant_session", body.sessionToken, cookieOptions);
    const raw = body.sessionToken ?? getCookie(c, "participant_session");
    if (!raw) throw new GameError("SESSION_REQUIRED", "No participant session.", 401);
    const participant = game.restoreParticipant(raw);
    if (body.scanToken) {
      const matchingScan = db.prepare(`
        SELECT id FROM participants WHERE id=? AND scan_token_hash=?
      `).get(participant.id, hash(body.scanToken)) as { id: string } | undefined;
      if (!matchingScan) throw new GameError("RECOVERY_SCAN_INVALID", "Recovery QR token is invalid.", 401);
    }
    return c.json({ participant, ...(body.scanToken ? { scanToken: body.scanToken } : {}) });
  });

  app.get("/api/participant/snapshot", c => c.json({ participant: game.participantSnapshotById(participantId(c)) }));
  app.post("/api/participant/match", async c => {
    const body = await c.req.json<{ key?: string }>();
    return c.json(game.match(participantId(c), body.key ?? ""));
  });

  app.get("/api/participant/meme-reference", async c => {
    const id = participantId(c);
    const snapshot = game.participantSnapshotById(id);
    if (snapshot.phase !== "MEME" || !snapshot.meme) throw new GameError("NOT_AVAILABLE", "Meme reference is not available.", 404);
    const assignment = db.prepare(`
      SELECT ma.template_id FROM participants p JOIN meme_assignments ma ON ma.id=p.meme_assignment_id WHERE p.id=?
    `).get(id) as { template_id: string } | undefined;
    const generated = assignment
      ? assets.memeReference(String(snapshot.team.slug), assignment.template_id)
      : null;
    if (generated) return serveAsset(generated, "private, max-age=300");
    if (!assets.placeholdersAllowed()) {
      throw new GameError("ASSET_NOT_READY", "Approved meme reference is missing.", 503);
    }
    return c.body(memeReferenceSvg(String(snapshot.team.name), String(snapshot.team.emoji), String(snapshot.meme.title), String(snapshot.team.color)), 200, {
      "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=300"
    });
  });

  app.get("/api/participant/tile", async c => {
    const id = participantId(c);
    const row = db.prepare(`
      SELECT p.paired_at,p.puzzle_index,t.slug FROM participants p JOIN teams t ON t.id=p.team_id WHERE p.id=?
    `).get(id) as { paired_at: string | null; puzzle_index: number | null; slug: string };
    if (!row.paired_at || row.puzzle_index === null) throw new GameError("TILE_LOCKED", "Match first to unlock your tile.", 403);
    const generated = assets.puzzleTile(row.slug, row.puzzle_index);
    if (generated) return serveAsset(generated, "private, max-age=3600");
    if (!assets.placeholdersAllowed()) {
      throw new GameError("ASSET_NOT_READY", "Approved puzzle tile is missing.", 503);
    }
    return c.body(mysterySvg(row.slug, row.puzzle_index), 200, {
      "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=3600"
    });
  });

  app.post("/api/auth/bootstrap", async c => {
    const body = await c.req.json<{ role?: string; token?: string; teamSlug?: string }>();
    const role = body.role ?? "";
    let teamId: string | null = null;
    let valid = false;
    if (role === "volunteer" && body.teamSlug) {
      const team = db.prepare("SELECT id,volunteer_token_hash FROM teams WHERE slug=?").get(body.teamSlug) as
        { id: string; volunteer_token_hash: string } | undefined;
      valid = Boolean(team && hash(body.token ?? "") === team.volunteer_token_hash);
      teamId = team?.id ?? null;
    } else {
      const expected = staffBootstrapSecret(role);
      valid = Boolean(expected && safeEqual(body.token ?? "", expected));
    }
    if (!valid) throw new GameError("BAD_BOOTSTRAP", "Invalid provisioned access token.", 401);
    const raw = token();
    db.prepare(`INSERT INTO staff_sessions(id,token_hash,role,team_id,expires_at,created_at)
      VALUES(?,?,?,?,?,?)`).run(
      makeId("staff"), hash(raw), role, teamId,
      new Date(Date.now() + 18 * 60 * 60_000).toISOString(), now()
    );
    setCookie(c, "staff_session", raw, cookieOptions);
    return c.json({ ok: true, role, teamId });
  });

  app.get("/api/public/snapshot", c => c.json(game.publicSnapshot()));

  app.get("/api/volunteer/snapshot", c => {
    const auth = staff(c, ["volunteer"]);
    const team = db.prepare(`
      SELECT * FROM teams WHERE id=?
    `).get(auth.teamId ?? null) as Record<string, string | number | null>;
    const assignments = db.prepare(`
      SELECT ma.*,GROUP_CONCAT(p.display_name, ' + ') AS members,m.id AS media_id,m.status AS upload_status
      FROM meme_assignments ma LEFT JOIN participants p ON p.meme_assignment_id=ma.id AND p.active=1
      LEFT JOIN media m ON m.id=ma.captured_media_id WHERE ma.team_id=? GROUP BY ma.id ORDER BY ma.rowid
    `).all(auth.teamId ?? null);
    const progress = game.teamProgress(String(auth.teamId));
    const qa = db.prepare(`
      SELECT COUNT(*) AS total,SUM(CASE WHEN matched_at IS NOT NULL THEN 1 ELSE 0 END) AS matched FROM qa_pairs WHERE team_id=?
    `).get(auth.teamId ?? null) as { total: number; matched: number | null };
    return c.json({
      event: game.event(),
      team: { id: team.id, slug: team.slug, name: team.name, emoji: team.emoji, theory: team.theory },
      progress, assignments, qa: { total: Number(qa.total), matched: Number(qa.matched ?? 0) }
    });
  });

  app.post("/api/volunteer/scan", async c => {
    const auth = staff(c, ["volunteer"]);
    const body = await c.req.json<{ scanToken?: string }>();
    return c.json(game.scan(String(auth.teamId), body.scanToken ?? ""));
  });

  app.post("/api/volunteer/theory", async c => {
    const auth = staff(c, ["volunteer"]);
    const body = await c.req.json<{ theory?: string }>();
    return c.json(game.submitTheory(String(auth.teamId), body.theory ?? ""));
  });

  app.post("/api/volunteer/meme/:assignmentId/upload", async c => {
    const auth = staff(c, ["volunteer"]);
    const assignmentId = c.req.param("assignmentId");
    const assignment = db.prepare("SELECT * FROM meme_assignments WHERE id=?").get(assignmentId) as
      { id: string; team_id: string; captured_media_id: string | null } | undefined;
    if (!assignment) throw new GameError("ASSIGNMENT_NOT_FOUND", "Meme assignment not found.", 404);
    if (assignment.team_id !== auth.teamId) throw new GameError("TEAM_MISMATCH", "That meme belongs to another team.", 403);
    if (assignment.captured_media_id) {
      return c.json({ ok: true, mediaId: assignment.captured_media_id, status: "ALREADY_UPLOADED" });
    }
    const form = await c.req.formData();
    const file = form.get("photo");
    if (!(file instanceof File)) throw new GameError("PHOTO_REQUIRED", "Choose a photo.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new GameError("BAD_MEDIA", "Use JPEG, PNG, or WebP.");
    if (file.size > 6 * 1024 * 1024) throw new GameError("TOO_LARGE", "Photo must be under 6 MB.");
    await mkdir(mediaDir, { recursive: true });
    const mediaId = makeId("media");
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const relativePath = `${mediaId}.${extension}`;
    await writeFile(join(mediaDir, relativePath), Buffer.from(await file.arrayBuffer()));
    db.prepare(`INSERT INTO media(id,team_id,assignment_id,relative_path,mime_type,created_at)
      VALUES(?,?,?,?,?,?)`).run(mediaId, auth.teamId, assignmentId, relativePath, file.type, now());
    db.prepare("UPDATE meme_assignments SET captured_media_id=?,captured_at=? WHERE id=?")
      .run(mediaId, now(), assignmentId);
    audit(db, `volunteer:${auth.teamId}`, "meme.photo_added", mediaId);
    const slide = { id: mediaId, createdAt: now() };
    slideshow.add(slide);
    game.bus.emit("meme.photo_added", { teamId: auth.teamId, mediaId });
    return c.json({ ok: true, mediaId }, 201);
  });

  app.get("/media/meme/:id", async c => {
    staff(c, ["projector", "host", "volunteer"]);
    const media = db.prepare("SELECT relative_path,mime_type FROM media WHERE id=? AND status='READY'")
      .get(c.req.param("id")) as { relative_path: string; mime_type: string } | undefined;
    if (!media || basename(media.relative_path) !== media.relative_path) throw new GameError("MEDIA_NOT_FOUND", "Media not found.", 404);
    const path = join(mediaDir, media.relative_path);
    if (!existsSync(path)) throw new GameError("MEDIA_MISSING", "Media file is missing.", 404);
    return new Response(await readFile(path), { headers: {
      "Content-Type": media.mime_type,
      "Cache-Control": "private, max-age=86400"
    } });
  });

  app.get("/api/projector/next-slide", c => {
    staff(c, ["projector", "host"]);
    const next = slideshow.next();
    if (!next) return c.json({ slide: null, durationMs: 5000, unseenBacklog: 0 });
    db.prepare("UPDATE media SET shown_at=COALESCE(shown_at,?) WHERE id=?").run(now(), next.slide.id);
    const media = db.prepare(`
      SELECT m.id,t.name,t.emoji FROM media m JOIN teams t ON t.id=m.team_id WHERE m.id=?
    `).get(next.slide.id) as Record<string, string | number | null>;
    return c.json({ ...next, slide: { ...media, url: `/media/meme/${media.id}` } });
  });

  app.get("/api/reveal/mystery/:teamId", async c => {
    staff(c, ["projector", "host"]);
    const event = game.event();
    if (event.phase !== "REVEAL") throw new GameError("REVEAL_LOCKED", "Mystery image is still locked.", 403);
    const team = db.prepare("SELECT slug FROM teams WHERE id=?").get(c.req.param("teamId")) as { slug: string } | undefined;
    if (!team) throw new GameError("TEAM_NOT_FOUND", "Team not found.", 404);
    const generated = assets.mysterySource(team.slug);
    if (generated) return serveAsset(generated, "private, no-store");
    if (!assets.placeholdersAllowed()) {
      throw new GameError("ASSET_NOT_READY", "Approved mystery source is missing.", 503);
    }
    return c.body(mysterySvg(team.slug), 200, { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" });
  });

  app.post("/api/host/phase", async c => {
    staff(c, ["host"]);
    const body = await c.req.json<{ phase?: Phase; mysteryMinutes?: number }>();
    return c.json(game.setPhase(body.phase as Phase, Math.max(1, Math.min(30, body.mysteryMinutes ?? 12))));
  });

  app.post("/api/host/reveal", async c => {
    staff(c, ["host"]);
    const body = await c.req.json<{ teamId?: string; step?: string }>();
    const steps = ["THEORY", "COUNTDOWN", "ACTUAL_IMAGE"];
    const step = body.step ?? "";
    if (!steps.includes(step)) throw new GameError("BAD_STEP", "Unknown reveal step.");
    db.prepare("UPDATE events SET reveal_team_id=?,reveal_step=?,updated_at=?").run(body.teamId ?? null, step, now());
    game.bus.emit("reveal.changed", { ...body, step });
    return c.json({ ok: true });
  });

  app.get("/api/host/snapshot", c => {
    staff(c, ["host", "projector"]);
    const snapshot = game.publicSnapshot();
    const theories = snapshot.event.phase === "REVEAL"
      ? db.prepare("SELECT id,theory FROM teams ORDER BY display_order").all()
      : db.prepare("SELECT id FROM teams ORDER BY display_order").all();
    return c.json({ ...snapshot, theories });
  });

  app.get("/api/host/participants", c => {
    staff(c, ["host"]);
    return c.json({ participants: game.hostParticipants(c.req.query("q") ?? "") });
  });

  app.get("/api/host/overview", c => {
    staff(c, ["host"]);
    return c.json({
      teams: db.prepare("SELECT id,name,emoji FROM teams ORDER BY display_order").all(),
      media: db.prepare(`
        SELECT m.id,m.status,m.created_at,t.name AS team_name,ma.title
        FROM media m JOIN teams t ON t.id=m.team_id JOIN meme_assignments ma ON ma.id=m.assignment_id
        ORDER BY m.created_at DESC LIMIT 100
      `).all(),
      event: game.event()
    });
  });

  app.post("/api/host/participants/:id/active", async c => {
    staff(c, ["host"]);
    const body = await c.req.json<{ active?: boolean }>();
    return c.json({ participant: game.deactivateParticipant(c.req.param("id"), Boolean(body.active)) });
  });

  app.post("/api/host/participants/:id/check-in", async c => {
    staff(c, ["host"]);
    const body = await c.req.json<{ checkedIn?: boolean }>();
    db.prepare("UPDATE participants SET checked_in_at=? WHERE id=?").run(body.checkedIn ? now() : null, c.req.param("id"));
    audit(db, "host", body.checkedIn ? "participant.manual_checkin" : "participant.manual_uncheck", c.req.param("id"));
    game.bus.emit("participant.updated", { participantId: c.req.param("id") });
    return c.json({ ok: true });
  });

  app.post("/api/host/participants/:id/recovery", c => {
    staff(c, ["host"]);
    const sessionToken = token();
    const scanToken = token(16);
    transaction(db, () => {
      const result = db.prepare(`
        UPDATE participants SET session_hash=?,scan_token_hash=? WHERE id=?
      `).run(hash(sessionToken), hash(scanToken), c.req.param("id"));
      if (!result.changes) throw new GameError("NOT_FOUND", "Participant not found.", 404);
      audit(db, "host", "participant.session_and_scan_recovered", c.req.param("id"));
    });
    const site = process.env.SITE_URL ?? "http://localhost:5173";
    return c.json({
      recoveryUrl: `${site}/?recover=${sessionToken}&scan=${scanToken}`
    });
  });

  app.post("/api/host/participants/:id/reassign", async c => {
    staff(c, ["host"]);
    const event = game.event();
    if (!["SETUP", "ASSEMBLY"].includes(String(event.phase))) {
      throw new GameError("ASSIGNMENTS_LOCKED", "Team reassignment is only safe before Meme mode.", 409);
    }
    const body = await c.req.json<{ teamId?: string }>();
    const team = db.prepare("SELECT id FROM teams WHERE id=?").get(body.teamId ?? "") as { id: string } | undefined;
    if (!team) throw new GameError("TEAM_NOT_FOUND", "Target team not found.", 404);
    const result = db.prepare(`
      UPDATE participants SET team_id=?,checked_in_at=NULL,meme_assignment_id=NULL,qa_role='NONE',
        qa_pair_id=NULL,puzzle_index=NULL,paired_at=NULL WHERE id=?
    `).run(team.id, c.req.param("id"));
    if (!result.changes) throw new GameError("NOT_FOUND", "Participant not found.", 404);
    audit(db, "host", "participant.reassigned", c.req.param("id"), { teamId: team.id });
    game.bus.emit("participant.updated", { participantId: c.req.param("id"), teamId: team.id });
    return c.json({ participant: game.participantSnapshotById(c.req.param("id")) });
  });

  app.post("/api/host/qa/regenerate", c => {
    staff(c, ["host"]);
    const phase = String(game.event().phase);
    if (["MYSTERY", "REVEAL", "ENDED"].includes(phase)) throw new GameError("QA_LOCKED", "Q&A is already locked.", 409);
    game.generateQaAssignments(true);
    return c.json({ ok: true });
  });

  app.post("/api/host/media/:id/reset", c => {
    staff(c, ["host"]);
    const media = db.prepare("SELECT assignment_id FROM media WHERE id=?").get(c.req.param("id")) as { assignment_id: string } | undefined;
    if (!media) throw new GameError("NOT_FOUND", "Media not found.", 404);
    db.prepare("UPDATE media SET status='RESET' WHERE id=?").run(c.req.param("id"));
    db.prepare("UPDATE meme_assignments SET captured_media_id=NULL,captured_at=NULL WHERE id=?").run(media.assignment_id);
    audit(db, "host", "media.reset", c.req.param("id"));
    slideshow = new Slideshow(loadSlides(db));
    return c.json({ ok: true });
  });

  app.post("/api/host/teams/:id/theory-clear", c => {
    staff(c, ["host"]);
    db.prepare("UPDATE teams SET theory=NULL,theory_submitted_at=NULL WHERE id=?").run(c.req.param("id"));
    audit(db, "host", "team.theory_cleared", c.req.param("id"));
    game.bus.emit("team.theory_submitted", { teamId: c.req.param("id"), cleared: true });
    return c.json({ ok: true });
  });

  app.post("/api/host/reset", async c => {
    staff(c, ["host"]);
    const body = await c.req.json<{ confirm?: string }>().catch(() => ({ confirm: undefined }));
    if (body.confirm !== "RESET") throw new GameError("RESET_CONFIRMATION", "Type RESET to confirm a full event reset.", 422);
    transaction(db, () => {
      db.exec("DELETE FROM media; DELETE FROM qa_pairs; DELETE FROM meme_assignments; DELETE FROM participants;");
      db.prepare("UPDATE teams SET theory=NULL,theory_submitted_at=NULL").run();
      db.prepare("UPDATE events SET phase='SETUP',mystery_ends_at=NULL,reveal_team_id=NULL,reveal_step='THEORY',updated_at=?").run(now());
      audit(db, "host", "event.reset", "event-main");
    });
    await rm(mediaDir, { recursive: true, force: true });
    await mkdir(mediaDir, { recursive: true });
    slideshow = new Slideshow([]);
    game.bus.emit("phase.changed", { phase: "SETUP", reset: true });
    return c.json({ ok: true, snapshot: game.publicSnapshot() });
  });

  app.get("/api/stream", c => {
    let allowed = false;
    try { participantId(c); allowed = true; } catch {}
    if (!allowed) {
      try { staff(c, ["volunteer", "host", "projector"]); allowed = true; } catch {}
    }
    if (!allowed) throw new GameError("SESSION_REQUIRED", "Session required.", 401);
    return streamSSE(c, async stream => {
      let closed = false;
      const unsubscribe = game.bus.subscribe((event, data) => {
        if (!closed) void stream.writeSSE({ event, data: JSON.stringify(data) });
      });
      stream.onAbort(() => { closed = true; unsubscribe(); });
      await stream.writeSSE({ event: "snapshot.required", data: "{}" });
      while (!closed) {
        await stream.sleep(15_000);
        if (!closed) await stream.writeSSE({ event: "heartbeat", data: String(Date.now()) });
      }
    });
  });

  const clientRoot = resolve("dist-client");
  if (existsSync(clientRoot)) {
    app.use("/*", serveStatic({ root: "./dist-client" }));
    app.get("*", serveStatic({ path: "./dist-client/index.html" }));
  }
  return { app, game, assets };
}

async function serveAsset(asset: ResolvedAsset, cacheControl: string) {
  return new Response(await readFile(asset.path), {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function loadSlides(db: OrientationDb) {
  return (db.prepare(`
    SELECT id,created_at AS createdAt,shown_at AS shownAt FROM media WHERE status='READY' ORDER BY created_at
  `).all() as Array<{ id: string; createdAt: string; shownAt: string | null }>);
}
