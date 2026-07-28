# Planning Session Decision Log

This file preserves the important intent and changes from the planning conversation so implementation agents do not accidentally reintroduce rejected ideas.

It is a structured decision history rather than a verbatim transcript.

---

# Context

- Previous orientation attendance had been expected around 400 but actual attendance reached roughly **550 students**.
- The next orientation is for **µLearn / Sahrdaya** and should support a similarly large crowd.
- Target is roughly **20 teams** and about **27–28 juniors per team**.
- Around **27 volunteers** are available overall.
- The experience should be fun, social, visually entertaining on the projector, and technically simple enough to run reliably.

---

# Original concept

The initial concept had three broad stages:

1. Everyone scans one QR, gets a random animal/team, finds matching people and the corresponding volunteer, then gets scanned into the team.
2. Students recreate assigned memes; a team volunteer photographs them; projector can show the results.
3. Students receive matching question/answer halves, find each other, pair through a code, unlock pieces of a funny mystery image, physically reconstruct it with phones, then tell the volunteer what action they think is happening.

Early discussion considered points/leaderboards and manual judging.

Those competitive elements were later intentionally removed.

---

# Decision: no meme scoring

Rejected ideas:

- approve/deny every meme on projector
- score meme accuracy
- points out of 20
- anchor judging hundreds of meme photos
- team meme leaderboard

Final decision:

> The meme phase is purely for laughter and participation. Volunteer takes the photo and moves on. No judging or scoring.

Reason:

With ~550 juniors, manual review would create a huge timing bottleneck. The projector itself is enough of a payoff.

---

# Decision: projector shows only recreated meme photos

An earlier idea showed the original/reference meme alongside the recreation.

Rejected.

Final decision:

> The projector never shows the reference image. It only shows the recreated photos taken by volunteers.

Reason:

Seeing unexplained absurd student photos is funnier and visually cleaner.

Participants themselves still see the reference they are meant to recreate.

---

# Decision: volunteer faces appear in meme references

The meme references should be AI-generated before the event from real volunteer photos.

Important refinement:

> The 20 team volunteers are pre-selected before the event because their identities/photos become part of the content.

For a given animal team, the reference memes should feature that team's recognisable volunteer where possible.

The participant sees their own nearby volunteer appearing in absurd/famous meme compositions, then recreates that pose with their assigned partner/trio.

This is intended to produce a strong recognition/laugh moment.

---

# Decision: one fixed volunteer per animal zone

Final operational rule:

> Lion volunteer stays in the Lion zone and can only scan/manage Lion juniors. Same for every animal.

The volunteer does not walk around finding students.

Students find the team/volunteer.

This is both a physical crowd-control rule and a server-side authorisation rule.

Rejected behaviour:

- one volunteer scanning arbitrary teams
- volunteers roaming through the hall
- trusting a frontend-provided team ID

---

# Decision: adaptive never-ending meme slideshow

Concern:

A fixed slideshow interval is wrong at this scale.

If images stay up too long, unseen queue becomes badly delayed. If too fast with only a few photos, the slideshow feels frantic/repetitive.

Final model:

- `newQueue` contains photos never displayed
- new photos are always prioritised
- `history` contains already displayed photos
- when there is no unseen image, replay from history
- avoid recently displayed repeats
- slideshow therefore never ends while Meme mode is active
- image duration decreases as unseen queue grows
- a hard minimum duration prevents images flashing too quickly

Recommended starting range: ~1.5 to 5 seconds based on backlog, tuned through simulation.

Newly arriving image should not abruptly cut off the current image before its minimum exposure.

---

# Decision: no camera micro-interactions

An earlier suggestion added flash/confetti/"sent to big screen" moments after volunteer capture.

Rejected.

Final decision:

> Volunteer camera workflow should be boring and extremely fast.

Capture → upload → next group.

The projector is the payoff.

---

# Decision: projector still gets micro-interactions

Micro-interactions are wanted on the projector, just not on every camera capture.

Desired examples:

- assembly card pulses when team member count changes/completes
- subtle transitions between meme photos
- mystery pair count does a small pulse/glitch when incrementing
- `THEORY LOCKED` gets a satisfying stamp/lock animation
- shared timer gets more urgent near the end
- final reveal has a deliberate countdown/impact moment

Avoid giant animations/sounds for high-frequency events.

---

# Decision: Q&A should be Manglish

Original idea was funny/icebreaking college/KTU questions.

Final language direction:

> Use colloquial Manglish that sounds like Kerala college students chatting, not formal transliterated Malayalam.

Topics should include:

- KTU
- seniors
- Sahrdaya
- attendance
- exams/results/revaluation
- assignments
- college events
- WhatsApp groups
- first-year culture

Example tone:

> Senior "oru cheriya help und" ennu paranjaal?
>
> Ninte next 3 divasam poyi ennu karuthikko.

Answers must be unique enough that participants can identify the right matching question by conversation.

---

# Decision: question-holder enters answer-holder key

Final matching mechanic:

1. one participant receives question
2. matching participant receives answer + short pair key
3. they find each other through talking
4. question-holder enters answer-holder's key
5. server validates the specific intended pair
6. successful pair is permanently/atomically locked

