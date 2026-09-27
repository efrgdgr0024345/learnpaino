# LearnPiano — score-first piano lessons

A calibrated, resizable falling-note piano trainer with Exact and Soulful playback and an optional private AI coach.

## Library v2

The new library starts with five bundled two-hand source scores: Moonlight Sonata I, Petzold's Minuet in G, Satie's Gymnopedie No. 1, full-length Fur Elise, and Chopin's Nocturne Op. 9 No. 2. Seven older melody/arrangement demos remain in a separate legacy group. This is not yet a 100-song collection.

Bundled scores are delivered with the project, not fetched from unrelated hosts during normal selection. Original extracted MusicXML bytes, pinned provenance and SHA-256 fingerprints are recorded in scores/catalogue.json and scores/source-manifest.json. Structural checks confirm both notated hand parts; they do not certify edition accuracy or redistribution rights. Difficulty ratings (1–10) and performance profiles are provisional teaching suggestions, not examination grades, pianist reviews or recordings. Check source terms before commercial redistribution.

**Library** opens a closable search/filter panel. **Import sheet music** accepts XML/MusicXML and compressed MXL locally, shows an import review and warnings, and requires confirmation. PDF/photo recognition and a persistent publishing admin are not implemented. Existing keyboard alignment is not changed by importing or selecting songs. Long titles do not resize the toolbar or shift the piano.

Both Exact and Soulful modes use the same score notes. Source dynamics, illustrative voicing/phrase shaping and limited pedal handling remain separate from musical correctness. Ordinary repeat/ending handling has been added; advanced navigation and ornaments still need review. See [the full library guide](docs/LIBRARY_V2.md).

## Optional coach

The server-side OpenAI coach supports text questions, explicitly recorded questions, spoken replies, confirmed passage actions and approximate attempt feedback. It is disabled until configured; no paid calls occur just because the piano page opens. No API key belongs in GitHub or browser storage. See [private setup, limits and privacy](docs/AI_COACH.md).

The microphone feedback remains approximate: green correct, red wrong, blue missed. It cannot provide a reliable formal grade for chords, pedal, velocity or musical expression. Listening to demo speakers can generate false matches. Hand assignments follow source staves and need review for cross-staff writing.

## Deploy

Open the existing loader.php in your browser and select **Load latest from GitHub**, then reopen index.php. Do not delete old files, change hashes manually or upload an API key. Private coach configuration remains outside the project. Protect or remove the web updater when it is not needed.

## Test and reproduce

`python tools/check_integrity.py` checks runtime hashes. `python tools/build_library.py` recreates the bundled scores from pinned, hash-checked sources (build step only). Browser suites cover song import, hand mapping, mode switching, source integrity, local MXL safety, UI/calibration and coach isolation. Tests use simulated coach responses; they do not certify musical accuracy or exercise a real API key.
