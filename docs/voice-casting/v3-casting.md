# ElevenLabs casting recommendation (version 3, historical)

> Historical: this cast the version-3 story, where the six travelers and a narrator spoke. In version 4 only the six keepers and Plume speak; their brief is [README.md](README.md). The auditions, `cast.json` and `index.html` here belong to this older cast.

Open [the local audition player](index.html) to compare all seven downloaded samples. **Use these existing voices as the first cast; listen before committing to production.** Selection is based on live ElevenLabs library descriptions and authored characters. Audio was generated and downloaded, but was not directly heard in this session. The directions below describe desired performances, not verified sonic outcomes.

| Role | Proposed voice | Desired fit |
| --- | --- | --- |
| Narrator | [George - Warm, Captivating Storyteller](https://elevenlabs.io/voices/JBFqnCBsd6RMkjVDRZzb) | Warm British storybook anchor; patient clarity for instructions. |
| Pip | [Cooper - Nervous, Dramatic and Timid](https://elevenlabs.io/voices/GsfuR3Wo2BACoxELWyEF) | Alert, lightly nervous moth trying to sound brave. Keep the hesitation small. |
| Moss | [Brian - Deep, Resonant and Comforting](https://elevenlabs.io/voices/nPczCjzI2devNBz1zQrb) | Rounded, mellow camp cook. An unhurried contrast to Pip and Bea. |
| Rook | [Oliver - Clean, British and Steady](https://elevenlabs.io/voices/L1aJrPa7pLJEyYlh3Ilq) | Mature navigator with dry, understated humor; a small pause before the correction. |
| Bea | [Laura - Enthusiast, Quirky Attitude](https://elevenlabs.io/voices/FGY2WhTYpPnrIDTdsKH5) | Bright, practical builder; curiosity and brisk decisions without sounding like an advert. |
| Fern | [Lily - Velvety Actress](https://elevenlabs.io/voices/pFZP5JQG7iQjIQuC4Bku) | Soft, grounded tree tender. Calm assurance, with clear consonants rather than whispering. |
| Tumble | [Lutz - Chuckling, Giggly and Cheerful](https://elevenlabs.io/voices/9yzdeviXkFddZ4Oz8Mok) | Buoyant comic creature. Warm enthusiasm, with laughs saved for the joke. |

The intended ensemble has **seven voices: one narrator and six companions**. A literal replacement of the current script needs only one narrator: its 36 story lines are third-person narration and existing speaker metadata is ignored by playback. The proposed full-cast production assigns 18 intros to their characters and 18 consequences plus 50 unique instruction readings to the narrator. Adapt awkward self-references deliberately; do not add decorative dialogue. The exact current extraction covers **86 clips, 9,363 characters and 1,747 whitespace-delimited words** across current road and catalog puzzles.

Companion auditions use six existing identity quotes; these are not currently displayed or spoken and have not been added to the game script. The narrator audition combines sample setup with two existing consequences. Luma, Bracken, the speaking ferry and the Keeper belong to historical material and need no current casting.

## Audition evidence

- Seven local MP3 files, totaling approximately 25.9 seconds, are available in [the audition player](index.html). The page includes cast data inline and needs no dependencies.
- All seven use eleven_multilingual_v2 with each voice’s own preset defaults. Settings differ between voices. [cast.json](cast.json) retains voice IDs, exact sample text, typed settings, source links, file hashes and original download filenames with their encoded settings. These presets have not been tuned as a consistent production direction.
- Settled included-credit balance: **131,000 → 130,613**, a measured **387 credits** for these auditions. No paid additions were purchased. This is observed credit usage, not cash cost or a projection for the whole game.
- Listen particularly for overplayed hesitation in Pip, continuous laughter in Tumble, and adequate distinction between the narrator and Rook. Check Bea’s energy and Fern’s consonants. Try an actual puzzle instruction with George before generating the full batch.

## If a custom voice is needed

Try the existing cast first. Voice Design is an optional fallback for these two roles if listening reveals a mismatch; no cloning is needed.

**Pip prompt:** A light, nimble adult character voice for a small moth. Alert, earnest and quietly brave, with a tiny nervous pause before a dry joke. Clear natural diction, gentle warmth, no squeaking or exaggerated stammer.

**Tumble prompt:** A warm, rounded adult character voice for a cheerful furry traveler. Buoyant, slightly rumbling, affectionate and matter-of-fact about silly things. Crisp diction and playful pauses; occasional soft chuckle, never constant laughter.

## Production handoff

The game has **not been switched to ElevenLabs**; these samples are auditions. [production-plan.md](production-plan.md) describes role assignments, the prerecorded asset manifest, playback integration, offline caching and validation. [script-inventory.md](script-inventory.md) provides the readable script; [script-inventory.json](script-inventory.json) maps exact readings to puzzle IDs and source hashes. Next, confirm performances by listening, fix small character-text mismatches, generate the production batch, then integrate and check browser/iPad playback. The shipped game needs no ElevenLabs credentials or runtime model calls.
