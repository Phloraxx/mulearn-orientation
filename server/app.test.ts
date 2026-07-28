import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { openDatabase } from "./db.js";
import { GameService } from "./game.js";
import { hash, now } from "./utils.js";

let db: ReturnType<typeof openDatabase>;
beforeEach(() => {
  process.env.DATA_DIR = "/tmp/orientation-test-data";
  db = openDatabase(":memory:");
  db.prepare("UPDATE events SET phase='ASSEMBLY'").run();
});
afterEach(() => db.close());

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
});
