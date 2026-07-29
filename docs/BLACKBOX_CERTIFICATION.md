# Black-box Certification — 29 July 2026

## Release under test

- Production application commit: `0766f5a496ca7a1d41a8e026973807ddb45135be`
- Public endpoint: `https://orientation.mulearnscet.in`
- Deployment: Oracle VM, Docker, persistent `/data`, existing Cloudflare Tunnel
- Final intended capacity: ~550 participants, 20 fixed animal teams

This certification deliberately exercised externally visible behavior rather than relying only on implementation/unit tests. Destructive cases ran against a production-identical isolated database; the complete browser journey and public-network checks ran against the real HTTPS deployment.

## Overall result

**PASS for all remotely testable software behavior.**

The black-box process found several real defects. They were fixed, merged, redeployed, and the relevant tests were repeated before this report was finalized.

The only remaining checks require physical hardware/venue conditions: real iPhone/Android camera permission UX, the actual event Wi-Fi/radio environment, and a floor arrangement of 26–28 mixed physical phones.

## Production-identical API/SSE suite

Final clean rerun: **56/56 checks passed**.

Coverage included:

- production health/readiness and closed registration in SETUP
- all 22 private staff roles and role/team authorization
- participant join, duplicate names, restore, replacement-device recovery and scan-token rotation
- correct-team/wrong-team/duplicate volunteer scans and Host manual recovery
- 550 concurrent registrations with exact 27–28 team distribution
- Meme pair/trio allocation, all 15 shared references, upload validation/privacy/idempotency
- unseen-first adaptive projector slideshow and media reset/recapture
- Mystery Q/A/Detective distribution, role separation, wrong-key cooldown and all 270 pair matches
- instant two-phone distinct puzzle tiles, early theory lock and continued matching
- reveal access control and THEORY → COUNTDOWN → ACTUAL_IMAGE flow
- ENDED behavior, full reset, absence/reactivation recovery and restart persistence

Observed load run: 550 joins completed in about 2.9 s on the isolated VM endpoint; all 572 simultaneous real SSE clients received the phase event; 40 simultaneous photo uploads all succeeded. These timings are environment-specific and are recorded as observations, not latency guarantees.

## Browser-level black-box testing

A real headless Chromium browser was used against the public HTTPS deployment, including mobile and projector-sized viewports.

The complete visible journey passed:

`Host → Assembly → participant join → Meme → volunteer photo → projector slideshow → Mystery → early theory → visible key entry → both tile screens → Reveal → End`.

Verified browser details included:

- bare/expired Host and Projector routes show `Private access required` instead of hanging on `Connecting…`
- bootstrap tokens disappear from the browser URL after creating the HttpOnly session
- projector join QR measured ~302×302 px at 1920×1080
- mobile participant viewport 390×844 had no horizontal overflow
- meme reference loaded visibly on the student's phone with partner names/instructions
- recreated photo reached the projector through the actual volunteer file-input/compression/upload path
- matched phone tiles loaded as 800×1400 images; final mystery source loaded as 1960×1960
- SETUP, REVEAL and ENDED screens visibly changed across already-open browsers through realtime updates
- hostile-looking participant display text such as `<script>…</script>` rendered as literal text, not executable markup

## Camera and media black-box testing

Chromium was launched with a fake physical camera feed containing an actual generated participant QR.

Final regression result:

- the same participant QR shown to the wrong volunteer was rejected with the correct team message
- the camera remained live and usable after the rejection
- the QR shown to the correct volunteer produced exactly one `FOUND` result
- the camera closed after a successful scan and the result was not overwritten by a duplicate `ALREADY CHECKED IN`

The server remains idempotent even if a duplicate request is received.

## Visual content audit

Contact sheets were generated and visually inspected for:

- all 15 Meme reference cards
- all 20 square, text-free mystery source images
- all 20 reconstructed 7×4 puzzle mosaics

Puzzle validation also programmatically rejects wrong dimensions and byte-identical tiles. A 28-person team uses all 28 logical positions; a 27-person team has 26 phone pieces plus one clue-less Detective, with two non-essential corner positions omitted.

## Public network and failure-mode checks

Through Cloudflare, a 200-request burst of `/health` and public snapshot requests completed **200/200 successfully**. Observed p50 was ~108 ms and p95 ~1.57 s during that burst.

Malformed JSON originally surfaced as HTTP 500 during fuzzing. That was corrected to `400 BAD_JSON` with a regression test and retested on the public deployment.

Production configuration remains fail-closed for required secrets, generated content is required for readiness, captured media and mystery originals remain access controlled, and SQLite/media persistence survives a real container restart.

## Defects found during this certification

1. Some background-only puzzle tiles could be byte-identical; fixed with non-positional visual texture plus validator enforcement.
2. Reactivating an unmatched participant after pair dissolution could restore a stale Q/A role; fixed to a safe clue-less Detective state.
3. Malformed JSON returned HTTP 500; fixed to `400 BAD_JSON`.
4. Camera QR callbacks could fire twice and wrong-team camera rejection stopped the scanner; fixed with one-result-at-a-time handling and automatic restart on rejection.

All four were merged, redeployed and retested.

## Final frozen production state

After testing, all reusable staff bootstrap credentials were rotated and every existing staff session was invalidated. The old Host/Projector/volunteer links are intentionally invalid.

Final verified state:

- application image/version: `0766f5a`
- phase: `SETUP`
- teams: 20
- participants: 0
- matched pairs: 0
- media rows/files: 0
- active staff sessions: 0
- current private access pack: 22 links (20 volunteers + Host + Projector), stored on the VM with mode `600`
- container: healthy, restart count 0 at freeze

Final backup:

`/home/drvij/mulearn-orientation-prod/backups/pre-event-blackbox-certified-20260729T041443Z.sqlite`

SHA-256:

`f1a62e561600a5091e2e84d88059b385788b3bb441729ba259c5717df4274035`

## Release decision

**Software black-box certification: PASS.**

Before admitting the real crowd, perform one short physical dress rehearsal with at least one actual Android phone, one actual iPhone, the venue projector, and the venue network. That is the only meaningful verification boundary that cannot be reproduced remotely.

### Supporting repository verification

- Vitest: 28/28 passed
- TypeScript client/server checks: passed
- production Vite build: passed
- approved content validation: passed
- 550-participant simulation: passed with 270 Meme groups, 270 Q&A pairs, 10 Detectives and 572 simulated SSE clients
