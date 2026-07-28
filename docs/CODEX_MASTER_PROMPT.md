# Codex Master Implementation Prompt

Copy/paste the prompt below into Codex with this repository attached/open.

---

## Prompt

You are the lead engineer for a live µLearn/Sahrdaya orientation game that will be used by approximately **550 juniors in one room**. You have full access to this repository.

Your task is to **fully implement, test, harden, and prepare this repository for production deployment**. Do not stop at creating a plan, mock-up, README, or partial prototype. Work through the implementation end to end.

### First: read the repository instructions

Before writing code, read these files completely and treat them as authoritative product requirements:

- `AGENTS.md`
- `README.md`
- `docs/GAME_SPEC.md`
- `docs/TECHNICAL_ARCHITECTURE.md`
- `docs/CONTENT_AND_ASSETS.md`
- `docs/OPERATIONS_RUNBOOK.md`
- `docs/DEPLOYMENT.md`
- `docs/SESSION_DECISIONS.md`

`docs/SESSION_DECISIONS.md` exists specifically to prevent you from reintroducing ideas that were considered and rejected during planning.

If your implementation choice conflicts with a documented gameplay rule, the documented rule wins unless there is a genuine technical impossibility. In that case, implement the closest robust alternative and document the exact trade-off.

---

# Non-negotiable product behaviour

The event has **20 animal teams** and approximately 550 participants, normally 27–28 students per team.

There are **20 pre-selected team volunteers**, exactly one per animal. This mapping is configured before the event because the volunteer's identity/photo is part of the team's meme content.

A volunteer stays in that animal's physical zone for the entire game and can **only scan/manage juniors assigned to that same animal**. Enforce this on the server. A Lion volunteer must not be able to scan a Panda participant even by crafting an API request.

There is no overall points system or competitive leaderboard.

## Phase 1 — Find Your Animal

- One shared public QR for every junior.
- Student enters display name.
- Assign a random-looking but balanced animal team.
- Persist participant identity/session; reload/reopen must restore the same team and never reroll.
- Show a personal participant QR.
- Student finds the fixed animal zone/volunteer.
- Volunteer scans only their own team's participants.
- Projector shows a fixed 20-team progress grid, not ranking.

## Phase 2 — Meme Recreation

- Participant sees an assigned meme reference on their phone.
- References are pre-generated from real photos of the **pre-selected volunteer for that team** wherever possible.
- 28-person team: 14 pairs.
- 27-person team: prefer 12 pairs + one trio so nobody is left idle.
- Students find their assigned meme partner/trio inside their team area.
- Volunteer photographs each ready group.
- Camera flow must be extremely fast: capture → reliable background upload → next.
- **No scoring, no approval/deny, no rating, no per-photo celebration animation.**
- Projector **never shows the reference meme**.
- Projector continuously shows only the captured recreations.

The meme slideshow must be adaptive and never-ending while Meme mode is active:

- unseen photos always have priority
- previously shown history fills gaps when no unseen photos exist
- avoid immediate repeats
- display duration speeds up when unseen backlog is high
- retain a hard minimum duration, starting around 1.5 seconds
- small backlog may display around 4–5 seconds
- do not interrupt a currently displayed image before its minimum exposure
- no sound for every meme photo

Implement this as tested logic, not an ad-hoc timer hidden inside a component.

## Phase 3 — Manglish Match + Progressive Mystery Puzzle

This is **one concurrent phase**, not two rounds.

- Half of ordinary participants receive funny/sarcastic Manglish questions.
- Matching half receive answers + short pair keys.
- Content is KTU/seniors/Sahrdaya/college-life humour and should sound like actual Kerala student chat.
- Question-holder talks to the team, finds the matching answer-holder, and enters that answer-holder's key.
- Pair validation is server-side and atomic.

Critical behaviour:

> The instant a valid Q&A pair succeeds, **BOTH PHONES immediately glitch into TWO DISTINCT puzzle pieces**.

Do not wait for other pairs.
Do not add a separate "start puzzle" action.
Do not reveal only one piece per pair.

Matched students can immediately put phones on the floor and start arranging them while the rest of the team is still finding matches. The puzzle must progressively materialise as more pairs succeed.

Puzzle piece UI:

- designed for portrait phones physically placed on the floor
- wake lock where supported
- minimal controls
- no visible piece number, row, column, coordinates, or positional clue
- mixed phone dimensions must be handled gracefully

For odd-sized teams, exactly one unpaired participant becomes **Detective**.

Detective gets no clue, no secret image, no special power. Their screen only explains that their job is to help arrange the phones and figure out what is happening.

### Early theory submission is intentional

The volunteer can submit the team's description of the mystery action **at any time**, even if only part of the puzzle is unlocked.

- do not require all pairs to finish
- do not require full puzzle completion
- theory becomes locked after submission
- remaining participants may continue pairing afterward
- remaining puzzle pieces continue to reveal afterward

Projector during Mystery mode shows fixed team progress + master timer + theory locked state. Do not show theory text until reveal mode. Do not reorder it like a leaderboard.

Final reveal is team theory → short countdown → actual absurd mystery source image.

---

# Architecture constraints

Keep production intentionally simple and operationally reliable.

Implement as one deployable application:

- TypeScript
- React + Vite
- lightweight Node backend, preferably Hono
- SQLite in WAL mode
- HTTP mutations
- SSE for server → browser realtime updates
- persistent local media directory for meme captures
- one Docker container
- one persistent `/data` volume

Production target is the user's existing Oracle/VPS + **Dokploy + Traefik** setup.

Planning default hostname:

`https://orientation.mulearnscet.in`

Do not introduce PocketBase, Supabase, Firebase, Redis, Kafka, external managed DBs, microservices, or third-party auth unless you can prove a hard requirement that the documented architecture cannot satisfy.

The projector is entertainment, never a dependency for game correctness.

---

# Build the complete product surfaces

Implement polished mobile-first routes for:

1. public participant join/restore
2. participant current-game screen
3. team-scoped volunteer interface
4. projector/display
5. host/master control
6. admin/recovery

The UI should feel fun and energetic but stay extremely obvious at 550-person scale. One participant screen should generally have one primary instruction/action.

Add micro-interactions intentionally:

- nice team/animal reveal
- subtle scan/team progress feedback
- wrong pair key feedback
- successful match → glitch → immediate puzzle piece
- projector team-count pulse
- projector theory-lock stamp
- timer urgency
- final reveal countdown

Do **not** add camera-capture micro-interactions or lots of high-frequency sounds.

Mobile Chrome and Mobile Safari matter.

---

# Data and permissions

Implement participant sessions with opaque random IDs/tokens. Names are display-only and not unique identifiers.

Volunteer/team roles are provisioned ahead of time and cannot be claimed publicly.

Volunteer endpoints derive team from authenticated volunteer session. Never trust a browser-submitted team ID for authorisation.

Participant QR contains an opaque scan token, not trusted team/name data.

Provide host/admin/projector provisioned access using strong bootstrap tokens that are exchanged into safer sessions/cookies where practical.

---

# Resilience requirements

The event cannot be blocked by one bad phone.

Implement admin recovery for at least:

- search participant
- manual check-in/uncheck
- deactivate/mark absent participant
- replacement-device session recovery
- broken/pending meme upload inspection/retry/reset
- safe pre-lock team reassignment
- Q&A assignment regeneration before Mystery starts
- handling an absent participant so a team can continue
- host phase recovery after page reload

Refresh/reconnect must restore authoritative server state.

SSE disconnect/reconnect must fetch a new snapshot; never treat an event stream as the sole source of truth.

Meme upload should preserve/retry a captured blob when practical rather than making the volunteer retake because of a brief network issue.

Compress/resize captured photos to a projector-appropriate size instead of storing hundreds of enormous originals.

---

# Content and image assets

The organiser will later provide a Google Drive link containing the real pre-selected volunteer photos.

Do not block implementation on that link.

Create:

- clear `content-input/` / generated-asset structure
- sample/placeholder volunteer identities and images for development
- a 20-team config/manifest
- meme template manifest with pair/trio group sizes
- final generated asset manifest format
- 20 placeholder mystery images or deterministic development stand-ins
- puzzle tile preprocessing script
- content validation command

Implement an **optional pre-event AI asset-generation pipeline/adapter** for volunteer meme references and mystery images. The actual execution may depend on whether the Codex environment has image-generation capability/API credentials. Do not make live gameplay call an image-generation API.

