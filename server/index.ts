import { serve } from "@hono/node-server";
import { openDatabase } from "./db.js";
import { createApp } from "./app.js";
import { assertProductionConfig } from "./config.js";

const port = Number(process.env.PORT ?? 3000);
assertProductionConfig();
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
