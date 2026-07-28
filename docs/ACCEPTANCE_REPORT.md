# Implementation Acceptance Report

Date: 2026-07-28

## Product acceptance

| Requirement | Verification |
|---|---|
| 20 fixed teams and volunteer slots | Seed and `content:validate` |
| balanced public allocation | 550-user test and simulation; observed 27–28 |
| session/team restoration | automated test and live process-restart smoke test |
| volunteer team isolation | service and HTTP upload tests |
| duplicate scan safety | automated idempotency test |
| pair/trio memes | automated 28-person and 27-person assignment test |
| projector never receives reference memes | separate private participant reference route; projector media route serves captures only |
| adaptive endless slideshow | unseen priority, duration floor, recycling, and repeat-avoidance tests |
| no scoring/leaderboard | no score entity, endpoint, control, or UI |
| atomic Manglish matching | transaction-backed matching tests |
| immediate two-phone distinct tiles | both participant snapshots unlock distinct authenticated tile responses in the success transaction |
| progressive floor puzzle | every successful pair independently reveals two portrait tile views with wake-lock request and no coordinate metadata |
| clue-less Detective | odd-roster test verifies no pair, clue, tile, or index |
| early locked theory | tested after one pair; duplicate submission rejected |
| late matching after theory | automated test |
| projector/host reveal | fixed grid, server timer, theory step, timed 3–2–1, authorised source-image route |
| restart/persistence | live compiled-service restart restored the same participant/team from persistent SQLite |
| recovery controls | search, check/uncheck, absence, counterpart release, new-device link, safe reassignment, Q&A regeneration, media reset |
| production build | TypeScript and Vite production builds pass |
| Docker build | final image `mulearn-orientation:acceptance` built successfully |
| container readiness | Docker health `healthy`; `/ready` confirmed DB, 20 teams, and writable media volume |

## Final command results

```text
tsc --noEmit                         PASS
tsc -p tsconfig.server.json --noEmit PASS
vitest run                           2 files, 14 tests passed
content validation                   PASS
Vite build                           PASS, 286.83 kB JS / 92.84 kB gzip
Docker build                         PASS
Docker health/readiness              healthy / ready=true
access provisioning in container     PASS, 23 private links emitted
```

The representative in-process concurrency simulation completed with:

```json
{
  "participants": 550,
  "volunteers": 20,
  "teamRange": [27, 28],
  "memeGroups": 270,
  "qaPairsMatched": 270,
  "detectives": 10,
  "simulatedSseClients": 573,
  "eventDeliveries": 952326,
  "elapsedMs": 393
}
```

This simulation validates state transitions, transaction invariants, allocation,
fanout work, media metadata bursts, theory locks, and late matches. It does not
replace the documented dress rehearsal on real Android/iPhone devices and the
actual venue network.

## External inputs still required

1. The 20 real pre-selected volunteer identities/photos and final animal mapping.
2. Human-approved generated meme references and mystery images replacing stand-ins.
3. Organiser review of Manglish/Sahrdaya wording and inside jokes.
4. Final µLearn/Sahrdaya branding, if required.
5. Confirmation of `orientation.mulearnscet.in`, DNS, and the live Dokploy route.
6. Strong production secrets from `.env.example`.
7. Android/iPhone, mobile-data/venue-Wi-Fi, camera-permission, and Traefik SSE dress rehearsal.
