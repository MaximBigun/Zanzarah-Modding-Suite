# Historical Releases

Canonical historical snapshots are Git tags in this repository. This document records the intended release identity and validation state of each preserved build.

| Version | Git tag | Status | Main milestone |
|---|---|---|---|
| v0.1 | [`v0.1`](../../tree/v0.1) | Historical | First Enemy Editor |
| v0.2 | [`v0.2`](../../tree/v0.2) | Historical | First 3D World Viewer |
| v0.3 | [`v0.3`](../../tree/v0.3) | Historical | Items + BSP placement |
| v0.4 | [`v0.4`](../../tree/v0.4) | Historical | Wild Fairies + Undo |
| v0.4.1 | [`v0.4.1`](../../tree/v0.4.1) | Historical | sceneFile BSP lookup |
| v0.4.2 | [`v0.4.2`](../../tree/v0.4.2) | Historical | RenderWare BSP fixes |
| v0.5.1 | [`v0.5.1`](../../tree/v0.5.1) | Historical | Hostile NPC radius |
| v0.5.2 | [`v0.5.2`](../../tree/v0.5.2) | Historical / RE | ii4 pool index confirmed |
| v0.6.0 | [`v0.6.0`](../../tree/v0.6.0) | Historical | poolId UI |
| v0.7.0 | [`v0.7.0`](../../tree/v0.7.0) | Historical / RE | Pools 0–33 decoded |
| v0.8.0 EXP | [`v0.8.0-exp`](../../tree/v0.8.0-exp) | Experimental | Custom wild pool patcher; Pool 34+ gameplay PASS |
| v0.8.1 EXP | [`v0.8.1-exp`](../../tree/v0.8.1-exp) | Experimental | Level UI + NumPad camera |
| v0.8.2 EXP | [`v0.8.2-exp`](../../tree/v0.8.2-exp) | Experimental | Item quantity ×N |
| v0.8.3 EXP | [`v0.8.3-exp`](../../tree/v0.8.3-exp) | Experimental | First Custom Shadow Elf |
| v0.8.4 EXP | [`v0.8.4-exp`](../../tree/v0.8.4-exp) | Experimental | One-specific-fairy mode |
| v0.8.5 EXP | [`v0.8.5-exp`](../../tree/v0.8.5-exp) | Experimental | Custom pools 34–255 |
| v0.8.6 EXP | [`v0.8.6-exp`](../../tree/v0.8.6-exp) | Experimental | Custom Shadow ns322a attempt |
| v0.8.7 EXP | [`v0.8.7-exp`](../../tree/v0.8.7-exp) | Experimental | Custom Shadow ns321a fix #2 |

There is no standalone archived v0.5.0 build.

## Validation vocabulary

- **Static PASS** — parser/serializer/patch structure or other offline checks passed.
- **Gameplay PASS** — behavior was actually observed working in Zanzarah.
- **Gameplay FAIL** — a tested behavior failed in the game.
- **Pending** — not yet confirmed in gameplay.
- **Historical** — reconstructed from preserved project builds/history; does not imply every feature was gameplay-tested.

## Binary builds

Git tags are the canonical source snapshots. Binary ZIP assets should be attached to GitHub Releases when the corresponding archived build is available. Missing historical binaries must not be silently regenerated and presented as byte-identical originals.

Known SHA-256 values for preserved build ZIPs are recorded in [`SHA256SUMS-HISTORICAL.md`](SHA256SUMS-HISTORICAL.md).