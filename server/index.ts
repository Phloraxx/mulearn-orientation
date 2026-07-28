import { serve } from "@hono/node-server";
import { openDatabase } from "./db.js";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
if (process.env.NODE_ENV === "production") {
  const required = [
    "SITE_URL", "SESSION_SECRET", "HOST_BOOTSTRAP_SECRET", "ADMIN_BOOTSTRAP_SECRET",
    "PROJECTOR_BOOTSTRAP_SECRET", "VOLUNTEER_TOKEN_PREFIX"
  ];
  const invalid = required.filter(key => !process.env[key] || process.env[key]!.includes("replace-with"));
  if (invalid.length) throw new Error(`Missing or unsafe production configuration: ${invalid.join(", ")}`);
}
const db = openDatabase();
const { app } = createApp(db);

serve({ fetch: app.fetch, port }, info => {
  console.log(`µLearn Orientation listening on http://0.0.0.0:${info.port}`);
});

function shutdown() {
  try { db.exec("PRAGMA wal_checkpoint(TRUNCATE)"); } finally { db.close(); }
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
