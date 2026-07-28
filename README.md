# µLearn SCET Orientation Game

A live, phone-driven orientation experience for approximately **550 juniors**, split across **20 balanced animal teams**, with one dedicated pre-selected volunteer per team.

This repository is the single source of truth for the game design, implementation, deployment, volunteer operation, projector experience, and content/assets.

## Event concept

The experience has three connected phases:

1. **Find Your Animal** — every junior scans one public QR code, enters their name, receives a balanced random animal team, finds that team's fixed physical zone, and is checked in by that team's pre-selected volunteer.
2. **Meme Recreation** — juniors are paired/trio-assigned meme poses featuring the real µLearn/Sahrdaya volunteers in AI-generated reference images. The team volunteer photographs recreations. Captured photos immediately join an adaptive, never-ending projector slideshow. There is no scoring or judging.
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

The approved structure is **15 reusable AI-generated reference images total**:

- 14 two-person meme/pose cards
- 1 three-person card

A 28-person team uses all 14 pair cards. A 27-person team uses 12 pair cards + the trio card. Every reference within a team is unique so finding someone with the same image unambiguously identifies the meme partner/group.

The reference images feature the real pre-selected volunteers and are generated **before** the event. They are shown on participant phones only; the projector shows only the juniors' captured recreations.

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

The hostname and branding source are now confirmed. The application should remain fully testable before the remaining photos arrive by using obvious placeholders and seeded demo data.