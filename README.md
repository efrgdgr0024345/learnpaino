# LearnPiano

LearnPiano is a browser-based piano learning prototype designed to sit above or in front of a real keyboard.

The project now combines the original **falling-note / calibrated keyboard trainer** with the newer **live microphone listener** rather than treating them as separate versions.

## Core features

- Falling-note piano-roll display that lands directly on the matching on-screen piano key.
- On-screen piano can be **moved and resized from every edge/corner** so the keys can be physically aligned with a real keyboard.
- **Full size mode preserves that calibration**: the piano keeps the same pixel width, horizontal position and keyboard height instead of stretching to fill the screen.
- Small-screen fullscreen requests landscape orientation and uses a CSS landscape fallback where orientation locking is unavailable.
- 61-key, 88-key and score-range views.
- MusicXML import from `.musicxml` / `.xml` files.
- Automatically loads `demo.musicxml`; if needed the PHP file attempts to cache the public-domain MusicXML for **Claude Debussy — Clair de Lune**.
- Sampled grand-piano playback using Yamaha C5 / Salamander recordings, with a synthesized fallback if samples cannot load.
- Tempo, lead-time and timeline/scrub controls.
- Keyboard keys can be tapped/clicked to audition notes.

## Live real-piano listener

Press **Listen** and play one note at a time on the real piano.

- **Blue key** = note currently heard through the microphone.
- **Green key** = the heard note matches one of the lesson notes currently reaching the keyboard.
- The UI reports whether the played note is correct, too low or too high.
- Sensitivity, detector confidence and A4 reference tuning can be adjusted.
- Pitch analysis runs locally in the browser; the app does not upload microphone recordings.

The listener is currently monophonic. Polyphonic/chord transcription is a later stage.

## Diagnostics

The single `index.php` also includes a small diagnostics endpoint.

Browser/audio/microphone errors and useful runtime events are written to:

```text
piano_debug.log
```

Use the **Diagnostics** button to copy a compact report that can be pasted back into ChatGPT when testing on a phone.

## Running it

The web app itself remains a **single `index.php` entry point**.

1. Put the repository files in a PHP-enabled HTTPS folder.
2. Open the site in the browser.
3. Resize/move the piano until it lines up with your real keyboard.
4. Press **Full size** to enter the clean teaching view without losing that calibration.
5. Press **Play** to run the falling-note score.
6. Optionally press **Listen** to compare notes from the real piano with the lesson.

Microphone access requires HTTPS in normal browser use.

## GitHub loader

`loader.php` updates the hosted copy from the repository's `main` branch. It preserves loader state/temp files and server-only files rather than wiping the directory.

## Current roadmap

- Improve microphone bass-note stability and octave correction.
- Add note-onset detection for repeated notes.
- Add polyphonic/chord recognition.
- Add wait-for-correct-note practice mode.
- Score timing and pitch accuracy.
- Restore/add Standard MIDI import alongside MusicXML.
- Persist keyboard calibration and practice statistics.
