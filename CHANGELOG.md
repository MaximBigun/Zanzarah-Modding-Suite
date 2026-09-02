# Zanzarah Modding Suite — Master Changelog

**Canonical master changelog. Current through World Editor v0.9.0 and Fairy Extractor v0.1 EXP.**

This is the single repository-level master changelog and must always be updated with every new ZMS version. Detailed historical per-version notes are archived under [`changelogs/`](changelogs/).

## v0.9.0 — 2026-09-02
- Promoted the gameplay-confirmed v0.8.35 group-combat implementation to the stable World Editor v0.9.0 baseline.
- Preserves all v0.8.35 functionality: linked leader/support groups, group cleanup after victory, 3D BSP dragging, automatic `Resources/data_0.pak` discovery, manual PAK fallback, separate FBS/SCN export and direct overwrite into the selected game folder with backups.
- Group naming is human-readable and group-scoped: `_CustomGroup01_Leader`, `_CustomGroup01_Support01`, etc.
- Removed experimental camera-diagnostic wording from the UI; the no-teleport group flow is now the confirmed baseline.

## v0.8.35 EXP — 2026-09-02
- Final camera-fix experiment for linked group battles.
- Removed the unused fixed group states `&.3001`, `&.3002`, `&.3003` and their `Q.10` calls from generated group Script1.
- Retained only the per-support link `P.<marker>.<UID>` + `Q.10`.
- Gameplay PASS: leader attacks, one or two support enemies join the same battle, the pre-battle camera teleport is gone, and all group members disappear after victory.
- Added automatic group-scoped names: `_CustomGroupNN_Leader` / `_CustomGroupNN_SupportNN`.

## v0.8.34 EXP — 2026-09-02
- Camera diagnostic #2: removed `e.5` from generated group Script1 while keeping `P`, `Q.10`, support triggers, ii=5 markers and cleanup unchanged.
- Gameplay result: the camera still teleported three times before battle, so `e.5` was not the source.
- Introduced clearer leader/support naming for generated group profiles; the scheme was refined in v0.8.35.

## v0.8.33 EXP — 2026-09-02
- Added two save workflows for modified game data: download `_fb0x05.fbs` and the active SCN separately, or write both directly back into the selected game installation.
- Direct-write mode creates one-time `.zwe.bak` backups beside the original FBS/SCN files before overwrite.
- Manual `data_0.pak` selection remains available as a fallback.

## v0.8.32 EXP — 2026-09-02
- Selecting the Zanzarah root folder now explicitly auto-detects `Resources/data_0.pak` case-insensitively.
- Manual PAK selection remains available.
- Preserves the v0.8.31 camera diagnostic.

## v0.8.31 EXP — 2026-09-02
- Camera diagnostic #1 based strictly on the gameplay-working v0.8.26 group architecture.
- Removed only `[.0.<marker>` after each `P.<marker>.<UID>` link.
- Gameplay result: group combat still worked, but the camera teleport remained.

## v0.8.30 — 2026-09-02
- Returned the group constructor close to the original v0.8.21 linked-group mechanics while retaining 3D drag.
- Earlier crash observations from this research range were later traced to incompatible/stale scene state in old save files and must not be treated as definitive structural failures.

## v0.8.29 — 2026-09-02
- Tested linked-group mechanics without post-battle cleanup while retaining co-located support markers and 3D drag.
- Old-save scene-load failures were later identified as potentially save-state related.

## v0.8.28 — 2026-09-02
- Tested v0.8.21-style linked group combat with co-located ii=5 markers and explicit cleanup.
- Old-save crash result is retained as historical evidence but is not considered conclusive after the save-state discovery.

## v0.8.27 — 2026-09-02
- Continued group-combat isolation after v0.8.26; this build was tested against an old scene-state save and produced a crash.
- Later fresh-save testing showed that stale persistent SCN state can invalidate these crash conclusions.

