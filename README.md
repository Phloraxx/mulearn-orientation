# µLearn SCET Orientation Game

A live, phone-driven orientation experience for approximately **550 juniors**, split across **20 pre-assigned animal teams**, with one dedicated volunteer per team.

This repository is the single source of truth for the game design, implementation, deployment, volunteer operation, projector experience, and content/assets.

## Event concept

The experience has three connected phases:

1. **Find Your Animal** — every junior scans one public QR code, enters their name, receives a balanced random animal team, finds that team's fixed physical zone, and is checked in by that team's pre-selected volunteer.
2. **Meme Recreation** — juniors are paired/trio-assigned meme poses featuring their own team's volunteer in AI-generated reference images. The team volunteer photographs recreations. Captured photos immediately join an adaptive, never-ending projector slideshow. There is no scoring or judging.
3. **Manglish Match + Mystery Puzzle** — half the team receives sarcastic/funny Manglish questions and the other half matching answers. When a valid pair enters the answer-holder's key, **both phones immediately glitch into separate puzzle pieces**. Pieces are placed on the floor and arranged while other team members are still pairing. The team may submit a description of the mystery action at any time; they do not need to unlock every piece first.

There is intentionally **no overall leaderboard**. Projector views show live progress and entertainment, not competitive ranking.

## Fixed event assumptions

- ~550 participants
- 20 teams, balanced to roughly 27–28 participants each
- 20 pre-selected team volunteers, each permanently mapped to one animal/team for the event
- A team volunteer remains in the team's designated physical zone and **can only scan/manage juniors from that same team**
- ~27 total volunteers available, leaving ~7 for anchors, media, game control, technical support, and floor coordination
- One shared public join QR
- One realtime event session; no student accounts and no long-term student profile database
- Mobile-first participant and volunteer UI
- Dedicated projector UI and host/control UI
- Intended production hostname: **`orientation.mulearnscet.in`** unless changed before deployment

## Recommended implementation

Keep deployment deliberately simple:

- **React + Vite** frontend
- **Node.js** backend (Hono or similarly lightweight HTTP framework)
- **SQLite in WAL mode** for event state
- **SSE** for server → browser realtime updates; ordinary HTTP POST/PUT for participant/volunteer actions
- Local persistent media directory for captured meme photos
- One Docker container / one Dokploy application behind Traefik
- Persistent Docker volume for SQLite + uploaded photos

The projector is an enhancement, not a dependency: participant gameplay must continue even if the projector disconnects.

## Documentation

- [`docs/GAME_SPEC.md`](docs/GAME_SPEC.md) — authoritative gameplay and UX rules
- [`docs/TECHNICAL_ARCHITECTURE.md`](docs/TECHNICAL_ARCHITECTURE.md) — routes, state, realtime model, persistence, media, failure handling
- [`docs/CONTENT_AND_ASSETS.md`](docs/CONTENT_AND_ASSETS.md) — teams, pre-selected volunteers, memes, mystery images, Manglish Q&A
- [`docs/OPERATIONS_RUNBOOK.md`](docs/OPERATIONS_RUNBOOK.md) — event-day volunteer/anchor/control procedures and timing
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Docker/Dokploy/Traefik/subdomain deployment plan
- [`docs/SESSION_DECISIONS.md`](docs/SESSION_DECISIONS.md) — decision history from the planning conversation, including ideas explicitly rejected
- [`docs/CODEX_MASTER_PROMPT.md`](docs/CODEX_MASTER_PROMPT.md) — implementation prompt for Codex
- [`AGENTS.md`](AGENTS.md) — repository-level instructions for coding agents

## Inputs still required before final content freeze

1. A Google Drive link containing the **20 pre-selected team volunteers' photos**, with names clearly identifiable.
2. Confirm or change the intended hostname (`orientation.mulearnscet.in`).
3. Final animal ↔ volunteer mapping, unless we assign the mapping from the supplied photo list.
4. Any Sahrdaya-specific inside jokes/phrases that should be included in the Manglish Q&A bank.
5. Branding assets (µLearn SCET logo/event artwork), if there is a required visual identity.

The application should remain fully testable before those assets arrive by using obvious placeholders and seeded demo data.

## Implemented application

The repository now contains the production single-service application:

- React/Vite mobile UI for participant join/restore and current phase
- fixed-team volunteer scanner, camera capture queue, and early theory submission
- host phase/timer/reveal console
- fixed-order projector assembly/mystery grids and adaptive endless meme slideshow
- technical recovery admin for search, check-in, absence, device recovery, safe reassignment, Q&A regeneration, and media reset
- Hono HTTP/SSE server backed by SQLite WAL
- controlled persistent media storage under `/data/media`
- deterministic placeholder meme and mystery assets
- content validation, puzzle tile generation, demo seed, and 550-participant simulation
- multi-stage production Docker image

Participant identity is an opaque HttpOnly-cookie session; the personal QR contains
only a separate opaque scan token. Staff bootstrap links exchange their URL token
for a time-limited HttpOnly staff session.

## Local development

Node 22.12+ and pnpm 11.9 are required (Node 24 is used by the production image).

```bash
corepack enable
pnpm install
pnpm dev
```

Vite can be run separately on port 5173 with `pnpm dev:client`; it proxies the API
to the server on port 3000.

Useful checks:

```bash
pnpm content:validate
pnpm test
pnpm lint
pnpm build
pnpm simulate:550
```

The safe demo reset deliberately refuses to run unless `DEMO_MODE=1` and
`NODE_ENV` is not `production`.

## Placeholder content workflow

Raw volunteer photos go under the gitignored `content-input/volunteers/<team>/`
tree. `content/asset-manifest.json` documents the reviewed output contract.
`pnpm content:tiles` generates deterministic 7×4 development sources and 28
portrait tiles per team under `generated-assets/`; tile coordinates stay in
private manifests and are never sent through participant APIs.

The runtime SVG stand-ins keep every game flow usable until the organiser supplies
real volunteer photos. AI generation is an optional pre-event asset step only.

## Production environment

Copy `.env.example` into the Dokploy environment and replace every placeholder
with an independently generated random value:

```bash
openssl rand -base64 36
```

Production startup refuses weak/missing staff and session configuration. The
container contract is:

```text
port: 3000
database: /data/orientation.sqlite
captures: /data/media/event-main
volume: /data
```

The first start seeds exactly 20 fixed animal teams and volunteer slots.
After the persistent volume exists, run this once inside the app container to
rotate/provision the fixed volunteer credentials and print all private links:

```bash
node dist-server/server/provision-access.js
```

Do not share host/admin/projector links with participants.

## Dokploy + Traefik deployment

1. Create one Dokploy application from
   `https://github.com/Phloraxx/mulearn-orientation`.
2. Select Dockerfile build, repository root context, and internal port `3000`.
3. Attach a named persistent volume such as `orientation-data` at `/data`.
4. Add every variable from `.env.example`, using strong unique values. Keep
   `SITE_URL=https://orientation.mulearnscet.in`.
5. Configure the Dokploy domain `orientation.mulearnscet.in`, enable HTTPS, and
   route every path to this one service.
6. Ensure Traefik response buffering is disabled for `text/event-stream` and the
   idle timeout is above 30 seconds. The app emits 15-second SSE heartbeats and
   every client fetches an authoritative snapshot after reconnect.
7. Deploy and wait for both `/health` and `/ready` to return HTTP 200.
8. Run `node dist-server/server/provision-access.js` in the running container and distribute the 20
   resulting volunteer links plus the host/admin/projector links privately.
9. Run `pnpm content:validate`, `pnpm test`, and `pnpm simulate:550` against the
   release commit before opening registration.
10. Verify persistence by joining one test participant, restarting the container,
    confirming restoration, and deleting/deactivating that test record in Admin.
11. Create the `orientation` DNS record to the existing Dokploy/Traefik ingress.
    Do not alter the root domain or other subdomains.
12. Snapshot `/data/orientation.sqlite`, `/data/orientation.sqlite-wal` when
    applicable, final manifests, and media content after the dress rehearsal.

For a local container rehearsal:

```bash
cp .env.example .env
# replace every secret first
docker compose up --build
curl -fsS http://localhost:3000/ready
```

## Event access patterns

The provision command prints exact links following these patterns:

```text
https://orientation.mulearnscet.in/volunteer/lion?t=<private-team-token>
https://orientation.mulearnscet.in/host?t=<host-secret>
https://orientation.mulearnscet.in/admin?t=<admin-secret>
https://orientation.mulearnscet.in/projector?t=<projector-secret>
```

After successful bootstrap the query secret is removed from browser history and a
time-limited HttpOnly cookie is used.
