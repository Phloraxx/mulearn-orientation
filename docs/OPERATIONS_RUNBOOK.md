# Event Operations Runbook

## 1. Staffing

Assuming ~27 volunteers:

| Role | Count | Responsibility |
|---|---:|---|
| Fixed animal/team volunteers | 20 | Stay in assigned team zone; scan only own team; take meme photos; submit mystery theory |
| Anchors | 2 | Explain phases, control room energy, run final reveal commentary |
| Media | 2 | Event coverage independent of game capture |
| Host/projector operator | 1 | Master phase changes, timer, projector/reveal control |
| Technical support | 1 | Participant/device/recovery issues |
| Floor coordinator / backup | 1 | Crowd flow, team-zone issues, cover emergencies |

The 20 animal volunteers are **pre-selected before event day** and are not interchangeable casually because their identities are built into team content/meme references.

If a fixed volunteer must be replaced at the last minute, use an host recovery override and accept that AI meme references may still show the originally selected person unless regenerated.

---

# 2. Physical setup

Create 20 clearly visible team zones around/in the hall.

Each zone needs:

- animal placard visible above standing students
- pre-selected volunteer
- enough space for ~27–28 students
- a small clear floor area for the eventual phone puzzle

The fixed volunteer **does not wander around searching for juniors**.

The junior's job is to find the animal zone.

Once Phase 1 ends, juniors remain primarily inside their team zone for all later phases.

This prevents 550-person cross-hall movement.

For the puzzle, designate one small "phone floor" area inside each team zone so participants know where phones go and other students do not walk through it.

---

# 3. Pre-event checklist

## Content

- [ ] 20 animals finalised
- [ ] 20 volunteers finalised
- [ ] animal ↔ volunteer mapping finalised
- [ ] volunteer source photos received
- [ ] meme reference assets generated and reviewed
- [ ] mystery source image for each team generated and reviewed
- [ ] puzzle tiles generated/validated
- [ ] Manglish Q&A bank reviewed by organisers
- [ ] final branding loaded

## Software

- [ ] production build deployed
- [ ] public HTTPS hostname works on mobile data
- [ ] `/health` reports healthy
- [ ] `/projector` and `/host` tested
- [ ] all 20 volunteer links tested
- [ ] Lion credential cannot scan another team (explicit test)
- [ ] participant refresh/rejoin restoration tested
- [ ] media volume persistent across container restart
- [ ] SSE reconnect tested through production proxy
- [ ] 550-participant simulation/load run completed
- [ ] database/media backup taken after content freeze

## Room

- [ ] same public join QR printed/projected
- [ ] backup printed QR copies available
- [ ] 20 animal placards positioned
- [ ] projector set to correct browser/page
- [ ] sound system ready for shared countdown/reveal sounds
- [ ] host laptop plugged in
- [ ] technical-support phone/laptop has the private Host link
- [ ] volunteers receive their private team links before juniors arrive

---

# 4. Volunteer briefing

Keep briefing short and role-specific.

Every fixed animal volunteer needs to know:

1. **Do not leave your animal zone.** Juniors come to you.
2. Your scanner only accepts your animal. A mismatch is expected to fail.
3. During memes, move quickly: pose ready → photo → next group. No scoring/judging.
4. During Mystery mode, participants will unlock puzzle pieces progressively and place phones on the floor.
5. Listen to the team's theory and submit it whenever they are confident; do **not** wait for all pairs.
6. Once theory is submitted, it is locked, but remaining players may keep pairing.
7. For technical problems, call the roaming tech volunteer rather than trying to alter team data yourself.

---

# 5. Participant entry

Before opening registration:

- Host confirms event phase `ASSEMBLY`.
- Projector shows join QR + assembly grid.
- Team volunteers are already standing in zones.

Participant scans QR → enters name → receives animal + personal QR → finds zone → gets scanned.

Do not ask everyone to scan at an exact single second if avoidable. Keep QR visible while anchors introduce the activity so joins naturally spread across a minute or two.

---

