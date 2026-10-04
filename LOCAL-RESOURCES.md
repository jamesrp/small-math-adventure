# Optional local game research inputs

The app's ordinary tests, content validation and release build use the committed owned files. These inputs are needed only for reproducing the separate [Zoombinis research](research/zoombinis/README.md).

Original discs stay in the repository root, ignored by `.gitignore`. Do not mount or run the original installers as part of source setup. Obtain any missing originals through the user's authorized private file access; a cloud Git checkout does not download them automatically.

| Filename and placement | Purpose | Exact bytes | SHA-256 |
| --- | --- | ---: | --- |
| `Zoombinis.iso` | Logical Journey source disc | 246257664 | `a60243bfc272d468a574ce2de31f14073d86c016103696c3f8a72d29e0169131` |
| `MountainRescue.iso` | Mountain Rescue source disc | 579850240 | `a02da8925ba5f92984e804c3931f4b7d2e1fc77c57c0a8ea51d483a3f779138f` |
| `IslandOdyssey.iso` | Island Odyssey source disc | 306425856 | `0617b232ccfeb89434d6aa433ac6f5e3e83944656a30d8ae8b9b2b28130277e8` |

Verify bytes and hashes before extraction. Generated original/source-derived assets belong under ignored `research/zoombinis/local/`; the optional native environment belongs under ignored `research/zoombinis/.venv/`. Keep the analytical tools and authored notes in Git, and keep the discs and extracted assets private and local to the authorized research environment.
