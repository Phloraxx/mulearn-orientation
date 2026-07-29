# Technical Architecture

## 1. Design goal

Support approximately 550 participant phones, 20 team-volunteer phones, a host console, and one or more projector displays with minimal operational complexity.

Recommended shape:

```text
Participant browsers ─┐
Volunteer browsers ───┼──── HTTPS ──── Node application
Host console ─────────┤                    ├─ HTTP API
Projector ────────────┘                    ├─ SSE realtime stream
                                            ├─ React/Vite static app
                                            ├─ SQLite (WAL)
                                            └─ persistent media directory
```

One Docker image. One Dokploy application. One persistent volume.

This event does not need a distributed architecture.

---

# 2. Suggested stack

- TypeScript
- React + Vite
- React Router or a simple route layer
- Node.js 20+
- Hono (preferred) or another lightweight Node HTTP framework
- SQLite with WAL mode
- Drizzle ORM or a very thin SQL layer
- Server-Sent Events for realtime server → browser changes
- Browser HTTP/fetch for mutations
- HTML5 camera capture / `getUserMedia` or reliable mobile file capture fallback
- Docker multi-stage build

Do not add managed auth/database/storage services unless requirements change.

---

# 3. Application routes / surfaces

Recommended logical routes:

```text
/                         public participant join/restore
/play                     current participant game screen
/volunteer/:teamSlug      team-scoped volunteer interface
/projector                projector/display UI
/host                     master event control + reveal control
/host                     master control + recovery/support tools
```

Volunteer, host, and host recovery sections must not be publicly claimable roles.

Use provisioned secret tokens or event-issued credentials stored server-side.

Example deployment-time links:

```text
https://orientation.mulearnscet.in/volunteer/lion?t=<long-secret>
https://orientation.mulearnscet.in/host?t=<long-secret>
https://orientation.mulearnscet.in/projector?t=<display-secret>
```

Prefer moving the secret into an HttpOnly cookie/session after first successful access rather than keeping it in the address bar forever.

---

# 4. Event state machine

One active event record can be enough for event day.

Suggested phases:

```text
SETUP
ASSEMBLY
MEME
MYSTERY
REVEAL
ENDED
```

Host controls phase transitions.

Clients render based on authoritative server phase + participant state.

A participant does not manually navigate between phases.

---

# 5. Core entities

## Event

- id
- name
- phase
- startsAt
- mysteryEndsAt nullable
- createdAt
- updatedAt

## Team

- id
- slug
- displayName
- animalEmoji
- displayOrder
- targetCapacity
- volunteerId
- mysteryAssetId
- submittedTheory nullable
- theorySubmittedAt nullable

## Volunteer

- id
- displayName
- teamId UNIQUE
- photoAsset references/manifest
- accessTokenHash
- enabled

One volunteer belongs to exactly one team for the event.

## Participant

- id UUID/random token-backed ID
- displayName
- teamId
- browserSessionHash / session relationship
- checkedInAt nullable
- memeAssignmentId nullable
- qaRole: `QUESTION | ANSWER | DETECTIVE | NONE`
- qaPairId nullable
- puzzlePieceAssetId nullable
- pairedAt nullable
- createdAt
- lastSeenAt
- active

## MemeAssignment

Represents one meme group within one team.

- id
- teamId
- referenceAssetId
- expectedGroupSize (usually 2, occasionally 3)
- capturedPhotoId nullable
- capturedAt nullable

Participants reference this assignment.

## QAPair

- id
- teamId
- questionText
- answerText
- answerKeyHash / generated key record
- questionParticipantId
- answerParticipantId
- matchedAt nullable

## MediaAsset

- id
- kind: `VOLUNTEER_SOURCE | MEME_REFERENCE | MEME_CAPTURE | MYSTERY_SOURCE | PUZZLE_TILE | BRAND`
- teamId nullable
- relativePath
- mimeType
- width nullable
- height nullable
- createdAt

