import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createApp } from "./app.js";
import { openDatabase } from "./db.js";
import { GameService } from "./game.js";
import { hash, now } from "./utils.js";
import { AssetStore } from "./assets.js";

let db: ReturnType<typeof openDatabase>;
let temporaryDirectories: string[] = [];
beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "orientation-test-data-"));
  temporaryDirectories.push(process.env.DATA_DIR);
  delete process.env.HOST_BOOTSTRAP_SECRET;
  delete process.env.ADMIN_BOOTSTRAP_SECRET;
  delete process.env.PROJECTOR_BOOTSTRAP_SECRET;
  delete process.env.VOLUNTEER_TOKEN_PREFIX;
  db = openDatabase(":memory:");
  db.prepare("UPDATE events SET phase='ASSEMBLY'").run();
});
afterEach(() => {
  db.close();
  temporaryDirectories.forEach(directory => rmSync(directory, { recursive: true, force: true }));
  temporaryDirectories = [];
});

function makeAssetRoot(mode: "demo" | "approved" = "approved") {
  const root = mkdtempSync(join(tmpdir(), "orientation-assets-"));
  temporaryDirectories.push(root);
  writeFileSync(join(root, "asset-manifest.json"), JSON.stringify({
    version: 1,
    mode,
    memeReferencePattern: "generated-assets/meme-references/{teamSlug}/{templateId}.webp",
    mysterySourcePattern: "generated-assets/mysteries/{teamSlug}/source.webp",
    puzzleTilePattern: "generated-assets/mysteries/{teamSlug}/tiles/{tileIndex}.webp"
  }));
  return root;
}

function put(root: string, relativePath: string, bytes: string) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
}

async function staffCookie(app: ReturnType<typeof createApp>["app"], role: string, token: string, teamSlug?: string) {
  const login = await app.request("/api/auth/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, token, teamSlug })
  });
  expect(login.status).toBe(200);
  return login.headers.get("set-cookie")!.split(";")[0];
}

