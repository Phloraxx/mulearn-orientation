# Meme Reference Plan — Final

## Final model

The live event uses **15 shared reference images** across all 20 animal teams:

- 14 two-person references
- 1 three-person reference

A 28-person team receives all 14 pair references once each. A 27-person team receives 12 pair references plus the trio. Students only search inside their fixed animal zone, so reusing the same 15 references across teams is unambiguous.

Volunteer faces are **not** required in meme references. This removes the old 300-image team-specific generation requirement and makes the event much easier to prepare and validate.

## Approved bank

1. Spider-Man Pointing
2. Epic Handshake
3. Absolute Cinema
4. Drake Hotline Bling
5. Woman Yelling At Cat
6. Two Buttons
7. Running Away Balloon
8. American Chopper Argument
9. Change My Mind
10. Surprised Pikachu
11. Disaster Girl
12. UNO Draw 25
13. Is This A Pigeon
14. Leonardo DiCaprio Cheers
15. Distracted Boyfriend — trio

Source-page attribution and recreation notes live in `content/internet-meme-sources.json`.

## Runtime files

The approved files are stored once:

```text
content/generated-assets/meme-references/pose-01.webp
...
content/generated-assets/meme-references/pose-15.webp
```

The participant endpoint remains authenticated and only exposes the reference assigned to that participant during Meme mode. The projector never displays these source references; it displays only juniors' captured recreations.

## Recreation rules

- easy to understand in roughly five seconds
- no dangerous contact, lifting, jumping or lying on the floor
- no intimate pose requirement
- props should be mime-able with empty hands
- reference should remain readable on a phone screen
- one unique reference per meme group inside each team

## Copyright/source policy

The repository records third-party source-page attribution. The local reference cards are event assets used only to guide pose recreation. They should not be marketed or redistributed as an original meme-template library.
