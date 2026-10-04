# Lantern Road artwork (version 3)

These six scenes belong to the version-3 road. The version-4 road (`docs/ROAD.md`) no longer shows them, so the web copies moved here from `dist/assets/road/` to `v3/`, where they are kept as references. Five of them show places that are also stops on the new road (ferry, marsh, ridge, workshop, lighthouse). New art goes through the slots in `docs/art/ROADMAP.md`.

Six new environment illustrations generated with the built-in ImageGen tool. The complete prompts and generated-source paths are recorded in `prompts.json`; selected original PNGs are in `originals/`. The source illustrations were inspected for scene clarity, consistent dusk palette, open foreground, and absence of UI/text or duplicate characters.

The runtime used JPEG copies (now in `v3/`), encoded with `sips` at quality 86 without compositing or repainting. The app overlaid the vector companions and interactive progress in `dist/road-art.js` (removed with version 4). Exact puzzle states remain on their mathematical boards. Old rescue artwork is retained for the historical campaign.
