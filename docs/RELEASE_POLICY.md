# ZMS Release Policy

## Source of truth

GitHub is the canonical source repository for Zanzarah Modding Suite. Confluence is the durable technical knowledge base and Jira is the work/bug tracker.

## Every new version must include

1. A versioned source commit.
2. A Git tag (`vX.Y.Z` or `vX.Y.Z-exp`).
3. `CHANGELOG_vX.Y.Z.txt` for the build.
4. An update to repository `CHANGELOG.md` / MASTER CHANGELOG.
5. Static-test results separated from gameplay-test results.
6. Known limitations and pending tests.
7. For distributed binary builds: SHA-256 recorded with the artifact.

## EXP versions

Experimental versions use a `-exp` Git tag and should be marked **Pre-release** when a GitHub Release is created. EXP does not mean broken; it means the build still contains functionality awaiting broader gameplay validation or format/patch stability.

## Binary releases

When an archived ZIP exists, attach that exact ZIP to the matching GitHub Release. Do not regenerate a historical ZIP and present it as the original artifact unless it is explicitly labeled as reconstructed.

## Original game data

Never commit or redistribute original copyrighted Zanzarah resources or binaries. In particular, avoid original `zanthp.exe`, `data_0.pak`, FBS, SCN, BSP, DFF, WAV, MP3 and similar game assets.

## v1.0 integrity/signing plan

Planned official-build infrastructure:

- permanent branding `Zanzarah Modding Suite — by Maksym Bihun`;
- project marker in exported patches/files;
- marker in patched executable where technically appropriate;
- `manifest.json` containing version/date/SHA-256;
- editor-side integrity status (Official / Modified / Unknown);
- real Ed25519 release signature.

The Ed25519 private key must never be committed to this repository or included in public releases. Only the public verification key may be distributed.

A marker or SHA-256 manifest alone must not be described as cryptographic proof of authorship.