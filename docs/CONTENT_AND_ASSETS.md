# Content and Asset Plan

## 1. Core principle

The event content must be **pre-generated and pre-mapped before juniors enter the hall**.

The live application should not depend on AI image generation succeeding during the event.

This particularly applies to volunteer meme references and mystery source images.

---

# 2. Pre-selected team volunteers

There are exactly 20 team volunteers.

Every volunteer is mapped to exactly one animal before event start.

The mapping drives all of the following:

- volunteer login/provisioning
- volunteer's fixed physical team zone
- which participant QRs they are allowed to scan
- which meme reference assets participants in that team see
- team labels/projector identity
- content validation

Suggested configuration format:

```json
[
  {
    "team": "lion",
    "displayName": "Lion",
    "emoji": "🦁",
    "volunteer": {
      "id": "vol_lion",
      "name": "TBD",
      "sourcePhotos": ["assets/volunteers/lion/01.jpg"]
    }
  }
]
```

Do not allow event-day participants to choose or impersonate volunteer roles.

---

# 3. Suggested 20 animals

Final list can change, but choose visually/verbally distinct animals to make crowd finding easy.

Example set:

1. Lion 🦁
2. Tiger 🐯
3. Panda 🐼
4. Zebra 🦓
5. Penguin 🐧
6. Fox 🦊
7. Monkey 🐒
8. Elephant 🐘
9. Giraffe 🦒
10. Koala 🐨
11. Bear 🐻
12. Wolf 🐺
13. Rabbit 🐰
14. Owl 🦉
15. Crocodile 🐊
16. Shark 🦈
17. Dolphin 🐬
18. Parrot 🦜
19. Gorilla 🦍
20. Kangaroo 🦘

Avoid animals that look/sound too similar from a distance.

---

# 4. Volunteer photo input

Organiser will provide a Google Drive link later containing volunteer photos.

Preferred folder structure if possible:

```text
Volunteer Photos/
  Person Name 01/
    01.jpg
    02.jpg
  Person Name 02/
    01.jpg
```

Ideal photo characteristics:

- face clearly visible
- no heavy beauty filters
- reasonably high resolution
- front/three-quarter angle
- at least one full/half-body photo is useful for pose recreation
- volunteer name identifiable from filename/folder

If only one photo per volunteer is available, generation can still proceed, but multiple angles improve consistency.

---

# 5. AI-generated volunteer meme references

## Intended joke

Participants should receive meme reference images where the person in the absurd/famous meme pose is recognisably **their own team volunteer**.

The volunteer is standing physically in the team's zone, so the recognition itself is part of the humour.

The projector must **not** show the reference images.

Only participant phones show the reference they must recreate.

## Asset generation workflow

Codex should implement an optional asset-generation utility/pipeline, but generation must be treated as a build/content-prep step, not production runtime logic.

Suggested flow:

1. Put source volunteer photos in a private/local `content-input/volunteers/` directory (gitignored if photos should not be public).
2. Maintain a meme template manifest describing desired pose/composition and group size.
3. For each team, generate the required reference images using that team's volunteer identity.
4. Human-review the output for recognisability, pose clarity, and appropriateness.
5. Approved references are copied into deployable event assets and registered in the content manifest.
6. Generate fallback placeholder references so implementation can be completed before real photos arrive.

Codex may be able to call an image-generation capability depending on the environment it is given. If it does not have direct image-generation access, it should still build the manifests, folder structure, validation scripts, and optional provider adapter. Actual images can then be produced through ChatGPT image generation or an image API and dropped into the expected asset paths.

Do not block the app implementation waiting for final AI images.

---

# 6. Meme template manifest

Each template should define:

```json
{
  "id": "absolute-cinema",
  "groupSize": 2,
  "title": "Absolute Cinema",
  "generationBrief": "Recreate the recognisable pose/composition using the provided volunteer identity. Keep the pose visually easy for two students to copy.",
  "safeForOrientation": true
}
```

A 28-person team receives all 14 distinct two-person templates exactly once:
no meme reference is duplicated within that team.

A 27-person team needs 12 pair references + 1 trio reference.

The production manifest therefore contains exactly 15 templates: 14 unique
two-person references and one three-person reference. The same template set is
reused across teams, but each team's generated version features its own
pre-selected volunteer.

Use recognisable body-language/pose memes rather than references where the humour depends on reading tiny text.

---

# 7. Mystery images

Each team should have one distinct absurd source image for the final puzzle/reveal.

The image must have:

- one main action
- clear characters/objects
- enough visual structure to reconstruct from fragments
- enough absurdity to make wrong interpretations funny
- no tiny critical text
- no sensitive/embarrassing representation of an identifiable junior

