# Deployment Plan

## 1. Target

Preferred production hostname:

> **https://orientation.mulearnscet.in**

This is a planning default and can be changed before DNS/deployment.

The user's existing preferred infrastructure is an Oracle/VPS environment with **Dokploy + Traefik**, so the application should deploy as one Dockerised service there.

No Cloudflare Workers runtime is required.

---

# 2. Production topology

```text
Internet
   ↓ HTTPS
mulearnscet.in DNS / Cloudflare routing
   ↓
Traefik (Dokploy)
   ↓
orientation app container :3000
   ├─ React/Vite static app
   ├─ Node/Hono API
   ├─ SSE
   ├─ /data/orientation.sqlite
   └─ /data/media/...
   └─ /content/approved generated event assets (read-only)
```

Persistent Docker volume mounted at `/data`.

---

# 3. Required production files

Implementation should provide:

- `Dockerfile` — multi-stage production build
- `.dockerignore`
- `.env.example`
- health endpoint
- startup migration/initialisation command
- content validation command
- demo/load simulation command

Optional `docker-compose.yml` is useful for local development/testing, but Dokploy should not require multiple production services.

---

# 4. Container contract

Recommended:

```text
PORT=3000
DATA_DIR=/data
DATABASE_PATH=/data/orientation.sqlite
CONTENT_DIR=/content
```

Container should:

1. ensure data directories exist
2. apply safe database migrations
3. validate required runtime config
4. start Node server
5. serve frontend and API from same origin

Same-origin frontend/API avoids unnecessary CORS complexity.

---

# 5. Environment variables

Example `.env.example`:

```bash
NODE_ENV=production
PORT=3000
SITE_URL=https://orientation.mulearnscet.in
DATA_DIR=/data
DATABASE_PATH=/data/orientation.sqlite
CONTENT_DIR=/content

# Generate strong random values before event
SESSION_SECRET=change-me
HOST_BOOTSTRAP_SECRET=change-me
ADMIN_BOOTSTRAP_SECRET=change-me
PROJECTOR_BOOTSTRAP_SECRET=change-me
VOLUNTEER_TOKEN_PREFIX=change-me

# Optional content generation only; never required for live gameplay
OPENAI_API_KEY=
```

Do not commit real secrets.

Production refuses to start when any required secret is absent, shorter than
32 characters, or contains a demo/placeholder/example value. `SITE_URL` must be
the public HTTPS origin and cannot be localhost.

Volunteer access tokens should preferably be generated/provisioned by a provisioning command rather than written as plaintext into source files.

---

# 6. Dokploy application

Create one Dokploy application from:

```text
https://github.com/Phloraxx/mulearn-orientation
```

Build from repository `Dockerfile`.

Set internal port to `3000` (or implementation equivalent).

Attach persistent volume:

```text
orientation-data → /data
```

Approved content may either be baked into `content/` before building the image,
or mounted read-only from a separately managed persistent content volume:

```text
orientation-content → /content (read-only)
```

The directory must contain `asset-manifest.json` with `"mode": "approved"` and
the complete `generated-assets/` tree documented in
`content/generated-assets/README.md`.

Set environment variables from the production secret store/UI.

Do not deploy SQLite/media on the ephemeral container filesystem without a volume.

---

# 7. Traefik / hostname

Configure the Dokploy domain for:

```text
orientation.mulearnscet.in
```

with HTTPS.

The route should send all paths to the same application because frontend, API, SSE, uploaded-media delivery, and host/projector views share the origin.

SSE requirements:

- proxy must not aggressively buffer event streams
- idle connection timeouts must be long enough for SSE
- application should send heartbeat events/comments periodically
- client must reconnect and fetch a fresh snapshot on reconnect anyway

No game correctness should depend on a permanently open SSE socket.

---

# 8. DNS / Cloudflare

Once the final hostname is confirmed, create the appropriate `orientation` DNS record/routing for `mulearnscet.in` to the existing Dokploy/Traefik ingress or Cloudflare Tunnel used by the server.

Do not repoint the root domain or existing `pay.mulearnscet.in` services.

The exact DNS record depends on the current zone/tunnel topology, so production DNS should be applied only after the Dokploy endpoint is known.

---

# 9. Uploaded media serving

Student meme recreations live under persistent `/data/media`.

Do not expose the entire data directory as a raw static filesystem.

Serve media through controlled routes such as:

```text
/media/meme/<opaque-id>
```

Validate IDs and MIME types.

Mystery source images should only be available to reveal/projector/host-authorised routes until reveal mode.

Volunteer raw/source photos should not need to be served publicly in production.

---

# 10. Production build checks

Before deployment passes health/readiness:

- database can open in WAL mode
- migrations succeed
- `/data` writable
- content manifest parses
- exactly 20 teams configured for production event seed
- all enabled teams have volunteers
- the manifest is `approved` and all 300 meme references, 20 mystery sources,
  and 560 puzzle tiles exist

Provide separate `/health` and optionally `/ready` endpoints.

`/health` should be cheap and not depend on external AI APIs.

---

# 11. Pre-event release process

Recommended sequence:

1. Implement/test locally with placeholder assets.
2. Deploy staging/preview on a temporary hostname if desired.
3. Receive volunteer Drive photos.
4. Generate/review final meme references and mystery images.
5. Freeze 20 animal ↔ volunteer mappings.
6. Set the reviewed manifest to `approved` and run content validation against
   that exact content directory.
7. Run automated tests.
8. Run 550-participant load simulation.
9. Deploy the production image with the exact approved `/content` bundle.
10. Verify persistent volume.
11. Provision all volunteer/host/projector access links.
12. Test from real Android + iPhone devices over mobile data.
13. Take pre-event DB/media/content backup/snapshot.
14. Put event into clean `SETUP`/`ASSEMBLY` state.

---

# 12. Event-day deployment safety

Avoid code deploys once the room is actively playing unless there is a severe blocker.

Before doors/opening:

- verify current commit/version in host UI
- verify DB path/volume
- verify health endpoint
- verify one real participant join
- delete/reset that test participant from the host recovery tools
- test Lion volunteer scanner against one Lion and one non-Lion seeded/test participant
- test projector SSE

If the app container restarts during the event, persistent state must restore automatically.

---

# 13. Backups

Before event start:

- copy/snapshot `orientation.sqlite`
- preserve final content assets/manifests

During event, SQLite WAL/checkpoint strategy should be safe for normal operation.

After event:

- export any desired student meme images
- export theories/results if organisers want an archive
- decide whether to retain/delete captured student photos
- back up DB before cleanup

---

# 14. Rollback

Keep the previously known-good image/commit deployable.

A rollback must mount the same `/data` volume and use schema-compatible migrations.

Avoid destructive migrations immediately before the event.

---

# 15. Domain placeholder

Until organiser confirms otherwise, all docs/config examples use:

```text
orientation.mulearnscet.in
```

Change `SITE_URL`, Dokploy hostname, generated QR links, and provisioned volunteer links together if a different subdomain is chosen.