# 6. Phase 1 operation — Find Your Animal

Target: 5–7 minutes.

Anchors say only what is necessary:

> Scan. Enter your name. Find your animal. Find that animal's volunteer and get scanned.

Projector shows fixed progress grid.

Floor coordinator watches for:

- one zone overcrowding unexpectedly (possible allocation/config bug)
- students unable to find placard
- students trying to get scanned by nearest wrong volunteer
- corridors being blocked

Tech support handles dead/broken sessions from the host recovery tools.

Do not hold the event indefinitely for one or two missing students. Host can move forward when operationally sensible; inactive/missing participants can be handled before content assignment locks.

---

# 7. Transition to memes

Before host clicks `START MEME`:

- verify active roster counts
- let software create pair/trio assignments from active participants
- confirm final meme references exist

Host starts phase.

Participant phones automatically switch to their meme reference/instructions.

Anchors can say:

> Find the people in your animal team with the same meme. Copy it. When you're ready, go to your volunteer for the photo.

That's enough.

---

# 8. Phase 2 operation — Meme Recreation

Target: ~7–9 minutes.

Participants find assigned partner/trio and rehearse inside the team zone.

Volunteer photography is the bottleneck, so participants should arrive already posed/prepared.

Volunteer workflow:

1. identify next ready assigned group
2. take photo
3. app uploads/retries in background
4. immediately call next group

No scoring.
No approval.
No retake bureaucracy unless photo is genuinely unusable.

Projector continuously displays captured recreations with adaptive timing.

New photos are prioritised; old photos recycle when queue is empty.

The host/projector operator should not manually curate the live slideshow during normal flow.

---

# 9. Meme-round fallback handling

If one team's photography is slow:

- don't stop other teams
- keep slideshow running
- floor coordinator helps form a ready queue near that team's volunteer

If upload temporarily fails:

- volunteer capture should retain pending image
- proceed to next photo where implementation permits
- retry automatically/manual retry later

If projector fails:

- continue gameplay
- reload projector when possible

Do not restart the entire round because the display disconnected.

---

# 10. Transition to Mystery mode

Before starting:

- host ends meme capture assignment state
- active rosters are finalised for Q&A
- software assigns questions/answers and Detectives for odd teams
- puzzle tiles already exist
- master mystery timer configured (suggest ~10–12 minutes in 45-minute schedule)

Projector switches away from slideshow to Mystery progress grid.

Shared start sound/visual can make this transition feel significant.

---

# 11. Phase 3 operation — Manglish Match + Puzzle

Anchors explain only:

> Ningalkku question allenkil answer kittum. Teamil samsarichu matching aaline kandupidikku. Question kittiya aal answer kittiya aalude code enter cheyyanam. Match aaya udane randu phone-um puzzle piece aavum. Phone floor-il arrange cheythu image-il entha nadakkunnathennu kandupidikku. Manassilaayi ennu thonnumbol volunteer-ne paranju theory submit cheyyam — full puzzle complete aavan wait cheyyenda.

The app supplies the details.

Operationally, multiple activities happen at once:

- unmatched participants talk/search
- newly matched phones glitch into tiles
- early matched participants arrange phones
- Detective coordinates odd teams
- team interprets emerging picture
- volunteer can submit theory at any time

This concurrency is intentional.

---

# 12. Detective operation

For odd teams, the software assigns exactly one Detective.

Detective sees only their job:

> Help arrange the phones and figure out what is happening.

Do not verbally give them a clue.
Do not secretly tell the volunteer to give them a clue.

They are the puzzle coordinator, nothing more.

---

# 13. Early theory submission

Volunteer should ask the team for a single action description when they seem confident.

Examples:

> "Senior record submission avoid cheyth odunnu; faculty pinnale und."

Volunteer types it and submits.

Projector changes team status to `THEORY LOCKED` but does not reveal text.

After submission:

- team may continue pairing
- puzzle may continue filling
- theory remains locked

This keeps late/unmatched students involved.

---

# 14. Timer and shared audio

