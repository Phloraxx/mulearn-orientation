# AGENTS.md

This repository implements a live orientation game for approximately 550 students. Read **all files under `docs/` before changing gameplay logic**.

## Product principles

1. **Fast over fancy.** There are ~550 participant phones and 20 volunteer phones. Every interaction must be obvious and require as few taps as possible.
2. **No overall scoring.** Do not introduce points, rankings, judging, or leaderboards unless explicitly requested later.
3. **Physical team zones are fixed.** Every animal has one pre-selected volunteer. That volunteer stays in the designated animal zone and can only scan/manage participants belonging to that animal.
4. **Meme references are private to participants.** The projector shows only captured recreations, never the reference meme.
5. **Meme slideshow never ends.** New photos are prioritised; when there are no unseen photos, recycle older photos without immediate repetition. Display time adapts to backlog with a hard minimum.
6. **Question/answer pairing and puzzle solving happen concurrently.** As soon as a valid pair is confirmed, both phones immediately glitch into their own puzzle pieces. Never wait for all pairs to finish.
7. **Teams may submit a mystery theory early.** They can submit before every pair/puzzle piece is unlocked. Submission is locked, but remaining players can keep pairing afterward.
8. **Odd participant = Detective.** Only create this role when a team is odd-sized. Detective receives no clue and no special power. Their job is to coordinate/arrange the phones and help interpret the image.
9. **Phones go on the floor.** Build the puzzle UI for this use case: portrait locked, wake lock requested, minimal chrome, no accidental navigation.
10. **Projector is non-critical.** Participant/volunteer gameplay must continue if projector or SSE client disconnects.

## Preferred architecture

Keep it a single deployable service:

- React + Vite
- Node.js backend; prefer Hono or another lightweight framework
- SQLite, WAL mode
- SSE for live server → client event/state updates
- HTTP endpoints for mutations
- persistent local directory for meme images
- Dockerised and suitable for one Dokploy app behind Traefik

Avoid introducing PocketBase, Supabase, Firebase, Redis, Kafka, microservices, external managed databases, or authentication providers unless there is a demonstrated need. This is a short-lived event system and should remain operationally simple.

## Identity and state

- Student name is display-only, never an identity key.
- Generate a random participant ID/token and persist it in browser storage/cookie.
- Refreshing or reopening must restore the same participant/team/role.
- Rejoining must never reroll the animal.
- Team allocation must be random-looking but balanced.
- Volunteer/team identity must be provisioned ahead of the event; do not expose a public way to become a volunteer.

## Safety and failure handling

- Reject a volunteer scan when participant.teamId != volunteer.teamId.
- Prevent duplicate check-ins, duplicate pair use, and pair-key reuse.
- Provide host recovery controls for dead phones, mistaken sessions, absent students, image upload failure, and participant removal/reassignment.
- Uploaded meme images should be resilient to temporary network loss; capture locally first and retry upload where practical.
- Never make one missing participant block an entire team from progressing.

## Content

- Q&A text should be colloquial **Manglish**: funny/sarcastic KTU, senior, Sahrdaya, and Kerala college-life humour.
- Answers must be uniquely recognisable enough to avoid ambiguous matches.
- Mystery images should depict one clear but absurd action that can be described in a sentence.
- AI volunteer meme images are assets, not runtime dependencies. The app must work with placeholders until final generated images are supplied.

## Code quality

- Production-ready error handling.
- Mobile Safari/Chrome compatibility is important.
- Large tap targets and high contrast.
- No unnecessary onboarding screens.
- Keep host and volunteer views authenticated/protected by event secrets or provisioned links.
- Add seed/demo mode so the full game can be tested with simulated teams before event day.
- Add automated tests for allocation, team-scoped scanning, pairing, early theory submission, slideshow queue logic, and state restoration.

## Do not regress these decisions

Do not add: meme scoring, reference images on projector, detective clues, delayed puzzle reveal, requirement to finish all pairings before theory submission, per-photo camera animations, or a competitive leaderboard.