## SlideshowState (may be in memory with DB-backed source data)

No need to persist every projector tick. Persist photos, then derive:

- unseen photo IDs
- last-shown timestamps
- recently shown IDs

Projector reconnection should reconstruct a sensible queue from database timestamps.

---

# 6. Balanced team allocation

Do not use `Math.random()` over 20 teams independently.

When participant first joins:

1. Read active team counts.
2. Find current minimum count.
3. Build candidate teams whose count is at most minimum + allowed skew (normally 0).
4. Randomly select among those candidates.
5. Insert participant + team assignment atomically.

With a known target of ~550, configuration may specify ten 28-capacity teams and ten 27-capacity teams, or simply maintain max skew <= 1 until registration closes.

Concurrency safety matters: allocation and insert should be transactional so simultaneous joins do not produce a large skew.

---

# 7. Participant session restoration

On first join:

- server creates random opaque session token
- store hashed token server-side
- return secure cookie where practical; browser storage fallback can hold an opaque recovery ID only

On reload:

- restore participant
- restore team
- restore current assignment/role/pair status
- render current phase

Never create a second participant merely because the browser refreshed.

Provide an explicit `Reset this device` only in host recovery flow, not as a prominent participant option.

---

# 8. Team-scoped volunteer enforcement

This rule must be enforced on the server, not just UI.

When volunteer scans participant QR:

```text
if volunteer.teamId !== participant.teamId:
    reject TEAM_MISMATCH
```

Also reject:

- unknown participant
- inactive participant
- already checked-in participant (idempotent response is fine)

Successful scan sets `checkedInAt`.

A Lion credential cannot call Panda management endpoints successfully even if someone manually edits frontend requests.

All volunteer mutation endpoints derive `teamId` from the authenticated volunteer session; never trust `teamId` supplied by the browser.

---

# 9. Participant QR

QR should contain only a short opaque participant identifier/scan token, not personal details.

Example logical payload:

```text
https://orientation.mulearnscet.in/s/<opaque-scan-token>
```

The volunteer scanner can extract the token and POST it to its own authenticated scan endpoint.

Do not encode name/team as trusted values in the QR.

---

# 10. Realtime model

Use SSE channels/snapshots rather than WebSockets unless implementation testing proves a need.

Possible endpoints:

```text
GET /api/events/current/stream
GET /api/participant/stream
GET /api/volunteer/stream
GET /api/projector/stream
GET /api/host/stream
```

They can share one server event bus internally and filter payloads by role/team.

SSE events should be lightweight, e.g.:

```text
phase.changed
team.progress
participant.checked_in
meme.photo_added
qa.pair_matched
team.theory_submitted
timer.sync
```

Send periodic heartbeat comments/events so reverse proxies do not close idle streams.

Every client must recover by fetching an authoritative snapshot after reconnect. Realtime messages are hints, not the only source of truth.

---

# 11. Meme assignment and capture

When Meme phase begins, prepare assignments per team.

28-person team:

- 14 pairs

27-person team:

- 12 pairs + one trio

Prefer assignment only among active/check-in participants. If numbers change, generator should recalculate before host locks/starts Meme mode.

Participants sharing an assignment see the same reference asset.

Volunteer sees a queue/list of expected meme groups for their own team.

Capture flow:

1. Identify/select group.
2. Capture image.
3. Keep local preview/blob until server confirms upload.
4. POST multipart upload with assignment ID.
5. Server verifies assignment belongs to volunteer's team.
6. Store image to persistent media directory.
7. Create `MEME_CAPTURE` database row.
8. Emit `meme.photo_added`.
9. Volunteer can immediately move on.

Do not block next capture on projector display.

If upload fails, mark capture pending and allow retry.

Use reasonable compression/resizing on the client or server. A projector does not require full multi-megapixel originals, and ~275 huge phone photos can cause unnecessary bandwidth/storage pressure.