## v0.8.26 — 2026-09-02
- Restored the `sc_0611`-derived linked group architecture with an independent battle-ready `nq4001` leader and `ns321a`-style supports.
- Physical supports use `ii=3 / ii2=3`; each support gets a separate `ii=5` marker used by `P.<marker>.<supportUID>`.
- Added post-battle cleanup by prepending `a.<physical support trigger>` to the leader cleanup script.
- Gameplay PASS on a fresh/working save: leader and support enter the same battle and both disappear after victory.
- Remaining issue at this version: pre-battle camera teleport.

## v0.8.25 — 2026-09-02
- Group actor-role experiment: nq4001 lifecycle with actor-reference transplantation from original scene-specific group roles.
- Retained separate W teams and 3D point dragging.
- Static structure checks passed; gameplay result from an old save was later considered unreliable because of persistent scene state.

## v0.8.24 — 2026-09-02
- Added direct 3D BSP dragging for NPC, item and wild encounter points.
- Dragging raycasts against BSP geometry and preserves terrain-relative vertical offset.
- Reworked group participants toward independent battle-ready clones rather than copying full scene-specific quest profiles.
- 3D dragging was gameplay/UI-confirmed to work and was retained in later releases.

## v0.8.23 — 2026-09-02
- Tested story-profile cloning as a possible group-battle architecture.
- Scene-load failures observed at the time were later found to be potentially contaminated by stale per-scene save state.

## v0.8.22 — 2026-09-02
- Experimental switch to another original scripted encounter architecture during group-combat research.
- This path was abandoned as a generic template because the referenced scenes contain quest-specific fairy/event logic rather than a reusable multi-elf encounter.

## v0.8.21 — 2026-09-02
- First successful reverse-engineered linked enemy group based on original `sc_0611`.
- Identified the original leader link `P.82.6eceda24`, where 82 is an `ii=5` marker and UID `0x6ECEDA24` belongs to the physical support NPC.
- Generated leader + support profiles with separate W decks, physical support triggers and ii=5 markers.
- Gameplay result: support joined the same battle as the leader; camera moved unexpectedly before combat and support cleanup was not yet complete.
- The engine `n` command was removed from this group mode.

## v0.8.20 — 2026-09-02
- Added 1–5 alternative deck variants for one enemy using the observed `L / $ / W / K` layout.
- Confirmed interpretation of mod profiles containing 10–15 `W` lines: they are multiple alternative five-slot decks, not a single 10–15 fairy deck.
- Replaced the failed physical-neighbour group experiment with an `n`-based group constructor containing one visible initiator.
- Exact custom decks for every `n` group participant remain unresolved and are not fabricated.
- Re-checked the >5-fairy question: no `W` slot above 4 was found in the original `_fb0x05` or either supplied mod database.

## v0.8.19 — 2026-09-01
- Removed the scene-load crash introduced by the first grouped-enemy experiment in v0.8.18.
- Removed `n.*` from profiles that also contain explicit `W.*` commands.
- Tested a group as 2–3 separate physical `_CustomElf` NPCs: scene loads correctly, but gameplay test showed only the initiating NPC participates in combat.
- RE result: nearby physical enemies with separate `W` decks do **not** automatically join the same battle.
- Identified mod profiles with `L.3.0`, `$.0/$.1/$.2` and separate groups of `W` slots 0..4 as alternative-deck logic.

## v0.8.18 — 2026-09-01
- Removed the `EXP` suffix from the World Editor name.
- Added first grouped-enemy placement experiment for 2–3 opponents.
- Each physical opponent had a separate appearance and explicit five-fairy `W` deck.
- The leader additionally received `n.(N-1).L.1`.
- Gameplay result: save succeeded, but entering the modified scene crashed the game. The `n + W` construction used by this build is therefore considered invalid/unsupported.
- Research across original + two supplied mods found maximum observed `W` slot = 4.

