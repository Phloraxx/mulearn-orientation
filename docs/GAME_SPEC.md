# Game Specification

## 1. Goal

Create a funny, high-energy orientation experience for approximately **550 juniors** that naturally makes them talk, collaborate, and laugh without feeling like a formal icebreaker.

The intended emotional progression is:

> Find your people → do something ridiculous together → talk to strangers → collaboratively reconstruct a mystery.

There is **no overall score or winner requirement**. The projector is used for shared entertainment and visible progress.

---

# 2. Teams and fixed volunteers

There are exactly **20 animal teams**.

Participants are balanced across them, approximately 27–28 per team. Allocation should feel random to participants but maintain near-equal sizes.

Each animal has exactly one **pre-selected team volunteer**.

The animal ↔ volunteer mapping is configured before the event and stays fixed throughout the session.

Critical rule:

> A volunteer remains physically in their designated animal zone and can only scan/manage juniors assigned to that same animal.

Example:

- Lion volunteer stays in Lion zone.
- Lion volunteer app is provisioned as Lion.
- Lion scanner accepts only Lion participant QRs.
- Scanning a Panda participant must visibly fail with a clear team mismatch message.

The volunteer's face/photo identity is also used to create the meme reference assets for that team.

---

# 3. Join flow

## Public entry

All juniors scan the **same public QR code**.

Participant flow:

1. Open join page.
2. Enter display name.
3. Server creates a persistent participant session/token.
4. Server assigns one balanced-random animal.
5. Participant receives a large animal/team screen and a personal QR.
6. Participant finds other students with that animal and then the matching fixed volunteer/team zone.

Refreshing/reopening must restore the same participant. It must never reroll the animal.

Names are not unique identity keys.

---

# 4. Phase 1 — Find Your Animal

## Participant objective

Find the people with the same animal and gather at the matching volunteer's fixed physical zone.

The screen should be extremely obvious:

> YOU ARE A LION
>
> Find the other Lions and the Lion Volunteer.
>
> [Participant QR]

## Volunteer objective

Scan each arriving junior.

The scan endpoint must enforce team ownership server-side.

Successful scan:

> FOUND
> Lion 19 / 28

Wrong-team scan:

> WRONG TEAM
> This participant belongs to Panda.

Duplicate scan:

> ALREADY CHECKED IN

## Projector

Show a fixed 20-card team grid with progress, not a competitive leaderboard.

Example:

- Lion — 19/28
- Panda — 27/27 ✓
- Zebra — 22/28

Cards remain in a fixed order; do not reorder by progress.

When a team completes, briefly pulse/expand its card and show a celebratory team-complete state, then return to the grid.

No points.

---

# 5. Phase 2 — Meme Recreation

## Content concept

Before the event, create AI-generated meme reference images using the **pre-selected volunteers' real photos**.

For a given animal team, references should prominently feature that team's volunteer so the juniors immediately recognise the person standing near them.

Examples include recreations of famous two-person or group meme poses, but the resulting reference assets should be generated/staged specifically with the volunteers.

The reference image is shown on participant phones only.

**Never show the meme reference on the projector.**

The joke on the projector is simply seeing the juniors' bizarre recreations without explanation.

## Pairing/trio allocation

28-person team:

- 14 two-person meme assignments.

27-person team:

- Prefer 12 two-person assignments + one three-person assignment.

Do not leave an odd participant inactive in this phase.

Participants assigned to the same meme reference find each other within their team zone and rehearse before approaching the volunteer.

## Volunteer capture flow

The volunteer is the photographer for their team.

Keep the capture interface extremely fast:

- identify the expected pair/trio
- open camera
- capture
- upload in background
- immediately advance to next capture

No scoring.
No approval/deny step.
No rating.
No per-photo celebration animation.
No camera micro-interactions beyond what is necessary to take the picture.

## Captured photo projector slideshow

As soon as a captured image is successfully available to the server, it joins the projector slideshow.

The projector shows only recreated photos, optionally with a subtle animal/team label.

The slideshow must **never end** while the meme mode is active.

Maintain:

- `newQueue`: photos never displayed before
- `history`: all valid photos already received
- `recentlyShown`: rolling exclusion window to prevent immediate repeats

Rules:

1. Always prioritise `newQueue`.
2. Never interrupt the currently displayed image before its minimum display duration.
3. When `newQueue` is empty, randomly replay eligible images from `history`.
4. Do not replay something in the recent exclusion window unless there are too few images to choose from.
5. Newly arriving photos get the next available slot.
6. The slideshow adapts its duration to backlog so it never becomes badly delayed.

Recommended timing algorithm:

```text
displaySeconds = clamp(30 / max(newQueueLength, 1), 1.5, 5.0)
```