Recommended stored display size: approximately 1600–2000 px on long edge with JPEG/WebP quality tuned for projector use.

---

# 12. Adaptive meme slideshow

The projector should never display a reference meme.

Maintain selection logic conceptually as:

```ts
if (newQueue.length > 0) {
  next = newQueue.shift();
} else {
  next = chooseRandom(history excluding recentlyShown);
}
```

Duration:

```ts
const seconds = clamp(30 / Math.max(newQueue.length, 1), 1.5, 5.0)
```

Tune after simulation.

Important behaviours:

- current image cannot be interrupted before minimum duration
- new upload is inserted into unseen queue and gets priority next
- once no unseen photos exist, slideshow draws from history forever
- maintain a rolling recent exclusion window around 10–15 items when enough history exists
- after projector reconnect, photos captured recently but never acknowledged as shown should be prioritised where possible

Avoid persistent writes for every slideshow frame unless needed; ephemeral projector state can live in memory because losing it is harmless.

---

# 13. Q&A assignment

At Mystery phase start, create/lock Q&A assignments based on active team roster.

Even roster N:

- N/2 question participants
- N/2 answer participants

Odd roster N:

- (N-1)/2 question participants
- (N-1)/2 answer participants
- 1 Detective

Use the same question/answer bank across teams, but randomly distribute which participant receives which entry.

Pair keys should be short enough to exchange verbally/type quickly (e.g. 4 digits) but unique within the team/session.

Do not store raw reusable secrets where unnecessary; pair keys are short-lived game tokens, not security credentials.

---

# 14. Pair validation and atomic locking

Question-holder submits answer-holder key.

Server:

1. Identify authenticated question participant.
2. Validate participant role and team.
3. Resolve submitted key within that team.
4. Verify the resolved answer participant belongs to the QAPair assigned to this question participant.
5. Ensure neither side is already paired.
6. In one transaction set `matchedAt` / `pairedAt` for both.
7. Return puzzle piece metadata to caller.
8. Emit participant-specific update for both devices.
9. Emit `qa.pair_matched` for volunteer/projector progress.

Retries after success should be idempotent.

Wrong attempts should be rate-limited enough to discourage brute forcing without frustrating humans. A brief per-device/per-participant cooldown after repeated failures is sufficient.

---

# 15. Immediate puzzle reveal

Every ordinary participant has a precomputed puzzle tile for their team's mystery source image.

The puzzle tile assignment exists before matching, but is hidden.

On successful pair match:

- both devices receive their respective tile URL/metadata immediately
- both run a short glitch transition
- both enter full-screen piece mode

There is no team-level gate.

Detective receives Detective UI when Mystery mode begins and never receives a hidden clue.

---

# 16. Puzzle tile generation

Because phones vary in aspect ratio, generate logical portrait tile canvases rather than expecting exact physical screen dimensions.

For 28-piece teams, a 7 × 4 logical grid is a sensible starting point.

For 27-piece teams with a Detective, use a 27-tile layout/source strategy that still forms a coherent physical arrangement. Do not simply expose a numbered missing location.

A practical implementation may define tile layouts in asset metadata:

```json
{
  "layout": { "columns": 7, "rows": 4 },
  "tiles": [
    { "id": "...", "x": 0, "y": 0, "asset": "..." }
  ]
}
```

The x/y metadata is server/host-only and must never appear in participant UI/API responses beyond what is required to fetch that participant's own image.

A slight visual crop overlap can make mixed-device physical alignment more forgiving.

---

# 17. Early theory submission

Volunteer can submit a theory at any time during Mystery mode.

Endpoint derives team from volunteer session.

Rules:

- non-empty text
- exactly one ordinary submission per team
- atomic `submittedTheory` + timestamp
- after submission, UI becomes locked/read-only
- Q&A matching remains enabled until host ends the phase

Emit `team.theory_submitted` for projector/host.

---

# 18. Projector mystery screen