describe("HTTP authorization", () => {
  it("rejects a cross-team meme upload even with a valid volunteer session", async () => {
    const stamp = now();
    db.prepare(`INSERT INTO participants
      (id,display_name,team_id,session_hash,scan_token_hash,checked_in_at,created_at,last_seen_at)
      VALUES(?,?,?,?,?,?,?,?)`).run("panda-p", "Panda Person", "team-panda", hash("s"), hash("q"), stamp, stamp, stamp);
    db.prepare(`INSERT INTO participants
      (id,display_name,team_id,session_hash,scan_token_hash,checked_in_at,created_at,last_seen_at)
      VALUES(?,?,?,?,?,?,?,?)`).run("panda-p2", "Second Panda", "team-panda", hash("s2"), hash("q2"), stamp, stamp, stamp);
    const game = new GameService(db);
    game.generateMemeAssignments();
    const assignment = db.prepare("SELECT id FROM meme_assignments WHERE team_id='team-panda' LIMIT 1").get() as { id: string };
    const { app } = createApp(db);
    const login = await app.request("/api/auth/bootstrap", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "volunteer", teamSlug: "lion", token: "volunteer-demo-lion" })
    });
    expect(login.status).toBe(200);
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    const form = new FormData();
    form.append("photo", new File([new Uint8Array([1, 2, 3])], "tiny.jpg", { type: "image/jpeg" }));
    const response = await app.request(`/api/volunteer/meme/${assignment.id}/upload`, {
      method: "POST", headers: { Cookie: cookie }, body: form
    });
    expect(response.status).toBe(403);
    expect((await response.json() as any).error).toBe("TEAM_MISMATCH");
  });

  it("rotates both recovery credentials and restores a usable QR before check-in", async () => {
    const game = new GameService(db);
    const joined = game.createParticipant("Recovery Student");
    const { app } = createApp(db);
    const adminCookie = await staffCookie(app, "admin", "admin-demo-secret");
    const recovery = await app.request(`/api/admin/participants/${joined.participant.id}/recovery`, {
      method: "POST",
      headers: { Cookie: adminCookie }
    });
    expect(recovery.status).toBe(200);
    const recoveryUrl = new URL((await recovery.json() as { recoveryUrl: string }).recoveryUrl);
    const sessionToken = recoveryUrl.searchParams.get("recover")!;
    const scanToken = recoveryUrl.searchParams.get("scan")!;
    expect(sessionToken).toBeTruthy();
    expect(scanToken).toBeTruthy();
    expect(() => game.restoreParticipant(joined.sessionToken)).toThrowError("session");
    expect(() => game.scan(String(joined.participant.team.id), joined.scanToken)).toThrowError("not valid");

    const restored = await app.request("/api/participant/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken, scanToken })
    });
    expect(restored.status).toBe(200);
    const payload = await restored.json() as any;
    expect(payload.participant.id).toBe(joined.participant.id);
    expect(payload.participant.checkedIn).toBe(false);
    expect(payload.scanToken).toBe(scanToken);
    expect(game.scan(String(joined.participant.team.id), scanToken).status).toBe("FOUND");
  });

  it("serves an installed generated meme reference and uses SVG fallback only outside production", async () => {
    const stamp = now();
    const insert = db.prepare(`INSERT INTO participants
      (id,display_name,team_id,session_hash,scan_token_hash,checked_in_at,created_at,last_seen_at)
      VALUES(?,?,?,?,?,?,?,?)`);
    insert.run("meme-a", "Meme A", "team-lion", hash("meme-session-a"), hash("meme-scan-a"), stamp, stamp, stamp);
    insert.run("meme-b", "Meme B", "team-lion", hash("meme-session-b"), hash("meme-scan-b"), stamp, stamp, stamp);
    const game = new GameService(db);
    game.generateMemeAssignments();
    db.prepare("UPDATE events SET phase='MEME'").run();
    const assignment = db.prepare(`
      SELECT ma.template_id FROM participants p JOIN meme_assignments ma ON ma.id=p.meme_assignment_id WHERE p.id='meme-a'
    `).get() as { template_id: string };

    const approvedRoot = makeAssetRoot();
    put(approvedRoot, `generated-assets/meme-references/lion/${assignment.template_id}.webp`, "approved-meme");
    const approved = createApp(db, { assets: new AssetStore(approvedRoot, { NODE_ENV: "development" }) });
    const generatedResponse = await approved.app.request("/api/participant/meme-reference", {
      headers: { Cookie: "participant_session=meme-session-a" }
    });
    expect(generatedResponse.status).toBe(200);
    expect(generatedResponse.headers.get("content-type")).toContain("image/webp");
    expect(await generatedResponse.text()).toBe("approved-meme");

    const demoRoot = makeAssetRoot("demo");
    const demo = createApp(db, { assets: new AssetStore(demoRoot, { NODE_ENV: "development" }) });
    const fallbackResponse = await demo.app.request("/api/participant/meme-reference", {
      headers: { Cookie: "participant_session=meme-session-a" }
    });
    expect(fallbackResponse.status).toBe(200);
    expect(fallbackResponse.headers.get("content-type")).toContain("image/svg+xml");

    const production = createApp(db, { assets: new AssetStore(demoRoot, { NODE_ENV: "production" }) });
    const blockedResponse = await production.app.request("/api/participant/meme-reference", {
      headers: { Cookie: "participant_session=meme-session-a" }
    });
    expect(blockedResponse.status).toBe(503);
    expect((await blockedResponse.json() as any).error).toBe("ASSET_NOT_READY");
  });

  it("serves generated puzzle tiles and protects the approved mystery source until REVEAL", async () => {
    const stamp = now();
    db.prepare(`INSERT INTO participants
      (id,display_name,team_id,session_hash,scan_token_hash,checked_in_at,puzzle_index,paired_at,created_at,last_seen_at)
      VALUES(?,?,?,?,?,?,?,?,?,?)`).run(
      "tile-p", "Tile Person", "team-lion", hash("tile-session"), hash("tile-scan"),
      stamp, 0, stamp, stamp, stamp
    );
    db.prepare("UPDATE events SET phase='MYSTERY'").run();
    const root = makeAssetRoot();
    put(root, "generated-assets/mysteries/lion/tiles/00.webp", "approved-tile");
    put(root, "generated-assets/mysteries/lion/source.webp", "approved-source");
    const { app } = createApp(db, { assets: new AssetStore(root, { NODE_ENV: "development" }) });

    const tile = await app.request("/api/participant/tile", {
      headers: { Cookie: "participant_session=tile-session" }
    });
    expect(tile.status).toBe(200);
    expect(tile.headers.get("content-type")).toContain("image/webp");
    expect(await tile.text()).toBe("approved-tile");

    const unauthenticated = await app.request("/api/reveal/mystery/team-lion");
    expect(unauthenticated.status).toBe(401);
    const projectorCookie = await staffCookie(app, "projector", "projector-demo-secret");
    const locked = await app.request("/api/reveal/mystery/team-lion", {
      headers: { Cookie: projectorCookie }
    });
    expect(locked.status).toBe(403);
    db.prepare("UPDATE events SET phase='REVEAL'").run();
    const revealed = await app.request("/api/reveal/mystery/team-lion", {
      headers: { Cookie: projectorCookie }
    });
    expect(revealed.status).toBe(200);
    expect(revealed.headers.get("content-type")).toContain("image/webp");
    expect(await revealed.text()).toBe("approved-source");
  });

  it("returns not-ready and refuses demo bootstrap when production secrets are invalid", async () => {
    process.env.NODE_ENV = "production";
    process.env.SITE_URL = "https://orientation.mulearnscet.in";
    process.env.SESSION_SECRET = "short";
    delete process.env.ADMIN_BOOTSTRAP_SECRET;
    const { app } = createApp(db, {
      assets: new AssetStore(makeAssetRoot("demo"), { NODE_ENV: "production" })
    });
    const ready = await app.request("/ready");
    expect(ready.status).toBe(503);
    const body = await ready.json() as any;
    expect(body.ready).toBe(false);
    expect(body.configuration).toBe("invalid");
    const bootstrap = await app.request("/api/auth/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin", token: "admin-demo-secret" })
    });
    expect(bootstrap.status).toBe(401);
  });
});