No person/key can be paired twice.

---

# Critical decision: puzzle reveal is immediate per pair

A major clarification in the conversation:

Rejected interpretation:

> Finish all question-answer pairing first, then reveal/start the puzzle.

Final decision:

> The instant one Q&A pair succeeds, **both phones immediately glitch into two separate puzzle pieces**.

They can put those two phones on the floor immediately and start arranging.

Meanwhile the rest of the team is still talking and pairing.

So the puzzle progressively materialises:

```text
2 pieces → 4 pieces → 6 pieces → ...
```

Pairing and puzzle construction are simultaneous parts of one phase.

This is one of the most important product rules.

---

# Decision: both matched phones become pieces

Earlier concept considered one piece per pair.

Final decision:

> Both phones become distinct puzzle pieces immediately after pairing.

This creates up to 28 physical phone tiles in a 28-person team.

---

# Decision: phones may be placed on the ground

Concern was raised about phones being stepped on.

Final organiser preference:

> Putting phones on the ground is part of the desired physical puzzle mechanic.

Implementation/operations should accommodate this rather than prevent it.

Mitigation:

- keep teams in fixed zones
- designate a clear puzzle-floor area inside each team zone
- phone piece UI stays awake/locked/minimal

---

# Decision: no piece indices/hints

Puzzle pieces must not show:

- piece number
- row number
- column number
- positional hint

Participants should solve visually.

Mixed phone sizes are expected, so tile generation should be visually forgiving without exposing coordinates.

---

# Decision: odd person becomes Detective only when necessary

Earlier Detective ideas included giving clues or a special puzzle role.

Rejected.

Final decision:

> If a team's active participant count is odd, the one unpaired person becomes Detective.

Their screen simply explains:

> Your job is to help arrange the phones and figure out what is happening in the image.

No clue.
No secret information.
No special power.

The purpose is to keep the odd student actively involved rather than excluded.

Detective is not compulsory for even teams.

---

# Critical decision: theory can be submitted before full pairing/puzzle completion

Another major clarification:

Rejected interpretation:

> Team must finish all matching and complete the whole puzzle before answering.

Final decision:

> The team may submit as soon as they believe they understand the action, even with many pieces still missing.

Volunteer sees progress + theory field and submits the team's description.

Theory becomes locked.

Remaining participants are still allowed to keep pairing and revealing pieces afterward.

This intentionally creates a risk/reward decision without needing numeric scoring:

- submit early when confident
- or wait for more visual evidence

---

# Decision: mystery image should be funny but describable

Source puzzle images should be absurd/AI-generated but have one clear action.

Good:

> professor chasing a student who stole the attendance register

Bad:

> random abstract objects with no coherent action

The team should be able to answer:

> "What is happening in this image?"

Final reveal compares their submitted interpretation with the actual full image.

---

# Decision: no overall competition needed

Although early planning considered a leaderboard and points, the later direction is intentionally less competitive.

Final experience should use:

- assembly progress
- live meme slideshow
- pair/puzzle progress
- theory lock state
- final theory-vs-image reveal

without requiring a numeric winner.

A playful team-level forfeit may be improvised by anchors for a wildly wrong interpretation, but should not become a formal scoring engine.

---

# Decision: 20 fixed physical zones remain throughout

At ~550 people, repeated full-hall movement would create operational chaos.

Once juniors find their animal in Phase 1, that area remains their home zone.

Memes, Q&A search, puzzle floor, and theory discussion happen primarily inside the same team area.

---

# Decision: architecture should remain simple

The game now needs shared state across hundreds of devices, so frontend-only static state is no longer enough.

However, operational simplicity is still a priority.

Selected architecture direction:

- React + Vite
- lightweight Node backend
- SQLite WAL
- SSE for realtime server→client updates
- HTTP mutations
- persistent local media volume
- one Docker container
- Dokploy/Traefik deployment

Avoid adding managed services/microservices without demonstrated need.

---

# Decision: projector is not a game dependency

If projector crashes/disconnects:

> gameplay continues.

Projector can reload from a fresh server snapshot.

Same principle applies to transient SSE disconnects on participant/volunteer phones.

---

# Decision: host owns phase transitions

Individual volunteers do not decide global phases.

A central host screen controls:

- start assembly/state
- start Meme mode
- start Mystery mode/timer
- end Mystery mode
- final reveal sequence

Clients automatically render the current server-authoritative phase.

---

# Deployment context

Repository:

> `Phloraxx/mulearn-orientation`

Repo was empty when documentation work began, so there is no legacy application to preserve.

Preferred deployment style based on existing infrastructure:

- Oracle/VPS
- Dokploy
- Traefik
- one app container
- persistent volume

Planning default hostname:

> `orientation.mulearnscet.in`

Final subdomain can be changed before production DNS is configured.

---

# External inputs still pending

1. Google Drive link with the pre-selected volunteers' photos.
2. Exact animal ↔ volunteer mapping, unless organisers want it assigned from the provided list.
3. Confirmation/change of `orientation.mulearnscet.in`.
4. Any very specific Sahrdaya inside jokes worth adding to Q&A.
5. Optional branding assets.

These inputs should not prevent Codex from implementing the complete system with placeholders/demo content first.