Show fixed-order team cards with:

- team name/animal
- `matchedPairs / totalPossiblePairs`
- working/locked state

Do not show theory content before reveal.

Master timer should be server-authoritative. Projector may animate locally between sync messages, but periodically resynchronise to server end timestamp.

---

# 19. Reveal mode

Host controls selected team and reveal step.

State per selected team:

```text
THEORY
COUNTDOWN / READY
ACTUAL_IMAGE
```

Projector renders the host-selected team.

The actual mystery source image is not available through participant APIs before reveal.

---

# 20. Host recovery features

A small host recovery section is essential for a 550-device room.

Minimum actions:

- search participant by name/ID/team
- see current participant state
- manually check in/uncheck participant
- deactivate participant who left
- restore participant to a replacement device using a one-time recovery code/link
- move participant between teams only before content assignments are locked, or with explicit destructive warning
- reset a broken meme assignment/capture
- mark missing participant so their pair does not permanently block team progress
- regenerate Q&A assignments before Mystery starts
- inspect failed/pending media uploads
- manually submit/clear theory only with explicit host recovery action
- reset event/demo data in non-production/demo mode

All actions should create a simple audit log.

---

# 21. SQLite and persistence

Enable WAL mode and busy timeout.

Persist at minimum:

```text
/data/orientation.sqlite
/data/media/<event-id>/...
```

Mount `/data` as a persistent Docker volume in production.

Back up the database and media directory before the live event starts once content is final.

Because the event is short-lived, a single SQLite writer is appropriate if transactions are kept short and photo bytes are stored on disk rather than inside SQLite blobs.

---

# 22. Performance/load target

Design target:

- 550 participant sessions
- 20 volunteer sessions
- 1–3 projector/host sessions
- bursts of hundreds of initial joins
- bursts of ~20 concurrent check-ins
- up to ~275 meme uploads over several minutes
- up to ~275 Q&A match submissions over several minutes
- SSE connections from most participant devices during active phases

Run a local load/simulation script before deployment that creates 550 virtual participants and exercises allocation, check-in, meme upload metadata, pair matching, theory submission, and projector SSE fanout.

Actual image binary load can be tested with representative compressed fixtures rather than 275 full camera photos.

---

# 23. Security/privacy

This is an orientation game, not an identity system, but basic controls still matter:

- participant QR uses opaque tokens
- host/volunteer routes require secrets/sessions
- volunteer permissions are team-scoped server-side
- uploads validate MIME, size, and assignment/team ownership
- rate-limit sensitive/mutating endpoints
- do not expose volunteer source photos or original mystery assets from unrestricted directory indexes
- no raw filesystem path traversal
- escape/sanitise participant names and theory text
- use HTTPS in production

Decide event media retention after the event. Provide an host cleanup/export command rather than silently retaining student photos forever.

---

# 24. Testing requirements

Automated tests should cover at least:

1. balanced allocation maintains max team skew <= 1
2. participant refresh restores same team
3. volunteer cannot scan another team's participant
4. duplicate scan is idempotent
5. meme capture cannot target another team
6. adaptive slideshow prioritises unseen photos
7. slideshow respects minimum duration and can recycle history
8. correct Q&A key atomically pairs both users
9. wrong key does not reveal match information
10. paired key/participant cannot be reused
11. both puzzle pieces become available immediately after match
12. Detective gets no clue/puzzle tile
13. theory may submit before all pairs match
14. pair matching continues after theory is locked
15. projector reconnect can recover from snapshot
16. one absent/deactivated participant does not deadlock the team

---

# 25. Demo/simulation mode

Codex should include a developer/demo mode that can:

- seed 20 teams and volunteers with placeholder assets
- generate hundreds of fake participants
- simulate check-ins
- inject fake meme captures
- simulate Q&A pair matches
- submit theories
- advance phases

This is critical because the real room-scale behaviour cannot be tested manually one phone at a time.
