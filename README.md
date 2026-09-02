# Zanzarah Modding Suite (ZMS)

**Zanzarah Modding Suite — by Maksym Bihun**

ZMS is a reverse-engineering and modding toolkit for **Zanzarah: The Hidden Portal**. The project currently focuses on world editing, NPC/enemy placement, items, wild encounters, RenderWare BSP/DFF viewing, SCN/FBS tooling, PAK resource access and controlled EXE patching.

> This repository contains ZMS code, documentation, reverse-engineering notes and project history. It does **not** include original copyrighted game assets.

> **Proprietary project:** public source visibility does **not** make ZMS open source. Redistribution, modified public builds, forks/derivative distributions and reuse of substantial ZMS code require prior written permission from the copyright holder. See [`LICENSE`](LICENSE).

## Current status

Current World Editor source: **v0.9.0**. This release promotes the gameplay-confirmed v0.8.35 group-combat work to the stable baseline.

A separate experimental **Fairy Extractor v0.1 EXP** is included under [`tools/fairy-extractor-v0.1-exp/`](tools/fairy-extractor-v0.1-exp/). It is not yet considered gameplay-validated.

- [Master changelog](CHANGELOG.md)
- [Progress log: 2026-08-30 → 2026-09-02](docs/progress/2026-08-30_to_2026-09-02.md)
- [Release history](docs/releases/HISTORY.md)
- [Detailed historical changelogs](changelogs/)
- [Release policy](docs/RELEASE_POLICY.md)
- [Project structure](docs/PROJECT_STRUCTURE.md)

## Confirmed milestones

- Existing SCN enemy → `_fb0x05` → `W` team editing is gameplay-confirmed.
- Custom visible hostile NPC creation based on battle-ready `nq4001` scripts is gameplay-confirmed.
- NPC appearance is controlled by `C.<model>` and can be previewed from DFF/AED resources in `data_0.pak`.
- Standard existing attack-dialogue references work; creating new custom `_fb0x06` dialogue records was found to crash the game and is disabled.
- Wild encounter pool semantics: `Trigger.ii4 = poolId`.
- Original wild pools 0–33 decoded from `zanthp.exe`.
- Custom wild pool EXE patcher; Pool 34+ gameplay tested successfully.
- Manual wild level range using `_WildWizform`-derived profiles is gameplay-confirmed.
- Alternative enemy deck layouts using `L / $ / W / K` were identified in mod data: multiple groups of five `W` slots are alternative decks, not one oversized deck.
- No `W` slot above 4 has been confirmed in the original database or the two supplied mods.
- Linked enemy groups are gameplay-confirmed: one leader plus multiple support enemies can enter the same battle through the `P.<marker>.<UID>` + ii=5-marker architecture, and the generated cleanup removes all group members after victory.
- The pre-battle camera teleport was eliminated by removing the unused fixed `&.3001 / &.3002 / &.3003` group states while retaining the per-support `P` links.

## Included tools

### World Editor
Root files (`index.html`, `editor.js`, `editor-core.js`, `bsp-viewer.js`, `style.css`) are the current World Editor v0.9.0 source.

### Fairy Extractor v0.1 EXP
Experimental standalone browser tool for opening mod `_fb0x01.fbs`, comparing fairy records, previewing DFF/AED resources from a user-selected modded `data_0.pak`, and exporting selected records into the experimental `.zfairy` container.

## Repository policy

Do not commit original game binaries or resources such as `zanthp.exe`, `data_0.pak`, original FBS/SCN/BSP/DFF/WAV/MP3 files. ZMS should operate on user-provided game files locally.

Unknown or only partially reverse-engineered fields must be preserved whenever possible instead of rewritten with guessed meanings. Gameplay-failed experiments remain documented in the changelog instead of being presented as confirmed behavior.

## Versioning

Historical tags cover `v0.1` through the older experimental series. The current stable source is **v0.9.0**; many v0.8.x research builds used the `EXP` suffix.

There is no standalone archived `v0.5.0` build.

## License

ZMS is **proprietary software** and is **not an open-source project**. Copyright © 2026 Maksym Bihun. All rights reserved.

See [`LICENSE`](LICENSE) for the exact terms.