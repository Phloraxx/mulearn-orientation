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