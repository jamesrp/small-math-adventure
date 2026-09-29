# ElevenLabs production plan

This plan covers the current version-3 Lantern Road in the working checkout. It is a migration proposal; playback and audio assets have not been changed. The exact existing text, source hashes, and puzzle-to-reading mapping are in [script-inventory.json](script-inventory.json), with a readable [script inventory](script-inventory.md).

## Scope and cast

Existing playback needs one narrator: all 36 story lines are third-person narration, and the browser ignores the encounters’ character metadata. The intended full cast uses seven voices while retaining the same 86 production clips:

| Role | Full-cast assignment | Clips |
| --- | --- | ---: |
| Narrator | 50 puzzle-help readings and 18 story consequences | 68 |
| Pip | Two encounter intros | 2 |
| Moss | Three encounter intros | 3 |
| Rook | Three encounter intros | 3 |
| Bea | Five encounter intros | 5 |
| Fern | Three encounter intros | 3 |
| Tumble | Two encounter intros | 2 |

Use the existing `speaker` field for each intro. Adapt only text that sounds unnatural from its assigned character: for example, Tumble’s “Tumble has a pebble game for the rest stop” can become “I have a pebble game for the rest stop.” Record production text separately from the unchanged extraction until the corresponding story edit is implemented. Add no decorative lines, automatic story announcements, or historical story arcs. Existing companion quotes can support auditions but are not additional production dialogue.

The current script totals **9,363 characters / 1,747 whitespace-delimited words**: 36 story readings (1,429 characters / 242 words) and 50 distinct full help readings (7,934 characters / 1,505 words). These are exact-text counts, not billing or duration estimates; the small dialogue adaptation will change them. The help readings cover 192 library puzzles and 54 road boards across three grade trails. The road alone uses 31 of the 50 readings. Story clips are shared across grade trails.

## Integration boundaries

- [caravan.js:10–41](../../dist/caravan.js#L10) defines the 18 encounters, speaker assignments, intros, and consequences. [road-art.js:85–94](../../dist/road-art.js#L85) chooses the text for Story → Listen.
- [main.js:134–149](../../dist/main.js#L134) constructs puzzle help and speaks all text using the browser’s default voice. Help combines [puzzle-copy.js](../../dist/puzzle-copy.js), [expansion.js](../../dist/expansion.js), [tile-controls.js:62](../../dist/tile-controls.js#L62), and the fixed cup-swap instructions. These depend on authored puzzle parameters, so all readings can be generated ahead of time.
- [main.js:195–198](../../dist/main.js#L195) handles Story → Listen; [main.js:218](../../dist/main.js#L218) handles the help speaker button. [main.js:226](../../dist/main.js#L226) cancels speech on navigation and reads instructions automatically only when the explorer’s existing sound setting is enabled. Preserve these triggers and settings.
- Current companion biographies have no Listen control ([caravan-ui.js:49](../../dist/caravan-ui.js#L49)); map opening/finale, archive prose, hints, and explorer names are outside replacement coverage.

## Next implementation steps

1. Confirm cast through short auditions, including a real puzzle instruction for the narrator. Record each selected ElevenLabs voice ID, model, settings, and pronunciation decisions. Check intelligibility of mathematical terms, letters, numbers, and interface labels.
2. Generate and download prerecorded clips using the existing subscription. Keep an auditable production manifest with stable clip ID, role, exact spoken text, text/source hash, voice/model/settings, and asset filename. Refresh the extraction if its source hashes have changed. Store compact delivery audio under `dist/assets/voice/`; keep large masters outside `dist/`.
3. Replace both speech-synthesis paths with one audio controller and explicit clip lookup. Cancel the current clip before another reading or navigation. Handle rejected playback and missing audio with the existing readable Story/Help content. Preserve puzzle IDs, save state, and the existing opt-in instruction setting. The app needs no ElevenLabs credentials or runtime AI service.
4. Add audio MIME types to [serve.mjs:5](../../scripts/serve.mjs#L5). [release.mjs:6–16](../../scripts/release.mjs#L6) already discovers and hashes every public asset; `npm run build` will include the recordings in the service-worker precache. [sw.js:3–8](../../dist/sw.js#L3) treats precaching atomically, so a missing clip must prevent an offline-ready claim.
5. Run `npm test` and `npm run build`. Check manifest coverage against all current story/help readings, no missing assets, and no stale text hashes. Adapt the existing speech-synthesis assertion in [tile-browser-smoke.mjs:50](../../scripts/tile-browser-smoke.mjs#L50), then exercise character/narrator selection, repeated Listen, cancellation, rejected playback, preserved sound settings, and an unopened story/help clip after offline reload. Listen to rendered files for pronunciation, pacing, clipping, and consistent loudness; automated checks cannot establish performance quality.

Real iPad Safari installation, playback, and offline relaunch remain unverified. Check them on the actual device before claiming the audio migration works there. Publishing is a separate step from completing and verifying local integration.
