# Zanzarah Modding Suite — Master Changelog

**Canonical master changelog. Current through v0.8.7 EXP.**

This is the single repository-level master changelog and must always be updated with every new ZMS version. Detailed historical per-version notes are archived under [`changelogs/`](changelogs/).

## v0.8.7 EXP
- Custom Shadow Elf gameplay fix #2: base changed from `ns322a` to `ns321a`.
- Preserves Shadow Elf actor ref `0x97688F91`.
- Custom Script2 uses `C.u002s02m` + user W team.
- Placement trigger profile: `ii=3`, `ii2=3`, `ii3=0`, `ii4=0`, empty strings.
- Default hostile radius 5.0.
- Static tests PASS: FBS roundtrip, template/actor ref, Script2, trigger profile, Scene.s empty, item Y+1, custom pools 34–255.
- Pending: gameplay validation of Custom Shadow Elf v0.8.7.
- Known bug: ordinary item ×N pickup notification does not display quantity although inventory receives N.

## v0.8.6 EXP
- Custom Shadow based on `ns322a`.
- Default hostile radius 5.0.
- New items stored at Y+1.0.
- Static tests PASS.
- Gameplay FAIL: Custom Shadow absent; RE identified scene/quest conditional scripts in `ns322a` as likely deactivation cause.

## v0.8.5 EXP
- Custom pools expanded from 34–45 to **34–255** (222 custom IDs).
- EXE patch architecture v2: generic dispatcher + compact metadata table.
- High IDs >45 pending gameplay validation.

## v0.8.4 EXP
- Added wild encounter mode for **one specific fairy**.
- Reuses matching custom pool or allocates a new one; requires EXE repatch.

## v0.8.3 EXP
- First Custom Shadow Elf implementation.
- Protected original `_ShadowElf`; cloned to `_CustomShadowElf_XX` with unique UID from `0xE5000001`.
- Script2 replaced with `C.u002s02m` + W team.
- Static tests PASS; gameplay exposed model/hostility problems.

## v0.8.2 EXP
- Item quantity 1–99 implemented as N real collectable SCN objects at the same coordinates.
- Click/coordinate placement and single Undo batch.
- Gameplay: coins PASS, crystals PASS, ordinary items confirmed to add N to inventory.
- Later-discovered UI bug: pickup notification omits ×N for ordinary items.

## v0.8.1 EXP
- Human-readable wild level range selector.
- NumPad camera: 7/9 rotate, 8/2 vertical; Shift accelerates movement.

## v0.8.0 EXP
- First custom wild pool EXE patcher.
- Original pools 0–33 untouched; custom IDs 34–45.
- Up to 8 weighted fairy slots + levelParam.
- Reads already-patched EXE.
- Wild pool entry `0x00476102` redirected to code cave.
- **Gameplay PASS:** custom Pool 34+ confirmed working in game.

## v0.7.0
- Fully decoded original encounter pools 0–33 from `zanthp.exe`, function VA `0x00476102`.
- Added decoded pool database.
- DebugView confirmed action/support spell candidate-list generation and random selection by the game; W commands/wild triggers do not contain spell IDs.

## v0.6.0
- Wild UI moved to `poolId` semantics.
- Initial original-pool mappings added.

## v0.5.2
- Confirmed `Trigger.ii4` is encounter pool index 0–33.
- Pool 3 identified as Tinefol/Pfoe.

## v0.5.1
- Hostile NPC Trigger type1.
- Float attack radius; radius 0 uses ordinary type2, radius >0 hostile type1.

## v0.4.2
- RenderWare BSP fixes: World Struct offsets and RW 0x310 support.
- Verified `SC_0231.BSP` and `MD_0004.BSP`.

## v0.4.1
- BSP lookup via `[Misc] -> sceneFile`.
- `md_*` support.

## v0.4
- Wild Fairies tab and encounter point add/edit/delete.
- Undo/Ctrl+Z.
- At this stage `ii4` was still incorrectly presumed to be a direct fairy ID.

## v0.3
- Items and BSP surface placement.
- Ray/triangle picking.
- Collectables via Models_v3 + Behaviours.
- Add/move/change/delete items and SCN export.

## v0.2
- First 3D World Viewer.
- RenderWare BSP reading and extraction from `data_0.pak`.
- NPC overlays on real geometry, camera controls and NPC clicking.

## v0.1
- First working Enemy Editor.
- Reads `_fb0x05.fbs`, NPC/fairy masters and `W.<fairy>.<slot>.<level>`.
- Edits up to five NPC fairies/levels.
- Reads SCN and links Scene type4 → Trigger type2 → NPC UID.
- X/Z schematic, XYZ/direction, add/remove placement, FBS + SCN export.