If direct image generation is unavailable, leave the app completely functional with placeholders and make the expected input/output paths obvious so generated images can be dropped in later.

Raw volunteer source photos should be gitignored/not automatically committed because the repository is public unless organiser explicitly decides otherwise.

Student runtime meme captures must live in persistent runtime media storage, not git.

---

# Testing and simulation

Write automated tests for all high-risk rules, especially:

- balanced allocation max skew <= 1
- reload restores same team
- wrong-team volunteer scan is rejected server-side
- duplicate scan is safe/idempotent
- meme capture is team-scoped
- slideshow unseen priority, adaptive timing, min duration, history recycling, recent-repeat avoidance
- Q&A wrong key does not leak answer
- successful pair atomically locks both participants
- same participant/key cannot pair twice
- both distinct puzzle tiles are immediately available after match
- Detective has no clue/tile
- theory can submit before full matching
- matching continues after theory lock
- reconnect snapshot recovery
- missing/deactivated participant does not deadlock a team

Also create a developer simulation/load tool capable of modelling ~550 participants, 20 volunteers, joins, scans, Q&A pair bursts, projector SSE fanout, and meme-photo metadata bursts.

Do not claim scale readiness without actually running representative tests in the environment.

---

# Deployment deliverables

Create a production-ready:

- multi-stage `Dockerfile`
- `.dockerignore`
- `.env.example`
- health endpoint
- database migration/init mechanism
- persistent `/data` handling
- startup script if useful
- production README/deployment commands

Application should listen on one port (suggest 3000) and serve frontend/API/media/realtime from one origin.

Deployment target is Dokploy/Traefik with a persistent volume mounted to `/data` and planned hostname `orientation.mulearnscet.in`.

SSE must survive/reconnect correctly through the production proxy.

Do not make AI APIs part of `/health` or production availability.

---

# Developer experience

Provide scripts that make the project easy to work with, e.g. conceptually:

- `dev`
- `build`
- `start`
- `test`
- `lint`
- `db:migrate`
- `seed:demo`
- `event:reset-demo`
- `content:validate`
- `content:tiles`
- `simulate:550`

Use the package manager you choose consistently and commit the lockfile.

---

# Implementation workflow

1. Read all docs first.
2. Inspect repo state.
3. Create a concise internal implementation checklist.
4. Build backend/data model and tests for invariants first.
5. Build participant/volunteer flows.
6. Build host/projector/admin surfaces.
7. Build media/slideshow pipeline.
8. Build Mystery pairing/puzzle/reveal flow.
9. Add placeholder content/assets + preprocessors.
10. Add Docker/deployment config.
11. Run tests/lint/build.
12. Run 550-user simulation.
13. Fix failures found rather than merely documenting them.
14. Review the entire implementation against `GAME_SPEC.md` and `SESSION_DECISIONS.md` line-by-line for regressions.
15. Leave the repository in a production-ready state with exact remaining external inputs clearly listed.

Do not repeatedly stop to ask for minor decisions that can be represented as configuration/placeholders. The only expected external inputs still pending are real volunteer photos/mapping details, final branding/inside jokes, and final hostname confirmation. Implement around them cleanly.

---

# Final acceptance checklist

Before considering the task complete, demonstrate or verify:

- 20 fixed teams exist
- 20 fixed volunteer slots exist
- volunteer team isolation is enforced by tests
- public join balances teams
- participant state survives refresh
- Meme mode supports pair/trio assignments
- captured photos reach adaptive endless projector slideshow
- projector never shows meme references
- no meme scoring exists
- Mystery Manglish pairing works
- correct pair causes both phones to glitch directly into distinct pieces
- puzzle starts progressively with first successful pair
- Detective has no clue
- early theory submission works
- late matches still work after theory submission
- projector/host reveal flow works
- server restart/data persistence strategy is correct
- admin recovery exists
- production build succeeds
- Docker image builds
- representative 550-participant simulation completes acceptably

At the end, report:

1. what you implemented
2. tests/simulation results with actual commands/outcomes
3. any unresolved risks
4. exactly which external assets/secrets are still needed
5. exact Dokploy/deployment steps for `orientation.mulearnscet.in`

Most importantly: **build the application, not another plan.**