## v0.8.17 EXP — 2026-08-30
- Gameplay-confirmed custom visible hostile creation based on a battle-ready `nq4001` profile.
- Decoupled battle logic from appearance: battle scripts come from the verified hostile template, while appearance is selected through `C.<model>`.
- Added real DFF geometry preview for NPC appearance, with AED→DFF resolution from user-selected `data_0.pak`.
- Extended DFF preview with UV/material parsing and texture lookup by basename inside PAK resources.
- Added selection of existing standard attack dialogue.
- Disabled creation of new custom `_fb0x06` attack phrases after gameplay testing showed a crash when the enemy attacks.
- Fixed cleanup recognition for legacy `_CustomShadowElf_XX` profiles.

## v0.8.16 EXP — 2026-08-30
- Added appearance selection based on the script `C.<model>` command.
- Added first real DFF enemy preview path and standard attack-dialogue tooling.
- Initial custom-dialogue creation experiment was implemented here and later removed after gameplay failure.

## v0.8.15 EXP — 2026-08-30
- Added deletion/cleanup of custom NPC profiles.
- Preserved the gameplay-confirmed battle-ready custom enemy architecture.
- Added explicit appearance/profile selection work that led to the later `C.<model>` correction.

## v0.8.14 EXP — 2026-08-30
- Replaced non-battle-ready `ns321a` cloning with battle-ready hostile cloning, defaulting to `nq4001`.
- Preserved full start/dialogue/combat/post-battle scripts and replaced only the fairy team.
- Gameplay test confirmed that a newly created `_CustomElf` appears, attacks automatically and enters combat normally.

## v0.8.13 EXP — 2026-08-30
- Added editing of existing enemy `W` teams through the confirmed SCN → `_fb0x05` linkage.
- Added first custom visible enemy placement experiment.
- The initial custom enemy template was not battle-ready and did not attack; this was corrected in v0.8.14.

## v0.8.12 EXP — 2026-08-30
- Added `_WildWizform`-derived manual wild level ranges.
- Gameplay confirmation: configured range 10–15 produced a normal wild encounter at level 12 with no visible elf.

## Fairy Extractor v0.1 EXP — 2026-08-30
- Added standalone experimental tool under `tools/fairy-extractor-v0.1-exp/`.
- Opens mod `_fb0x01.fbs`, optionally compares with original `_fb0x01`, and filters added-looking fairy records.
- Resolves Mesh/AED/DFF resources from a user-selected modded `data_0.pak` and provides 3D preview with textures where resolvable.
- Added experimental `.zfairy` export containing the selected record, a single-record FBS representation, external UID references and resolved graphical assets.
- This tool is not yet gameplay-validated and does not yet import extracted fairies into the original game.

## v0.8.11 EXP
- Control experiment for the Custom Shadow crash boundary: reused original `ns321a` instead of creating a new `_fb0x05` master record.
- This build existed only to isolate whether new-record creation itself caused the crash.

## v0.8.9 EXP
- Fixed Custom Shadow UID allocation so generated NPC/script UIDs preserve the original `_fb0x05` type nibble.
- Custom UIDs changed from the invalid sequential `E5000001`, `E5000002`, ... form to `E5000014`, `E5000024`, ... .

## v0.8.8 EXP
- Continued Custom Shadow Elf crash investigation with a minimal custom profile.
- Fixed a placement-update bug that could rewrite trigger fields incorrectly.

## v0.8.7 EXP
- Custom Shadow Elf gameplay fix #2: base changed from `ns322a` to `ns321a`.
- Preserves Shadow Elf actor ref `0x97688F91`.
- Custom Script2 uses `C.u002s02m` + user W team.
- Placement trigger profile: `ii=3`, `ii2=3`, `ii3=0`, `ii4=0`, empty strings.
- Default hostile radius 5.0.
- Static tests PASS: FBS roundtrip, template/actor ref, Script2, trigger profile, Scene.s empty, item Y+1, custom pools 34–255.
- Pending at that time: gameplay validation of Custom Shadow Elf.
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
