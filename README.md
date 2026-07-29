# µLearn SCET Orientation Game

A live, phone-driven orientation experience for approximately **550 juniors**, split across **20 balanced animal teams**, with one dedicated pre-selected volunteer per team.

This repository is the single source of truth for the game design, implementation, deployment, volunteer operation, projector experience, and content/assets.

## Event concept

The experience has three connected phases:

1. **Find Your Animal** — every junior scans one public QR code, enters their name, receives a balanced random animal team, finds that team's fixed physical zone, and is checked in by that team's pre-selected volunteer.
2. **Meme Recreation** — juniors are paired/trio-assigned one of 15 shared internet meme reference cards. The team volunteer photographs recreations. Captured photos immediately join an adaptive, never-ending projector slideshow. There is no scoring or judging.
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
- Production hostname: **`orientation.mulearnscet.in`**

## Meme-reference bank

The approved structure is **15 reusable reference templates**:

- 14 two-person meme/pose cards
- 1 three-person card

A 28-person team uses all 14 pair cards. A 27-person team uses 12 pair cards + the trio card. Every reference within a team is unique so finding someone with the same image unambiguously identifies the meme partner/group.

The same 15 approved reference images are reused across all 20 teams. Because students only search inside their fixed animal team, the shared references remain unambiguous. Reference images are shown on participant phones only; the projector shows only the juniors' captured recreations.

See [`docs/MEME_REFERENCE_PLAN.md`](docs/MEME_REFERENCE_PLAN.md).

## Branding source

Reuse the existing µLearn Sahrdaya identity from:

> `Phloraxx/MuLearn-Scet-Webpage`

That project already contains the reusable inline µLearn logo and the campus colour palette (`#283618`, `#606c38`, `#fefae0`, `#dda15e`, `#bc6c25`). The orientation game should feel related to the existing campus site while being more playful/game-like.

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
- [`docs/MEME_REFERENCE_PLAN.md`](docs/MEME_REFERENCE_PLAN.md) — exact 14-pair + 1-trio volunteer meme bank and generation rules
- [`docs/OPERATIONS_RUNBOOK.md`](docs/OPERATIONS_RUNBOOK.md) — event-day volunteer/anchor/control procedures and timing
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Docker/Dokploy/Traefik/subdomain deployment plan
- [`docs/SESSION_DECISIONS.md`](docs/SESSION_DECISIONS.md) — decision history from the planning conversation, including ideas explicitly rejected
- [`docs/CODEX_MASTER_PROMPT.md`](docs/CODEX_MASTER_PROMPT.md) — implementation prompt for Codex
- [`AGENTS.md`](AGENTS.md) — repository-level instructions for coding agents

## Current volunteer-photo status

The supplied organiser Drive folder currently contains usable source photos for 8 volunteers: Milan, Sreehari K R, Aaron Stanphen, Hisham, Ann Rose, Christeena, Josbin, and Aksa. More volunteer photos are expected before final content generation.

Raw volunteer source photos should remain outside this public repository by default.

## Inputs still required before final content freeze

1. Remaining volunteer photos needed to reach the final selected volunteer roster.
2. Final animal ↔ volunteer mapping.
3. Any particularly good Sahrdaya-specific inside jokes/phrases to add to the Manglish Q&A bank.

The hostname and branding source are now confirmed. The application should
remain fully testable before the remaining photos arrive by using obvious
placeholders and seeded demo data.

## Implemented application

The repository now contains the production single-service application:

- React/Vite mobile UI for participant join/restore and current phase
- fixed-team volunteer scanner, camera capture queue, and early theory submission
- host phase/timer/reveal console
- fixed-order projector assembly/mystery grids and adaptive endless meme slideshow
- host recovery tools for search, check-in, absence, device recovery, safe reassignment, Q&A regeneration, and media reset
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

## Generated content workflow

Raw volunteer photos go under the gitignored `content-input/volunteers/<team>/`
tree. `content/asset-manifest.json` documents the reviewed output contract.
The template set is fixed at exactly 15 references: 14 unique two-person
templates and one three-person template. Approved meme references are installed
under `content/generated-assets/meme-references/`.

Approved mystery sources are square, text-free action images. `pnpm content:tiles` crops
each real source into its 7×4 set of 28 portrait WebP tiles. Coordinates remain
in private manifests and are never sent through participant APIs. See
`content/generated-assets/README.md` for the exact tree.

Runtime SVG stand-ins keep the game usable only in development/demo mode until
the organiser supplies real assets. Production requires an approved, complete
content bundle; `/ready` fails closed if anything is missing.

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
approved content: /content (read-only)
```

Every production secret must be independently generated, at least 32 characters,
and must not contain demo/placeholder/example text. `SITE_URL` must be the public
HTTPS origin. The image includes the repository's `content/` directory; a
separately managed approved bundle may instead be mounted read-only at
`/content`.

The first start seeds exactly 20 fixed animal teams and volunteer slots.
After the persistent volume exists, run this once inside the app container to
rotate/provision the fixed volunteer credentials and print all private links:

```bash
node dist-server/server/provision-access.js
```

Do not share host/projector links with participants.

## Dokploy + Traefik deployment

1. Create one Dokploy application from
   `https://github.com/Phloraxx/mulearn-orientation`.
2. Select Dockerfile build, repository root context, and internal port `3000`.
3. Attach a named persistent volume such as `orientation-data` at `/data`. If
   content is managed separately, mount the approved bundle read-only at
   `/content`.
4. Add every variable from `.env.example`, using strong unique values. Keep
   `SITE_URL=https://orientation.mulearnscet.in`.
5. Configure the Dokploy domain `orientation.mulearnscet.in`, enable HTTPS, and
   route every path to this one service.
6. Ensure Traefik response buffering is disabled for `text/event-stream` and the
   idle timeout is above 30 seconds. The app emits 15-second SSE heartbeats and
   every client fetches an authoritative snapshot after reconnect.
7. Deploy and wait for both `/health` and `/ready` to return HTTP 200.
8. Run `node dist-server/server/provision-access.js` in the running container and distribute the 20
   resulting volunteer links plus the host/projector links privately.
9. Run `CONTENT_DIR=/path/to/approved-content pnpm content:validate`,
   `pnpm test`, and `pnpm simulate:550` against the release commit before
   opening registration.
10. Verify persistence by joining one test participant, restarting the container,
    confirming restoration, and deleting/deactivating that test record in Host recovery.
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
https://orientation.mulearnscet.in/projector?t=<projector-secret>
```

After successful bootstrap the query secret is removed from browser history and a
time-limited HttpOnly cookie is used.
