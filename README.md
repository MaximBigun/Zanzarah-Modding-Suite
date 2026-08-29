# Zanzarah Modding Suite (ZMS)

**Zanzarah Modding Suite — by Maksym Bihun**

ZMS is a reverse-engineering and modding toolkit for **Zanzarah: The Hidden Portal**. The project currently focuses on world editing, NPC/enemy placement, items, wild encounters, RenderWare BSP viewing, SCN/FBS tooling, PAK resource access and controlled EXE patching.

> This repository contains ZMS code, documentation, reverse-engineering notes and project history. It does **not** include original copyrighted game assets.

> **Proprietary project:** public source visibility does **not** make ZMS open source. Redistribution, modified public builds, forks/derivative distributions and reuse of substantial ZMS code require prior written permission from the copyright holder. See [`LICENSE`](LICENSE).

## Current status

Latest historical build: **v0.8.7 EXP**.

The reconstructed Git history preserves development from `v0.1` through `v0.8.7-exp`. Experimental builds use the `-exp` suffix starting with v0.8.0.

- [Tags](https://github.com/MaximBigun/Zanzarah-Modding-Suite/tags)
- [Release history](docs/releases/HISTORY.md)
- [Master changelog](CHANGELOG.md)
- [Detailed version changelogs](changelogs/)
- [Release policy](docs/RELEASE_POLICY.md)
- [Project structure](docs/PROJECT_STRUCTURE.md)

## Main directions

1. **World Editor** — NPC/enemies, items, wild encounters, 3D BSP viewer, SCN/FBS editing, PAK/resource tools.
2. **Fairy Editor** — future full fairy data editor and research toward new fairies.
3. **Landscape / Level Development** — future BSP geometry editing and Unity-assisted authoring pipeline.
4. **Modern PC / Engine Improvements** — resolution, ultrawide, FOV/HUD, compatibility and rendering fixes.
5. **Localization & Voice** — text localization, speech mapping, TTS/voice packs and runtime language switching research.

## Confirmed milestones

- SCN placement links and NPC team editing.
- RenderWare BSP geometry loading from `data_0.pak`.
- Item placement and quantity via multiple real collectable SCN objects.
- Wild encounter pool semantics: `Trigger.ii4 = poolId`.
- Original wild pools 0–33 decoded from `zanthp.exe`.
- Custom wild pool EXE patcher; Pool 34+ gameplay tested successfully.
- Custom pool architecture expanded to IDs 34–255 (high IDs still require broader gameplay validation).

## Repository policy

Do not commit original game binaries or resources such as `zanthp.exe`, `data_0.pak`, original FBS/SCN/BSP/DFF/WAV/MP3 files. ZMS should operate on user-provided game files locally.

Unknown or only partially reverse-engineered fields must be preserved whenever possible instead of rewritten with guessed meanings.

## Versioning

Historical tags:

`v0.1` → `v0.2` → `v0.3` → `v0.4` → `v0.4.1` → `v0.4.2` → `v0.5.1` → `v0.5.2` → `v0.6.0` → `v0.7.0` → `v0.8.0-exp` → … → `v0.8.7-exp`

There is no standalone archived `v0.5.0` build.

## License

ZMS is **proprietary software** and is **not an open-source project**. Copyright © 2026 Maksym Bihun. All rights reserved.

The repository may be publicly visible for transparency, development history, testing and reference, but public visibility does not grant permission to redistribute, republish, fork into a public derivative distribution, sell, repackage, or reuse substantial portions of ZMS in another product.

See the full [`LICENSE`](LICENSE) for the exact terms.