Possible concepts:

- senior escaping on a dinosaur while juniors chase with event forms
- professor chasing a student holding an attendance register
- cat teaching an engineering class while a professor sleeps at a desk
- group of seniors carrying one student like royalty into an event
- student dramatically proposing to biriyani while friends celebrate
- lab record being treated like a sacred treasure during a chase

Create ~20 approved mystery images so every team has its own final reveal.

---

# 8. Puzzle tile preprocessing

Do not crop mystery images at runtime on participant devices.

Precompute tile assets during content preparation/build.

For every team's source image, generate the relevant participant tile set and a private layout manifest.

Requirements:

- portrait tile canvas
- visually usable on mixed phone sizes
- no visible tile number/index
- optional tiny crop overlap to help physical matching
- public participant API should only expose the caller's own tile after successful pairing
- original full image should stay hidden until reveal mode

The source and private tile-coordinate manifest should not be accidentally linked from public UI.

---

# 9. Manglish Q&A content style

The text should sound like actual Kerala college chat.

Good:

> Senior "oru cheriya help und" ennu paranjaal?
>
> Ninte next 3 divasam poyi ennu karuthikko.

Avoid stiff transliteration or formal Malayalam.

Content categories:

- KTU uncertainty/results/revaluation
- attendance
- assignment deadlines
- seniors recruiting volunteers
- WhatsApp groups
- Sahrdaya navigation/campus life
- event culture
- exams
- first-year assumptions vs reality

Humour should punch at shared college situations, not at a named student or vulnerable individual.

---

# 10. Initial approved-style Q&A bank

These are seed candidates and should be human-reviewed before final freeze.

| # | Question | Answer |
|---|---|---|
| 1 | Senior "oru cheriya help und" ennu paranjaal? | Ninte next 3 divasam poyi ennu karuthikko. |
| 2 | Eventinu volunteer aavan interest undo ennu chodichaal? | Reply cheyyumbozhekkum groupil add aayi kaanum. |
| 3 | Senior ninte number save cheythaal next entha? | Ninte free time officially over. |
| 4 | Seniorsinte favourite starting dialogue entha? | "Njangal first year aayirunnappo..." |
| 5 | KTU result eppo varum? | Ath KTUvinum ariyilla. |
| 6 | Exam thale divasam biggest confidence entha? | "Naale ravile padikkaam." |
| 7 | Revaluation koduthittu student entha vicharikkunne? | "Ithavana universe ente side aanu." |
| 8 | Exam kazhinju "easy aayirunnu" ennu parayunnavan aaranu? | Groupinte samadhanam kalayaan vannavan. |
| 9 | Collegeil ettavum fast spread aavunna news entha? | "Last hour free aanu." |
| 10 | Sahrdayayil vazhi ariyillenkil best navigation entha? | Confident aayi nadakkunna aalude pinnale povuka. |
| 11 | Assignment serious aavunna exact time eppozha? | Deadlineinu randu minute munpu. |
| 12 | Oru clubil mathram join cheyyam ennu paranja first year studentinu entha sambhavikkum? | Ezhu WhatsApp groupil ethum. |
| 13 | "Oru small orientation aanu" ennu paranjaal? | 500+ pere hallil kaanum. |
| 14 | Faculty varilla enna newsinte speed ethra? | College Wi-Fi-nekkal fast. |

Answers should be checked pairwise for ambiguity before deployment.

---

# 11. Branding

Requested assets if available:

- µLearn SCET logo
- Sahrdaya/college branding if appropriate/authorised
- orientation title
- any preferred colour system

The implementation should still look intentional with placeholders if branding arrives late.

---

# 12. Content validation command

Add a content validation script that fails loudly when:

- fewer/more than 20 enabled teams exist
- a team has no volunteer
- one volunteer is mapped to multiple enabled teams
- a team lacks enough meme references for its intended group structure
- Q&A IDs/answer keys are duplicated within a team/session seed
- a mystery source/tile asset is missing
- a public asset manifest accidentally contains private source-photo paths

This should be runnable before deployment and surfaced in CI/demo tooling.

---

# 13. Asset privacy / repository policy

Volunteer source photos should not automatically be committed to a public repository.

Recommended:

- keep raw Google Drive/source photos outside git or in gitignored `content-input/`
- only commit final approved generated references if organisers are comfortable with them being public
- alternatively mount/copy final media during deployment

Student meme captures are runtime event data and should live only in the persistent `/data/media` volume, not in git.

After the event, organisers should explicitly decide whether to export/retain or delete captured student photos.
