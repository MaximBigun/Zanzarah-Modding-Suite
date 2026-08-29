# Zanzarah Modding Suite — Project Structure

## 1. World Editor

### 1.1 Enemies / NPC
FBS NPC reading, placement, W teams/levels, ordinary/aggressive NPCs, aggression radius, Custom Shadow Elf, cloning/UID and Scene ↔ Trigger ↔ NPC linkage.

### 1.2 Items
Item database, placement/move/delete, quantity ×N, coins/crystals/ordinary items, pickup notification research and future item-property editing.

### 1.3 Map / 3D World Viewer
RenderWare BSP reading, `sceneFile` lookup, BSP extraction from `data_0.pak`, real geometry rendering, camera navigation, ray/triangle picking and gameplay-object overlays. This is currently a map/world viewer, not landscape geometry editing.

### 1.4 Wild Fairies / Encounter System
Encounter points, radius/raw fields, original pools 0–33, decoded pool DB, custom pools 34–255, weighted slots, level ranges, one-specific-fairy mode, EXE pool patcher and high-ID gameplay validation.

### 1.5 SCN / Scene System
Scene items, triggers, types, XYZ/direction, linkage, serialization, preservation of unknown fields, Undo and import/export.

### 1.6 NPC/FBS Scripting & Reverse Engineering
`_fb0x05`, W/C/n commands, Script1–5, `_ShadowElf`, `ns321a`, `ns322a`, conditions/jumps/quest flags and unknown commands.

### 1.7 PAK / Resource Tools
`data_0.pak` index/search/extraction, safe extraction and future repacking/resource replacement research.

## 2. Fairy Editor — concept/research
Full fairy data editor: stats, elements/classes, evolution, spells/progression, models/textures, cards/UI/localization and eventually new IDs usable by NPC teams and wild pools.

## 3. Landscape / Level Development — concept/research
Actual level geometry editing: geometry, walls/platforms/objects, materials/textures, collision, lighting, rooms/transitions and new areas.

Strong authoring direction: `Zanzarah → ZMS → Unity → ZMS → Zanzarah`, using Unity as an external level-authoring environment rather than replacing the game engine.

First intended proof of concept: `SC_0231.BSP → Unity → unchanged export → Zanzarah`, then controlled geometry/collision modifications.

## 4. Modern PC / Engine Improvements — concept/research
2K/4K, ultrawide, FOV, HUD/UI scaling, borderless/windowed, FPS/timing, legacy DirectX/GPU compatibility and rendering bug fixes.

Long-term UE5 hybrid frontend research is separate R&D and not a confirmed architecture.

## 5. Localization & Voice — concept/research
UI/system text, subtitles/dialogue, voice packs, optional video assets, custom language packs, TTS/machine voice and runtime language switching where feasible.

Current speech research identified packaged speech WAVs as mono 44.1 kHz IMA ADPCM and is tracing dialog → speaker → speech filename generation.

## Cross-cutting: Project Infrastructure / Release Engineering
Versioning, changelogs, manifests, hashes, branding, official-build markers and future Ed25519 signing. This is infrastructure across all product directions, not a sixth product category.