Interpretation:

- tiny/no backlog → roughly 4–5 seconds per image
- moderate backlog → 2–3 seconds
- heavy backlog → 1.5-second hard minimum

The exact formula may be tuned after load testing, but the important requirements are:

- minimum display time exists
- timing gets faster as unseen queue grows
- unseen backlog is actively drained
- slideshow never becomes empty because history can recycle

Do not play a sound for every image.

---

# 6. Phase 3 — Manglish Match + Mystery Puzzle

This is **one continuous phase**, not two sequential rounds.

Pair matching and puzzle reconstruction happen at the same time.

## Team assignment

For an even-sized team:

- half receive questions
- half receive corresponding answers

For an odd-sized team:

- equal number of question/answer participants
- one remaining participant becomes the Detective

The same Q&A bank can be reused across all 20 teams.

## Manglish style

Text should feel like actual Kerala student messaging, not formal transliterated Malayalam.

Topics:

- KTU
- seniors
- Sahrdaya
- college events
- attendance
- assignments
- exams/results/revaluation
- WhatsApp groups
- first-year culture

The humour should be sarcastic/familiar rather than insulting or personally humiliating.

Every answer must be distinct enough that a participant can recognise its matching question without multiple plausible matches.

## Example Q&A bank

1. **Q:** Senior "oru cheriya help und" ennu paranjaal?  
   **A:** Ninte next 3 divasam poyi ennu karuthikko.

2. **Q:** Eventinu volunteer aavan interest undo ennu chodichaal?  
   **A:** Reply cheyyumbozhekkum groupil add aayi kaanum.

3. **Q:** Senior ninte number save cheythaal next entha?  
   **A:** Ninte free time officially over.

4. **Q:** Seniorsinte favourite starting dialogue entha?  
   **A:** "Njangal first year aayirunnappo..."

5. **Q:** KTU result eppo varum?  
   **A:** Ath KTUvinum ariyilla.

6. **Q:** Exam thale divasam biggest confidence entha?  
   **A:** "Naale ravile padikkaam."

7. **Q:** Revaluation koduthittu student entha vicharikkunne?  
   **A:** "Ithavana universe ente side aanu."

8. **Q:** Exam kazhinju "easy aayirunnu" ennu parayunnavan aaranu?  
   **A:** Groupinte samadhanam kalayaan vannavan.

9. **Q:** Collegeil ettavum fast spread aavunna news entha?  
   **A:** "Last hour free aanu."

10. **Q:** Sahrdayayil vazhi ariyillenkil best navigation entha?  
    **A:** Confident aayi nadakkunna aalude pinnale povuka.

11. **Q:** Assignment serious aavunna exact time eppozha?  
    **A:** Deadlineinu randu minute munpu.

12. **Q:** Oru clubil mathram join cheyyam ennu paranja first year studentinu entha sambhavikkum?  
    **A:** Ezhu WhatsApp groupil ethum.

13. **Q:** "Oru small orientation aanu" ennu paranjaal?  
    **A:** 500+ pere hallil kaanum.

14. **Q:** Faculty varilla enna newsinte speed ethra?  
    **A:** College Wi-Fi-nekkal fast.

Final bank should be reviewed by organisers for Sahrdaya-specific humour before event day.

---

# 7. Pair-key interaction

The answer-holder receives a short pair key.

The question-holder finds the matching answer-holder through conversation and types that person's key.

Validation is server-side.

Wrong key/wrong match:

- brief screen shake
- subtle haptic/sound where permitted
- funny Manglish failure copy such as `WRONG AAL — iniyum nokku`
- do not expose which person/key is correct

Correct key:

1. Atomically lock the pair.
2. Prevent either participant/key being reused.
3. Notify both devices immediately.
4. Show `MATCH FOUND` briefly.
5. Run a short glitch/static transition.
6. **Immediately replace both participant UIs with their own puzzle image pieces.**

Critical: do not wait for the team, the volunteer, or the rest of the pairings.

---

# 8. Puzzle mechanic

The mystery source is one funny/absurd image per team, designed around one clearly understandable action.

Examples:

- senior escaping on a dinosaur while juniors chase with event forms
- cat teaching an engineering class while a professor sleeps at a desk
- professor chasing someone carrying an attendance register
- students carrying a senior like a king into an event

Avoid abstract visual noise. The image should support a sentence answering:

> What is happening here?

## Piece reveal

Every ordinary participant corresponds to one distinct image tile.

On successful match, both participants immediately reveal their own distinct tiles.

There must be:

- no piece number
- no row/column index
- no positional clue

The full-screen puzzle view should be built for phones placed on the floor:

- portrait-oriented
- wake lock requested where supported
- minimal/no controls
- high brightness prompt if useful
- accidental taps do not leave the piece view

Use a consistent tile canvas so different phone aspect ratios do not destroy usability. Small image overlap between adjacent source crops is acceptable if it helps humans align mixed phone sizes, but do not make placement trivial.

## Progressive assembly

The team starts arranging the phones the moment the first pair unlocks.

Example:

- pair 1 matches → 2 tiles can be placed
- pair 2 matches → 4 tiles
- pair 3 matches → 6 tiles

Other team members continue talking/searching while early tiles are already being arranged.

This parallel activity is intentional and must not be converted into separate "pairing" and "puzzle" rounds.

---

# 9. Detective

Only used for an odd-sized team.

The odd participant sees a dedicated transition to:

> DETECTIVE
>
> You don't have a pair.
>
> Your job is to help arrange the phones and figure out what is happening in the image.

The Detective gets:

- no puzzle clue
- no secret image
- no special answer
- no magical ability

Their purpose is to coordinate the physical puzzle and avoid making the odd participant feel excluded.

---

# 10. Early theory submission

A team **does not need to finish every match or reveal every tile** before submitting.

The volunteer interface continuously shows:

- pairs found / possible pairs
- puzzle tiles unlocked / possible tiles
- theory input

As soon as the team thinks it understands the image, the volunteer may submit the team's description.

Example:

> Pairs found: 8/14  
> Tiles revealed: 16/28  
> Theory: `Oru senior record submission avoid cheyth odunnu...`

Submission rules:

- one theory per team
- submitting locks the theory
- theory cannot be edited in ordinary event flow
- remaining participants can continue matching after submission
- remaining puzzle pieces can continue unlocking after submission

This creates the intended decision: submit early when confident, or wait for more visual information.

---

# 11. Projector during mystery phase

Stop the meme slideshow when host starts Mystery Mode.

Show a fixed 20-team progress grid and master timer.

For each team show:

- animal/name
- pairs found / possible pairs
- theory state (`working` / `THEORY LOCKED`)

Do not reorder teams by progress.
Do not show points.
Do not reveal team theory text before the reveal segment.

Micro-interactions:

- small pulse/glitch on pair-count increment
- satisfying stamp/lock animation when a team submits
- master timer urgency near the end

Avoid a huge animation for every pair because hundreds of pair events may occur.

---

# 12. Shared sound/micro-interaction policy

Phone interactions may use subtle local haptics/sounds for actions initiated on that phone, such as:

- initial animal reveal
- wrong pair key
- successful pair
- glitch-to-puzzle transition

Do not depend on browser autoplay audio for critical state.

Projector/shared speakers are reserved for shared moments:

- phase start
- mystery mode start
- one-minute warning
- final 10-second countdown
- time up
- mystery reveal beats

No sound per meme photo.

---

# 13. Final mystery reveal

After Mystery Mode ends, the anchor controls a reveal screen.

For each team:

1. Show team animal/name.
2. Show the submitted theory text.
3. Give anchor room for a quick reaction.
4. 3–2–1 reveal.
5. Show the actual source mystery image.

This is the payoff: the audience compares what the team believed was happening with the actual absurd scene.

No numeric judgement is required.

Any punishment/forfeit should be light, team-based, optional and playful (e.g. animal sound/pose), never humiliating an individual.

---

# 14. Timing targets

## Preferred ~45-minute schedule

- 0:00–2:00 — public QR + minimal explanation
- 2:00–8:00 — Find Your Animal
- 8:00–10:00 — settle/anchor transition
- 10:00–19:00 — Meme Recreation + live slideshow
- 19:00–21:00 — transition
- 21:00–33:00 — Manglish Match + progressive Mystery Puzzle
- 33:00–42:00 — theory vs actual-image reveals
- 42:00–45:00 — close

## Compressed ~30-minute schedule

- 0:00–5:00 — animal gathering
- 5:00–12:00 — memes
- 12:00–22:00 — pairing + puzzle
- 22:00–29:00 — fast reveals
- 29:00–30:00 — close

The UI should explain individual objectives so anchors do not spend several minutes teaching every mechanic.

---

# 15. Product success criteria

The game succeeds when:

- juniors naturally talk to people they did not arrive with
- volunteer lines keep moving
- no team is blocked by one missing/dead phone
- projector always has something meaningful/funny to show
- meme photos appear quickly enough to feel live
- the puzzle begins progressively, not after pairing is complete
- odd participants are engaged as Detectives
- teams can make a risky early theory submission
- the final reveal gets laughs without needing a scoring system
- event staff can recover from mistakes through admin controls
