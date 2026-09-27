# Story artwork

Generated with the built-in ImageGen tool using the imagegen skill. `prompts.json` records the full prompts, references, selected outputs, and any edits. The first citadel painting established the style; subsequent scenes use it and the original companion portraits as references.

- `originals/`: selected, unmodified generated PNGs.
- `references/`: original app artwork and the harbor image before its localized correction.
- `../../dist/assets/story/`: JPEG copies used by the app and included in its offline cache.

JPEGs preserve the full composition and source dimensions. They were encoded with macOS `sips -s format jpeg -s formatOptions 85`; no procedural painting, compositing, or retouching was applied. Creative corrections were made through ImageGen.

`dist/rescue-art.js` selects artwork by encounter, capability, route and completion. Images portray the story; exact puzzle states remain on the interactive boards. Captions are live, accessible HTML using each encounter’s existing story text.