Suggested shared cues:

- Mystery start: one clear sound
- 1 minute remaining: audible warning + projector state change
- final 10 seconds: projector countdown + room audio
- time up: strong end sound

Do not create hundreds of shared sounds for individual pair events.

Participant-local successful matching may use haptic/small audio where browser allows it.

---

# 15. Reveal segment

Target: ~8–9 minutes for 20 teams in the 45-minute plan, so keep average around 20–25 seconds/team.

For each team:

1. Projector displays team + submitted theory.
2. Anchor reads/reacts quickly.
3. Trigger 3–2–1.
4. Reveal full source image.
5. Allow laugh/reaction.
6. Move on.

Do not score every reveal.

If using playful forfeits, keep them short and team-wide, e.g. animal sound/pose. Avoid singling out or humiliating a junior.

---

# 16. 45-minute show rundown

| Time | Activity |
|---|---|
| 00:00–02:00 | Join QR + instructions |
| 02:00–08:00 | Find Your Animal |
| 08:00–10:00 | Settle / transition |
| 10:00–19:00 | Meme Recreation + live slideshow |
| 19:00–21:00 | Transition to Mystery |
| 21:00–33:00 | Manglish Match + progressive puzzle |
| 33:00–42:00 | Team theories vs actual images |
| 42:00–45:00 | close / buffer |

Always protect 2–3 minutes of buffer because 550-person physical movement is less predictable than software timing.

---

# 17. 30-minute emergency rundown

| Time | Activity |
|---|---|
| 00:00–05:00 | Animal gathering |
| 05:00–12:00 | Memes |
| 12:00–22:00 | Manglish Match + Puzzle |
| 22:00–29:00 | Fast reveals |
| 29:00–30:00 | close |

In this version, anchors must cut commentary aggressively.

---

# 18. Real-world failure playbook

## Student refreshes / closes page

Restore session automatically.

## Student has duplicate-name conflict

Ignore name uniqueness; recover by participant ID/team.

## Student reaches wrong volunteer

Scanner rejects and tells correct animal.

## Phone battery dies

Host recovery marks participant missing or transfers/recovery-restores session. Do not block entire team.

## Student leaves before Mystery

Deactivate before Q&A assignment where possible; regenerate assignments before phase lock.

## Student leaves after Q&A assignment

Host recovery resolves/removes affected pair so remaining team is not deadlocked. Puzzle may have missing pieces; early theory submission still makes the round viable.

## Volunteer phone fails

Log the same pre-selected volunteer role into a backup device using that team's private credential. Team mapping does not change.

## Projector/browser crashes

Reload projector. Gameplay continues.

## Server/container restarts

Persistent SQLite/media + client reconnect must recover event state. Host verifies phase/timer before resuming announcements.

## Network temporarily degrades

Participant UIs show reconnecting status without discarding current identity/state. Camera capture should preserve pending photo locally where possible.

---

# 19. Dress rehearsal

Before the real event, run at least one accelerated rehearsal with volunteers:

1. 20 fake participants or simulated devices, one per team.
2. Test wrong-team scanning deliberately.
3. Start Meme mode and upload at least one photo from several volunteer phones simultaneously.
4. Confirm projector adaptive slideshow.
5. Start Mystery.
6. Test wrong key, correct key, two-phone immediate tile reveal.
7. Submit a theory before all pairs finish.
8. Confirm later pair can still match after theory lock.
9. Run reveal.
10. Restart/reload one client and projector to confirm recovery.

Then run automated 550-participant simulation separately.

---

# 20. What not to do on event day

- Do not let fixed team volunteers roam around the hall.
- Do not let volunteers scan other animals manually "just to help".
- Do not introduce scoring spontaneously.
- Do not show meme reference images on projector.
- Do not wait for every meme photo to finish displaying before moving on.
- Do not separate pairing and puzzle into two rounds.
- Do not wait for full puzzle completion before accepting theory.
- Do not give Detectives clues.
- Do not stop the whole game because one participant/device fails.
