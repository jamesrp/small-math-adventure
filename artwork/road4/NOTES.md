# Lantern Road still art

Requested scope: stills only. Made with the built-in image generation tool on 2026-10-03, using `docs/art/ROADMAP.md`, the original placeholder compositions, and the character reference sheets.

## Delivered

- 13 character model sheets in `reference-sheets/`, plus three reference boards assembled from those sheets and the finished locations.
- 69 distinct game stills: 28 scene stages, 28 keeper poses, six travelers, two maps, two wagon stickers, two tools, and one finale.
- All 90 catalog slots populated in `dist/art/manifest.json`. The 21 scene-change posters are byte-for-byte copies of their destination-stage stills; no video or audio was generated.
- Original PNG sources retained in `stills/`. Iterations remain alongside the selected source; `stills-selected.json` identifies the shipped choice for every slot.
- Full prompts and input references recorded in `prompts.json`; `stills-plan.json` reflects the final generation instructions.
- A local review gallery in `review/index.html`, with contact sheets for scenes, circular keeper crops, transparent sprites, maps and finale. The gallery uses the shipped WebP files. In-game map and ferry screenshots cover phone, tablet and desktop sizes.

The scene stages retain each location's camera and major landmarks. Review corrections restored white chalk marks in the hollow, retained the workshop pump after the final solve, and kept Fern's two-leaf pot separate from the fair's wooden lantern stand. The finale includes each of the 13 characters once.

## Export and checks

`ffmpeg` was unavailable on the shell path. The still export used bundled Sharp with cover resizing to the catalog dimensions, WebP quality 82 and alpha quality 100, matching the roadmap's still settings. Generated PNGs were preserved. Reference boards and review sheets were laid out in HTML and captured in an isolated headless browser; the generated artwork itself was not painted or altered with those tools.

- `node scripts/check-art.mjs`: 90 ready, zero missing, zero problems; 8.4 MiB shipped art (8,819,360 bytes).
- Alpha validation: all ten transparent assets have clear background pixels, opaque content, and fully transparent outer edges. The 90 shipped images contain 69 distinct file hashes.
- Browser image validation: all 90 served WebPs decode successfully (`browser-art-validation.json`). Loaded finale screenshots are saved for phone, tablet and desktop in `review/finale-*.png`.
- `npm run build`: passed content and proof validation and rebuilt the offline asset list, cache version `3ec718c9021ffcd0`.
- `npm test`: all 239 tests passed.
- `node scripts/road-browser-smoke.mjs`: passed on all three grade trails and phone/tablet/desktop sizes; 63 main encounters, tool unlocks, side puzzles, finales and offline replay, with zero browser errors. Full results are saved in `road-browser-results.json`.
- Visual review: all scene stages, keeper circular crops, maps, finale and transparent sprites inspected. In-game previews inspected at 390×844, 1024×768 and 1440×1000, including the loaded finale.

The tablet check uses a simulated viewport in Chromium. Physical iPad Safari testing remains for a device review.

Only artwork, art records and the generated service-worker asset/cache list were changed. No puzzle boards, game logic, dialogue or CSS changes were needed.
