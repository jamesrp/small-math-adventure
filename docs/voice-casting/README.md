# Voices for the Lantern Road

A brief for Dot/Codex: cast and record the six keepers and Plume, who speak 85 short lines on the road (about 420 words, 2,156 characters). The story and its words are Claude's; the voices, recordings and their records are Dot/Codex's; James picks the cast and has the final word. The six travelers do not speak, and there is no narrator. The version-3 casting notes, for the travelers and a narrator, are in [v3-casting.md](v3-casting.md) and do not apply.

Work in two stages with a stop between them: auditions, then James picks, then all 85 lines. Claim each stage's line on [WORKBOARD.md](../../WORKBOARD.md) first.

## Where the lines play

On every road puzzle the keeper (or Plume) has a speech bubble with a Listen button. Tapping it plays that line's recording, or the browser's voice if there is none. When a player has turned sound on, the opening line plays by itself as the puzzle opens. Every other line (a mistake, a hint, a solve, Plume's verdict, a locked side puzzle) plays only on Listen.

`node scripts/check-art.mjs --voices` lists all 85 lines with their IDs and speakers. That list is the script. The text comes from `dist/road.js` (each puzzle's `open`, `win`, `locked`) and `dist/road-cast.js` (each character's `hint`, `oops` and Plume's `beat`, `tie`, `lose`, `gloat`).

## The words

Record the bubble's words exactly. The text you send to the generator may differ only to get a sound right (a performance tag such as `[snores]`, or a respelling), and the record keeps both. If a line reads badly aloud, don't change it: note it in `artwork/road4/NOTES.md` for Claude, who owns the lines.

## The cast

All seven are adult character voices: no child imitations and no pitch-shifted squeaks, which children find hard to understand. Accents can be mild and varied but never a joke about real people, and no voice imitates a real actor. Every word must be clear to a five-year-old, including Snooze's sleepy ones and Rattle's hammy ones.

| Character | Lines | Who | Voice |
|---|---|---|---|
| Snooze (she) | 13 | A giant sleepy sea turtle who is the ferry. Has a bath once the pump arrives. | Low, warm and very slow, a smile in it. Drowsy stretches between words, never mumbled. The slowest of the cast. |
| Mr. Hops (he) | 15 | A fussy frog lamplighter, always late, proud of his lamps. Returns at the fair. | A precise, slightly nasal tenor with crisp consonants. Prim and polite even when tutting; flustered when late. |
| Billie (she) | 10 | A loud, cheerful goat who runs the cable car, then a prize booth at the fair. | Loud and bright, as if calling over the wind. Laughs easily, with the child. Big energy, projected rather than shrill. |
| Rattle (he) | 10 | A skeleton gardener who plays at being spooky and is delighted to have visitors. | A hammy stage villain with a dry, clattery edge, relishing long vowels. Bursts into real glee when beaten. Never menacing. |
| Sprocket (she) | 10 | A raccoon inventor; things go bang around her. | Fast and excitable, words tumbling over each other, a little raspy. The quickest of the cast. |
| Wick (he) | 10 | A calm owl lighthouse keeper. Few words, dry humor. | Low, unhurried and dry, warmth under the understatement. The pauses are part of the line. |
| Plume (he) | 17 | The show-off peacock who leads the rival caravan. | Showy, smug and sing-song, a performer. Huffy and indignant when he loses, then a good sport. |

Billie and Sprocket have no stated gender in the game; this brief casts both as women so the seven aren't five men and two women. James can change that at the audition.

**Contrast.** A child should know who is talking with eyes closed. Snooze and Wick are both low and slow: she is drowsy and warm, he is dry and calm. Billie and Sprocket are both high-energy: Billie is loud and open, Sprocket quick and raspy. Mr. Hops and Plume are both proud: Hops is prim and exact, Plume theatrical.

## Sounds and stresses

| In the text | Say it as |
|---|---|
| Zzz… (Snooze) | a soft snore or breathy hum, never "zee zee zee" |
| Hmm, Mm?, Hm. | a closed-mouth hum; Snooze's "Mm?" rises, half asleep |
| Psst. | a whisper |
| Ahem. | Mr. Hops's polite throat-clear |
| Tsk. / Tsk tsk. | tongue clicks, not the word "tisk" |
| Hoo. (Wick) | one soft owl hoot |
| Heh heh. / Mwahaha! (Rattle) | a sly chuckle; a hammy villain laugh |
| Ha! | a short laugh in the speaker's own character |
| Hmph. | an indignant huff |
| Oooh, Ooooh, Ahhh | drawn out; Snooze's "Ahhh" is a contented bath sigh |
| Creeeak! (Rattle) | Rattle voicing the crypt door's creak, stretched |
| Rattle rattle. | said, bony and playful |
| EVER, PROVED | stressed |
| … | a real pause mid-line; a trailing one fades out |

## Stage 1: auditions (stop for James)

- For each character, two or three candidate voices from the library, or from Voice Design when nothing fits. Each candidate reads the same three lines, chosen to show the range:

  | Character | Audition lines (IDs) |
  |---|---|
  | Snooze | `ferry-bell/open`, `ferry-bell/win`, `snooze/oops-3` |
  | Mr. Hops | `marsh-boardwalks/open`, `marsh-water/win`, `hops/oops-2` |
  | Billie | `ridge-stones/open`, `ridge-kites/win`, `billie/oops-2` |
  | Rattle | `hollow-plots/open`, `hollow-plots/win`, `rattle/oops-3` |
  | Sprocket | `workshop-parts/open`, `workshop-pump/win`, `sprocket/oops-1` |
  | Wick | `lighthouse-mirrors/open`, `lighthouse-lamps/win`, `wick/oops-3` |
  | Plume | `ridge-duel/open`, `plume/beat-1`, `fair-final/win` |

- Use the model and settings you would use for production, the same for all of one candidate's lines.
- An audition page, `docs/voice-casting/auditions-v4/index.html`, like the version-3 [player](index.html): each character with this brief's direction and each candidate's three clips, plus one row that plays one line from each character's first-choice voice in turn, so James can hear the cast together.
- A record, `docs/voice-casting/cast-v4.json`: each candidate's voice name, ID and source link, model, settings, the exact text sent, and the credits used.
- Then stop. Tell James the page is ready and what you would pick and why. The auditions are what he hears; don't record the full script before he picks.

## Stage 2: all 85 lines (after James picks)

- One voice, model and settings per character across all their lines. Regenerate a bad take rather than drifting the settings.
- Files at `dist/art/voice/<line ID>.mp3` (for example `dist/art/voice/ferry-seats/open.mp3`, `dist/art/voice/plume/beat-1.mp3`), with manifest entries in `dist/art/manifest.json`: `"voice/ferry-seats/open": {"status": "ready", "audio": "voice/ferry-seats/open.mp3"}`. A line can sit as `"todo"` until it is good.
- Mono MP3 (M4A also works) at about 64 kbps, under the checker's 200 KB. Trim leading and trailing silence so the line starts the moment Listen is tapped, and bring every clip to the same loudness, for example: `ffmpeg -i take.mp3 -af "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11" -ac 1 -ar 44100 -b:a 64k out.mp3`. A small `scripts/prepare-voice.mjs` that does this and writes the manifest entry, like `prepare-art.mjs`, is welcome in its own commit.
- Extend `cast-v4.json` with every line: ID, speaker, bubble text, the text sent, voice ID, model, settings and the file's SHA-256.
- Recordings join the offline install (`npm run build` adds them); all 85 should come to two or three megabytes.

## Checks

- Transcribe each clip with a speech-to-text tool and compare it with the bubble text, to catch dropped, added or garbled words. Flag any clip shorter than half a second or longer than five.
- `node scripts/check-art.mjs` (every voice ID is a real line, MP3 or M4A, under 200 KB, file present), `npm run build`, `npm test`, and `node scripts/road-browser-smoke.mjs` with `npm start` running.
- In the game: tap Listen at every stop and on a mistake, a hint and a solve; turn sound on in the profile and open a puzzle to hear its opening line play by itself. If an iPad is at hand, try Safari there too; recorded playback has never been checked on one.
- Voice and art both write `dist/art/manifest.json`. If an art batch lands first, rebase and keep both sets of entries.

## Done

All 85 lines are ready in the manifest, the checks pass, `cast-v4.json` is complete, and the work is on `main` under `AGENTS.md`. Mark the work-board line done and tell James three things to watch for with children:

1. Can they tell who is talking without looking?
2. Do they understand every word, especially Snooze's and Rattle's?
3. Do they tap Listen at all, and do they tap it again?
